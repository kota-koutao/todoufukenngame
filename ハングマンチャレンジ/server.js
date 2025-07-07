const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 単語リスト
const wordLists = {
  easy: [
    { word: 'apple', meaning: 'りんご' },
    { word: 'book', meaning: '本' },
    { word: 'cat', meaning: 'ねこ' },
    { word: 'desk', meaning: '机' },
    { word: 'pen', meaning: 'ペン' }
  ],
  normal: [
    { word: 'school', meaning: '学校' },
    { word: 'summer', meaning: '夏' },
    { word: 'friend', meaning: '友達' },
    { word: 'music', meaning: '音楽' },
    { word: 'train', meaning: '電車' }
  ]
};

// ミドルウェア設定
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'hangman-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// EJSテンプレートエンジン設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ゲームロジック
class HangmanGame {
  constructor(level) {
    this.level = level;
    this.maxLives = 6;
    this.lives = this.maxLives;
    this.wrongGuesses = [];
    this.guessedLetters = [];
    this.gameOver = false;
    this.gameWon = false;
    
    // ランダムに単語を選択
    const wordList = wordLists[level];
    const randomIndex = Math.floor(Math.random() * wordList.length);
    this.targetWord = wordList[randomIndex];
    
    // 表示用の単語（アンダースコア）
    this.displayWord = '_'.repeat(this.targetWord.word.length).split('');
  }

  guessLetter(letter) {
    letter = letter.toLowerCase();
    
    // 既に推測済みの文字かチェック
    if (this.guessedLetters.includes(letter)) {
      return { success: false, message: 'その文字は既に推測済みです。' };
    }
    
    this.guessedLetters.push(letter);
    
    // 正解の文字かチェック
    if (this.targetWord.word.includes(letter)) {
      // 正解の場合、表示用単語を更新
      for (let i = 0; i < this.targetWord.word.length; i++) {
        if (this.targetWord.word[i] === letter) {
          this.displayWord[i] = letter;
        }
      }
      
      // 全て埋まったかチェック
      if (!this.displayWord.includes('_')) {
        this.gameWon = true;
        this.gameOver = true;
      }
      
      return { success: true, message: '正解！' };
    } else {
      // 不正解の場合
      this.wrongGuesses.push(letter);
      this.lives--;
      
      if (this.lives <= 0) {
        this.gameOver = true;
      }
      
      return { success: false, message: '残念！その文字はありません。' };
    }
  }

  getCurrentState() {
    return {
      displayWord: this.displayWord.join(' '),
      lives: this.lives,
      maxLives: this.maxLives,
      wrongGuesses: this.wrongGuesses,
      gameOver: this.gameOver,
      gameWon: this.gameWon,
      targetWord: this.targetWord.word,
      meaning: this.targetWord.meaning,
      level: this.level
    };
  }
}

// ゲームロジック関数
function guessLetter(gameState, letter) {
  // 既に推測済みの文字かチェック
  if (gameState.guessedLetters.includes(letter)) {
    return { success: false, message: 'その文字は既に推測済みです。' };
  }
  
  gameState.guessedLetters.push(letter);
  
  // 正解の文字かチェック
  if (gameState.targetWord.word.includes(letter)) {
    // 正解の場合、表示用単語を更新
    for (let i = 0; i < gameState.targetWord.word.length; i++) {
      if (gameState.targetWord.word[i] === letter) {
        gameState.displayWord[i] = letter;
      }
    }
    
    // 全て埋まったかチェック
    if (!gameState.displayWord.includes('_')) {
      gameState.gameWon = true;
      gameState.gameOver = true;
    }
    
    return { success: true, message: '正解！' };
  } else {
    // 不正解の場合
    gameState.wrongGuesses.push(letter);
    gameState.lives--;
    
    if (gameState.lives <= 0) {
      gameState.gameOver = true;
    }
    
    return { success: false, message: '残念！その文字はありません。' };
  }
}

// ルート設定
app.get('/', (req, res) => {
  res.render('index');
});

// ゲーム開始
app.post('/start', (req, res) => {
  const { level } = req.body;
  
  if (!level || !wordLists[level]) {
    return res.redirect('/');
  }
  
  // 新しいゲームを作成
  const game = new HangmanGame(level);
  
  // セッションに保存するためにプレーンオブジェクトに変換
  req.session.gameState = {
    level: game.level,
    maxLives: game.maxLives,
    lives: game.lives,
    wrongGuesses: game.wrongGuesses,
    guessedLetters: game.guessedLetters,
    gameOver: game.gameOver,
    gameWon: game.gameWon,
    targetWord: game.targetWord,
    displayWord: game.displayWord
  };
  
  res.redirect('/game');
});

// ゲーム画面
app.get('/game', (req, res) => {
  if (!req.session.gameState) {
    return res.redirect('/');
  }
  
  const gameState = {
    displayWord: req.session.gameState.displayWord.join(' '),
    lives: req.session.gameState.lives,
    maxLives: req.session.gameState.maxLives,
    wrongGuesses: req.session.gameState.wrongGuesses,
    gameOver: req.session.gameState.gameOver,
    gameWon: req.session.gameState.gameWon,
    targetWord: req.session.gameState.targetWord.word,
    meaning: req.session.gameState.targetWord.meaning,
    level: req.session.gameState.level
  };
  
  res.render('game', { gameState });
});

// 文字推測処理
app.post('/guess', (req, res) => {
  if (!req.session.gameState) {
    return res.redirect('/');
  }
  
  const { letter } = req.body;
  
  if (!letter || letter.length !== 1 || !/[a-zA-Z]/.test(letter)) {
    return res.redirect('/game');
  }
  
  // ゲームロジックを実行
  const result = guessLetter(req.session.gameState, letter.toLowerCase());
  res.redirect('/game');
});

// ゲームリセット
app.post('/reset', (req, res) => {
  req.session.gameState = null;
  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});