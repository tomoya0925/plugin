import { useState, useEffect } from 'react';

function App() {
  // --- ロジック部分（前回作成したもの） ---
  const [checkins, setCheckins] = useState([]);
  const [seat, setSeat] = useState("");
  const [task, setTask] = useState("");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/checkins/")
      .then(res => res.json())
      .then(data => setCheckins(data));
  }, []);

  const handleCheckin = (e) => {
    e.preventDefault();
    const newCheckin = {
      user_id: 1, // 現在はテスト用ID
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

  // --- UI部分（StitchのデザインをReact化） ---
  return (
    <div className="bg-background text-on-surface min-h-screen font-['Plus_Jakarta_Sans'] pb-24">
      {/* ヘッダー */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl">rocket_launch</span>
          <h1 className="font-bold text-slate-900 text-lg tracking-tighter">venture platform</h1>
        </div>
      </header>

      <main className="pt-24 px-container-padding max-w-[600px] mx-auto space-y-stack-lg">
        
        {/* チェックインセクション */}
        <section className="bg-surface rounded-xl p-6 border border-slate-200 shadow-sm space-y-stack-md">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">location_on</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">チェックイン</h2>
          </div>

          {/* フォームに onSubmit を追加 */}
          <form onSubmit={handleCheckin} className="space-y-4">
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

        {/* タイムラインセクション */}
        <section className="space-y-stack-md">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <span className="material-symbols-outlined text-accent-blue">schedule</span>
              本日のタイムライン
            </h2>
            <span className="text-xs font-bold text-accent-blue px-2 py-1 bg-accent-blue/10 rounded-full">{checkins.length}名が活動中</span>
          </div>

          <div className="space-y-4">
            {/* データベースの情報を元にカードをループして生成 */}
            {checkins.map((checkin) => (
              <div key={checkin.checkin_id} className="bg-surface rounded-xl p-4 border border-slate-200 shadow-sm transition-all hover:border-accent-blue/50">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      {/* TODO: 後でユーザーIDから名前を引っ張るように修正します */}
                      <h3 className="font-bold text-sm text-slate-900">ユーザー {checkin.user_id}</h3>
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200">
                        {checkin.seat_number}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                      {checkin.task_description}
                    </p>
                  </div>
                </div>
                
                {/* リアクションボタン */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100">
                  <button className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-slate-50 text-slate-500 text-xs font-semibold hover:text-slate-900 hover:bg-slate-100 transition-all">
                    <span className="material-symbols-outlined text-[18px]">thumb_up</span>いいね
                  </button>
                  <button className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg bg-accent-lime/10 text-accent-lime text-xs font-bold hover:bg-accent-lime/20 transition-all">
                    <span className="material-symbols-outlined text-[18px]">forum</span>話してみたい
                  </button>
                </div>
              </div>
            ))}
            
            {/* チェックインが0件の時の表示 */}
            {checkins.length === 0 && (
              <p className="text-center text-slate-500 py-8">まだ誰もチェックインしていません。最初のチェックインをしましょう！</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;