import { useState, useEffect } from 'react';

const AVATAR_LIST = {
  // 動物・ロボット系
  "cat": "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0",
  "dog": "https://api.dicebear.com/7.x/notionists/svg?seed=Bella&backgroundColor=e2e8f0",
  "robot1": "https://api.dicebear.com/7.x/bottts/svg?seed=Robo1&backgroundColor=e2e8f0",
  "robot2": "https://api.dicebear.com/7.x/bottts/svg?seed=Robo2&backgroundColor=e2e8f0",
  
  // 人物系 (Notion風)
  "human1": "https://api.dicebear.com/7.x/notionists/svg?seed=Mimi&backgroundColor=e2e8f0",
  "human2": "https://api.dicebear.com/7.x/notionists/svg?seed=Jack&backgroundColor=e2e8f0",
  "human3": "https://api.dicebear.com/7.x/notionists/svg?seed=Sasha&backgroundColor=e2e8f0",
  "human4": "https://api.dicebear.com/7.x/notionists/svg?seed=Leo&backgroundColor=e2e8f0",
  
  // 冒険者・ポップ系 (Adventurer)
  "adv1": "https://api.dicebear.com/7.x/adventurer/svg?seed=Bear&backgroundColor=e2e8f0",
  "adv2": "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=e2e8f0",
  "adv3": "https://api.dicebear.com/7.x/adventurer/svg?seed=Oliver&backgroundColor=e2e8f0",
  
  // おしゃれ・アート系 (Lorelei)
  "art1": "https://api.dicebear.com/7.x/lorelei/svg?seed=Aria&backgroundColor=e2e8f0",
  "art2": "https://api.dicebear.com/7.x/lorelei/svg?seed=Zane&backgroundColor=e2e8f0",
  "art3": "https://api.dicebear.com/7.x/lorelei/svg?seed=Maya&backgroundColor=e2e8f0",
  "art4": "https://api.dicebear.com/7.x/lorelei/svg?seed=Ken&backgroundColor=e2e8f0",
};

const API_BASE_URL = "https://venture-platform-backend.onrender.com";

function App() {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("venture_currentUser") || "");
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [checkins, setCheckins] = useState([]);
  const [avatarId, setAvatarId] = useState("cat"); 
  const [seat, setSeat] = useState("");
  const [task, setTask] = useState("");

  const myCheckin = checkins.find(c => c.nickname === currentUser);

  useEffect(() => {
    const fetchCheckins = () => {
      fetch(`${API_BASE_URL}/checkins/`)
        .then(res => res.json())
        .then(data => setCheckins(data));
    };
    fetchCheckins();
    const timer = setInterval(fetchCheckins, 30000);
    return () => clearInterval(timer);
  }, []);

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
      task_description: task
    };

    fetch(`${API_BASE_URL}/checkins/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCheckin)
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
    .then(() => {
      setCheckins(checkins.filter(c => c.checkin_id !== checkin_id));
    });
  };

  const handleReaction = (checkin_id, type) => {
    fetch(`${API_BASE_URL}/checkins/${checkin_id}/reactions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_nickname: currentUser,
        reaction_type: type
      })
    })
    .then(res => res.json())
    .then(newReaction => {
      setCheckins(prev => prev.map(c => {
        if (c.checkin_id === checkin_id) {
          return { ...c, reactions: [...(c.reactions || []), newReaction] };
        }
        return c;
      }));
    });
  };

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
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
          <h1 className="font-bold text-slate-900 text-lg tracking-tighter">venture platform</h1>
        </div>
        <div className="text-sm font-bold text-slate-600">{currentUser} さん</div>
      </header>

      <main className="pt-24 px-4 max-w-[600px] mx-auto space-y-8">
        {!myCheckin ? (
          <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">チェックイン</h2>
            <form onSubmit={handleCheckin} className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">アバターを選択</label>
                <div className="flex gap-2 overflow-x-auto">
                  {Object.entries(AVATAR_LIST).map(([id, url]) => (
                    <img key={id} src={url} alt={id} onClick={() => setAvatarId(id)}
                      className={`w-12 h-12 rounded-full cursor-pointer transition-all border-2 ${avatarId === id ? 'border-primary scale-110 shadow-md' : 'border-transparent opacity-50'}`}
                    />
                  ))}
                </div>
              </div>
              <input value={seat} onChange={(e) => setSeat(e.target.value)} required className="w-full h-[48px] px-4 rounded-lg border border-slate-200" placeholder="座席番号 (例: A-12)" />
              <textarea value={task} onChange={(e) => setTask(e.target.value)} required className="w-full p-4 rounded-lg border border-slate-200" placeholder="目標を入力..." rows="3" />
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
            {checkins.map((checkin) => {
              const reactions = checkin.reactions || [];
              const likes = reactions.filter(r => r.reaction_type === "like");
              const talks = reactions.filter(r => r.reaction_type === "talk");
              
              const hasLiked = likes.some(r => r.sender_nickname === currentUser);
              const hasTalked = talks.some(r => r.sender_nickname === currentUser);

              return (
                <div key={checkin.checkin_id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex gap-4">
                    <img src={AVATAR_LIST[checkin.avatar_id] || AVATAR_LIST["cat"]} className="w-12 h-12 rounded-full shrink-0" alt="avatar" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm">{checkin.nickname}</h3>
                        {/* 🌟 修正ポイント: 時間経過ではなく「座席番号」を表示 */}
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                          {checkin.seat_number}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{checkin.task_description}</p>
                    </div>
                  </div>

                  {reactions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reactions.map((r, idx) => (
                        <div key={idx} className="text-[9px] bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-500">
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
                          onClick={() => handleReaction(checkin.checkin_id, "like")} 
                          className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${hasLiked ? 'bg-slate-100 text-slate-400' : 'bg-slate-50 active:scale-95'}`}
                        >
                          👍 いいね {likes.length > 0 && likes.length}
                        </button>
                        <button 
                          disabled={hasTalked}
                          onClick={() => handleReaction(checkin.checkin_id, "talk")} 
                          className={`flex-1 h-10 rounded-lg text-xs font-bold transition-all ${hasTalked ? 'bg-green-100 text-green-400' : 'bg-green-50 text-green-600 active:scale-95'}`}
                        >
                          💬 話したい {talks.length > 0 && talks.length}
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleCheckout(checkin.checkin_id)} className="w-full h-10 bg-red-50 text-red-500 rounded-lg text-xs font-bold active:scale-95">チェックアウト</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;