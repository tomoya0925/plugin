const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    try {
      const url = new URL(request.url);
      const path = normalizePath(url.pathname);
      const response = await route(request, env, url, path);
      return withHeaders(response, cors);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status >= 500) console.error(error);
      const status = error instanceof ApiError ? error.status : 500;
      const message = error instanceof ApiError ? error.message : "Internal server error";
      return json({ detail: message }, status, cors);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(resetCheckins(env));
  },
};

async function route(request, env, url, path) {
  if (request.method === "GET" && path === "/health") {
    await env.DB.prepare("SELECT 1").first();
    return json({ status: "ok" });
  }

  if (path === "/checkins" && request.method === "GET") {
    return getCheckins(request, env);
  }
  if (path === "/checkins" && request.method === "POST") {
    return createCheckin(request, env);
  }
  if (path === "/checkins/reset-all" && request.method === "POST") {
    await requireAdminKey(request, env);
    return resetCheckins(env);
  }

  let match = path.match(/^\/checkins\/(\d+)$/);
  if (match && request.method === "DELETE") {
    return checkout(Number(match[1]), env);
  }

  match = path.match(/^\/checkins\/(\d+)\/reactions$/);
  if (match && request.method === "POST") {
    return addReaction(Number(match[1]), request, env);
  }

  match = path.match(/^\/checkins\/(\d+)\/comments$/);
  if (match && request.method === "POST") {
    return addComment(Number(match[1]), request, env);
  }

  if (path === "/long-term-profiles" && request.method === "GET") {
    await requireAccessCode(request, env);
    return getLongTermProfiles(env);
  }
  if (path === "/long-term-profiles" && request.method === "POST") {
    await requireAccessCode(request, env);
    return upsertLongTermProfile(request, env);
  }

  match = path.match(/^\/long-term-profiles\/(.+)$/);
  if (match && request.method === "GET") {
    await requireAccessCode(request, env);
    return getLongTermProfile(decodeURIComponent(match[1]), env);
  }
  if (match && request.method === "DELETE") {
    await requireAccessCode(request, env);
    return deleteLongTermProfile(decodeURIComponent(match[1]), env);
  }

  if (path === "/job-infos" && request.method === "GET") {
    await requireAccessCode(request, env);
    return getJobInfos(env);
  }
  if (path === "/job-infos" && request.method === "POST") {
    await requireAccessCode(request, env);
    return createJobInfo(request, env);
  }

  match = path.match(/^\/job-infos\/(\d+)$/);
  if (match && request.method === "DELETE") {
    await requireAccessCode(request, env);
    return deleteJobInfo(Number(match[1]), request, env, url);
  }

  if (env.ASSETS && ["GET", "HEAD"].includes(request.method)) {
    return env.ASSETS.fetch(request);
  }

  throw new ApiError(404, "Not found");
}

async function getCheckins(request, env) {
  const versionRow = await env.DB.prepare(
    "SELECT value FROM app_metadata WHERE key = 'checkins_version'"
  ).first();
  const etag = `\"checkins-${versionRow?.value ?? 0}\"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }

  const checkinResult = await env.DB.prepare(`
    SELECT checkin_id, user_id, nickname, avatar_id, seat_number,
           task_description, is_active, created_at
    FROM checkins
    WHERE is_active = 1
    ORDER BY created_at ASC
  `).all();
  const checkins = checkinResult.results ?? [];

  if (checkins.length > 0) {
    const placeholders = checkins.map(() => "?").join(",");
    const ids = checkins.map((item) => item.checkin_id);
    const [reactionResult, commentResult] = await Promise.all([
      env.DB.prepare(`
        SELECT reaction_id, checkin_id, sender_nickname, reaction_type, created_at
        FROM reactions
        WHERE checkin_id IN (${placeholders})
        ORDER BY created_at ASC
      `).bind(...ids).all(),
      env.DB.prepare(`
        SELECT comment_id, checkin_id, sender_nickname, body, created_at
        FROM comments
        WHERE checkin_id IN (${placeholders})
        ORDER BY created_at ASC
      `).bind(...ids).all(),
    ]);

    const reactionsByCheckin = groupBy(reactionResult.results ?? [], "checkin_id");
    const commentsByCheckin = groupBy(commentResult.results ?? [], "checkin_id");
    for (const checkin of checkins) {
      checkin.is_active = Boolean(checkin.is_active);
      checkin.reactions = reactionsByCheckin.get(checkin.checkin_id) ?? [];
      checkin.comments = commentsByCheckin.get(checkin.checkin_id) ?? [];
    }
  }

  return json(checkins, 200, { etag, "cache-control": "no-cache" });
}

async function createCheckin(request, env) {
  const body = await readJson(request);
  requireFields(body, ["nickname", "avatar_id", "seat_number", "task_description"]);
  assertMax(body.nickname, 50, "nickname");
  assertMax(body.avatar_id, 50, "avatar_id");
  assertMax(body.seat_number, 20, "seat_number");
  assertMax(body.task_description, 40, "task_description");

  const saved = await env.DB.prepare(`
    INSERT INTO checkins (user_id, nickname, avatar_id, seat_number, task_description)
    VALUES (?, ?, ?, ?, ?)
    RETURNING checkin_id, user_id, nickname, avatar_id, seat_number,
              task_description, is_active, created_at
  `).bind(
    Number(body.user_id) || 1,
    clean(body.nickname),
    clean(body.avatar_id),
    clean(body.seat_number),
    clean(body.task_description)
  ).first();
  await bumpCheckinsVersion(env);
  saved.is_active = Boolean(saved.is_active);
  saved.reactions = [];
  saved.comments = [];
  return json(saved, 200);
}

async function checkout(checkinId, env) {
  const result = await env.DB.prepare(
    "UPDATE checkins SET is_active = 0 WHERE checkin_id = ? AND is_active = 1"
  ).bind(checkinId).run();
  if (!result.meta.changes) throw new ApiError(404, "Checkin not found");
  await bumpCheckinsVersion(env);
  return new Response(null, { status: 204 });
}

async function addReaction(checkinId, request, env) {
  await requireCheckin(checkinId, env);
  const body = await readJson(request);
  requireFields(body, ["sender_nickname", "reaction_type"]);
  if (!["like", "talk"].includes(body.reaction_type)) {
    throw new ApiError(400, "Invalid reaction type");
  }
  assertMax(body.sender_nickname, 50, "sender_nickname");

  const saved = await env.DB.prepare(`
    INSERT INTO reactions (checkin_id, sender_nickname, reaction_type)
    VALUES (?, ?, ?)
    RETURNING reaction_id, sender_nickname, reaction_type, created_at
  `).bind(checkinId, clean(body.sender_nickname), body.reaction_type).first();
  await bumpCheckinsVersion(env);
  return json(saved, 200);
}

async function addComment(checkinId, request, env) {
  await requireCheckin(checkinId, env);
  const body = await readJson(request);
  requireFields(body, ["sender_nickname", "body"]);
  assertMax(body.sender_nickname, 50, "sender_nickname");
  assertMax(body.body, 300, "body");

  const saved = await env.DB.prepare(`
    INSERT INTO comments (checkin_id, sender_nickname, body)
    VALUES (?, ?, ?)
    RETURNING comment_id, sender_nickname, body, created_at
  `).bind(checkinId, clean(body.sender_nickname), clean(body.body)).first();
  await bumpCheckinsVersion(env);
  return json(saved, 200);
}

async function resetCheckins(env) {
  const result = await env.DB.prepare(
    "UPDATE checkins SET is_active = 0 WHERE is_active = 1"
  ).run();
  if (result.meta.changes) await bumpCheckinsVersion(env);
  return json({ message: `${result.meta.changes ?? 0} 名を退出させました` });
}

async function getLongTermProfiles(env) {
  const result = await env.DB.prepare(`
    SELECT profile_id, nickname, current_focus, desired_connections,
           profile_text, updated_at
    FROM long_term_profiles
    ORDER BY updated_at DESC
  `).all();
  return json(result.results ?? []);
}

async function getLongTermProfile(nickname, env) {
  const profile = await env.DB.prepare(`
    SELECT profile_id, nickname, current_focus, desired_connections,
           profile_text, updated_at
    FROM long_term_profiles WHERE nickname = ?
  `).bind(nickname).first();
  if (!profile) throw new ApiError(404, "Profile not found");
  return json(profile);
}

async function upsertLongTermProfile(request, env) {
  const body = await readJson(request);
  requireFields(body, ["nickname", "current_focus", "desired_connections"]);
  assertMax(body.nickname, 50, "nickname");
  assertMax(body.current_focus, 120, "current_focus");
  assertMax(body.desired_connections, 120, "desired_connections");
  assertMax(body.profile_text ?? "", 800, "profile_text");

  const saved = await env.DB.prepare(`
    INSERT INTO long_term_profiles (
      nickname, current_focus, desired_connections, profile_text, updated_at
    ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(nickname) DO UPDATE SET
      current_focus = excluded.current_focus,
      desired_connections = excluded.desired_connections,
      profile_text = excluded.profile_text,
      updated_at = CURRENT_TIMESTAMP
    RETURNING profile_id, nickname, current_focus, desired_connections,
              profile_text, updated_at
  `).bind(
    clean(body.nickname),
    clean(body.current_focus),
    clean(body.desired_connections),
    optionalText(body.profile_text)
  ).first();
  return json(saved, 200);
}

async function deleteLongTermProfile(nickname, env) {
  const result = await env.DB.prepare(
    "DELETE FROM long_term_profiles WHERE nickname = ?"
  ).bind(nickname).run();
  if (!result.meta.changes) throw new ApiError(404, "Profile not found");
  return new Response(null, { status: 204 });
}

async function getJobInfos(env) {
  const result = await env.DB.prepare(`
    SELECT job_info_id, submitter_nickname, company_name, role, selection_type,
           start_period, end_period, selection_features, company_impression, created_at
    FROM job_infos
    ORDER BY created_at DESC
  `).all();
  return json(result.results ?? []);
}

async function createJobInfo(request, env) {
  const body = await readJson(request);
  const required = [
    "submitter_nickname", "company_name", "role", "selection_type",
    "start_period", "end_period", "selection_features", "company_impression",
  ];
  requireFields(body, required);
  if (!["本選考", "インターン"].includes(body.selection_type)) {
    throw new ApiError(400, "selection_type must be 本選考 or インターン");
  }
  for (const field of ["submitter_nickname", "start_period", "end_period"]) {
    assertMax(body[field], 50, field);
  }
  for (const field of ["company_name", "role"]) assertMax(body[field], 120, field);
  for (const field of ["selection_features", "company_impression"]) {
    assertMax(body[field], 1000, field);
  }

  const saved = await env.DB.prepare(`
    INSERT INTO job_infos (
      submitter_nickname, company_name, role, selection_type, start_period,
      end_period, selection_features, company_impression
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING job_info_id, submitter_nickname, company_name, role, selection_type,
              start_period, end_period, selection_features, company_impression, created_at
  `).bind(...required.map((field) => clean(body[field]))).first();
  return json(saved, 200);
}

async function deleteJobInfo(jobInfoId, request, env, url) {
  const item = await env.DB.prepare(
    "SELECT submitter_nickname FROM job_infos WHERE job_info_id = ?"
  ).bind(jobInfoId).first();
  if (!item) throw new ApiError(404, "Job info not found");

  const requester = url.searchParams.get("requester_nickname") ?? "";
  const isOwner = item.submitter_nickname === requester;
  const isAdmin = await safeEqual(request.headers.get("x-admin-key") ?? "", env.JOB_INFO_ADMIN_KEY ?? "");
  if (!isOwner && !isAdmin) throw new ApiError(403, "Not allowed to delete this job info");

  await env.DB.prepare("DELETE FROM job_infos WHERE job_info_id = ?").bind(jobInfoId).run();
  return new Response(null, { status: 204 });
}

async function requireCheckin(checkinId, env) {
  const checkin = await env.DB.prepare(
    "SELECT checkin_id FROM checkins WHERE checkin_id = ? AND is_active = 1"
  ).bind(checkinId).first();
  if (!checkin) throw new ApiError(404, "Checkin not found");
}

async function bumpCheckinsVersion(env) {
  await env.DB.prepare(`
    UPDATE app_metadata SET value = value + 1 WHERE key = 'checkins_version'
  `).run();
}

async function requireAccessCode(request, env) {
  if (!env.APP_ACCESS_CODE) throw new ApiError(503, "APP_ACCESS_CODE is not configured");
  const supplied = request.headers.get("x-access-code") ?? "";
  if (!(await safeEqual(supplied, env.APP_ACCESS_CODE))) {
    throw new ApiError(401, "Invalid access code");
  }
}

async function requireAdminKey(request, env) {
  if (!env.JOB_INFO_ADMIN_KEY) throw new ApiError(503, "JOB_INFO_ADMIN_KEY is not configured");
  const supplied = request.headers.get("x-admin-key") ?? "";
  if (!(await safeEqual(supplied, env.JOB_INFO_ADMIN_KEY))) {
    throw new ApiError(401, "Invalid admin key");
  }
}

async function safeEqual(left, right) {
  if (!left || !right) return false;
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
}

function requireFields(body, fields) {
  for (const field of fields) {
    if (!clean(body?.[field])) throw new ApiError(400, `${field} is required`);
  }
}

function assertMax(value, maxLength, field) {
  if (String(value ?? "").length > maxLength) {
    throw new ApiError(400, `${field} must be at most ${maxLength} characters`);
  }
}

function clean(value) {
  return String(value ?? "").trim();
}

function optionalText(value) {
  const text = clean(value);
  return text || null;
}

function groupBy(items, key) {
  const grouped = new Map();
  for (const item of items) {
    const groupKey = item[key];
    const copy = { ...item };
    delete copy[key];
    grouped.set(groupKey, [...(grouped.get(groupKey) ?? []), copy]);
  }
  return grouped;
}

function normalizePath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin");
  const allowed = String(env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const headers = {
    "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type,x-access-code,x-admin-key,If-None-Match",
    "access-control-expose-headers": "ETag",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
  if (origin && allowed.includes(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function json(value, status = 200, headers = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function withHeaders(response, extraHeaders) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
