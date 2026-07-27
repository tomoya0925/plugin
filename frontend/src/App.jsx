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
  { seat: "01", x: 92, y: 69 }, { seat: "02", x: 92, y: 59 },
  { seat: "03", x: 84, y: 52 }, { seat: "04", x: 78, y: 52 },
  { seat: "05", x: 69, y: 46 }, { seat: "06", x: 69, y: 56 },
  { seat: "07", x: 63, y: 56 }, { seat: "08", x: 63, y: 46 },
  { seat: "09", x: 56, y: 46 }, { seat: "10", x: 56, y: 56 },
  { seat: "11", x: 50, y: 56 }, { seat: "12", x: 50, y: 46 },
  { seat: "13", x: 43, y: 46 }, { seat: "14", x: 43, y: 56 },
  { seat: "15", x: 37, y: 56 }, { seat: "16", x: 37, y: 46 },
  { seat: "17", x: 23, y: 10 }, { seat: "18", x: 23, y: 18 },
  { seat: "19", x: 23, y: 26 }, { seat: "20", x: 14, y: 26 },
  { seat: "21", x: 14, y: 18 }, { seat: "22", x: 14, y: 10 },
  { seat: "23", x: 23, y: 42 }, { seat: "24", x: 23, y: 51 },
  { seat: "25", x: 23, y: 60 }, { seat: "26", x: 14, y: 60 },
  { seat: "27", x: 14, y: 51 }, { seat: "28", x: 14, y: 42 },
  { seat: "29", x: 36, y: 82 }, { seat: "30", x: 31, y: 82 },
  { seat: "31", x: 31, y: 91 }, { seat: "32", x: 36, y: 91 },
  { seat: "33", x: 23, y: 82 }, { seat: "34", x: 23, y: 91 },
  { seat: "35", x: 13, y: 82 }, { seat: "36", x: 8, y: 82 },
  { seat: "37", x: 13, y: 91 }, { seat: "38", x: 8, y: 91 },
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
  const [jobInfos, setJobInfos] = useState([]);
  const [activeTab, setActiveTab] = useState("today");
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isJobFormOpen, setIsJobFormOpen] = useState(false);
  const [avatarId, setAvatarId] = useState("cat");
  const [seat, setSeat] = useState("");
  const [task, setTask] = useState("");
  const [commentInputs, setCommentInputs] = useState({});
  const [profileForm, setProfileForm] = useState({
    current_focus: "",
    desired_connections: "",
    profile_text: "",
  });
  const [jobForm, setJobForm] = useState({
    company_name: "",
    role: "",
    selection_type: "本選考",
    start_period: "",
    end_period: "",
    selection_features: "",
    company_impression: "",
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

  const fetchJobInfos = useCallback(() => {
    fetch(`${API_BASE_URL}/job-infos/`)
      .then(res => res.json())
      .then(data => setJobInfos(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    fetchCheckins();
    if (!isStoreMapView) {
      fetchProfiles();
      fetchJobInfos();
    }
    const timer = setInterval(fetchCheckins, 30000);
    return () => clearInterval(timer);
  }, [fetchCheckins, fetchProfiles, fetchJobInfos, isStoreMapView]);

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

  const handleJobInfoSave = (e) => {
    e.preventDefault();
    fetch(`${API_BASE_URL}/job-infos/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitter_nickname: currentUser,
        ...jobForm,
      }),
    })
      .then(res => res.json())
      .then(savedJobInfo => {
        setJobInfos(prev => [savedJobInfo, ...prev]);
        setJobForm({
          company_name: "",
          role: "",
          selection_type: "本選考",
          start_period: "",
          end_period: "",
          selection_features: "",
          company_impression: "",
        });
        setIsJobFormOpen(false);
      });
  };

  const handleJobInfoDelete = (jobInfo) => {
    const isOwner = jobInfo.submitter_nickname === currentUser;
    let adminKey = "";
    if (!isOwner) {
      adminKey = window.prompt("管理用キーを入力してください") || "";
      if (!adminKey) return;
    }
    if (!window.confirm("この就活情報を削除しますか？")) return;

    const params = new URLSearchParams({ requester_nickname: currentUser });
    if (adminKey) params.set("admin_key", adminKey);

    fetch(`${API_BASE_URL}/job-infos/${jobInfo.job_info_id}?${params.toString()}`, {
      method: "DELETE",
    })
      .then(res => {
        if (!res.ok) throw new Error("delete failed");
        setJobInfos(prev => prev.filter(info => info.job_info_id !== jobInfo.job_info_id));
      })
      .catch(() => window.alert("削除できませんでした"));
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
        <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setActiveTab("today")} className={`h-10 rounded-lg text-sm font-bold ${activeTab === "today" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            今日
          </button>
          <button onClick={() => setActiveTab("longTerm")} className={`h-10 rounded-lg text-sm font-bold ${activeTab === "longTerm" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            中長期
          </button>
          <button onClick={() => setActiveTab("jobInfo")} className={`h-10 rounded-lg text-sm font-bold ${activeTab === "jobInfo" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
            就活情報
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
        ) : activeTab === "longTerm" ? (
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
        ) : (
          <JobInfoView
            jobInfos={jobInfos}
            jobForm={jobForm}
            isJobFormOpen={isJobFormOpen}
            setJobForm={setJobForm}
            setIsJobFormOpen={setIsJobFormOpen}
            onJobInfoSave={handleJobInfoSave}
            onJobInfoDelete={handleJobInfoDelete}
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
  const [communicators, setCommunicators] = useState(() => {
    const savedList = localStorage.getItem("venture_store_communicators");
    const oldSavedName = localStorage.getItem("venture_store_communicator");
    if (savedList) {
      try {
        const parsedList = JSON.parse(savedList);
        if (Array.isArray(parsedList) && parsedList.length > 0) return parsedList;
      } catch {
        return [oldSavedName || ""];
      }
    }
    return [oldSavedName || ""];
  });
  const activeCheckinsBySeat = checkins.reduce((acc, checkin) => {
    acc[normalizeSeatNumber(checkin.seat_number)] = checkin;
    return acc;
  }, {});
  const selectedCheckin = selectedSeat ? activeCheckinsBySeat[selectedSeat] : null;

  const saveCommunicators = (nextCommunicators) => {
    setCommunicators(nextCommunicators);
    localStorage.setItem("venture_store_communicators", JSON.stringify(nextCommunicators));
  };

  const handleCommunicatorChange = (index, value) => {
    const nextCommunicators = communicators.map((name, currentIndex) => (
      currentIndex === index ? value : name
    ));
    saveCommunicators(nextCommunicators);
  };

  const addCommunicator = () => {
    saveCommunicators([...communicators, ""]);
  };

  const removeCommunicator = (index) => {
    const nextCommunicators = communicators.filter((_, currentIndex) => currentIndex !== index);
    saveCommunicators(nextCommunicators.length > 0 ? nextCommunicators : [""]);
  };

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
            <div className="absolute right-[6%] top-[6%] w-[28%] bg-white border border-slate-200 rounded-lg shadow-sm p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-[11px] font-bold text-slate-500">今日のコミュニケーター</label>
                <button
                  onClick={addCommunicator}
                  className="h-7 px-2 rounded-md bg-slate-900 text-white text-[11px] font-bold active:scale-95"
                >
                  追加
                </button>
              </div>
              <div className="space-y-1.5">
                {communicators.map((name, index) => (
                  <div key={index} className="flex gap-1.5">
                    <input
                      value={name}
                      onChange={(e) => handleCommunicatorChange(index, e.target.value)}
                      className="min-w-0 flex-1 h-8 px-2 rounded-md border border-slate-200 text-sm font-bold outline-none focus:border-primary"
                      placeholder={`名前 ${index + 1}`}
                    />
                    {communicators.length > 1 && (
                      <button
                        onClick={() => removeCommunicator(index)}
                        className="w-8 h-8 rounded-md bg-red-50 text-red-500 border border-red-100 text-[11px] font-bold active:scale-95"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <a
                href="https://canva.link/anzwwd3v1m3lmbf"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center h-9 rounded-md bg-primary text-white text-xs font-bold active:scale-95"
              >
                Canvaを開く
              </a>
            </div>

            <div className="absolute left-[43%] top-[66%] w-[35%] min-h-[132px] bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              {selectedSeat ? (
                selectedCheckin ? (
                  <div className="flex gap-3">
                    <img src={AVATAR_LIST[selectedCheckin.avatar_id] || AVATAR_LIST.cat} className="w-12 h-12 rounded-full shrink-0" alt="avatar" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">席 {selectedSeat}</span>
                        <h2 className="text-lg font-bold truncate">{selectedCheckin.nickname}</h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">今日頑張ること</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 break-words">{selectedCheckin.task_description}</p>
                      {(selectedCheckin.comments || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {selectedCheckin.comments.slice(0, 3).map((comment) => (
                            <span key={comment.comment_id} className="text-[10px] bg-slate-50 border border-slate-100 rounded-full px-2 py-1 text-slate-600">
                              {comment.sender_nickname}: {comment.body}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-[11px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full inline-block">席 {selectedSeat}</div>
                    <p className="text-sm text-slate-500 mt-3">この席は現在チェックインされていません。</p>
                  </div>
                )
              ) : (
                <p className="text-sm text-slate-500">座席番号をタップすると詳細が表示されます。</p>
              )}
            </div>

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

function JobInfoView({
  jobInfos,
  jobForm,
  isJobFormOpen,
  setJobForm,
  setIsJobFormOpen,
  onJobInfoSave,
  onJobInfoDelete,
}) {
  return (
    <div className="space-y-6">
      <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">就活情報</h2>
            <p className="text-sm text-slate-500 mt-1">クルーが受けた企業や選考の情報を共有できます。</p>
          </div>
          <button
            onClick={() => setIsJobFormOpen(prev => !prev)}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-bold shrink-0 active:scale-95"
          >
            {isJobFormOpen ? "閉じる" : "登録する"}
          </button>
        </div>

        {isJobFormOpen && (
          <form onSubmit={onJobInfoSave} className="space-y-4 pt-2">
            <input
              value={jobForm.company_name}
              onChange={(e) => setJobForm(prev => ({ ...prev, company_name: e.target.value }))}
              required
              maxLength={120}
              className="w-full h-[48px] px-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
              placeholder="企業名"
            />
            <input
              value={jobForm.role}
              onChange={(e) => setJobForm(prev => ({ ...prev, role: e.target.value }))}
              required
              maxLength={120}
              className="w-full h-[48px] px-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
              placeholder="受けた職種"
            />
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
              {["本選考", "インターン"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setJobForm(prev => ({ ...prev, selection_type: type }))}
                  className={`h-10 rounded-md text-sm font-bold ${jobForm.selection_type === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                >
                  {type}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={jobForm.start_period}
                onChange={(e) => setJobForm(prev => ({ ...prev, start_period: e.target.value }))}
                required
                maxLength={50}
                className="w-full h-[48px] px-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
                placeholder="開始時期"
              />
              <input
                value={jobForm.end_period}
                onChange={(e) => setJobForm(prev => ({ ...prev, end_period: e.target.value }))}
                required
                maxLength={50}
                className="w-full h-[48px] px-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
                placeholder="終了時期"
              />
            </div>
            <textarea
              value={jobForm.selection_features}
              onChange={(e) => setJobForm(prev => ({ ...prev, selection_features: e.target.value }))}
              required
              maxLength={1000}
              className="w-full p-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
              placeholder="選考の特徴"
              rows="4"
            />
            <textarea
              value={jobForm.company_impression}
              onChange={(e) => setJobForm(prev => ({ ...prev, company_impression: e.target.value }))}
              required
              maxLength={1000}
              className="w-full p-4 rounded-lg border border-slate-200 outline-none focus:border-primary"
              placeholder="選考やインターンを通じて感じたその企業の特徴"
              rows="4"
            />
            <button type="submit" className="w-full h-12 bg-slate-900 text-white font-bold rounded-lg shadow-md active:scale-95">
              投稿する
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">企業情報一覧</h2>
          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{jobInfos.length}件</span>
        </div>
        <div className="space-y-4">
          {jobInfos.map((jobInfo) => (
            <article key={jobInfo.job_info_id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-[11px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">{jobInfo.selection_type}</span>
                    <span className="text-[11px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{jobInfo.start_period}〜{jobInfo.end_period}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-2 break-words">{jobInfo.company_name}</h3>
                  <p className="text-sm text-slate-600 mt-1 break-words">{jobInfo.role}</p>
                </div>
                <button
                  onClick={() => onJobInfoDelete(jobInfo)}
                  className="h-8 px-3 rounded-lg bg-red-50 text-red-500 border border-red-100 text-xs font-bold shrink-0 active:scale-95"
                >
                  削除
                </button>
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs font-bold text-slate-500">選考の特徴</div>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{jobInfo.selection_features}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs font-bold text-slate-500">企業の特徴</div>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap break-words">{jobInfo.company_impression}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-bold">投稿者: {jobInfo.submitter_nickname}</p>
            </article>
          ))}
          {jobInfos.length === 0 && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 text-center text-sm text-slate-500">
              まだ就活情報がありません。
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
