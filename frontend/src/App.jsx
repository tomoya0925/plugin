import { useState, useEffect } from 'react';

const AVATAR_LIST = {
  "cat": "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0",
  "dog": "https://api.dicebear.com/7.x/notionists/svg?seed=Bella&backgroundColor=e2e8f0",
  "robot": "https://api.dicebear.com/7.x/bottts/svg?seed=Robo&backgroundColor=e2e8f0",
  "human1": "https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=e2e8f0",
  "human2": "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=e2e8f0",
};

// ベースURLを変数にしておくと修正が楽でミスも減ります
const API_BASE_URL = "https://venture-platform-backend.onrender.com";

function App() {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("venture_currentUser") || "");
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [checkins, setCheckins] = useState([]);
  const [avatarId, setAvatarId] = useState("cat"); 
  const [seat, setSeat] = useState("");
  const [task, setTask] = useState("");

  useEffect(() => {
    // 修正：末尾に /checkins/ を追加
    fetch(`${API_BASE_URL}/checkins/`)
      .then(res => res.json())
      .then(data => setCheckins(data));
  }, []);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    const trimmedInput = loginInput.trim();
    if (!trimmedInput) return;

    const isDuplicate = checkins.some(checkin => checkin.nickname === trimmedInput);
    if (isDuplicate) {
      setLoginError("その名前は使用できません。別の名前を入力してください。");
      return;
    }

    setLoginError("");
    setCurrentUser(trimmedInput);
    localStorage.setItem("venture_currentUser", trimmedInput);
  };

  const handleLogout = () => {
    setCurrentUser("");
    localStorage.removeItem("venture_currentUser");
    setLoginInput("");
    setLoginError("");
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

    // 修正：URLの末尾に / を追加
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

    // 修正：URLの繋ぎ目を修正 (/checkins/ID)
    fetch(`${API_BASE_URL}/checkins/${checkin_id}`, {
      method: "DELETE",
    })
    .then(() => {
      setCheckins(checkins.filter(c => c.checkin_id !== checkin_id));
    });
  };

  const handleReaction = (checkin_id, type) => {
    // 修正：URLの繋ぎ目を修正
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
      setCheckins(checkins.map(checkin => {
        if (checkin.checkin_id === checkin_id) {
          return {
            ...checkin,
            reactions: [...(checkin.reactions || []), newReaction]
          };
        }
        return checkin;
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
          <p className="text-slate-500 text-sm">コワーキングスペースへようこそ。</p>
          
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <input 
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              required
              className="w-full h-[48px] px-4 rounded-lg bg-slate-50 border border-slate-200 outline-none text-center font-bold text-lg"
              placeholder="ニックネーム" 
              type="text"
            />
            {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
            <button 
              type="submit" 
              className="w-full h-12 bg-primary text-white font-bold rounded-lg shadow-md active:scale-95 transition-all"
            >
              はじめる
            </button>
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
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-600">{currentUser} さん</span>
          <button onClick={handleLogout} className="text-xs text-slate-400 underline">名前変更</button>
        </div>
      </header>

      <main className="pt-24 px-4 max-w-[600px] mx-auto space-y-8">
        <section className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">チェックイン</h2>
          </div>

          <form onSubmit={handleCheckin} className="space-y-4">
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

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">座席番号</label>
              <input 
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
                required
                className="w-full h-[48px] px-4 rounded-lg border border-slate-200 outline-none" 
                placeholder="例: A-12" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">今日頑張ること</label>
              <textarea 
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required
                className="w-full p-4 rounded-lg border border-slate-200 outline-none resize-none" 
                placeholder="目標を入力..." 
                rows="3"
              />
            </div>
            
            {/* 🌟 修正ポイント：スマホでも確実に反応するように active:scale を追加 */}
            <button 
              type="submit" 
              className="w-full h-12 bg-primary text-white font-bold rounded-lg shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              チェックイン
            </button>
          </form>
        </section>

        {/* タイムライン部分（変更なし、URL修正により動くようになります） */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">タイムライン</h2>
            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">{checkins.length}名が活動中</span>
          </div>
          <div className="space-y-4">
            {checkins.map((checkin) => {
              const likes = (checkin.reactions || []).filter(r => r.reaction_type === "like");
              const talks = (checkin.reactions || []).filter(r => r.reaction_type === "talk");
              return (
                <div key={checkin.checkin_id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex gap-4">
                    <img src={AVATAR_LIST[checkin.avatar_id] || AVATAR_LIST["cat"]} className="w-12 h-12 rounded-full shrink-0" alt="avatar" />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-sm">{checkin.nickname}</h3>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full">{checkin.seat_number}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{checkin.task_description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-slate-100">
                    {currentUser !== checkin.nickname ? (
                      <>
                        <button onClick={() => handleReaction(checkin.checkin_id, "like")} className="flex-1 h-10 bg-slate-50 rounded-lg text-xs font-bold active:scale-95 transition-all">👍 いいね</button>
                        <button onClick={() => handleReaction(checkin.checkin_id, "talk")} className="flex-1 h-10 bg-green-50 text-green-600 rounded-lg text-xs font-bold active:scale-95 transition-all">💬 話したい</button>
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