(function () {
  'use strict';
  // The theme re-executes page scripts during PJAX navigation.
  if (window.__ylunaGallery) {
    window.__ylunaGallery.refresh();
    return;
  }
  let current = null;

  function init() {
    const root = document.querySelector('.gallery-page');
    if (current?.root === root) { current.sync(); return; }
    if (current) { current.destroy(); current = null; }
    if (!root) return;

    const dialog = root.querySelector('.gallery-viewer');
    const image = root.querySelector('.gallery-full-image');
    const status = root.querySelector('.gallery-viewer-status');
    const position = root.querySelector('.gallery-position');
    const title = root.querySelector('#gallery-viewer-title');
    const original = root.querySelector('.gallery-original');
    const previous = root.querySelector('.gallery-prev');
    const next = root.querySelector('.gallery-next');
    const buttons = Array.from(root.querySelectorAll('.gallery-open'));
    let selection = [];
    let index = 0;
    let opener = null;
    const permitted = button => !button.closest('.secret-gallery-group') || document.body.classList.contains('inner-site-active');

    function close() { if (dialog.open) dialog.close(); }
    function sync() {
      buttons.forEach(button => {
        const thumbnail = button.querySelector('img');
        if (permitted(button)) {
          if (!thumbnail.hasAttribute('src')) thumbnail.src = button.dataset.gallerySrc;
        } else thumbnail.removeAttribute('src');
      });
      if (dialog.open && selection[index] && !permitted(selection[index])) close();
    }
    function show(number) {
      index = (number + selection.length) % selection.length;
      const button = selection[index];
      const name = button.dataset.galleryTitle;
      title.textContent = name;
      original.href = button.dataset.gallerySrc;
      image.alt = name;
      image.style.visibility = 'hidden';
      status.textContent = '图片加载中…';
      image.src = button.dataset.gallerySrc;
      position.textContent = `${index + 1} / ${selection.length}`;
      previous.hidden = next.hidden = selection.length < 2;
    }
    image.addEventListener('load', () => {
      image.style.visibility = 'visible';
      status.textContent = '';
    });
    image.addEventListener('error', () => {
      image.style.visibility = 'hidden';
      status.textContent = '图片暂时无法加载，可以点击「查看原图」重试。';
    });
    buttons.forEach(button => {
      const thumbnail = button.querySelector('img');
      thumbnail.addEventListener('error', () => button.classList.add('is-unavailable'));
      thumbnail.addEventListener('load', () => button.classList.remove('is-unavailable'));
      button.addEventListener('click', () => {
        if (!permitted(button)) return;
        if (typeof dialog.showModal !== 'function') {
          window.open(button.dataset.gallerySrc, '_blank', 'noopener');
          return;
        }
        selection = buttons.filter(permitted);
        opener = button;
        show(selection.indexOf(button));
        dialog.showModal();
        document.body.classList.add('gallery-viewer-open');
      });
    });
    root.querySelector('.gallery-close').addEventListener('click', close);
    previous.addEventListener('click', () => show(index - 1));
    next.addEventListener('click', () => show(index + 1));
    dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
    dialog.addEventListener('close', () => {
      document.body.classList.remove('gallery-viewer-open');
      if (opener?.isConnected && permitted(opener)) opener.focus({ preventScroll: true });
    });
    dialog.addEventListener('keydown', event => {
      if (selection.length < 2) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        show(index + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    let touch = null;
    const stage = root.querySelector('.gallery-viewer-stage');
    stage.addEventListener('touchstart', event => {
      touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    stage.addEventListener('touchend', event => {
      if (!touch || selection.length < 2 || event.changedTouches.length !== 1) return;
      const dx = event.changedTouches[0].clientX - touch.x;
      const dy = event.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) show(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
    stage.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    current = {
      root, sync, close,
      destroy() { observer.disconnect(); close(); document.body.classList.remove('gallery-viewer-open'); }
    };
    sync();
  }
  function refresh() { queueMicrotask(init); }
  window.__ylunaGallery = { refresh };
  document.addEventListener('DOMContentLoaded', refresh);
  window.addEventListener('pjax:complete', refresh);
  document.addEventListener('pjax:send', () => current?.close());
  refresh();
})();
