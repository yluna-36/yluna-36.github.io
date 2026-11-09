import { constrain, goalFor, distanceTo, isAligned } from './geometry.mjs';

const scene = document.querySelector('#scene');
const moon = document.querySelector('#moon');
const orb = document.querySelector('#orb');
const feedback = document.querySelector('#feedback');
const arrival = document.querySelector('#arrival');
const tools = document.querySelector('#puzzle-tools');
const hint = document.querySelector('#hint');
const hintButton = document.querySelector('#hint-button');
const returnLink = document.querySelector('#return-link');
const STORAGE_KEY = 'yluna-moon-entry-v1';
let point = { x: .28, y: .63 };
let solved = false;
let drag = null;
let hintIndex = 0;
let keyTimer;
let settleFrame;
const hints = [
  '月亮缺的那一角，恰好留得下一个小小的世界。',
  '让月亮靠近那颗蓝色的小球。留意月光的回应。',
  '用月亮右上方的缺口，轻轻包住小球，再松开手。也可以点「不用拖动」。'
];

function metrics() {
  const r = scene.getBoundingClientRect();
  const o = orb.getBoundingClientRect();
  const size = moon.offsetWidth;
  const goal = goalFor({ x: o.x + o.width / 2 - r.x, y: o.y + o.height / 2 - r.y }, size);
  return { width: r.width, height: r.height, size, goal, rect: r };
}
function draw() {
  const m = metrics();
  const p = solved ? m.goal : constrain({ x: point.x * m.width, y: point.y * m.height }, m.width, m.height, m.size);
  point = { x: p.x / m.width, y: p.y / m.height };
  moon.style.left = `${point.x * 100}%`;
  moon.style.top = `${point.y * 100}%`;
  const distance = distanceTo(p, m.goal);
  const near = Math.max(0, 1 - distance / (Math.min(m.width, m.height) * .8));
  scene.style.setProperty('--near', String(solved ? 1 : near));
  if (solved) return;
  const copy = isAligned(p, m.goal, m.size) ? (drag ? '就是这里，轻轻松手。' : '月光正在合拢。') : near > .7 ? '再靠近一点点，月光认得这个方向。' : near > .35 ? '有一束微光，正在回应你。' : '夜色安静，月光尚未相逢。';
  if (feedback.textContent !== copy) feedback.textContent = copy;
}
function moveTo(x, y) {
  const m = metrics();
  const p = constrain({ x, y }, m.width, m.height, m.size);
  point = { x: p.x / m.width, y: p.y / m.height };
  draw();
}
function finishIfAligned() {
  if (solved) return;
  const m = metrics();
  if (!isAligned({ x: point.x * m.width, y: point.y * m.height }, m.goal, m.size)) return;
  solved = true;
  clearTimeout(keyTimer);
  document.body.classList.add('solved');
  tools.hidden = true;
  arrival.hidden = false;
  moon.setAttribute('aria-label', '月亮已经环抱住小球');
  moon.setAttribute('aria-disabled', 'true');
  moon.tabIndex = -1;
  try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) { /* The puzzle works without storage. */ }
  draw();
  settleFrame = requestAnimationFrame(() => {
    document.querySelector('#arrival-title').focus({ preventScroll: true });
    arrival.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
}

moon.addEventListener('pointerdown', event => {
  if (solved || drag || !event.isPrimary || event.button !== 0) return;
  clearTimeout(keyTimer);
  const m = metrics();
  drag = { id: event.pointerId, dx: event.clientX - m.rect.x - point.x * m.width, dy: event.clientY - m.rect.y - point.y * m.height };
  moon.setPointerCapture(event.pointerId);
  moon.classList.add('is-dragging');
});
moon.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  const r = scene.getBoundingClientRect();
  moveTo(event.clientX - r.x - drag.dx, event.clientY - r.y - drag.dy);
});
function endDrag(event, check) {
  if (!drag || drag.id !== event.pointerId) return;
  drag = null;
  moon.classList.remove('is-dragging');
  if (moon.hasPointerCapture(event.pointerId)) moon.releasePointerCapture(event.pointerId);
  if (check) finishIfAligned();
}
moon.addEventListener('pointerup', event => endDrag(event, true));
moon.addEventListener('pointercancel', event => endDrag(event, false));
moon.addEventListener('lostpointercapture', event => endDrag(event, false));
const directions = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
function nudge(direction, step = 12) {
  if (solved || drag) return;
  const m = metrics();
  const [dx, dy] = directions[direction];
  moveTo(point.x * m.width + dx * step, point.y * m.height + dy * step);
  clearTimeout(keyTimer);
  keyTimer = setTimeout(finishIfAligned, 350);
}
moon.addEventListener('keydown', event => {
  const direction = event.key.replace('Arrow', '').toLowerCase();
  if (!directions[direction]) return;
  event.preventDefault();
  nudge(direction, event.shiftKey ? 4 : 12);
});
document.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => nudge(button.dataset.direction)));
hintButton.addEventListener('click', () => {
  hint.textContent = hints[Math.min(hintIndex, hints.length - 1)];
  hintIndex++;
  if (hintIndex >= hints.length) hintButton.textContent = '✧ 月光都借给你了';
});
document.querySelector('#replay').addEventListener('click', () => {
  cancelAnimationFrame(settleFrame);
  clearTimeout(keyTimer);
  solved = false;
  point = { x: .28, y: .63 };
  hintIndex = 0;
  hint.textContent = '';
  hintButton.innerHTML = '<span aria-hidden="true">✧</span> 借一点月光';
  document.body.classList.remove('solved');
  tools.hidden = false;
  arrival.hidden = true;
  document.querySelector('#alternative').open = false;
  moon.removeAttribute('aria-disabled');
  moon.setAttribute('aria-label', '移动月亮');
  moon.tabIndex = 0;
  returnLink.hidden = false;
  draw();
  moon.focus({ preventScroll: true });
  scene.scrollIntoView({ block: 'center', behavior: 'auto' });
});
try { returnLink.hidden = localStorage.getItem(STORAGE_KEY) !== '1'; } catch (_) { /* Optional revisit shortcut. */ }
const resize = new ResizeObserver(() => {
  if (drag) endDrag({ pointerId: drag.id }, false);
  clearTimeout(keyTimer);
  draw();
});
resize.observe(scene);
draw();
