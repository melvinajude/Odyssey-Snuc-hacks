// ─────────────────────────────────────────────
// CASHLINE — Full App Script
// Features: landing page, onboarding, app shell
// Data: localStorage persistence for all data
// ─────────────────────────────────────────────

// ── DATA LAYER ──
const DB = {
  get: (key, fallback) => { try { return JSON.parse(localStorage.getItem('cashline_' + key)) ?? fallback; } catch { return fallback; } },
  set: (key, value) => localStorage.setItem('cashline_' + key, JSON.stringify(value)),
};

const DEFAULT_EXPENSES = [
  { id: 1, name: 'Hostel Rent', amount: 5000, date: '2026-04-01', flex: 'critical' },
  { id: 2, name: 'Electricity Bill', amount: 800, date: '2026-04-05', flex: 'tight' },
  { id: 3, name: 'Internet Recharge', amount: 500, date: '2026-04-10', flex: 'safe' },
];
const DEFAULT_GOALS = [
  { id: 1, name: '💻 New Laptop', target: 20000, saved: 12400, date: '2026-06-01' },
  { id: 2, name: '✈️ Trip to Goa', target: 10000, saved: 2800, date: '2026-12-01' },
];
const DEFAULT_INVOICES = [
  { id: 1, source: 'Aryan Design Co.', amount: 4000, date: '2026-04-10', status: 'pending' },
  { id: 2, source: 'Rahul Ventures', amount: 7500, date: '2026-03-28', status: 'overdue' },
  { id: 3, source: 'Sneha Creatives', amount: 2500, date: '2026-03-20', status: 'paid' },
];
const DEFAULT_TRANSACTIONS = [
  { id: 1, name: 'Scholarship received', amount: 12500, date: '2026-04-01', type: 'income' },
  { id: 2, name: 'Canteen lunch', amount: 120, date: '2026-04-02', type: 'expense' },
  { id: 3, name: 'Zomato order', amount: 340, date: '2026-04-03', type: 'expense' },
  { id: 4, name: 'Freelance project', amount: 4000, date: '2026-04-03', type: 'income' },
];

const personaMap = {
  school:     { name: 'School Student',  emoji: '🎒' },
  college:    { name: 'College Student', emoji: '🎓' },
  freelancer: { name: 'Freelancer',      emoji: '💻' },
  other:      { name: 'User',            emoji: '✨' },
};
let selectedPersona = null;
let currentInvoiceFilter = 'all';

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('cashline_expenses'))    DB.set('expenses', DEFAULT_EXPENSES);
  if (!localStorage.getItem('cashline_goals'))       DB.set('goals', DEFAULT_GOALS);
  if (!localStorage.getItem('cashline_invoices'))    DB.set('invoices', DEFAULT_INVOICES);
  if (!localStorage.getItem('cashline_transactions'))DB.set('transactions', DEFAULT_TRANSACTIONS);

  const savedPersona = DB.get('persona', null);
  if (savedPersona) {
    applyPersona(savedPersona);
    document.getElementById('landing').style.display = 'none';
    document.getElementById('screen-app').classList.add('active');
    renderAll();
  }

  // Streak
  const today = new Date().toDateString();
  const lastSeen = DB.get('lastSeen', null);
  let streak = DB.get('streak', 0);
  if (lastSeen !== today) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    streak = (lastSeen === yesterday.toDateString()) ? streak + 1 : 1;
    DB.set('streak', streak); DB.set('lastSeen', today);
  }
  const sv = document.getElementById('streak-val');
  if (sv) sv.textContent = streak;

  document.getElementById('ai-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
  });

  // Landing page JS
  initLanding();
});

// ── LANDING PAGE ──
function initLanding() {
  const nav = document.getElementById('topnav');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20), { passive: true });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('.scroll-reveal').forEach(el => io.observe(el));

  setTimeout(() => { const f = document.getElementById('semFill'); if (f) f.style.width = '68%'; }, 400);

  const tabItems = document.querySelectorAll('.tab-item');
  tabItems.forEach(t => t.addEventListener('click', () => {
    tabItems.forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.stage-panel').forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    const panel = document.getElementById('panel-' + t.dataset.tab);
    if (panel) panel.classList.add('active');
    positionPill();
    if (t.dataset.tab === 'student') setTimeout(() => { const f = document.getElementById('semFill'); if (f) f.style.width = '68%'; }, 100);
    if (t.dataset.tab === 'freelancer') setTimeout(drawGraph, 100);
  }));

  window.addEventListener('resize', positionPill);
  setTimeout(positionPill, 200);

  const toggleHandler = (id) => {
    const tog = document.getElementById(id);
    if (!tog) return;
    tog.addEventListener('click', () => {
      const on = tog.classList.toggle('on');
      const card = tog.closest('.control-card');
      if (card) { const v = card.querySelector('.control-val'); if (v) v.textContent = on ? 'On' : 'Off'; }
    });
  };
  toggleHandler('tog1'); toggleHandler('tog2');

  const incomeSlider = document.getElementById('incomeSlider');
  const incomeVal   = document.getElementById('incomeVal');
  if (incomeSlider && incomeVal) incomeSlider.addEventListener('input', () => { incomeVal.textContent = '₹' + parseInt(incomeSlider.value).toLocaleString('en-IN'); });

  const bufferSlider = document.getElementById('bufferSlider');
  const bufferVal   = document.getElementById('bufferVal');
  if (bufferSlider && bufferVal) bufferSlider.addEventListener('input', () => { bufferVal.textContent = bufferSlider.value + '%'; });
}

function positionPill() {
  const tabs    = document.getElementById('personaTabs');
  const active  = tabs && tabs.querySelector('.tab-item.active');
  const pill    = document.getElementById('tabPill');
  if (!active || !pill) return;
  if (window.innerWidth <= 680) {
    pill.style.cssText = `left:${active.offsetLeft}px;top:0;bottom:0;width:${active.offsetWidth}px;height:auto;right:auto`;
  } else {
    pill.style.cssText = `top:${active.offsetTop}px;left:0;right:0;height:${active.offsetHeight}px`;
  }
}

function drawGraph() {
  const svg = document.getElementById('velGraph');
  if (!svg) return;
  const W = 520, H = 180, pad = 24;
  const raw = [80, 45, 110, 30, 95, 140, 55, 120, 85, 60, 130, 100];
  const proj = [95, 90, 100, 95, 100, 105, 100, 108, 105, 108, 112, 115];
  const max = 155, min = 25;
  const sc = v => pad + (H - 2 * pad) * (1 - (v - min) / (max - min));
  const sx = i => pad + (W - 2 * pad) * i / (raw.length - 1);
  const pts = arr => arr.map((v, i) => `${sx(i)},${sc(v)}`).join(' ');
  const rawArea  = raw.map((v, i)  => `${sx(i)},${sc(v)}`).join(' L ');
  const projArea = proj.map((v, i) => `${sx(i)},${sc(v)}`).join(' L ');
  svg.innerHTML = `<defs>
    <linearGradient id="rawGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c2ccff" stop-opacity="0.4"/><stop offset="100%" stop-color="#c2ccff" stop-opacity="0"/></linearGradient>
    <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a47ff" stop-opacity="0.15"/><stop offset="100%" stop-color="#1a47ff" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="M ${rawArea} L ${sx(raw.length-1)},${H-pad} L ${sx(0)},${H-pad} Z" fill="url(#rawGrad)"/>
  <polyline points="${pts(raw)}" fill="none" stroke="#c2ccff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M ${projArea} L ${sx(proj.length-1)},${H-pad} L ${sx(0)},${H-pad} Z" fill="url(#projGrad)"/>
  <polyline points="${pts(proj)}" fill="none" stroke="#1a47ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="520" stroke-dashoffset="520">
    <animate attributeName="stroke-dashoffset" from="520" to="0" dur="1.2s" fill="freeze" begin="0.1s"/>
  </polyline>
  ${proj.map((v, i) => `<circle cx="${sx(i)}" cy="${sc(v)}" r="3.5" fill="#1a47ff"><animate attributeName="opacity" from="0" to="1" dur="0.2s" begin="${.1 + i * .08}s" fill="freeze"/></circle>`).join('')}`;
}

// ── SCREEN NAVIGATION ──
function showOnboarding() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('screen-onboard').classList.add('active');
  document.getElementById('screen-app').classList.remove('active');
}

function showLanding() {
  DB.set('persona', null);
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-onboard').classList.remove('active');
  document.getElementById('landing').style.display = 'block';
  selectedPersona = null;
  document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('ob-btn').disabled = true;
}

function selectPersona(el, type) {
  document.querySelectorAll('.persona-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedPersona = type;
  document.getElementById('ob-btn').disabled = false;
}

function enterApp() {
  if (!selectedPersona) return;
  DB.set('persona', selectedPersona);
  applyPersona(selectedPersona);
  document.getElementById('screen-onboard').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');
  renderAll();
}

function applyPersona(type) {
  const p = personaMap[type] || personaMap.other;
  const badge  = document.getElementById('persona-badge');
  const pname  = document.getElementById('profile-name');
  const pavat  = document.getElementById('profile-avatar');
  const mLabel = document.getElementById('market-persona-label');
  if (badge)  badge.textContent  = p.emoji + ' ' + p.name;
  if (pname)  pname.textContent  = p.name;
  if (pavat)  pavat.textContent  = p.emoji;
  if (mLabel) mLabel.textContent = 'Based on your profile as a ' + p.name;
  selectedPersona = type;
}

// ── APP NAVIGATION ──
function appSwitchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const tc = document.getElementById('tab-' + tab);
  const ni = document.getElementById('nav-' + tab);
  if (tc) tc.classList.add('active');
  if (ni) ni.classList.add('active');
}

function openSheet(id)  { document.getElementById('sheet-' + id).classList.add('open'); }
function closeSheet(e, id) {
  if (!e || e.target === document.getElementById('sheet-' + id)) {
    document.getElementById('sheet-' + id).classList.remove('open');
  }
}

let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── RENDER ALL ──
function renderAll() {
  renderObligations();
  renderGoals();
  renderCalendarEvents();
  renderInvoices();
  renderTransactions();
  updateHeader();
}

function renderObligations() {
  const expenses = DB.get('expenses', []);
  const list = document.getElementById('obligations-list');
  if (!list) return;
  const priorityMap = {
    critical: { order: 0, color: 'var(--danger)', badge: '🔴 Critical', bgBadge: 'var(--danger-soft)', textBadge: 'var(--danger)', cls: 'urgent' },
    tight:    { order: 1, color: 'var(--warn)',   badge: '🟡 Tight',    bgBadge: 'var(--warn-soft)',   textBadge: 'var(--warn)',   cls: 'tight'  },
    safe:     { order: 2, color: 'var(--accent)', badge: '🟢 Safe',     bgBadge: 'var(--accent-soft)', textBadge: 'var(--accent2)',cls: 'safe'   },
  };
  const sorted = [...expenses].sort((a, b) => (priorityMap[a.flex]?.order ?? 9) - (priorityMap[b.flex]?.order ?? 9));
  list.innerHTML = sorted.map(e => {
    const p = priorityMap[e.flex] || priorityMap.safe;
    const dueStr = e.date ? new Date(e.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
    return `<div class="ob-card ${p.cls}" onclick="showToast('${e.name} marked — taking action!')">
      <div class="ob-indicator" style="background:${p.color}"></div>
      <div class="ob-main"><div class="ob-name">${e.name}</div><div class="ob-meta">Due ${dueStr}</div></div>
      <div class="ob-right">
        <div class="ob-amount">₹${Number(e.amount).toLocaleString('en-IN')}</div>
        <div class="ob-badge" style="background:${p.bgBadge};color:${p.textBadge}">${p.badge}</div>
      </div>
    </div>`;
  }).join('');

  // Update stat card
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const statEl = document.getElementById('stat-expenses');
  if (statEl) statEl.textContent = '₹' + total.toLocaleString('en-IN');
}

function renderGoals() {
  const goals = DB.get('goals', []);
  const list = document.getElementById('goals-list');
  if (!list) return;
  list.innerHTML = goals.length === 0
    ? '<p style="font-size:13px;color:var(--muted);text-align:center;padding:20px 0;">No goals yet. Tap + Add to create one!</p>'
    : goals.map(g => {
        const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
        const dateStr = g.date ? new Date(g.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '';
        return `<div class="goal-card">
          <div class="goal-top"><div class="goal-name">${g.name}</div><div class="goal-pct">${pct}%</div></div>
          <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
          <div class="goal-foot"><span>₹${Number(g.saved).toLocaleString('en-IN')} saved</span><span>₹${Number(g.target).toLocaleString('en-IN')} · ${dateStr}</span></div>
        </div>`;
      }).join('');
  const goalsCount = document.getElementById('goals-count');
  if (goalsCount) goalsCount.textContent = goals.length;
  const totalSaved = goals.reduce((s, g) => s + Number(g.saved), 0);
  const statSaved  = document.getElementById('stat-saved');
  if (statSaved) statSaved.textContent = '₹' + totalSaved.toLocaleString('en-IN');
}

function renderTransactions() {
  const transactions = DB.get('transactions', []);
  const renderList = (listId, limit = 999) => {
    const list = document.getElementById(listId);
    if (!list) return;
    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
    list.innerHTML = sorted.length === 0
      ? '<p style="font-size:13px;color:var(--muted);text-align:center;padding:20px 0;">No transactions yet.</p>'
      : sorted.map(t => {
          const icon = t.type === 'income' ? '📥' : '📤';
          const dateStr = t.date ? new Date(t.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
          return `<div class="transaction-item ${t.type}">
            <div class="transaction-icon">${icon}</div>
            <div class="transaction-meta"><h4>${t.name}</h4><span>${dateStr}</span></div>
            <div class="transaction-amount">${t.type === 'income' ? '+' : '-'}₹${Number(t.amount).toLocaleString('en-IN')}</div>
          </div>`;
        }).join('');
  };
  renderList('recent-transactions', 4);
  renderList('transaction-list');
}

function renderInvoices() {
  const invoices = DB.get('invoices', []);
  const list = document.getElementById('invoice-list');
  if (!list) return;
  const filtered = currentInvoiceFilter === 'all' ? invoices : invoices.filter(i => i.status === currentInvoiceFilter);
  const statusLabel = { pending: '⏳ Pending', overdue: '🚨 Overdue', paid: '✅ Paid' };
  list.innerHTML = filtered.length === 0
    ? '<p style="font-size:13px;color:var(--muted);text-align:center;padding:20px 0;">No invoices here.</p>'
    : filtered.map(i => {
        const dateStr = i.date ? new Date(i.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
        return `<div class="invoice-item ${i.status || 'pending'}">
          <div class="invoice-status-dot"></div>
          <div class="invoice-info">
            <div class="invoice-source">${i.source}</div>
            <div class="invoice-date">Expected by ${dateStr}</div>
          </div>
          <div class="invoice-amount">₹${Number(i.amount).toLocaleString('en-IN')}</div>
          <div class="invoice-badge">${statusLabel[i.status] || statusLabel.pending}</div>
        </div>`;
      }).join('');
}

function filterInvoices(type, btn) {
  currentInvoiceFilter = type;
  document.querySelectorAll('.inv-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderInvoices();
}

function renderCalendarEvents() {
  const expenses = DB.get('expenses', []);
  const invoices = DB.get('invoices', []);
  const calList  = document.getElementById('calendar-events-list');
  if (!calList) return;
  const colorMap = {
    critical: { bg: 'var(--danger-soft)', text: 'var(--danger)' },
    tight:    { bg: 'var(--warn-soft)',   text: 'var(--warn)'   },
    safe:     { bg: 'var(--accent-soft)', text: 'var(--accent2)' },
  };
  const labelMap = { critical: '🔴 Critical · Cannot reschedule', tight: '🟡 Tight · Can delay with penalty', safe: '🟢 Safe · Flexible' };
  const expItems = expenses.map(e => {
    const d = e.date ? new Date(e.date) : null;
    const c = colorMap[e.flex] || colorMap.safe;
    return `<div class="event-item">
      <div class="event-date-box" style="background:${c.bg}">
        <div class="event-day" style="color:${c.text}">${d ? d.getDate() : '-'}</div>
        <div class="event-mon" style="color:${c.text}">${d ? d.toLocaleString('en-IN',{month:'short'}).toUpperCase() : ''}</div>
      </div>
      <div class="event-info"><div class="event-name">${e.name}</div><div class="event-sub">${labelMap[e.flex] || ''}</div></div>
      <div class="event-amt">₹${Number(e.amount).toLocaleString('en-IN')}</div>
    </div>`;
  });
  const invItems = invoices.map(i => {
    const d = i.date ? new Date(i.date) : null;
    const statusColor = i.status === 'overdue' ? 'var(--danger-soft)' : i.status === 'paid' ? 'var(--accent-soft)' : 'var(--blue-soft)';
    const statusText  = i.status === 'overdue' ? 'var(--danger)'      : i.status === 'paid' ? 'var(--accent2)'     : 'var(--blue)';
    return `<div class="event-item">
      <div class="event-date-box" style="background:${statusColor}">
        <div class="event-day" style="color:${statusText}">${d ? d.getDate() : '-'}</div>
        <div class="event-mon" style="color:${statusText}">${d ? d.toLocaleString('en-IN',{month:'short'}).toUpperCase() : ''}</div>
      </div>
      <div class="event-info"><div class="event-name">${i.source}</div><div class="event-sub">💰 Invoice · ${i.status}</div></div>
      <div class="event-amt" style="color:var(--accent)">+₹${Number(i.amount).toLocaleString('en-IN')}</div>
    </div>`;
  });
  calList.innerHTML = (expItems.join('') + invItems.join('')) || '<p style="font-size:13px;color:var(--muted);padding:20px 0;text-align:center;">No upcoming events. Add an expense or invoice!</p>';
}

function updateHeader() {
  const expenses = DB.get('expenses', []);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const oblEl = document.getElementById('header-obligations');
  if (oblEl) oblEl.innerHTML = `Updated just now · <span style="color:var(--danger)">₹${total.toLocaleString('en-IN')} in obligations</span>`;
  const criticals = expenses.filter(e => e.flex === 'critical');
  const alertEl = document.getElementById('home-alert');
  if (alertEl) {
    if (criticals.length > 0) {
      const c = criticals[0];
      alertEl.style.display = 'flex';
      alertEl.querySelector('.alert-text').innerHTML = `<strong>${c.name} is critical.</strong> Amount due: ₹${Number(c.amount).toLocaleString('en-IN')}. Pay this first — it cannot be rescheduled.`;
    } else {
      alertEl.style.display = 'none';
    }
  }
}

// ── SAVE ACTIONS ──
function saveExpense() {
  const name   = document.getElementById('exp-name').value.trim();
  const amount = document.getElementById('exp-amount').value.trim();
  const date   = document.getElementById('exp-date').value;
  const flex   = document.getElementById('exp-flex').value;
  if (!name || !amount) { showToast('Please fill in the name and amount.'); return; }
  const expenses = DB.get('expenses', []);
  expenses.push({ id: Date.now(), name, amount: Number(amount), date, flex });
  DB.set('expenses', expenses);
  closeSheet(null, 'add-expense');
  ['exp-name', 'exp-amount', 'exp-date'].forEach(id => document.getElementById(id).value = '');
  renderAll(); showToast('Obligation added ✓');
}

function saveInvoice() {
  const source = document.getElementById('inv-source').value.trim();
  const amount = document.getElementById('inv-amount').value.trim();
  const date   = document.getElementById('inv-date').value;
  const status = document.getElementById('inv-status').value;
  if (!source || !amount) { showToast('Please fill in the client and amount.'); return; }
  const invoices = DB.get('invoices', []);
  invoices.push({ id: Date.now(), source, amount: Number(amount), date, status });
  DB.set('invoices', invoices);
  closeSheet(null, 'add-invoice');
  ['inv-source', 'inv-amount', 'inv-date'].forEach(id => document.getElementById(id).value = '');
  renderAll(); showToast('Invoice tracked ✓');
}

function saveTransaction() {
  const name   = document.getElementById('txn-name').value.trim();
  const amount = document.getElementById('txn-amount').value.trim();
  const date   = document.getElementById('txn-date').value;
  const type   = document.getElementById('txn-type').value;
  if (!name || !amount) { showToast('Please fill in description and amount.'); return; }
  const transactions = DB.get('transactions', []);
  transactions.push({ id: Date.now(), name, amount: Number(amount), date: date || new Date().toISOString().split('T')[0], type });
  DB.set('transactions', transactions);
  closeSheet(null, 'add-transaction');
  ['txn-name', 'txn-amount', 'txn-date'].forEach(id => document.getElementById(id).value = '');
  renderAll(); showToast('Transaction logged ✓');
}

function saveGoal() {
  const name   = document.getElementById('goal-name').value.trim();
  const target = document.getElementById('goal-target').value.trim();
  const date   = document.getElementById('goal-date').value;
  const saved  = document.getElementById('goal-saved').value.trim() || '0';
  if (!name || !target) { showToast('Please fill goal name and target.'); return; }
  const goals = DB.get('goals', []);
  goals.push({ id: Date.now(), name, target: Number(target), saved: Number(saved), date });
  DB.set('goals', goals);
  closeSheet(null, 'add-goal');
  ['goal-name', 'goal-target', 'goal-date', 'goal-saved'].forEach(id => document.getElementById(id).value = '');
  renderAll(); showToast('Goal created! 🎯');
}

// ── AI CHAT ──
const aiResponses = {
  'How much can I save this month?': "Based on your current data: After paying all your obligations, your projected surplus for this month is <strong>₹1,940</strong>. I'd suggest putting ₹1,000 into your goals and keeping ₹940 as buffer. 💪",
  'Which bill should I pay first?':  "Pay your <strong>critical obligations first</strong> — they carry late penalties and cannot be rescheduled. Then tackle 'tight' ones. 'Safe/flexible' ones can wait till the end of the month. ✅",
  'Best investment for ₹1000?':      "With ₹1,000 I'd split it: ₹500 into a <strong>Nifty 50 Index Fund SIP</strong> (12% avg returns) and ₹500 into a <strong>Recurring Deposit</strong> (6.8% guaranteed). Only invest after paying critical obligations! 📈",
  'Draft a follow-up to my client':   "Here's a draft:<br><br><em>'Hi [Client], hope you're doing well! Following up on the invoice sent for [project]. Payment is now due — could you share an expected date? Thank you! — [Your name]'</em><br><br>Want me to adjust the tone? 📧",
};

function askAI(question) {
  const input = document.getElementById('ai-input');
  input.value = question;
  sendAIMessage();
}

function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const text  = input.value.trim();
  if (!text) return;
  const msgs = document.getElementById('ai-messages');
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.innerHTML = '<div class="msg-label">You</div><div class="msg-bubble">' + text + '</div>';
  msgs.appendChild(userMsg);
  input.value = '';
  const btn = document.getElementById('ai-send-btn');
  btn.disabled = true; btn.textContent = '···';
  setTimeout(() => {
    const aiMsg = document.createElement('div');
    aiMsg.className = 'msg ai';
    const response = aiResponses[text] || "Great question! Based on your current obligations and goals, I'd recommend staying conservative until your next expected income arrives. Use the cash forecast to plan ahead. 🤔";
    aiMsg.innerHTML = '<div class="msg-label">Cashline AI</div><div class="msg-bubble">' + response + '</div>';
    msgs.appendChild(aiMsg);
    msgs.scrollTop = msgs.scrollHeight;
    btn.disabled = false; btn.textContent = '↑';
  }, 900);
  msgs.scrollTop = msgs.scrollHeight;
}
