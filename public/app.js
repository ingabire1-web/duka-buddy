// ---- Data model ----
// Each transaction: { id, type: 'sale'|'expense', category, amount, date (YYYY-MM-DD) }
const DEFAULT_CATEGORIES = [
  { key: 'food', icon: '🍞', label: 'Food' },
  { key: 'clothes', icon: '👕', label: 'Clothes' },
  { key: 'tools', icon: '🔧', label: 'Tools' },
  { key: 'drinks', icon: '🥤', label: 'Drinks' },
  { key: 'produce', icon: '🥬', label: 'Produce' },
  { key: 'transport', icon: '🚚', label: 'Transport' },
  { key: 'rent', icon: '🏠', label: 'Rent' },
  { key: 'other', icon: '📦', label: 'Other' },
];

const CUSTOM_CATEGORY_KEY = 'duka_buddy_custom_categories';

function loadCustomCategories() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_CATEGORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCustomCategories(list) {
  localStorage.setItem(CUSTOM_CATEGORY_KEY, JSON.stringify(list));
}

function allCategories() {
  return [...DEFAULT_CATEGORIES, ...loadCustomCategories()];
}

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
  return allCategories().find(c => c.key === key) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}

let currentFilter = 'all';
let currentSearch = '';

function renderHistory() {
  const list = document.getElementById('historyList');
  list.innerHTML = '';

  let filtered = [...transactions].sort((a, b) => b.id - a.id);

  if (currentFilter !== 'all') {
    filtered = filtered.filter(t => t.type === currentFilter);
  }
  if (currentSearch.trim()) {
    const q = currentSearch.trim().toLowerCase();
    filtered = filtered.filter(t => categoryMeta(t.category).label.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    const msg = transactions.length === 0
      ? 'No entries yet. Tap Add Sale or Add Expense to begin.'
      : 'No entries match your filter or search.';
    list.innerHTML = `<div class="empty-note">${msg}</div>`;
    return;
  }

  filtered.slice(0, 30).forEach(t => {
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

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderHistory();
  });
});

document.getElementById('searchInput').addEventListener('input', (e) => {
  currentSearch = e.target.value;
  renderHistory();
});

function renderAll() {
  renderSnapshot();
  renderWeekBars();
  renderHistory();
}

// ---- Modal handling ----

function renderCategoryGrid() {
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = '';
  const customKeys = new Set(loadCustomCategories().map(c => c.key));

  allCategories().forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.dataset.key = cat.key;
    if (cat.key === selectedCategory) btn.classList.add('selected');

    btn.innerHTML = `${cat.icon}<span class="label">${cat.label}</span>`;

    if (customKeys.has(cat.key)) {
      const delBtn = document.createElement('span');
      delBtn.className = 'delete-cat-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Remove this category';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Remove "${cat.label}"? This won't delete past entries, just the icon option.`)) {
          const updated = loadCustomCategories().filter(c => c.key !== cat.key);
          saveCustomCategories(updated);
          if (selectedCategory === cat.key) selectedCategory = null;
          renderCategoryGrid();
        }
      });
      btn.appendChild(delBtn);
    }

    btn.addEventListener('click', () => {
      selectedCategory = cat.key;
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    grid.appendChild(btn);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'category-btn add-btn';
  addBtn.innerHTML = `➕<span class="label">Add New</span>`;
  addBtn.addEventListener('click', () => {
    const label = prompt('Name this category (e.g. "Phone Repairs", "Fabrics"):');
    if (!label || !label.trim()) return;
    const icon = prompt('Pick an emoji for it (e.g. 📱, 🧵, 🐐):', '📌');
    if (!icon || !icon.trim()) return;

    const key = 'custom_' + label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + Date.now();
    const updated = loadCustomCategories();
    updated.push({ key, icon: icon.trim(), label: label.trim() });
    saveCustomCategories(updated);
    selectedCategory = key;
    renderCategoryGrid();
  });
  grid.appendChild(addBtn);
}

function openModal(type) {
  currentModalType = type;
  selectedCategory = null;
  document.getElementById('modalTitle').textContent = type === 'sale' ? 'Add Sale' : 'Add Expense';
  document.getElementById('amountInput').value = '';

  renderCategoryGrid();

  document.getElementById('modalOverlay').hidden = false;
}

function closeModal() {
  document.getElementById('modalOverlay').hidden = true;
}

document.getElementById('addSaleBtn').addEventListener('click', () => openModal('sale'));
document.getElementById('addExpenseBtn').addEventListener('click', () => openModal('expense'));
document.getElementById('cancelBtn').addEventListener('click', closeModal);

document.getElementById('saveBtn').addEventListener('click', () => {
  const rawValue = document.getElementById('amountInput').value;
  const amount = parseFloat(rawValue);

  if (rawValue.trim() === '' || isNaN(amount)) {
    alert('Please enter a number for the amount.');
    return;
  }
  if (amount <= 0) {
    alert('Amount must be greater than 0.');
    return;
  }
  if (amount > 1000000000) {
    alert('That amount looks too large. Please check and try again.');
    return;
  }
  if (!selectedCategory) {
    alert('Please choose a category icon first.');
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

  if (!navigator.onLine) {
    adviceText.textContent = "You're offline. Connect to the internet to get today's tip.";
    return;
  }

  adviceText.textContent = 'Thinking of a good tip for you...';

  const today = todayStr();
  const todays = transactions.filter(t => t.date === today);
  const todaySales = todays.filter(t => t.type === 'sale').reduce((s, t) => s + t.amount, 0);
  const todayExpenses = todays.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const todayProfit = todaySales - todayExpenses;
  const weekProfits = getWeekProfits().map(d => d.profit);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('bad_response');
    }

    if (!res.ok) {
      throw new Error(data.error || 'server_error');
    }
    adviceText.textContent = data.advice;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      adviceText.textContent = "That took too long. Please try again in a moment.";
    } else {
      adviceText.textContent = "Couldn't get a tip right now. Please try again shortly.";
    }
  }
});

document.getElementById('speakAdviceBtn').addEventListener('click', () => {
  speak(document.getElementById('adviceText').textContent);
});

// ---- Offline detection ----

function updateOfflineBanner() {
  const banner = document.getElementById('offlineBanner');
  banner.hidden = navigator.onLine;
}
window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

// ---- Init ----
updateOfflineBanner();
renderAll();
