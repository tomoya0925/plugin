import { useState, useEffect } from 'react';

const AVATAR_LIST = {
  "cat": "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=e2e8f0",
  "dog": "https://api.dicebear.com/7.x/notionists/svg?seed=Bella&backgroundColor=e2e8f0",
  "robot": "https://api.dicebear.com/7.x/bottts/svg?seed=Robo&backgroundColor=e2e8f0",
  "human1": "https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=e2e8f0",
  "human2": "https://api.dicebear.com/7.x/adventurer/svg?seed=Jack&backgroundColor=e2e8f0",
};

function App() {
  const [currentUser, setCurrentUser] = useState(localStorage.getItem("venture_currentUser") || "");
  const [loginInput, setLoginInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const [checkins, setCheckins] = useState([]);
  const [avatarId, setAvatarId] = useState("cat"); 
  const [seat, setSeat] = useState("");
  const [task, setTask] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/checkins/")
      .then(res => res.json())
      .then(data => setCheckins(data));
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    const trimmedInput = loginInput.trim();
    if (!trimmedInput) return;

    const isDuplicate = checkins.some(checkin => checkin.nickname === trimmedInput);
    if (isDuplicate) {
      setLoginError("その名前は現在チェックイン中のため使用できません。別の名前を入力してください。");
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
    e.preventDefault();
    const newCheckin = {
      user_id: 1, 
      nickname: currentUser, 
      avatar_id: avatarId, 
      seat_number: seat,
      task_description: task
    };

    fetch("http://127.0.0.1:8000/checkins/", {
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

    fetch(`http://127.0.0.1:8000/checkins/${checkin_id}`, {
      method: "DELETE",
    })
    .then(() => {
      setCheckins(checkins.filter(c => c.checkin_id !== checkin_id));
    });
  };

  // 🌟【新設】リアクションを送信する処理
  const handleReaction = (checkin_id, type) => {
    fetch(`http://127.0.0.1:8000/checkins/${checkin_id}/reactions/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_nickname: currentUser,
        reaction_type: type
      })
    })
    .then(res => res.json())
    .then(newReaction => {
      // 送信成功したら、画面上のリストも更新する
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
          <p className="text-slate-500 text-sm">コワーキングスペースへようこそ。<br/>まずはあなたのニックネームを教えてください。</p>
          
          <form onSubmit={handleLogin} className="space-y-4 pt-4">
            <input 
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              required
              className="w-full h-[48px] px-4 rounded-lg bg-slate-50 border border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-center font-bold text-lg"
              placeholder="ニックネーム" 
              type="text"
            />
            {loginError && (
              <p className="text-red-500 text-xs font-bold bg-red-50 p-2 rounded border border-red-200 text-left">
                <span className="material-symbols-outlined align-middle text-[16px] mr-1">error</span>
                {loginError}
              </p>
            )}
            <button type="submit" className="w-full h-12 bg-primary text-white font-bold rounded-lg shadow-md hover:opacity-90 transition-all">
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
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-slate-600 underline">
            名前変更
          </button>
        </div>
      </header>

      <main className="pt-24 px-container-padding max-w-[600px] mx-auto space-y-stack-lg">
        <section className="bg-surface rounded-xl p-6 border border-slate-200 shadow-sm space-y-stack-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">location_on</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">チェックイン</h2>
          </div>

          <form onSubmit={handleCheckin} className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">アバターを選択</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {Object.entries(AVATAR_LIST).map(([id, url]) => (
                    <img 
                      key={id}
                      src={url}
                      alt={id}
                      onClick={() => setAvatarId(id)}
                      className={`w-12 h-12 rounded-full cursor-pointer transition-all border-2 ${avatarId === id ? 'border-primary scale-110 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">座席番号</label>
              <input 
                value={seat}
                onChange={(e) => setSeat(e.target.value)}
                required
                className="w-full h-[48px] px-4 rounded-lg bg-surface-variant border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface" 
                placeholder="例: A-12" 
                type="text"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">今日頑張ること</label>
              <textarea 
                value={task}
                onChange={(e) => setTask(e.target.value)}
                required
                className="w-full p-4 rounded-lg bg-surface-variant border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-on-surface resize-none" 
                placeholder="今日の目標を入力してください..." 
                rows="3"
              />
            </div>
            <button type="submit" className="w-full h-12 bg-primary text-white font-bold text-sm rounded-lg shadow-md shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[20px]">login</span>
              チェックイン
            </button>
          </form>
        </section>

        <section className="space-y-stack-md">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <span className="material-symbols-outlined text-accent-blue">schedule</span>
              本日のタイムライン
            </h2>
            <span className="text-xs font-bold text-accent-blue px-2 py-1 bg-accent-blue/10 rounded-full">{checkins.length}名が活動中</span>
          </div>

          <div className="space-y-4">
            {checkins.map((checkin) => {
              // 🌟【新設】リアクションを種類ごとに仕分ける
              const likes = (checkin.reactions || []).filter(r => r.reaction_type === "like");
              const talks = (checkin.reactions || []).filter(r => r.reaction_type === "talk");

              return (
                <div key={checkin.checkin_id} className="bg-surface rounded-xl p-4 border border-slate-200 shadow-sm transition-all hover:border-accent-blue/50">
                  <div className="flex gap-4">
                    <img 
                      src={AVATAR_LIST[checkin.avatar_id] || AVATAR_LIST["cat"]} 
                      alt="avatar" 
                      className="w-12 h-12 rounded-full border border-slate-200 shadow-sm shrink-0"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-slate-900">{checkin.nickname}</h3>
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">
                          {checkin.seat_number}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {checkin.task_description}
                      </p>

                      {/* 🌟【新設】届いたリアクションの表示エリア */}
                      {(likes.length > 0 || talks.length > 0) && (
                        <div className="mt-2 space-y-1">
                          {likes.length > 0 && (
                            <p className="text-xs text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded border border-slate-100">
                              👍 <span className="font-bold">{likes.map(l => l.sender_nickname).join("、")}</span> さんがいいねしました
                            </p>
                          )}
                          {talks.length > 0 && (
                            <p className="text-xs text-accent-lime bg-accent-lime/5 inline-block px-2 py-1 rounded border border-accent-lime/20 mt-1">
                              💬 <span className="font-bold">{talks.map(t => t.sender_nickname).join("、")}</span> さんが話してみたがっています
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* アクションボタン群 */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                    {/* 🌟 変更: 自分の投稿にはリアクションできないようにする（SNSの標準仕様） */}
                    {currentUser !== checkin.nickname && (
                      <>
                        <button 
                          onClick={() => handleReaction(checkin.checkin_id, "like")}
                          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-slate-50 text-slate-500 text-xs font-semibold hover:text-slate-900 hover:bg-slate-100 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">thumb_up</span>いいね
                        </button>
                        <button 
                          onClick={() => handleReaction(checkin.checkin_id, "talk")}
                          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-accent-lime/10 text-accent-lime text-xs font-bold hover:bg-accent-lime/20 transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">forum</span>話してみたい
                        </button>
                      </>
                    )}

                    {currentUser === checkin.nickname && (
                      <button 
                        onClick={() => handleCheckout(checkin.checkin_id)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all ml-auto"
                        title="チェックアウト"
                      >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                      </button>
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