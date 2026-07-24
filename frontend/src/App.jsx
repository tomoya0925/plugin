import { useCallback, useState, useEffect } from 'react';

const AVATAR_LIST = {
  cat: "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0",
  dog: "https://api.dicebear.com/7.x/notionists/svg?seed=Bella&backgroundColor=e2e8f0",
  robot1: "https://api.dicebear.com/7.x/bottts/svg?seed=Robo1&backgroundColor=e2e8f0",
  robot2: "https://api.dicebear.com/7.x/bottts/svg?seed=Robo2&backgroundColor=e2e8f0",
  human1: "https://api.dicebear.com/7.x/notionists/svg?seed=Mimi&backgroundColor=e2e8f0",
  human2: "https://api.dicebear.com/7.x/notionists/svg?seed=Jack&backgroundColor=e2e8f0",
  human3: "https://api.dicebear.com/7.x/notionists/svg?seed=Sasha&backgroundColor=e2e8f0",
  human4: "https://api.dicebear.com/7.x/notionists/svg?seed=Leo&backgroundColor=e2e8f0",
  adv1: "https://api.dicebear.com/7.x/adventurer/svg?seed=Bear&backgroundColor=e2e8f0",
  adv2: "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=e2e8f0",
  adv3: "https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=e2e8f0",
  art1: "https://api.dicebear.com/7.x/lorelei/svg?seed=Aria&backgroundColor=e2e8f0",
  art2: "https://api.dicebear.com/7.x/lorelei/svg?seed=Zane&backgroundColor=e2e8f0",
  art3: "https://api.dicebear.com/7.x/lorelei/svg?seed=Maya&backgroundColor=e2e8f0",
  art4: "https://api.dicebear.com/7.x/lorelei/svg?seed=Ken&backgroundColor=e2e8f0",
};

const API_BASE_URL = "https://venture-platform-backend.onrender.com";

const SEAT_LAYOUT = [
  { seat: "22", x: 11, y: 8 }, { seat: "17", x: 21, y: 9 },
  { seat: "21", x: 11, y: 16 }, { seat: "18", x: 21, y: 17 },
  { seat: "20", x: 11, y: 24 }, { seat: "19", x: 21, y: 25 },
  { seat: "28", x: 9, y: 42 }, { seat: "23", x: 20, y: 43 },
  { seat: "27", x: 8, y: 51 }, { seat: "24", x: 20, y: 52 },
  { seat: "26", x: 8, y: 60 }, { seat: "25", x: 19, y: 60 },
  { seat: "16", x: 35, y: 45 }, { seat: "13", x: 41, y: 45 },
  { seat: "15", x: 35, y: 53 }, { seat: "14", x: 41, y: 54 },
  { seat: "12", x: 50, y: 46 }, { seat: "09", x: 56, y: 47 },
  { seat: "11", x: 50, y: 55 }, { seat: "10", x: 56, y: 56 },
  { seat: "08", x: 64, y: 47 }, { seat: "05", x: 70, y: 47 },
  { seat: "07", x: 64, y: 55 }, { seat: "06", x: 70, y: 56 },
  { seat: "04", x: 79, y: 51 }, { seat: "03", x: 84, y: 52 },
  { seat: "02", x: 93, y: 61 }, { seat: "01", x: 93, y: 70 },
  { seat: "36", x: 7, y: 82 }, { seat: "35", x: 12, y: 82 },
  { seat: "33", x: 23, y: 82 }, { seat: "30", x: 31, y: 83 },
  { seat: "29", x: 36, y: 83 }, { seat: "38", x: 7, y: 92 },
  { seat: "37", x: 12, y: 92 }, { seat: "34", x: 23, y: 92 },
  { seat: "31", x: 31, y: 92 }, { seat: "32", x: 36, y: 92 },
];

const normalizeSeatNumber = (seatNumber) => {
  const digits = String(seatNumber || "").match(/\d+/)?.[0];
  return digits ? digits.padStart(2, "0") : String(seatNumber || "").trim();
};

function App() {
  const isStoreMapView = new URLSearchParams(window.location.search).get("view") === "store-map";
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("venture_currentUser") || "");
  const [loginInput, setLoginInput] = useState("");
  const [checkins, setCheckins] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [avatarId, setAvatarId] = useState("cat");
  const [seat, setSeat] = useState("");
  const [task, setTask] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const [profileForm, setProfileForm] = useState({
    current_focus: "",
    desired_connections: "",
    profile_text: "",
  });

  const myCheckin = checkins.find(c => c.nickname === currentUser);

  const fetchCheckins = useCallback(() => {
    fetch(`${API_BASE_URL}/checkins/`)
      .then(res => res.json())
      .then(data => setCheckins(Array.isArray(data) ? data : []));
  }, []);

  const fetchProfiles = useCallback(() => {
    fetch(`${API_BASE_URL}/long-term-profiles/`)
      .then(res => res.json())
      .then(data => {
        const nextProfiles = Array.isArray(data) ? data : [];
        const currentProfile = nextProfiles.find(p => p.nickname === currentUser);
        setProfiles(nextProfiles);
        if (currentProfile) {
          setProfileForm({
            current_focus: currentProfile.current_focus || "",
            desired_connections: currentProfile.desired_connections || "",
            profile_text: currentProfile.profile_text || "",
          });
        }
      });
  }, [currentUser]);

  useEffect(() => {
    fetchCheckins();
    if (!isStoreMapView) fetchProfiles();
    const timer = setInterval(fetchCheckins, 30000);
    return () => clearInterval(timer);
  }, [fetchCheckins, fetchProfiles, isStoreMapView]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const trimmedInput = loginInput.trim();
    if (!trimmedInput) return;
    setCurrentUser(trimmedInput);
    localStorage.setItem("venture_currentUser", trimmedInput);
  };

  const handleCheckin = (e) => {
    if (e) e.preventDefault();
    const newCheckin = {
      user_id: 1,
      nickname: currentUser,
      avatar_id: avatarId,
      seat_number: seat,
      task_description: task,
    };

    fetch(`${API_BASE_URL}/checkins/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCheckin),
    })
      .then(res => res.json())
      .then(data => {
        setCheckins([...checkins, data]);
        setSeat("");
        setTask("");
      });
  };

  const handleCheckout = (checkin_id) => {
    if (!window.confirm("チェックアウトして退室しますか？")) return;
    fetch(`${API_BASE_URL}/checkins/${checkin_id}`, { method: "DELETE" })
      .then(() => setCheckins(checkins.filter(c => c.checkin_id !== checkin_id)));
  };

  const handleReaction = (checkin_id, type) => {
    fetch(`${API_BASE_URL}/checkins/${checkin_id}/reactions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_nickname: currentUser,
        reaction_type: type,
      }),
    })
      .then(res => res.json())
      .then(newReaction => {
        setCheckins(prev => prev.map(c => (
          c.checkin_id === checkin_id
            ? { ...c, reactions: [...(c.reactions || []), newReaction] }
            : c
        )));
      });
  };

  const handleComment = (e, checkin_id) => {
    e.preventDefault();
    const body = (commentInputs[checkin_id] || "").trim();
    if (!body) return;

    fetch(`${API_BASE_URL}/checkins/${checkin_id}/comments/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_nickname: currentUser,
        body,
      }),
    })
      .then(res => res.json())
      .then(newComment => {
        setCheckins(prev => prev.map(c => (
          c.checkin_id === checkin_id
            ? { ...c, comments: [...(c.comments || []), newComment] }
            : c
        )));
        setCommentInputs(prev => ({ ...prev, [checkin_id]: "" }));
      });
  };

  const handleProfileSave = (e) => {
    e.preventDefault();
    fetch(`${API_BASE_URL}/long-term-profiles/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nickname: currentUser,
        ...profileForm,
      }),
    })
      .then(res => res.json())
      .then(savedProfile => {
        setProfiles(prev => {
          const exists = prev.some(p => p.nickname === savedProfile.nickname);
          return exists
            ? prev.map(p => p.nickname === savedProfile.nickname ? savedProfile : p)
            : [savedProfile, ...prev];
        });
        setSelectedProfile(null);
        setIsEditingProfile(false);
      });
  };

  const handleProfileDelete = () => {
    if (!window.confirm("掲載内容を消去しますか？")) return;

    fetch(`${API_BASE_URL}/long-term-profiles/${encodeURIComponent(currentUser)}`, {
      method: "DELETE",
    })
      .then(() => {
        setProfiles(prev => prev.filter(p => p.nickname !== currentUser));
        setSelectedProfile(null);
        setIsEditingProfile(false);
        setProfileForm({
          current_focus: "",
          desired_connections: "",
          profile_text: "",
        });
      });
  };

  if (isStoreMapView) {
    return <StoreMapView checkins={checkins} />;
  }

  if (!currentUser) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center font-['Plus_Jakarta_Sans'] px-6">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-lg text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl">rocket_launch</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">venture platform</h1>
          <p className="text-slate-500 text-sm">venture platformへようこそ。</p>
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <input
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              required
              className="w-full h-[48px] px-4 rounded-lg bg-slate-50 border border-slate-200 outline-none text-center font-bold text-lg"
              placeholder="ニックネーム"
            />
            <button type="submit" className="w-full h-12 bg-primary text-white font-bold rounded-lg shadow-md active:scale-95 transition-all">はじめる</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface min-h-screen font-['Plus_Jakarta_Sans'] pb-24">
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-[720px] mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
            <h1 className="font-bold text-slate-900 text-lg tracking-tighter">venture platform</h1>
          </div>
          <div className="text-sm font-bold text-slate-600">{currentUser} さん</div>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-[720px] mx-auto space-y-8">
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setActiveTab("today")} className={`h-10 rounded-lg text-sm font-bold ${activeTab === "today" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            今日
          </button>
          <button onClick={() => setActiveTab("longTerm")} className={`h-10 rounded-lg text-sm font-bold ${activeTab === "longTerm" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            中長期
          </button>
        </div>

        {activeTab === "today" ? (
          <TodayView
            currentUser={currentUser}
            myCheckin={myCheckin}
            checkins={checkins}
            avatarId={avatarId}
            seat={seat}
            task={task}
            commentInputs={commentInputs}
            setAvatarId={setAvatarId}
            setSeat={setSeat}
            setTask={setTask}
            setCommentInputs={setCommentInputs}
            onCheckin={handleCheckin}
            onCheckout={handleCheckout}
            onReaction={handleReaction}
            onComment={handleComment}
          />
        ) : (
          <LongTermView
            currentUser={currentUser}
            profiles={profiles}
            selectedProfile={selectedProfile}
            isEditingProfile={isEditingProfile}
            profileForm={profileForm}
            setSelectedProfile={setSelectedProfile}
            setIsEditingProfile={setIsEditingProfile}
            setProfileForm={setProfileForm}
            onProfileSave={handleProfileSave}
            onProfileDelete={handleProfileDelete}
          />
        )}
      </main>
    </div>
  );
}

function TodayView({
  currentUser,
  myCheckin,
  checkins,
  avatarId,
  seat,
  task,
  commentInputs,
  setAvatarId,
  setSeat,
  setTask,
  setCommentInputs,
  onCheckin,
  onCheckout,
  onReaction,
  onComment,
}) {
  return (
    <>
      {!myCheckin ? (
        <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900">チェックイン</h2>
          <form onSubmit={onCheckin} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase block mb-2">アバターを選択</label>
              <div className="flex gap-2 overflow-x-auto">
                {Object.entries(AVATAR_LIST).map(([id, url]) => (
                  <img
                    key={id}
                    src={url}
                    alt={id}
                    onClick={() => setAvatarId(id)}
                    className={`w-12 h-12 rounded-full cursor-pointer transition-all border-2 ${avatarId === id ? 'border-primary scale-110 shadow-md' : 'border-transparent opacity-50'}`}
                  />
                ))}
              </div>
            </div>
            <input value={seat} onChange={(e) => setSeat(e.target.value)} required className="w-full h-[48px] px-4 rounded-lg border border-slate-200" placeholder="座席番号 (例: A-12)" />
            <textarea value={task} onChange={(e) => setTask(e.target.value)} required className="w-full p-4 rounded-lg border border-slate-200" placeholder="今日頑張ることを入力..." rows="3" />
            <button type="submit" className="w-full h-12 bg-primary text-white font-bold rounded-lg shadow-md active:scale-95 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">login</span>チェックイン
            </button>
          </form>
        </section>
      ) : (
        <div className="bg-green-50 border border-green-100 p-4 rounded-xl text-center">
          <p className="text-green-700 font-bold text-sm">現在チェックイン中です 🚀</p>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">タイムライン</h2>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{checkins.length}名が活動中</span>
        </div>
        <div className="space-y-4">
          {checkins.map((checkin) => (
            <CheckinCard
              key={checkin.checkin_id}
              checkin={checkin}
              currentUser={currentUser}
              commentValue={commentInputs[checkin.checkin_id] || ""}
              setCommentInputs={setCommentInputs}
              onCheckout={onCheckout}
              onReaction={onReaction}
              onComment={onComment}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function CheckinCard({ checkin, currentUser, commentValue, setCommentInputs, onCheckout, onReaction, onComment }) {
  const reactions = checkin.reactions || [];
  const comments = checkin.comments || [];
  const likes = reactions.filter(r => r.reaction_type === "like");
  const talks = reactions.filter(r => r.reaction_type === "talk");
  const hasLiked = likes.some(r => r.sender_nickname === currentUser);
  const hasTalked = talks.some(r => r.sender_nickname === currentUser);

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
      <div className="flex gap-4">
        <img src={AVATAR_LIST[checkin.avatar_id] || AVATAR_LIST.cat} className="w-12 h-12 rounded-full shrink-0" alt="avatar" />
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center gap-3">
            <h3 className="font-bold text-sm truncate">{checkin.nickname}</h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold shrink-0">
              {checkin.seat_number}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1 break-words">{checkin.task_description}</p>
        </div>
      </div>

      {reactions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {reactions.map((r) => (
            <div key={r.reaction_id} className="text-[9px] bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-500">
              {r.reaction_type === 'like' ? '👍' : '💬'} {r.sender_nickname}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
        {currentUser !== checkin.nickname ? (
          <>
            <button
              disabled={hasLiked}
              onClick={() => onReaction(checkin.checkin_id, "like")}
              className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${hasLiked ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 active:scale-95'}`}
            >
              👍 いいね {likes.length > 0 && likes.length}
            </button>
            <button
              disabled={hasTalked}
              onClick={() => onReaction(checkin.checkin_id, "talk")}
              className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${hasTalked ? 'bg-green-100 text-green-400' : 'bg-green-50 text-green-600 active:scale-95'}`}
            >
              💬 話したい {talks.length > 0 && talks.length}
            </button>
          </>
        ) : (
          <button onClick={() => onCheckout(checkin.checkin_id)} className="w-full h-10 bg-red-50 text-red-500 rounded-lg text-xs font-bold active:scale-95">チェックアウト</button>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        {comments.length > 0 && (
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.comment_id} className="bg-slate-50 rounded-lg px-3 py-2">
                <div className="text-[10px] font-bold text-slate-500">{comment.sender_nickname}</div>
                <p className="text-xs text-slate-700 mt-0.5 break-words">{comment.body}</p>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={(e) => onComment(e, checkin.checkin_id)} className="flex gap-2">
          <input
            value={commentValue}
            onChange={(e) => setCommentInputs(prev => ({ ...prev, [checkin.checkin_id]: e.target.value }))}
            className="flex-1 min-w-0 h-10 px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-primary"
            placeholder="応援コメントを書く"
            maxLength={300}
          />
          <button type="submit" className="w-16 h-10 bg-slate-900 text-white rounded-lg text-xs font-bold active:scale-95">送信</button>
        </form>
      </div>
    </div>
  );
}

function StoreMapView({ checkins }) {
  const [selectedSeat, setSelectedSeat] = useState(null);
  const activeCheckinsBySeat = checkins.reduce((acc, checkin) => {
    acc[normalizeSeatNumber(checkin.seat_number)] = checkin;
    return acc;
  }, {});
  const selectedCheckin = selectedSeat ? activeCheckinsBySeat[selectedSeat] : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6 font-['Plus_Jakarta_Sans']">
      <main className="max-w-[1180px] mx-auto space-y-4">
        <header className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">店舗 座席マップ</h1>
            <p className="text-sm text-slate-500 mt-1">座席番号をタップすると、その人が今日取り組んでいることを確認できます。</p>
          </div>
          <div className="flex gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary">{checkins.length}名が活動中</span>
            <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500">30秒ごとに更新</span>
          </div>
        </header>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 sm:p-5 overflow-x-auto">
          <div className="relative min-w-[980px] aspect-[16/9] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
            <div className="absolute inset-[3%] border-2 border-slate-300 rounded-sm" />
            <div className="absolute left-[4%] top-[6%] w-[31%] h-[28%] border border-slate-300 rounded-sm" />
            <div className="absolute left-[3%] top-[39%] w-[25%] h-[28%] border border-slate-300 rounded-sm" />
            <div className="absolute left-[4%] bottom-[5%] w-[37%] h-[17%] border border-slate-300 rounded-sm" />
            <div className="absolute left-[39%] top-[42%] w-[39%] h-[20%] border-t-2 border-l-2 border-r-2 border-slate-300" />
            <div className="absolute right-[4%] top-[45%] w-[18%] h-[29%] border-t-2 border-r-2 border-slate-300 rounded-sm" />
            <div className="absolute left-[43%] top-[12%] w-[50%] h-[22%] border border-slate-300 rounded-sm" />
            <div className="absolute left-[43%] top-[7%] text-[11px] font-bold text-slate-500">座席一覧</div>
            <div className="absolute left-[43%] top-[39%] right-[5%] border-t-4 border-slate-300" />
            <div className="absolute left-[51%] bottom-[10%] w-[17%] h-[13%] border border-slate-300 rounded-sm flex items-center justify-center text-xs font-bold text-slate-400">ドリンクサーバー</div>
            <div className="absolute left-[38%] bottom-[8%] w-[9%] h-[18%] border border-slate-300 rounded-sm flex items-center justify-center text-xs font-bold text-slate-400">STORAGE</div>
            <div className="absolute right-[9%] bottom-[9%] w-[8%] h-[18%] border border-slate-300 rounded-sm flex items-center justify-center text-xs font-bold text-slate-400">受付</div>
            <div className="absolute right-[2%] bottom-[4%] text-xs font-bold text-slate-400">ENTRANCE</div>
            <div className="absolute left-[29%] top-[50%] rotate-[-90deg] text-sm font-bold tracking-widest text-slate-400">WORKSHOP SPACE</div>

            {SEAT_LAYOUT.map(({ seat, x, y }) => {
              const checkin = activeCheckinsBySeat[seat];
              const isSelected = selectedSeat === seat;
              return (
                <button
                  key={seat}
                  onClick={() => setSelectedSeat(seat)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 text-sm font-bold shadow-sm transition-all ${
                    checkin
                      ? "bg-primary text-white border-primary shadow-primary/30"
                      : "bg-white text-slate-500 border-rose-200"
                  } ${isSelected ? "ring-4 ring-slate-900/20 scale-110" : "active:scale-95"}`}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  title={`${seat}${checkin ? ` ${checkin.nickname}` : ""}`}
                >
                  {seat}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 min-h-[150px]">
          {selectedSeat ? (
            selectedCheckin ? (
              <div className="flex gap-4">
                <img src={AVATAR_LIST[selectedCheckin.avatar_id] || AVATAR_LIST.cat} className="w-16 h-16 rounded-full shrink-0" alt="avatar" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">席 {selectedSeat}</span>
                    <h2 className="text-xl font-bold truncate">{selectedCheckin.nickname}</h2>
                  </div>
                  <p className="text-sm text-slate-500 mt-3">今日頑張ること</p>
                  <p className="text-lg font-bold text-slate-800 mt-1 break-words">{selectedCheckin.task_description}</p>
                  {(selectedCheckin.comments || []).length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedCheckin.comments.map((comment) => (
                        <span key={comment.comment_id} className="text-xs bg-slate-50 border border-slate-100 rounded-full px-3 py-1 text-slate-600">
                          {comment.sender_nickname}: {comment.body}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full inline-block">席 {selectedSeat}</div>
                <p className="text-slate-500 mt-3">この席は現在チェックインされていません。</p>
              </div>
            )
          ) : (
            <p className="text-slate-500">座席番号をタップすると詳細が表示されます。</p>
          )}
        </section>
      </main>
    </div>
  );
}

function LongTermView({
  currentUser,
  profiles,
  selectedProfile,
  isEditingProfile,
  profileForm,
  setSelectedProfile,
  setIsEditingProfile,
  setProfileForm,
  onProfileSave,
  onProfileDelete,
}) {
  const myProfile = profiles.find(p => p.nickname === currentUser);
  const shouldShowProfileForm = !myProfile || isEditingProfile;

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 whitespace-nowrap">中長期で頑張っていること</h2>
            <p className="text-sm text-slate-500 mt-1">今頑張っていることとほしいつながりを掲載できます。</p>
          </div>
          {myProfile && !isEditingProfile && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditingProfile(true)}
                className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-bold active:scale-95"
              >
                再入力する
              </button>
              <button
                onClick={onProfileDelete}
                className="h-9 px-3 rounded-lg bg-red-50 text-red-500 border border-red-100 text-xs font-bold active:scale-95"
              >
                消去
              </button>
            </div>
          )}
        </div>

        {shouldShowProfileForm ? (
          <form onSubmit={onProfileSave} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">今頑張っていること</label>
              <input
                value={profileForm.current_focus}
                onChange={(e) => setProfileForm(prev => ({ ...prev, current_focus: e.target.value }))}
                required
                maxLength={120}
                className="w-full h-[48px] px-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
                placeholder="例: SaaSの初期顧客ヒアリング"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">ほしいつながり</label>
              <input
                value={profileForm.desired_connections}
                onChange={(e) => setProfileForm(prev => ({ ...prev, desired_connections: e.target.value }))}
                required
                maxLength={120}
                className="w-full h-[48px] px-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
                placeholder="例: BtoB営業に詳しい人、デザイナー"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-2">プロフィール</label>
              <textarea
                value={profileForm.profile_text}
                onChange={(e) => setProfileForm(prev => ({ ...prev, profile_text: e.target.value }))}
                maxLength={800}
                className="w-full p-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
                placeholder="背景、相談したいこと、話しかけてほしいことなど"
                rows="4"
              />
            </div>
            <button type="submit" className="w-full h-12 bg-primary text-white font-bold rounded-lg shadow-md active:scale-95">
              掲載する
            </button>
          </form>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-sm text-slate-600">
            掲載済みです。内容を変える場合は右上の「再入力する」から編集できます。
          </div>
        )}
      </section>

      {selectedProfile && (
        <ProfileDetail profile={selectedProfile} onBack={() => setSelectedProfile(null)} />
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">掲載メンバー</h2>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{profiles.length}名</span>
        </div>
        <div className="grid gap-3">
          {profiles.map((profile) => (
            <button
              key={profile.profile_id}
              onClick={() => setSelectedProfile(profile)}
              className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm text-left active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{profile.nickname}</h3>
                  <p className="text-sm text-slate-700 mt-2 break-words">{profile.current_focus}</p>
                  <p className="text-xs text-primary font-bold mt-2 break-words">つながりたい: {profile.desired_connections}</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 shrink-0">chevron_right</span>
              </div>
            </button>
          ))}
          {profiles.length === 0 && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-sm text-slate-500">
              まだ掲載がありません。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ProfileDetail({ profile, onBack }) {
  return (
    <section className="bg-slate-900 text-white rounded-xl p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-primary mb-1">PROFILE</div>
          <h2 className="text-2xl font-bold break-words">{profile.nickname}</h2>
        </div>
        <button onClick={onBack} className="h-9 px-3 rounded-lg bg-white/10 text-xs font-bold">
          閉じる
        </button>
      </div>
      <div className="grid gap-3">
        <div className="bg-white/10 rounded-lg p-4">
          <div className="text-xs font-bold text-slate-300">今頑張っていること</div>
          <p className="text-sm mt-2 break-words">{profile.current_focus}</p>
        </div>
        <div className="bg-white/10 rounded-lg p-4">
          <div className="text-xs font-bold text-slate-300">ほしいつながり</div>
          <p className="text-sm mt-2 break-words">{profile.desired_connections}</p>
        </div>
        {profile.profile_text && (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="text-xs font-bold text-slate-300">プロフィール</div>
            <p className="text-sm mt-2 leading-6 whitespace-pre-wrap break-words">{profile.profile_text}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default App;
