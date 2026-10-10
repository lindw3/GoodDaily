const AREAS = [
  { id: 'physical', name: 'Physical well-being', icon: '◒', color: '#2675e8', ideas: ['Go to the gym', 'Go for a run or walk', 'Play a sport', 'Take an activity break during work or studying', 'Take the stairs instead of the elevator'] },
  { id: 'spiritual', name: 'Spiritual well-being', icon: '✧', color: '#42ae54', ideas: ['Think of a quote that moves you', 'Think of a word that inspires you', 'Reflect on what gives your life a sense of meaning', 'Pray', 'Reflect on the kind of person you aspire to be'] },
  { id: 'intellectual', name: 'Intellectual well-being', icon: '◈', color: '#f4b62b', ideas: ['Read something nourishing', 'Write about an interesting subject', 'Think deeply', 'Listen to or watch intellectually stimulating content'] },
  { id: 'relational', name: 'Relational well-being', icon: '♡', color: '#ff7155', ideas: ['Be kind to someone', 'Make a generous gesture', 'Give a compliment', 'Reach out to a friend to show your appreciation'] },
  { id: 'emotional', name: 'Emotional well-being', icon: '☼', color: '#7766c9', ideas: ['Observe your emotions without judging them', 'Focus on what you are grateful for', 'Take time to appreciate what is good in your life', 'Do something that you enjoy'] }
];

const KEY = 'gooddaily-data-v1';
let data = loadData();
let activeArea = null;
let editingCompletion = null;
const $ = (selector) => document.querySelector(selector);

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { settings: { disabled: [], ...(saved?.settings || {}) }, completions: Array.isArray(saved?.completions) ? saved.completions : [] };
  } catch { return { settings: { disabled: [] }, completions: [] }; }
}
function saveData() { localStorage.setItem(KEY, JSON.stringify(data)); }
function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}
function currentDayCompletions() { return data.completions.filter(item => item.date === localDate()); }
function isActive(area) { return !data.settings.disabled.includes(area.id); }
function escapeHTML(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function formatDate(date) { return new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${date}T12:00:00`)); }
function formatTime(timestamp) { return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(timestamp)); }

function renderToday() {
  $('#todayDate').textContent = formatDate(localDate());
  const todays = currentDayCompletions();
  const active = AREAS.filter(isActive);
  const completed = new Set(todays.map(item => item.areaId));
  const completedActive = active.filter(area => completed.has(area.id));
  $('#progressCount').textContent = `${completedActive.length} of ${active.length}`;
  $('#progressFill').style.width = `${active.length ? (completedActive.length / active.length) * 100 : 0}%`;
  $('#areaList').innerHTML = active.length ? active.map(area => {
    const done = completed.has(area.id);
    const completion = todays.find(item => item.areaId === area.id);
    return `<article class="area-card ${done ? 'done' : ''}" style="--area:${area.color}">
      <button class="area-open" data-note-area="${area.id}" aria-label="${done ? `Add or edit a note for ${area.name}` : `Complete ${area.name} with an optional note`}"><span class="area-marker">${area.icon}</span><span class="area-card-copy"><span class="area-card-title">${area.name}</span><span class="area-card-sub">${done ? (completion.note ? 'Completed · note added' : 'Completed today') : 'Add a note or tap the check'}</span></span></button>
      <button class="check" data-quick-area="${area.id}" aria-label="${done ? `Uncheck ${area.name}` : `Quickly complete ${area.name}`}" aria-pressed="${done}">✓</button>
    </article>`;
  }).join('') : '<div class="empty-state">Your daily checklist is empty. Use the settings button above to bring an area back when you are ready.</div>';
  const message = $('#completionMessage');
  message.hidden = !(active.length && completedActive.length === active.length);
  document.querySelectorAll('[data-note-area]').forEach(button => button.addEventListener('click', () => openNoteDialog(button.dataset.noteArea)));
  document.querySelectorAll('[data-quick-area]').forEach(button => button.addEventListener('click', () => quickComplete(button.dataset.quickArea)));
}

function quickComplete(areaId) {
  const existing = currentDayCompletions().find(item => item.areaId === areaId);
  if (existing) {
    data.completions = data.completions.filter(item => item !== existing);
    saveData(); renderToday(); renderHistory();
    return;
  }
  data.completions.push({ id: crypto.randomUUID?.() || String(Date.now()), areaId, date: localDate(), timestamp: new Date().toISOString(), note: '' });
  saveData(); renderToday(); renderHistory();
}

function openNoteDialog(areaId) {
  editingCompletion = currentDayCompletions().find(item => item.areaId === areaId) || null;
  activeArea = AREAS.find(area => area.id === areaId);
  $('#modalSymbol').textContent = activeArea.icon;
  $('#modalSymbol').style.background = activeArea.color;
  $('#noteTitle').textContent = activeArea.name;
  $('#noteInput').value = editingCompletion?.note || '';
  $('#completeButton').textContent = editingCompletion ? 'Save note' : 'Complete area';
  $('#noteDialog').showModal();
  setTimeout(() => $('#noteInput').focus(), 60);
}

$('#noteForm').addEventListener('submit', (event) => {
  if (event.submitter?.id !== 'completeButton' || !activeArea) return;
  event.preventDefault();
  if (editingCompletion) editingCompletion.note = $('#noteInput').value.trim();
  else data.completions.push({ id: crypto.randomUUID?.() || String(Date.now()), areaId: activeArea.id, date: localDate(), timestamp: new Date().toISOString(), note: $('#noteInput').value.trim() });
  saveData(); $('#noteDialog').close(); renderToday(); renderHistory();
});

function populateFilters() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = [...new Set([currentYear, ...data.completions.map(item => Number(item.date.slice(0, 4)))])].sort((a,b) => b-a);
  $('#monthSelect').innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index}">${new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2020, index, 1))}</option>`).join('');
  $('#yearSelect').innerHTML = years.map(year => `<option value="${year}">${year}</option>`).join('');
  $('#monthSelect').value = String(now.getMonth()); $('#yearSelect').value = String(currentYear);
}
function renderHistory() {
  const month = Number($('#monthSelect').value); const year = Number($('#yearSelect').value);
  const inPeriod = data.completions.filter(item => { const d = new Date(`${item.date}T12:00:00`); return d.getFullYear() === year && d.getMonth() === month; });
  $('#summaryTotal').textContent = `${inPeriod.length} completion${inPeriod.length === 1 ? '' : 's'}`;
  $('#summaryList').innerHTML = AREAS.map(area => { const count = inPeriod.filter(item => item.areaId === area.id).length; return `<div class="summary-row" style="--area:${area.color}"><span class="summary-dot"></span><span class="summary-name">${area.name}</span><span class="summary-count">${count} ${count === 1 ? 'day' : 'days'}</span></div>`; }).join('');
  const notes = inPeriod.filter(item => item.note).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  $('#notesList').innerHTML = notes.length ? notes.map(note => { const area = AREAS.find(item => item.id === note.areaId); return `<article class="note-card" style="--area:${area.color}"><div class="note-card-top"><span class="note-card-area">${area.name}</span><time datetime="${note.timestamp}">${formatTime(note.timestamp)}</time></div><p>${escapeHTML(note.note)}</p></article>`; }).join('') : '<div class="empty-state">No notes for this month yet. Add one when you complete an area to make your history more personal.</div>';
}
function renderSettings() {
  $('#areaToggles').innerHTML = AREAS.map(area => `<label class="toggle-row" style="--area:${area.color}"><span class="toggle-symbol">${area.icon}</span><span class="toggle-name">${area.name}</span><span class="switch"><input type="checkbox" data-toggle="${area.id}" ${isActive(area) ? 'checked' : ''}><span></span></span></label>`).join('');
  document.querySelectorAll('[data-toggle]').forEach(input => input.addEventListener('change', () => { const id = input.dataset.toggle; data.settings.disabled = input.checked ? data.settings.disabled.filter(item => item !== id) : [...data.settings.disabled, id]; saveData(); renderToday(); }));
}
function renderInspiration() { $('#inspirationList').innerHTML = AREAS.map(area => `<article class="inspiration-card" style="--area:${area.color}"><h2><span>${area.icon}</span>${area.name}</h2><ul>${area.ideas.map(idea => `<li>${idea}</li>`).join('')}</ul></article>`).join(''); }

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  const tab = button.dataset.tab;
  document.querySelectorAll('.nav-item').forEach(item => { item.classList.toggle('active', item === button); item.toggleAttribute('aria-current', item === button); });
  document.querySelectorAll('.screen').forEach(screen => screen.classList.toggle('active', screen.id === `${tab}Screen`));
  if (tab === 'history') { populateFilters(); renderHistory(); }
}));
$('#monthSelect').addEventListener('change', renderHistory); $('#yearSelect').addEventListener('change', renderHistory);
$('#settingsButton').addEventListener('click', () => { renderSettings(); $('#settingsDialog').showModal(); });

renderToday(); renderInspiration(); populateFilters(); renderHistory();
const isPhone = window.matchMedia('(max-width: 600px), (pointer: coarse)').matches;
const isInstalled = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (isPhone && !isInstalled && !sessionStorage.getItem('gooddaily-install-tip-seen')) {
  $('#installDialog').showModal();
  sessionStorage.setItem('gooddaily-install-tip-seen', 'true');
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
