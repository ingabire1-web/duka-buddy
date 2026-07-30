// ---- Data model ----
// Each transaction: { id, type: 'sale'|'expense', category, amount, date (YYYY-MM-DD) }

const CATEGORIES = [
  { key: 'food', icon: '🍞', label: 'Food' },
  { key: 'clothes', icon: '👕', label: 'Clothes' },
  { key: 'tools', icon: '🔧', label: 'Tools' },
  { key: 'drinks', icon: '🥤', label: 'Drinks' },
  { key: 'produce', icon: '🥬', label: 'Produce' },
  { key: 'transport', icon: '🚚', label: 'Transport' },
  { key: 'rent', icon: '🏠', label: 'Rent' },
  { key: 'other', icon: '📦', label: 'Other' },
];

const STORAGE_KEY = 'duka_buddy_transactions';

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTransactions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function dateStrDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

let transactions = loadTransactions();
let currentModalType = null;
let selectedCategory = null;

// ---- Rendering ----

function renderSnapshot() {
  const today = todayStr();
  const todays = transactions.filter(t => t.date === today);
  const sales = todays.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const expenses = todays.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const profit = sales - expenses;

  document.getElementById('todayProfit').textContent = profit.toFixed(0);
  document.getElementById('todaySales').textContent = sales.toFixed(0);
  document.getElementById('todayExpenses').textContent = expenses.toFixed(0);
}

function getWeekProfits() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = dateStrDaysAgo(i);
    const dayTx = transactions.filter(t => t.date === date);
    const sales = dayTx.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
    const expenses = dayTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    days.push({ date, profit: sales - expenses });
  }
  return days;
}

function renderWeekBars() {
  const days = getWeekProfits();
  const maxAbs = Math.max(...days.map(d => Math.abs(d.profit)), 1);
  const container = document.getElementById('weekBars');
  container.innerHTML = '';
  days.forEach(d => {
    const col = document.createElement('div');
    col.className = 'bar-col';
    const bar = document.createElement('div');
    const heightPct = Math.max((Math.abs(d.profit) / maxAbs) * 100, 3);
    bar.className = 'bar' + (d.profit < 0 ? ' negative' : '');
    bar.style.height = heightPct + '%';
    const label = document.createElement('div');
    label.className = 'bar-day';
    label.textContent = new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })[0];
    col.appendChild(bar);
    col.appendChild(label);
    container.appendChild(col);
  });
}

function categoryMeta(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';
  const recent = [...transactions].sort((a, b) => b.id - a.id).slice(0, 8);

  if (recent.length === 0) {
    list.innerHTML = '<div class="empty-note">No entries yet. Tap Add Sale or Add Expense to begin.</div>';
    return;
  }

  recent.forEach(t => {
    const meta = categoryMeta(t.category);
    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div class="cat">${meta.icon} ${meta.label}</div>
      <div class="amt ${t.type}">${t.type === 'expense' ? '-' : '+'}${t.amount.toFixed(0)}</div>
    `;
    list.appendChild(row);
  });
}

function renderAll() {
  renderSnapshot();
  renderWeekBars();
  renderHistory();
}

// ---- Modal handling ----

function openModal(type) {
  currentModalType = type;
  selectedCategory = null;
  document.getElementById('modalTitle').textContent = type === 'sale' ? 'Add Sale' : 'Add Expense';
  document.getElementById('amountInput').value = '';

  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.key = cat.key;
    btn.innerHTML = `${cat.icon}<span class="label">${cat.label}</span>`;
    btn.addEventListener('click', () => {
      selectedCategory = cat.key;
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    grid.appendChild(btn);
  });

  document.getElementById('modalOverlay').hidden = false;
}

function closeModal() {
  document.getElementById('modalOverlay').hidden = true;
}

document.getElementById('addSaleBtn').addEventListener('click', () => openModal('sale'));
document.getElementById('addExpenseBtn').addEventListener('click', () => openModal('expense'));
document.getElementById('cancelBtn').addEventListener('click', closeModal);

document.getElementById('saveBtn').addEventListener('click', () => {
  const amount = parseFloat(document.getElementById('amountInput').value);
  if (!amount || amount <= 0) {
    alert('Please enter an amount greater than 0.');
    return;
  }
  if (!selectedCategory) {
    alert('Please choose a category icon.');
    return;
  }

  transactions.push({
    id: Date.now(),
    type: currentModalType,
    category: selectedCategory,
    amount: amount,
    date: todayStr(),
  });
  saveTransactions(transactions);
  renderAll();
  closeModal();
});

// ---- Text to speech (browser-native, no API key needed) ----

function speak(text) {
  if (!('speechSynthesis' in window)) {
    alert('Voice playback is not supported on this device/browser.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

document.getElementById('speakSummaryBtn').addEventListener('click', () => {
  const profit = document.getElementById('todayProfit').textContent;
  const sales = document.getElementById('todaySales').textContent;
  const expenses = document.getElementById('todayExpenses').textContent;
  speak(`Today, your sales are ${sales}. Your expenses are ${expenses}. Your profit is ${profit}.`);
});

// ---- Advice (calls backend, which calls Gemini) ----

function topCategoryToday() {
  const today = todayStr();
  const sales = transactions.filter(t => t.date === today && t.type === 'sale');
  const totals = {};
  sales.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  return sorted.length ? categoryMeta(sorted[0][0]).label : null;
}

document.getElementById('getAdviceBtn').addEventListener('click', async () => {
  const ticket = document.getElementById('adviceTicket');
  const adviceText = document.getElementById('adviceText');
  ticket.hidden = false;
  adviceText.textContent = 'Thinking of a good tip for you...';

  const today = todayStr();
  const todays = transactions.filter(t => t.date === today);
  const todaySales = todays.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todays.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayProfit = todaySales - todayExpenses;
  const weekProfits = getWeekProfits().map(d => d.profit);

  try {
    const res = await fetch('/api/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        todayProfit,
        todaySales,
        todayExpenses,
        weekProfits,
        topCategory: topCategoryToday(),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to get advice');
    adviceText.textContent = data.advice;
  } catch (err) {
    adviceText.textContent = "Couldn't reach the advice service. Please check your internet and try again.";
  }
});

document.getElementById('speakAdviceBtn').addEventListener('click', () => {
  speak(document.getElementById('adviceText').textContent);
});

// ---- Init ----
renderAll();
