const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Vercelのポートを使用

// メモリ上のデータストア
let records = [];
let config = { password: 'password' }; // 初期パスワード

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // HTTPSでない場合はfalse
}));

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));

// ログイン状態をチェックするミドルウェア
const checkAuth = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// API Routes
// ログイン
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === config.password) {
    req.session.loggedIn = true;
    res.status(200).send('Login successful');
  } else {
    res.status(401).send('Invalid password');
  }
});

// ログアウト
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.status(200).send('Logout successful');
});

// データの取得
app.get('/api/records', checkAuth, (req, res) => {
  res.json(records);
});

// データの追加
app.post('/api/records', checkAuth, (req, res) => {
  const newRecord = { id: Date.now(), ...req.body };
  records.push(newRecord);
  res.status(201).json(newRecord);
});

// データの更新
app.put('/api/records/:id', checkAuth, (req, res) => {
  const recordId = parseInt(req.params.id, 10);
  const updatedRecord = req.body;
  records = records.map(record =>
    record.id === recordId ? { ...record, ...updatedRecord } : record
  );
  res.json({ id: recordId, ...updatedRecord });
});

// データの削除
app.delete('/api/records/:id', checkAuth, (req, res) => {
  const recordId = parseInt(req.params.id, 10);
  records = records.filter(record => record.id !== recordId);
  res.status(204).send();
});

// パスワード変更
app.post('/api/change-password', checkAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (currentPassword !== config.password) {
    return res.status(403).send('現在のパスワードが違います。');
  }

  if (!newPassword || newPassword.length < 4) {
    return res.status(400).send('新しいパスワードは4文字以上で設定してください。');
  }

  config.password = newPassword;
  res.status(200).send('パスワードが正常に変更されました。');
});

// サーバーの起動
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});