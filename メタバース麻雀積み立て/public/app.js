
document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.getElementById('login-container');
  const mainContent = document.getElementById('main-content');
  const loginForm = document.getElementById('login-form');
  const passwordInput = document.getElementById('password');
  const logoutButton = document.getElementById('logout-button');
  const changePasswordForm = document.getElementById('change-password-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');

  const recordForm = document.getElementById('record-form');
  const recordIdInput = document.getElementById('record-id');
  const dateInput = document.getElementById('date');
  const tokensInput = document.getElementById('tokens');
  const priceInput = document.getElementById('price');
  const investmentInput = document.getElementById('investment');

  const recordsBody = document.getElementById('records-body');
  const totalTokensSpan = document.getElementById('total-tokens');
  const totalInvestmentSpan = document.getElementById('total-investment');
  const averagePriceSpan = document.getElementById('average-price');
  const monthlySummaryDiv = document.getElementById('monthly-summary');

  let lastEdited = null; // 最後に入力されたフィールドを追跡

  const calculate = () => {
    const investment = parseFloat(investmentInput.value) || 0;
    const tokens = parseFloat(tokensInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;

    if (lastEdited === 'investment') {
        if (tokens > 0) {
            priceInput.value = (investment / tokens).toFixed(5);
        } else if (price > 0) {
            tokensInput.value = (investment / price).toFixed(8);
        }
    } else if (lastEdited === 'tokens') {
        if (investment > 0) {
            priceInput.value = (investment / tokens).toFixed(5);
        } else if (price > 0) {
            investmentInput.value = (tokens * price).toFixed(5);
        }
    } else if (lastEdited === 'price') {
        if (investment > 0) {
            tokensInput.value = (investment / price).toFixed(8);
        } else if (tokens > 0) {
            investmentInput.value = (tokens * price).toFixed(5);
        }
    }
  };

  investmentInput.addEventListener('focus', (e) => lastEdited = e.target.id);
  tokensInput.addEventListener('focus', (e) => lastEdited = e.target.id);
  priceInput.addEventListener('focus', (e) => lastEdited = e.target.id);

  investmentInput.addEventListener('input', calculate);
  tokensInput.addEventListener('input', calculate);
  priceInput.addEventListener('input', calculate);

  const api = {
    login: (password) => fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    }),
    logout: () => fetch('/logout', { method: 'POST' }),
    getRecords: () => fetch('/api/records'),
    addRecord: (record) => fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }),
    updateRecord: (id, record) => fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    }),
    deleteRecord: (id) => fetch(`/api/records/${id}`, {
      method: 'DELETE'
    }),
    changePassword: (passwords) => fetch('/api/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passwords)
    })
  };

  // 投資金額を計算して表示
  const calculateInvestment = () => {
    const tokens = parseFloat(tokensInput.value) || 0;
    const price = parseFloat(priceInput.value) || 0;
    const investment = tokens * price;
    investmentInput.value = investment > 0 ? investment.toFixed(5) + '円' : '';
  };

  tokensInput.addEventListener('input', calculateInvestment);
  priceInput.addEventListener('input', calculateInvestment);

  // ログイン処理
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const response = await api.login(passwordInput.value);
    if (response.ok) {
      loginContainer.style.display = 'none';
      mainContent.style.display = 'block';
      loadRecords();
    } else {
      alert('パスワードが違います');
    }
  });

  // ログアウト処理
  logoutButton.addEventListener('click', async () => {
    await api.logout();
    loginContainer.style.display = 'block';
    mainContent.style.display = 'none';
    passwordInput.value = '';
  });

  // パスワード変更処理
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;

    const response = await api.changePassword({ currentPassword, newPassword });

    if (response.ok) {
      alert('パスワードが変更されました。');
      changePasswordForm.reset();
    } else {
      const errorMessage = await response.text();
      alert(`エラー: ${errorMessage}`);
    }
  });

  // 記録の読み込みと表示
  const loadRecords = async () => {
    const response = await api.getRecords();
    if (response.ok) {
      const records = await response.json();
      renderRecords(records);
      renderSummary(records);
    } else if (response.status === 401) {
      // セッションがない場合はログイン画面へ
      loginContainer.style.display = 'block';
      mainContent.style.display = 'none';
    }
  };

  // 記録の描画
  const renderRecords = (records) => {
    recordsBody.innerHTML = '';
    records.sort((a, b) => new Date(b.date) - new Date(a.date)); // 日付で降順ソート
    records.forEach(record => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.date}</td>
        <td>${(record.investment || (record.tokens * record.price)).toFixed(5)}円</td>
        <td>${record.tokens}</td>
        <td>${record.price}</td>
        <td>
          <button class="btn btn-sm btn-warning edit-btn" data-id="${record.id}">編集</button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${record.id}">削除</button>
        </td>
      `;
      recordsBody.appendChild(row);
    });
  };

  // サマリーの描画
  const renderSummary = (records) => {
    // 総合計
    const totalTokens = records.reduce((sum, record) => sum + parseFloat(record.tokens), 0);
    const totalInvestment = records.reduce((sum, record) => sum + (parseFloat(record.investment) || (parseFloat(record.tokens) * parseFloat(record.price))), 0);
    totalTokensSpan.textContent = totalTokens.toFixed(8);
    totalInvestmentSpan.textContent = totalInvestment.toFixed(5);
    averagePriceSpan.textContent = totalTokens > 0 ? (totalInvestment / totalTokens).toFixed(5) : 0;

    // 月別集計
    const monthlyTotals = {};
    records.forEach(record => {
      const month = record.date.substring(0, 7); // YYYY-MM
      if (!monthlyTotals[month]) {
        monthlyTotals[month] = { tokens: 0, investment: 0 };
      }
      monthlyTotals[month].tokens += parseFloat(record.tokens);
      monthlyTotals[month].investment += (parseFloat(record.investment) || (parseFloat(record.tokens) * parseFloat(record.price)));
    });

    monthlySummaryDiv.innerHTML = '<h4>月別サマリー</h4>';
    const sortedMonths = Object.keys(monthlyTotals).sort().reverse();
    sortedMonths.forEach(month => {
      const monthlyAveragePrice = monthlyTotals[month].tokens > 0 ? (monthlyTotals[month].investment / monthlyTotals[month].tokens).toFixed(5) : 0;
      monthlySummaryDiv.innerHTML += `<p><strong>${month}:</strong> トークン数: ${monthlyTotals[month].tokens.toFixed(8)} | 投資金額: ${monthlyTotals[month].investment.toFixed(5)}円 | 平均単価: ${monthlyAveragePrice}</p>`;
    });
  };

  // 記録フォームの送信処理 (追加・更新)
  recordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = recordIdInput.value;
    const record = {
      date: dateInput.value,
      tokens: parseFloat(tokensInput.value),
      price: parseFloat(priceInput.value),
      investment: parseFloat(investmentInput.value)
    };

    if (id) {
      // 更新
      await api.updateRecord(id, record);
    } else {
      // 追加
      await api.addRecord(record);
    }

    recordForm.reset();
    recordIdInput.value = '';
    loadRecords();
  });

  // 編集・削除ボタンのイベントリスナー
  recordsBody.addEventListener('click', async (e) => {
    const target = e.target;
    const id = target.dataset.id;

    if (target.classList.contains('edit-btn')) {
      // 編集
      const response = await api.getRecords();
      const records = await response.json();
      const recordToEdit = records.find(r => r.id == id);
      if (recordToEdit) {
        recordIdInput.value = recordToEdit.id;
        dateInput.value = recordToEdit.date;
        tokensInput.value = recordToEdit.tokens;
        priceInput.value = recordToEdit.price;
        investmentInput.value = recordToEdit.investment;
        window.scrollTo(0, 0); // フォームにスクロール
      }
    }

    if (target.classList.contains('delete-btn')) {
      // 削除
      if (confirm('本当にこの記録を削除しますか？')) {
        await api.deleteRecord(id);
        loadRecords();
      }
    }
  });

  // 初期読み込み
  loadRecords();
});
