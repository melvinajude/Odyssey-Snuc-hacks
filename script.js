// ── CASHLINE SCRIPT ──
const DB = {
  get: (k, d) => { try { return JSON.parse(localStorage.getItem('cashline_' + k)) ?? d; } catch { return d; } },
  set: (k, v) => localStorage.setItem('cashline_' + k, JSON.stringify(v)),
};

const DEFAULTS = {
  expenses: [
    { id:1, name:'Hostel Rent',      amount:5000, date:'2026-04-01', flex:'critical' },
    { id:2, name:'Electricity Bill', amount:800,  date:'2026-04-05', flex:'tight'    },
    { id:3, name:'Internet Recharge',amount:500,  date:'2026-04-10', flex:'safe'     },
  ],
  goals: [
    { id:1, name:'💻 New Laptop', target:20000, saved:12400, date:'2026-06-01' },
    { id:2, name:'✈️ Trip to Goa', target:10000, saved:2800,  date:'2026-12-01' },
  ],
  invoices: [
    { id:1, source:'Aryan Design Co.', amount:4000, date:'2026-04-10', status:'pending' },
    { id:2, source:'Rahul Ventures',   amount:7500, date:'2026-03-28', status:'overdue' },
    { id:3, source:'Sneha Creatives',  amount:2500, date:'2026-03-20', status:'paid'    },
  ],
  transactions: [
    { id:1, name:'Scholarship received', amount:12500, date:'2026-04-01', type:'income'  },
    { id:2, name:'Canteen lunch',         amount:120,   date:'2026-04-02', type:'expense' },
    { id:3, name:'Zomato order',          amount:340,   date:'2026-04-03', type:'expense' },
    { id:4, name:'Freelance project',     amount:4000,  date:'2026-04-03', type:'income'  },
  ],
};

const personaMap = {
  school:     { label:'🎒 School Student', name:'School Student',  emoji:'🎒' },
  college:    { label:'🎓 College Student',name:'College Student', emoji:'🎓' },
  freelancer: { label:'💻 Freelancer',     name:'Freelancer',      emoji:'💻' },
  other:      { label:'✨ User',            name:'User',            emoji:'✨' },
};

let selectedPersona = null;
let invoiceFilter   = 'all';

// ── BOOTSTRAP ──
window.addEventListener('DOMContentLoaded', () => {
  // Seed defaults if empty
  Object.entries(DEFAULTS).forEach(([k,v]) => { if (!localStorage.getItem('cashline_'+k)) DB.set(k, v); });

  // Streak
  const today = new Date().toDateString();
  const last  = DB.get('lastSeen', null);
  let streak  = DB.get('streak', 0);
  if (last !== today) {
    const yd = new Date(); yd.setDate(yd.getDate()-1);
    streak = (last === yd.toDateString()) ? streak+1 : 1;
    DB.set('streak', streak); DB.set('lastSeen', today);
  }
  const sv = document.getElementById('streak-val'); if (sv) sv.textContent = streak;

  // Resume session
  const saved = DB.get('persona', null);
  if (saved) {
    applyPersona(saved);
    document.getElementById('landing').style.display = 'none';
    document.getElementById('screen-app').classList.add('active');
    renderAll();
  }

  // AI enter key
  const ai = document.getElementById('ai-input');
  if (ai) ai.addEventListener('keydown', e => { if (e.key==='Enter') { e.preventDefault(); sendAIMessage(); } });

  initLanding();
});

// ── LANDING ──
function initLanding() {
  const nav = document.getElementById('topnav');
  if (nav) window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY>20), {passive:true});

  const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('revealed'); }), {threshold:.12});
  document.querySelectorAll('.scroll-reveal').forEach(el => io.observe(el));

  // Persona tabs
  const tabItems = document.querySelectorAll('.tab-item');
  tabItems.forEach(t => t.addEventListener('click', () => {
    tabItems.forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.stage-panel').forEach(p => p.classList.remove('active'));
    t.classList.add('active');
    const panel = document.getElementById('panel-'+t.dataset.tab);
    if (panel) panel.classList.add('active');
    positionPill();
    if (t.dataset.tab==='student') setTimeout(() => { const f=document.getElementById('semFill'); if (f) f.style.width='68%'; }, 100);
    if (t.dataset.tab==='freelancer') setTimeout(drawGraph, 100);
  }));
  window.addEventListener('resize', positionPill);
  setTimeout(() => { positionPill(); const f=document.getElementById('semFill'); if (f) f.style.width='68%'; }, 300);

  // Toggles
  ['tog1','tog2'].forEach(id => {
    const t = document.getElementById(id); if (!t) return;
    t.addEventListener('click', () => {
      const on = t.classList.toggle('on');
      const card = t.closest('.control-card');
      if (card) { const v=card.querySelector('.control-val'); if (v) v.textContent=on?'On':'Off'; }
    });
  });

  // Sliders
  const iSlider=document.getElementById('incomeSlider'), iVal=document.getElementById('incomeVal');
  if (iSlider&&iVal) iSlider.addEventListener('input', ()=>{ iVal.textContent='₹'+parseInt(iSlider.value).toLocaleString('en-IN'); });
  const bSlider=document.getElementById('bufferSlider'), bVal=document.getElementById('bufferVal');
  if (bSlider&&bVal) bSlider.addEventListener('input', ()=>{ bVal.textContent=bSlider.value+'%'; });
}

function positionPill() {
  const tabs=document.getElementById('personaTabs');
  const active=tabs&&tabs.querySelector('.tab-item.active');
  const pill=document.getElementById('tabPill');
  if (!active||!pill) return;
  if (window.innerWidth<=680) {
    pill.style.cssText=`left:${active.offsetLeft}px;top:0;bottom:0;width:${active.offsetWidth}px;height:auto;right:auto`;
  } else {
    pill.style.cssText=`top:${active.offsetTop}px;left:0;right:0;height:${active.offsetHeight}px`;
  }
}

function drawGraph() {
  const svg=document.getElementById('velGraph'); if (!svg) return;
  const W=520,H=180,pad=24;
  const raw=[80,45,110,30,95,140,55,120,85,60,130,100];
  const proj=[95,90,100,95,100,105,100,108,105,108,112,115];
  const max=155,min=25;
  const sc=v=>pad+(H-2*pad)*(1-(v-min)/(max-min));
  const sx=i=>pad+(W-2*pad)*i/(raw.length-1);
  const pts=arr=>arr.map((v,i)=>`${sx(i)},${sc(v)}`).join(' ');
  const rawArea=raw.map((v,i)=>`${sx(i)},${sc(v)}`).join(' L ');
  const projArea=proj.map((v,i)=>`${sx(i)},${sc(v)}`).join(' L ');
  svg.innerHTML=`<defs>
    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c2ccff" stop-opacity="0.4"/><stop offset="100%" stop-color="#c2ccff" stop-opacity="0"/></linearGradient>
    <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a47ff" stop-opacity="0.12"/><stop offset="100%" stop-color="#1a47ff" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="M ${rawArea} L ${sx(raw.length-1)},${H-pad} L ${sx(0)},${H-pad} Z" fill="url(#rg)"/>
  <polyline points="${pts(raw)}" fill="none" stroke="#c2ccff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M ${projArea} L ${sx(proj.length-1)},${H-pad} L ${sx(0)},${H-pad} Z" fill="url(#pg)"/>
  <polyline points="${pts(proj)}" fill="none" stroke="#1a47ff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="520" stroke-dashoffset="520">
    <animate attributeName="stroke-dashoffset" from="520" to="0" dur="1.2s" fill="freeze" begin="0.1s"/>
  </polyline>
  ${proj.map((v,i)=>`<circle cx="${sx(i)}" cy="${sc(v)}" r="3.5" fill="#1a47ff" opacity="0"><animate attributeName="opacity" from="0" to="1" dur="0.2s" begin="${.1+i*.08}s" fill="freeze"/></circle>`).join('')}`;
}

// ── NAVIGATION ──
function showOnboarding() {
  document.getElementById('landing').style.display='none';
  document.getElementById('screen-onboard').classList.add('active');
  document.getElementById('screen-app').classList.remove('active');
}

function showLanding() {
  DB.set('persona',null);
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-onboard').classList.remove('active');
  document.getElementById('landing').style.display='block';
  selectedPersona=null;
  document.querySelectorAll('.ob-persona-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('ob-btn').disabled=true;
}

function selectPersona(el, type) {
  document.querySelectorAll('.ob-persona-card').forEach(c=>c.classList.remove('selected'));
  el.classList.add('selected');
  selectedPersona=type;
  document.getElementById('ob-btn').disabled=false;
}

function enterApp() {
  if (!selectedPersona) return;
  DB.set('persona',selectedPersona);
  applyPersona(selectedPersona);
  document.getElementById('screen-onboard').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');
  renderAll();
}

function applyPersona(type) {
  const p=personaMap[type]||personaMap.other;
  const badge=document.getElementById('persona-badge');
  const pname=document.getElementById('profile-name');
  const pavat=document.getElementById('profile-avatar');
  const mLabel=document.getElementById('market-persona-label');
  if (badge) badge.textContent=p.label;
  if (pname) pname.textContent=p.name;
  if (pavat) pavat.textContent=p.emoji;
  if (mLabel) mLabel.textContent='Suggested for '+p.name;
  selectedPersona=type;
}

function appSwitchTab(tab) {
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.abn-item').forEach(n=>n.classList.remove('active'));
  const tc=document.getElementById('tab-'+tab);
  const ni=document.getElementById('nav-'+tab);
  if (tc) tc.classList.add('active');
  if (ni) ni.classList.add('active');
}

function openSheet(id)   { document.getElementById('sheet-'+id).classList.add('open'); }
function closeSheet(e,id){ if (!e||e.target===document.getElementById('sheet-'+id)) document.getElementById('sheet-'+id).classList.remove('open'); }

let toastTmr;
function showToast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTmr);
  toastTmr=setTimeout(()=>t.classList.remove('show'),2500);
}

// ── RENDER ──
function renderAll() {
  renderObligations(); renderGoals(); renderTransactions(); renderInvoices(); renderCalEvents(); updateHeader();
}

function updateHeader() {
  const expenses=DB.get('expenses',[]);
  const total=expenses.reduce((s,e)=>s+Number(e.amount),0);
  const oblEl=document.getElementById('header-obligations');
  if (oblEl) oblEl.innerHTML=`<span class="badge badge-red-sm">₹${total.toLocaleString('en-IN')} obligations</span>`;
  const criticals=expenses.filter(e=>e.flex==='critical');
  const alertEl=document.getElementById('home-alert');
  const alertTxt=document.getElementById('alert-text-content');
  if (alertEl&&alertTxt) {
    if (criticals.length>0) {
      alertEl.style.display='flex';
      alertTxt.innerHTML=`<strong>${criticals[0].name} is critical.</strong> ₹${Number(criticals[0].amount).toLocaleString('en-IN')} — cannot be rescheduled.`;
    } else { alertEl.style.display='none'; }
  }
}

function renderObligations() {
  const expenses=DB.get('expenses',[]);
  const list=document.getElementById('obligations-list'); if (!list) return;
  const pm={
    critical:{order:0,cls:'critical',badge:{ bg:'var(--red-lt)',col:'var(--red)',lbl:'🔴 Critical'}},
    tight:   {order:1,cls:'tight',   badge:{ bg:'var(--warn-lt)',col:'var(--warn)',lbl:'🟡 Tight'}},
    safe:    {order:2,cls:'safe',    badge:{ bg:'var(--green-lt)',col:'#00856a',  lbl:'🟢 Safe'}},
  };
  const sorted=[...expenses].sort((a,b)=>(pm[a.flex]?.order??9)-(pm[b.flex]?.order??9));
  list.innerHTML=sorted.map(e=>{
    const p=pm[e.flex]||pm.safe;
    const ds=e.date?new Date(e.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'}):'';
    return `<div class="ob-card ${p.cls}" onclick="showToast('${e.name} — taking action!')">
      <div style="flex:1"><div class="ob-name">${e.name}</div><div class="ob-meta">Due ${ds}</div></div>
      <div class="ob-right">
        <div class="ob-amount">₹${Number(e.amount).toLocaleString('en-IN')}</div>
        <div class="badge" style="background:${p.badge.bg};color:${p.badge.col}">${p.badge.lbl}</div>
      </div>
    </div>`;
  }).join('');
  const st=document.getElementById('stat-expenses');
  if (st) st.textContent='₹'+expenses.reduce((s,e)=>s+Number(e.amount),0).toLocaleString('en-IN');
}

function renderGoals() {
  const goals=DB.get('goals',[]);
  const list=document.getElementById('goals-list'); if (!list) return;
  list.innerHTML=goals.length===0
    ? '<p style="font-size:13px;color:var(--muted);padding:16px 0;text-align:center">No goals yet — tap + Add to create one!</p>'
    : goals.map(g=>{
        const pct=Math.min(100,Math.round((g.saved/g.target)*100));
        const ds=g.date?new Date(g.date).toLocaleDateString('en-IN',{month:'short',year:'numeric'}):'';
        return `<div class="goal-card">
          <div class="goal-top"><div class="goal-name">${g.name}</div><div class="goal-pct">${pct}%</div></div>
          <div class="goal-bar-track"><div class="goal-bar-fill" style="width:${pct}%"></div></div>
          <div class="goal-foot"><span>₹${Number(g.saved).toLocaleString('en-IN')} saved</span><span>₹${Number(g.target).toLocaleString('en-IN')} · ${ds}</span></div>
        </div>`;
      }).join('');
  const gc=document.getElementById('goals-count'); if (gc) gc.textContent=goals.length;
  const ss=document.getElementById('stat-saved');
  if (ss) ss.textContent='₹'+goals.reduce((s,g)=>s+Number(g.saved),0).toLocaleString('en-IN');
}

function renderTransactions() {
  const txns=DB.get('transactions',[]);
  const doRender=(id,limit=999)=>{
    const list=document.getElementById(id); if (!list) return;
    const sorted=[...txns].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,limit);
    list.innerHTML=sorted.length===0
      ? '<p style="font-size:13px;color:var(--muted);padding:16px 0;text-align:center">No transactions yet.</p>'
      : sorted.map(t=>{
          const icon=t.type==='income'?'📥':'📤';
          const ds=t.date?new Date(t.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'}):'';
          return `<div class="txn-row ${t.type}">
            <div class="txn-icon">${icon}</div>
            <div class="txn-meta"><h4>${t.name}</h4><span>${ds}</span></div>
            <div class="txn-amount">${t.type==='income'?'+':'-'}₹${Number(t.amount).toLocaleString('en-IN')}</div>
          </div>`;
        }).join('');
  };
  doRender('recent-transactions',4);
  doRender('transaction-list');
}

function renderInvoices() {
  const invoices=DB.get('invoices',[]);
  const list=document.getElementById('invoice-list'); if (!list) return;
  const filtered=invoiceFilter==='all'?invoices:invoices.filter(i=>i.status===invoiceFilter);
  const labels={pending:'⏳ Pending',overdue:'🚨 Overdue',paid:'✅ Paid'};
  list.innerHTML=filtered.length===0
    ? '<p style="font-size:13px;color:var(--muted);padding:16px 0;text-align:center">No invoices here.</p>'
    : filtered.map(i=>{
        const ds=i.date?new Date(i.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'}):'';
        return `<div class="inv-row ${i.status||'pending'}">
          <div class="inv-dot"></div>
          <div class="inv-info"><div class="inv-source">${i.source}</div><div class="inv-date">Expected by ${ds}</div></div>
          <div class="inv-amount">₹${Number(i.amount).toLocaleString('en-IN')}</div>
          <div class="inv-badge">${labels[i.status]||labels.pending}</div>
        </div>`;
      }).join('');
}

function filterInvoices(type,btn) {
  invoiceFilter=type;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderInvoices();
}

function renderCalEvents() {
  const expenses=DB.get('expenses',[]);
  const invoices=DB.get('invoices',[]);
  const list=document.getElementById('calendar-events-list'); if (!list) return;
  const pc={critical:{bg:'var(--red-lt)',col:'var(--red)'},tight:{bg:'var(--warn-lt)',col:'var(--warn)'},safe:{bg:'var(--green-lt)',col:'#00856a'}};
  const expHtml=expenses.map(e=>{
    const d=e.date?new Date(e.date):null;
    const c=pc[e.flex]||pc.safe;
    return `<div class="event-row">
      <div class="ev-date-box" style="background:${c.bg}"><div class="ev-day" style="color:${c.col}">${d?d.getDate():'-'}</div><div class="ev-mon" style="color:${c.col}">${d?d.toLocaleString('en-IN',{month:'short'}).toUpperCase():''}</div></div>
      <div class="ev-info"><div class="ev-name">${e.name}</div><div class="ev-sub">${e.flex==='critical'?'🔴 Critical':e.flex==='tight'?'🟡 Tight':'🟢 Safe'}</div></div>
      <div class="ev-amt">₹${Number(e.amount).toLocaleString('en-IN')}</div>
    </div>`;
  });
  const invHtml=invoices.map(i=>{
    const d=i.date?new Date(i.date):null;
    const bg=i.status==='overdue'?'var(--red-lt)':i.status==='paid'?'var(--green-lt)':'var(--blue-lt)';
    const col=i.status==='overdue'?'var(--red)':i.status==='paid'?'#00856a':'var(--blue)';
    return `<div class="event-row">
      <div class="ev-date-box" style="background:${bg}"><div class="ev-day" style="color:${col}">${d?d.getDate():'-'}</div><div class="ev-mon" style="color:${col}">${d?d.toLocaleString('en-IN',{month:'short'}).toUpperCase():''}</div></div>
      <div class="ev-info"><div class="ev-name">${i.source}</div><div class="ev-sub">💰 Invoice · ${i.status}</div></div>
      <div class="ev-amt" style="color:var(--blue)">+₹${Number(i.amount).toLocaleString('en-IN')}</div>
    </div>`;
  });
  list.innerHTML=(expHtml.join('')+invHtml.join(''))||'<p style="font-size:13px;color:var(--muted);padding:16px 0;text-align:center">No events. Add an expense or invoice!</p>';
}

// ── SAVE ──
function saveExpense() {
  const name=document.getElementById('exp-name').value.trim();
  const amount=document.getElementById('exp-amount').value;
  const date=document.getElementById('exp-date').value;
  const flex=document.getElementById('exp-flex').value;
  if (!name||!amount) { showToast('Please enter name and amount.'); return; }
  const ex=DB.get('expenses',[]); ex.push({id:Date.now(),name,amount:Number(amount),date,flex});
  DB.set('expenses',ex); closeSheet(null,'add-expense');
  ['exp-name','exp-amount','exp-date'].forEach(id=>document.getElementById(id).value='');
  renderAll(); showToast('Obligation added ✓');
}

function saveInvoice() {
  const source=document.getElementById('inv-source').value.trim();
  const amount=document.getElementById('inv-amount').value;
  const date=document.getElementById('inv-date').value;
  const status=document.getElementById('inv-status').value;
  if (!source||!amount) { showToast('Please enter client and amount.'); return; }
  const inv=DB.get('invoices',[]); inv.push({id:Date.now(),source,amount:Number(amount),date,status});
  DB.set('invoices',inv); closeSheet(null,'add-invoice');
  ['inv-source','inv-amount','inv-date'].forEach(id=>document.getElementById(id).value='');
  renderAll(); showToast('Invoice tracked ✓');
}

function saveGoal() {
  const name=document.getElementById('goal-name').value.trim();
  const target=document.getElementById('goal-target').value;
  const date=document.getElementById('goal-date').value;
  const saved=document.getElementById('goal-saved').value||'0';
  if (!name||!target) { showToast('Please enter goal name and target.'); return; }
  const gl=DB.get('goals',[]); gl.push({id:Date.now(),name,target:Number(target),saved:Number(saved),date});
  DB.set('goals',gl); closeSheet(null,'add-goal');
  ['goal-name','goal-target','goal-date','goal-saved'].forEach(id=>document.getElementById(id).value='');
  renderAll(); showToast('Goal created! 🎯');
}

function saveTransaction() {
  const name=document.getElementById('txn-name').value.trim();
  const amount=document.getElementById('txn-amount').value;
  const date=document.getElementById('txn-date').value||new Date().toISOString().split('T')[0];
  const type=document.getElementById('txn-type').value;
  if (!name||!amount) { showToast('Please enter description and amount.'); return; }
  const txns=DB.get('transactions',[]); txns.push({id:Date.now(),name,amount:Number(amount),date,type});
  DB.set('transactions',txns); closeSheet(null,'add-transaction');
  ['txn-name','txn-amount','txn-date'].forEach(id=>document.getElementById(id).value='');
  renderAll(); showToast('Transaction logged ✓');
}

// ── AI ──
const AI_RESPONSES = {
  'How much can I save this month?': "Based on your data: after paying all obligations, your projected surplus is <strong>₹1,940</strong>. Put ₹1,000 into your goals, keep ₹940 as buffer. 💪",
  'Which bill should I pay first?':   "Pay <strong>critical obligations</strong> first — they carry penalties and cannot be rescheduled. Then tight, then safe/flexible ones. ✅",
  'Best investment for ₹1000?':       "Split it: ₹500 into a <strong>Nifty 50 SIP</strong> (12% avg) and ₹500 into an <strong>RD</strong> (6.8% guaranteed). Invest only after paying critical bills! 📈",
  'Draft a follow-up to my client':    "Draft:<br><br><em>Hi [Client], following up on the invoice for [project]. Payment is now due — could you share an ETA? Thanks! — [Your name]</em><br><br>Want me to adjust the tone? 📧",
};

function askAI(q) { const i=document.getElementById('ai-input'); i.value=q; sendAIMessage(); }

function sendAIMessage() {
  const input=document.getElementById('ai-input');
  const text=input.value.trim(); if (!text) return;
  const msgs=document.getElementById('ai-messages');
  const userEl=document.createElement('div'); userEl.className='ai-msg user';
  userEl.innerHTML=`<div class="ai-bubble">${text}</div>`;
  msgs.appendChild(userEl); input.value='';
  const btn=document.getElementById('ai-send-btn'); btn.disabled=true; btn.textContent='···';
  setTimeout(()=>{
    const botEl=document.createElement('div'); botEl.className='ai-msg bot';
    const resp=AI_RESPONSES[text]||"Great question! Based on your current obligations and goals, I'd stay conservative until your next expected income. Use the cash forecast chart for planning. 🤔";
    botEl.innerHTML=`<div class="ai-avatar">🤖</div><div class="ai-bubble">${resp}</div>`;
    msgs.appendChild(botEl); msgs.scrollTop=msgs.scrollHeight;
    btn.disabled=false; btn.textContent='→';
  },900);
  msgs.scrollTop=msgs.scrollHeight;
}
