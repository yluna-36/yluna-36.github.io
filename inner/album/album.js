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

function renderNote(note) {
  const body = document.createDocumentFragment();
  body.append(textElement('h2', note.title), textElement('time', note.date));
  for (const block of note.blocks) {
    if (block.image) {
      const image = new Image();
      image.alt = block.alt;
      const bytes = Uint8Array.from(atob(block.image), c => c.charCodeAt(0));
      image.src = URL.createObjectURL(new Blob([bytes], {type:'image/png'}));
      body.append(image);
    } else {
      body.append(textElement(block.heading ? 'h3' : 'p', block.heading || block.text));
    }
  }
  return body;
}

const profileTags = new Set(['h2', 'h3', 'p', 'em', 'del', 'strong', 'br', 'ul', 'li', 'a', 'blockquote']);
function renderProfileNode(node) {
  if (typeof node === 'string') return document.createTextNode(node);
  if (!profileTags.has(node.tag)) throw Error('Unknown text element');
  const element = document.createElement(node.tag);
  if (node.tag === 'a') {
    const url = new URL(node.href, location.origin);
    if (url.origin !== location.origin && url.protocol !== 'https:') throw Error('Invalid link');
    element.href = url.href;
    element.target = '_blank';
    element.rel = 'noopener noreferrer';
  }
  element.append(...node.kids.map(renderProfileNode));
  return element;
}

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
  function addReading(label, file, render) {
    const details = document.createElement('details');
    details.className = 'journal';
    const article = document.createElement('article');
    details.append(textElement('summary', label), article);
    let loaded = false;
    details.addEventListener('toggle', async () => {
      if (!details.open || loaded) return;
      loaded = true;
      article.textContent = '正在打开…';
      try {
        const data = JSON.parse(new TextDecoder().decode(await read(file)));
        article.replaceChildren(render(data));
      } catch {
        loaded = false;
        article.textContent = '未能打开，收起后可以重试。';
      }
    });
    document.querySelector('#albums').before(details);
  }
  addReading('读里站手记', 'note-1.bin', renderNote);
  addReading('读个人资料', 'record-2.bin', nodes => {
    const body = document.createDocumentFragment();
    body.append(...nodes.map(renderProfileNode));
    return body;
  });
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
