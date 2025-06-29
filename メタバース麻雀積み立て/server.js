
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');
const DB_FILE = path.join(__dirname, 'db.json');

// 設定の読み込み
const loadConfig = () => {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } else {
    // デフォルト設定
    const defaultConfig = { password: 'password' };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
    return defaultConfig;
  }
};

let config = loadConfig();

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

// データベースの初期化
const initializeDatabase = () => {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ records: [] }, null, 2));
  }
};

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
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  res.status(200).send('パスワードが正常に変更されました。');
});

// ログアウト
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.status(200).send('Logout successful');
});

// データの取得
app.get('/api/records', checkAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  res.json(data.records);
});

// データの追加
app.post('/api/records', checkAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const newRecord = { id: Date.now(), ...req.body };
  data.records.push(newRecord);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.status(201).json(newRecord);
});

// データの更新
app.put('/api/records/:id', checkAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const recordId = parseInt(req.params.id, 10);
  const updatedRecord = req.body;
  data.records = data.records.map(record =>
    record.id === recordId ? { ...record, ...updatedRecord } : record
  );
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.json({ id: recordId, ...updatedRecord });
});

// データの削除
app.delete('/api/records/:id', checkAuth, (req, res) => {
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const recordId = parseInt(req.params.id, 10);
  data.records = data.records.filter(record => record.id !== recordId);
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  res.status(204).send();
});


// サーバーの起動
app.listen(PORT, () => {
  initializeDatabase();
  console.log(`Server is running on http://localhost:${PORT}`);
});
