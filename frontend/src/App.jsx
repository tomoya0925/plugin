import { useState, useEffect } from 'react'

function App() {
  const [checkins, setCheckins] = useState([]);
  const [seat, setSeat] = useState("");
  const [task, setTask] = useState("");

  // 画面が開いた時に、バックエンドからデータを取得する処理
  useEffect(() => {
    fetch("http://127.0.0.1:8000/checkins/")
      .then(res => res.json())
      .then(data => setCheckins(data));
  }, []);

  // チェックインボタンを押した時の処理
  const handleCheckin = (e) => {
    e.preventDefault();
    const newCheckin = {
      user_id: 1, // 今回はテスト用にユーザーIDを「1」で固定
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
      // 成功したら、画面の一覧に新しいデータを追加して入力欄を空にする
      setCheckins([...checkins, data]);
      setSeat("");
      setTask("");
    });
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>venture platform・チェックイン</h1>

      {/* 入力フォーム */}
      <form onSubmit={handleCheckin} style={{ marginBottom: "30px" }}>
        <input 
          value={seat} 
          onChange={(e) => setSeat(e.target.value)} 
          placeholder="座席番号 (例: A-1)" 
          required 
          style={{ marginRight: "10px", padding: "5px" }}
        />
        <input 
          value={task} 
          onChange={(e) => setTask(e.target.value)} 
          placeholder="今日頑張ること" 
          required 
          style={{ marginRight: "10px", padding: "5px", width: "200px" }}
        />
        <button type="submit" style={{ padding: "5px 10px" }}>チェックイン！</button>
      </form>

      {/* タイムライン（一覧表示） */}
      <h2>本日のタイムライン</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {checkins.map((checkin) => (
          <li key={checkin.checkin_id} style={{ borderBottom: "1px solid #ccc", padding: "10px 0" }}>
            <strong>座席 {checkin.seat_number}</strong>: {checkin.task_description}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App