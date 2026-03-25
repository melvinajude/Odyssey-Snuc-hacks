// ─── DATA LAYER (localStorage) ───────────────────
const DB = {
  get: (key, fallback) => {
    try { return JSON.parse(localStorage.getItem('cashline_' + key)) ?? fallback; }
    catch { return fallback; }
  },
  set: (key, value) => localStorage.setItem('cashline_' + key, JSON.stringify(value)),
};

// Default seed data shown on first load
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
  { id: 1, source: 'Aryan Design Co.', amount: 4000, date: '2026-04-10', status: 'Invoice sent — awaiting payment' }
];

// ─── STATE ───────────────────────────────────────
let selectedPersona = null;
const personaMap = {
  school:     { name: 'School Student',  emoji: '🎒' },
  college:    { name: 'College Student', emoji: '🎓' },
  freelancer: { name: 'Freelancer',      emoji: '💻' },
  other:      { name: 'User',            emoji: '✨' },
};

// ─── INIT ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Seed defaults only on first time
  if (!localStorage.getItem('cashline_expenses')) DB.set('expenses', DEFAULT_EXPENSES);
  if (!localStorage.getItem('cashline_goals'))    DB.set('goals',    DEFAULT_GOALS);
  if (!localStorage.getItem('cashline_invoices')) DB.set('invoices', DEFAULT_INVOICES);

  const savedPersona = DB.get('persona', null);
  if (savedPersona) {
    // Resume straight into app if persona already chosen
    applyPersona(savedPersona);
    document.getElementById('screen-onboard').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    renderAll();
  } else {
    renderAll();
  }

  document.getElementById('ai-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
  });

  // Update streak
  const today = new Date().toDateString();
  const lastSeen = DB.get('lastSeen', null);
  let streak = DB.get('streak', 0);
  if (lastSeen !== today) {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    streak = (lastSeen === yesterday.toDateString()) ? streak + 1 : 1;
    DB.set('streak', streak);
    DB.set('lastSeen', today);
  }
  document.getElementById('streak-val').textContent = streak;
});

// ─── PERSONA ─────────────────────────────────────
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
  document.getElementById('persona-badge').textContent = p.emoji + ' ' + p.name;
  document.getElementById('profile-name').textContent = p.name;
  document.getElementById('profile-avatar').textContent = p.emoji;
  document.getElementById('market-persona-label').textContent = 'Based on your profile as a ' + p.name;
  selectedPersona = type;
}

function goBack() {
  DB.set('persona', null);
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-onboard').classList.add('active');
}

// ─── NAVIGATION ──────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('nav-' + tab).classList.add('active');
}

function openSheet(id) { document.getElementById('sheet-' + id).classList.add('open'); }
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

// ─── RENDER ──────────────────────────────────────
function renderAll() {
  renderObligations();
  renderGoals();
  renderCalendarEvents();
  updateHeader();
}

function renderObligations() {
  const expenses = DB.get('expenses', []);
  const list = document.getElementById('obligations-list');
  if (!list) return;
  const priorityMap = {
    critical: { color: 'var(--danger)', badge: '🔴 Critical', bgBadge: 'var(--danger-soft)', textBadge: 'var(--danger)' },
    tight:    { color: 'var(--warn)',   badge: '🟡 Tight',    bgBadge: 'var(--warn-soft)',   textBadge: 'var(--warn)' },
    safe:     { color: 'var(--accent)', badge: '🟢 Safe',     bgBadge: 'var(--accent-soft)', textBadge: 'var(--accent2)' },
  };
  const sorted = [...expenses].sort((a, b) => {
    const order = { critical: 0, tight: 1, safe: 2 };
    return (order[a.flex] ?? 9) - (order[b.flex] ?? 9);
  });
  list.innerHTML = sorted.map(e => {
    const p = priorityMap[e.flex] || priorityMap.safe;
    const dueStr = e.date ? new Date(e.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '';
    return `<div class="ob-card" onclick="showToast('${e.name} marked — taking action!')">
      <div class="ob-indicator" style="background:${p.color}"></div>
      <div class="ob-main">
        <div class="ob-name">${e.name}</div>
        <div class="ob-meta">Due ${dueStr}</div>
      </div>
      <div class="ob-right">
        <div class="ob-amount">₹${Number(e.amount).toLocaleString('en-IN')}</div>
        <div class="ob-badge" style="background:${p.bgBadge};color:${p.textBadge}">${p.badge}</div>
      </div>
    </div>`;
  }).join('');
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
          <div class="goal-foot"><span>₹${Number(g.saved).toLocaleString('en-IN')} saved</span><span>₹${Number(g.target).toLocaleString('en-IN')} goal · ${dateStr}</span></div>
        </div>`;
      }).join('');
  document.getElementById('goals-count').textContent = goals.length;
}

function renderCalendarEvents() {
  const expenses = DB.get('expenses', []);
  const invoices = DB.get('invoices', []);
  const calList = document.getElementById('calendar-events-list');
  if (!calList) return;

  const colorMap = { critical: { bg: 'var(--danger-soft)', text: 'var(--danger)' }, tight: { bg: 'var(--warn-soft)', text: 'var(--warn)' }, safe: { bg: 'var(--accent-soft)', text: 'var(--accent2)' } };2

  const expItems = expenses.map(e => {
    const d = e.date ? new Date(e.date) : null;
    const c = colorMap[e.flex] || colorMap.safe;
    const labelMap = { critical: '🔴 Critical · Cannot reschedule', tight: '🟡 Tight · Can delay with penalty', safe: '🟢 Safe · Flexible' };
    return `<div class="event-item">
      <div class="event-date-box" style="background:${c.bg}">
        <div class="event-day" style="color:${c.text}">${d ? d.getDate() : '-'}</div>
        <div class="event-mon" style="color:${c.text}">${d ? d.toLocaleString('en-IN',{month:'short'}).toUpperCase() : ''}</div>
      </div>
      <div class="event-info"><div class="event-name">${e.name}</div><div class="event-sub">${labelMap[e.flex]||''}</div></div>
      <div class="event-amt">₹${Number(e.amount).toLocaleString('en-IN')}</div>
    </div>`;
  });

  const invItems = invoices.map(i => {
    const d = i.date ? new Date(i.date) : null;
    return `<div class="event-item">
      <div class="event-date-box" style="background:var(--blue-soft)">
        <div class="event-day" style="color:var(--blue)">${d ? d.getDate() : '-'}</div>
        <div class="event-mon" style="color:var(--blue)">${d ? d.toLocaleString('en-IN',{month:'short'}).toUpperCase() : ''}</div>
      </div>
      <div class="event-info"><div class="event-name">${i.source}</div><div class="event-sub">💰 ${i.status}</div></div>
      <div class="event-amt" style="color:var(--accent)">+₹${Number(i.amount).toLocaleString('en-IN')}</div>
    </div>`;
  });

  calList.innerHTML = (expItems.join('') + invItems.join('')) || '<p style="font-size:13px;color:var(--muted);padding:20px 0;text-align:center;">No upcoming events. Add an expense or invoice!</p>';
}

function updateHeader() {
  const expenses = DB.get('expenses', []);
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const balEl = document.getElementById('header-balance');
  const oblEl = document.getElementById('header-obligations');
  if (oblEl) oblEl.textContent = `₹${total.toLocaleString('en-IN')} in obligations`;
  // Alert banner
  const criticals = expenses.filter(e => e.flex === 'critical');
  const alertEl = document.getElementById('home-alert');
  if (alertEl) {
    if (criticals.length > 0) {
      const c = criticals[0];
      alertEl.style.display = 'flex';
      alertEl.querySelector('.alert-text').innerHTML = `<strong>${c.name} is a critical obligation.</strong> Amount due: ₹${Number(c.amount).toLocaleString('en-IN')}. Pay this first — it cannot be rescheduled.`;
    } else {
      alertEl.style.display = 'none';
    }
  }
}

// ─── SAVE ACTIONS ─────────────────────────────────
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
  document.getElementById('exp-name').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-date').value = '';
  renderAll();
  showToast('Obligation added ✓');
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
  document.getElementById('inv-source').value = '';
  document.getElementById('inv-amount').value = '';
  document.getElementById('inv-date').value = '';
  renderAll();
  showToast('Invoice tracked ✓');
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
  document.getElementById('goal-name').value = '';
  document.getElementById('goal-target').value = '';
  document.getElementById('goal-date').value = '';
  document.getElementById('goal-saved').value = '';
  renderAll();
  showToast('Goal created! 🎯');
}

// ─── AI CHAT ──────────────────────────────────────
const aiResponses = {
  'How much can I save this month?': "Based on your current data: After paying all your obligations, I'll calculate a monthly surplus. Add your upcoming invoices and that should be your saveable amount. I'd suggest putting ₹500 into your Nifty SIP and ₹500 toward your current savings goal. 💪",
  'Which bill should I pay first?': "Pay your <strong>critical obligations first</strong> — they carry late penalties and cannot be rescheduled. Then handle 'tight' ones. 'Safe/flexible' ones can wait. This order keeps your finances intact and minimizes penalties. ✅",
  'Best investment for ₹1000?': "With ₹1,000 I'd split it: put ₹500 into a <strong>Nifty 50 Index Fund SIP</strong> (long-term, 12% avg returns) and ₹500 into a <strong>Recurring Deposit</strong> (safe, 6.8% guaranteed). Don't invest this money until after you've paid your critical obligations though! 📈",
  'Draft a follow-up to my client': "Here's a draft:<br><br><em>'Hi [Client], I hope you're doing well! I wanted to follow up on the invoice I sent for [project]. The payment is now due — could you let me know the expected payment date? Thank you and I appreciate working with you! — [Your name]'</em><br><br>Want me to adjust the tone — more formal or casual? 📧"
};

function askAI(question) {
  const input = document.getElementById('ai-input');
  input.value = question;
  sendAIMessage();
}

function sendAIMessage() {
  const input = document.getElementById('ai-input');
  const text = input.value.trim();
  if (!text) return;
  const msgs = document.getElementById('ai-messages');
  const userMsg = document.createElement('div');
  userMsg.className = 'msg user';
  userMsg.innerHTML = '<div class="msg-label">You</div><div class="msg-bubble">' + text + '</div>';
  msgs.appendChild(userMsg);
  input.value = '';
  const btn = document.getElementById('ai-send-btn');
  btn.disabled = true;
  btn.textContent = '···';
  setTimeout(() => {
    const aiMsg = document.createElement('div');
    aiMsg.className = 'msg ai';
    const response = aiResponses[text] || "Great question! Based on your current obligations and goals, I'd recommend staying conservative until your next expected income arrives. Want me to run a specific scenario for you? 🤔";
    aiMsg.innerHTML = '<div class="msg-label">Cashline AI</div><div class="msg-bubble">' + response + '</div>';
    msgs.appendChild(aiMsg);
    msgs.scrollTop = msgs.scrollHeight;
    btn.disabled = false;
    btn.textContent = '↑';
  }, 900);
  msgs.scrollTop = msgs.scrollHeight;
}
