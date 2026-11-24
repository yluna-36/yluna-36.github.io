'use strict';
const $ = id => document.getElementById(id);
const api = 'https://firestore.googleapis.com/v1/projects/yluna-meet-20261124/databases/(default)/documents';
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
async function read(collection, key) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(api + '/' + collection + '/' + key, {
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller.signal
    });
    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) throw new Error();
    return (await res.json()).fields;
  } finally {
    clearTimeout(timeout);
  }
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
  if (Date.now() >= expires) reset('同步信息已过期，请稍后重新查看，或直接微信联系我。');
  else if (Date.now() >= nextStart) render();
}
$('unlock').onsubmit = async e => {
  e.preventDefault();
  const invite = $('invite').value.trim();
  if (!/^[A-Za-z0-9_-]{22}$/.test(invite)) { $('status').textContent='请检查邀请码是否复制完整。'; return; }
  const version = ++viewVersion;
  const submit = e.currentTarget.querySelector('button'); submit.disabled = true;
  $('status').textContent = '正在验证邀请码…';
  try {
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(invite));
    const key = [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
    const invitation = await read('invites',key);
    if (version !== viewVersion) return;
    if (!invitation?.enabled?.booleanValue) { reset('邀请码无效，请向我确认。'); return; }
    const data = await read('availability',key);
    if (version !== viewVersion) return;
    if (!data || !(Date.parse(data.expiresAt.timestampValue)>Date.now())) {
      reset('邀请码已确认，日历暂时没有近期同步的数据，可以直接微信问我。'); return;
    }
    expires = Date.parse(data.expiresAt.timestampValue);
    starts = (data.starts.arrayValue.values || []).map(slot=>Date.parse(slot.stringValue));
    $('updated').textContent = '上次同步于 '+display(Date.parse(data.updated.timestampValue),{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
    $('invite').value = ''; $('unlock').hidden = true; $('schedule').hidden = false;
    render(); timer = setInterval(checkTime,15000);
  } catch { if (version === viewVersion) reset('暂时连不上日历服务，请稍后重试。'); }
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
