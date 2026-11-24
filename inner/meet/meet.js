import {queryCalendar} from './live-client.js';
const $ = id => document.getElementById(id);
const display = (ms, options) => new Intl.DateTimeFormat('zh-CN', { timeZone:'Asia/Shanghai', ...options }).format(ms);
const day = ms => display(ms,{month:'long',day:'numeric',weekday:'long'});
const clock = ms => display(ms,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
let viewVersion = 0;
let expires = 0, nextStart = 0, starts = [], timer;
function reset(message) {
  viewVersion++;
  clearInterval(timer); expires = nextStart = 0; starts = [];
  $('schedule').hidden = $('selection').hidden = true;
  document.querySelector('.days').replaceChildren();
  $('unlock').hidden = false; $('invite').value = $('message').value = $('updated').textContent = $('copied').textContent = '';
  $('status').textContent = message;
}
function render() {
  const now = Date.now(), days = document.querySelector('.days');
  const future = starts.filter(ms => ms > now);
  nextStart = future[0] || expires; days.replaceChildren();
  $('selection').hidden = true; $('message').value = '';
  let times, previous;
  for (const ms of future) {
    const date = day(ms), time = clock(ms)+'–'+clock(ms+3600000);
    if (date !== previous) {
      const section = document.createElement('section'), heading = document.createElement('h3');
      section.className = 'day'; heading.textContent = date;
      times = document.createElement('div'); times.className = 'times';
      section.append(heading,times); days.append(section); previous = date;
    }
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = time; button.setAttribute('aria-pressed','false');
    button.onclick = () => {
      if (Date.now() >= expires || Date.now() >= ms) { checkTime(); return; }
      for (const b of days.querySelectorAll('[aria-pressed=true]')) b.setAttribute('aria-pressed','false');
      button.setAttribute('aria-pressed','true'); $('selection').hidden = false;
      $('message').value = date+' '+time+'（北京时间）方便吗？我想约这个时间。';
      $('copied').textContent = ''; $('copy').focus();
    };
    times.append(button);
  }
  $('status').textContent = future.length ? '' : '接下来两周暂时没有可约时段，可以直接微信问我。';
}
function checkTime() {
  if (!expires) return;
  if (Date.now() >= expires) reset('上次查询的时段已过期，请重新查看。');
  else if (Date.now() >= nextStart) render();
}
$('unlock').onsubmit = async e => {
  e.preventDefault();
  const invite = $('invite').value.trim();
  if (!/^[A-Za-z0-9_-]{22}$/.test(invite)) { $('status').textContent='请检查邀请码是否复制完整。'; return; }
  const version = ++viewVersion;
  const submit = e.currentTarget.querySelector('button'); submit.disabled = true;
  $('status').textContent = '正在查询苹果日历…';
  try {
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(invite));
    const key = [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
    const data = await queryCalendar(key);
    if (version !== viewVersion) return;
    const updated = Date.parse(data.updated);
    if (!Number.isFinite(updated)) throw new Error('offline');
    expires = updated + 5 * 60 * 1000;
    if (expires <= Date.now()) throw new Error('offline');
    starts = (data.starts || []).map(slot => Date.parse(slot));
    $('updated').textContent = '查询时间 '+display(updated,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    $('invite').value = ''; $('unlock').hidden = true; $('schedule').hidden = false;
    render(); timer = setInterval(checkTime,15000);
  } catch (error) {
    if (version === viewVersion) reset(error.message === 'invalid' ? '邀请码无效，请向我确认。' : '暂时查不到空档，Mac 可能正在休眠。可以直接微信问我。');
  }
  finally { submit.disabled = false; }
};
$('copy').onclick = async () => {
  checkTime(); if ($('selection').hidden) return;
  try { await navigator.clipboard.writeText($('message').value); $('copied').textContent = '已复制'; }
  catch { $('message').focus(); $('message').select(); $('copied').textContent = '请复制选中的文字'; }
};
$('lock').onclick = () => { reset('页面已锁定。'); $('invite').focus(); };
window.addEventListener('focus',checkTime);
window.addEventListener('pagehide',()=>reset(''));
document.addEventListener('visibilitychange',checkTime);
