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

const inviteDatabase = 'https://yluna-meet-20261124-default-rtdb.asia-southeast1.firebasedatabase.app/friendAccess/';
function decodeToken(text) {
  return Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}

async function inviteRequest(path, data) {
  const options = {credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer'};
  if (data) {
    options.method = 'PUT';
    options.body = JSON.stringify(data);
  }
  const response = await fetch(inviteDatabase + path + '.json' + (data ? '?print=silent' : ''), options);
  if (!response.ok) throw Error('Invitation service unavailable');
  if (!data) return response.json();
}

const unlockForm = document.querySelector('#unlock-form');
const privateAccess = document.querySelector('#private-access');
const privateStatus = document.querySelector('#private-status');
unlockForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const link = new URL(document.querySelector('#invitation').value.trim());
    if (link.origin !== location.origin || link.pathname !== '/inner/album/' ||
        !/^#(?:k|i)=[A-Za-z0-9_-]{43}$/.test(link.hash)) throw Error();
    unlockForm.reset();
    if (link.hash === location.hash) location.reload();
    else location.replace(link.hash);
  } catch {
    privateStatus.textContent = '请粘贴本站的完整邀请链接。';
  }
});

function makeReader(key, folder) {
  return async function read(name) {
    const response = await fetch(folder + name, {credentials:'omit'});
    if (!response.ok) throw Error('File unavailable');
    const bytes = new Uint8Array(await response.arrayBuffer());
    return crypto.subtle.decrypt({name:'AES-GCM', iv:bytes.slice(0,12), additionalData:new TextEncoder().encode(name)}, key, bytes.slice(12));
  };
}

async function openWithInvite(token, personal) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw Error();
  let raw = decodeToken(token);
  let inviteId;
  if (personal) {
    document.querySelector('#invite-notice').hidden = false;
    const hash = await crypto.subtle.digest('SHA-256', raw);
    inviteId = Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
    await inviteRequest('opens/' + inviteId, {'.sv':'timestamp'});
    const envelope = decodeToken(await inviteRequest('envelopes/' + inviteId));
    const wrappingKey = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    raw = await crypto.subtle.decrypt({
      name:'AES-GCM', iv:envelope.slice(0, 12),
      additionalData:new TextEncoder().encode('album-invite:' + inviteId)
    }, wrappingKey, envelope.slice(12));
  }
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  const read = makeReader(key, 'data/');
  await showPhotos(read);
  if (personal) {
    await inviteRequest('usage/' + inviteId, {count:{'.sv':{increment:1}}, last:{'.sv':'timestamp'}});
  }
  showPrivateReadings(read);
}

function showPrivateReadings(read) {
  const readings = document.createDocumentFragment();
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
    readings.append(details);
  }
  addReading('读里站手记', 'note-1.bin', renderNote);
  addReading('读个人资料', 'record-2.bin', nodes => {
    const body = document.createDocumentFragment();
    body.append(...nodes.map(renderProfileNode));
    return body;
  });
  privateAccess.replaceWith(readings);
}

async function showPhotos(read) {
  const groups = JSON.parse(new TextDecoder().decode(await read('album.bin')));
  const sections = document.createDocumentFragment();
  const imageLoads = [];
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
      imageLoads.push(read(photo.file).then(bytes => {
        photo.url = URL.createObjectURL(new Blob([bytes], {type:'image/jpeg'}));
        image.src = photo.url;
      }));
      button.append(image);
      button.onclick = () => show(index);
      const caption = textElement('figcaption', photo.title);
      caption.append(textElement('p', photo.description));
      figure.append(button, caption);
      grid.append(figure);
    }
  }
  await Promise.all(imageLoads);
  document.querySelector('#albums').replaceChildren(sections);
  statusLine.hidden = true;
}

async function openAlbum() {
  const params = new URLSearchParams(location.hash.slice(1));
  const personal = params.has('i');
  const token = params.get(personal ? 'i' : 'k');
  if (token) {
    try {
      await openWithInvite(token, personal);
      return;
    } catch {
      privateStatus.textContent = '手记和个人资料未解锁，请检查邀请链接或稍后重试。';
      privateAccess.open = true;
      if (document.querySelector('#albums').childElementCount) return;
      photos.length = 0;
    }
  }
  const grant = await fetch(new URL('/friendPhotoPreview.json', inviteDatabase), {
    cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'
  });
  if (!grant.ok) throw Error();
  const raw = decodeToken(await grant.json());
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  await showPhotos(makeReader(key, 'data/preview/'));
}
openAlbum().catch(() => { statusLine.textContent = '暂时无法打开照片，请稍后刷新重试。'; });
