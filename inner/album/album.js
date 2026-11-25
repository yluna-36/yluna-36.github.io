'use strict';
const statusLine = document.querySelector('#status');
const dialog = document.querySelector('dialog');
const full = document.querySelector('#full');
const photos = [];
let active = 0;
const textElement = (tag, text) => {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
};
function show(index) {
  active = (index + photos.length) % photos.length;
  const {title, description, url} = photos[active];
  full.src = url;
  full.alt = title;
  document.querySelector('#photo-title').textContent = title;
  document.querySelector('#caption').textContent = description;
  document.querySelector('#count').textContent = (active + 1) + ' / ' + photos.length;
  if (!dialog.open) dialog.showModal();
}
document.querySelector('#prev').onclick = () => show(active - 1);
document.querySelector('#next').onclick = () => show(active + 1);
document.querySelector('#close').onclick = () => dialog.close();
dialog.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') show(active - 1);
  if (e.key === 'ArrowRight') show(active + 1);
});
window.addEventListener('hashchange', () => location.reload());

async function unlock() {
  const token = new URLSearchParams(location.hash.slice(1)).get('k');
  if (!token) return;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw Error();
  statusLine.textContent = '正在打开相册…';
  const raw = Uint8Array.from(atob(token.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  async function read(name) {
    const response = await fetch('data/' + name, {credentials:'omit'});
    if (!response.ok) throw Error();
    const bytes = new Uint8Array(await response.arrayBuffer());
    return crypto.subtle.decrypt({name:'AES-GCM', iv:bytes.slice(0,12), additionalData:new TextEncoder().encode(name)}, key, bytes.slice(12));
  }
  const groups = JSON.parse(new TextDecoder().decode(await read('album.bin')));
  const sections = document.createDocumentFragment();
  for (const group of groups) {
    const section = document.createElement('section');
    section.append(textElement('h2', group.title), textElement('p', group.description));
    const grid = document.createElement('div');
    grid.className = 'grid';
    section.append(grid);
    sections.append(section);
    for (const photo of group.photos) {
      const index = photos.push(photo) - 1;
      const figure = document.createElement('figure');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', '查看大图：' + photo.title);
      const image = new Image();
      image.alt = photo.title;
      photo.url = URL.createObjectURL(new Blob([await read(photo.file)], {type:'image/jpeg'}));
      image.src = photo.url;
      button.append(image);
      button.onclick = () => show(index);
      const caption = textElement('figcaption', photo.title);
      caption.append(textElement('p', photo.description));
      figure.append(button, caption);
      grid.append(figure);
    }
  }
  document.querySelector('#albums').append(sections);
  statusLine.hidden = true;
}
unlock().catch(() => { statusLine.textContent = '相册未打开。请检查邀请链接是否完整，或稍后刷新重试。'; });
