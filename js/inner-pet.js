(function () {
  'use strict';
  if (window.__ylunaInnerPet) { window.__ylunaInnerPet.sync(); return; }

  const STORAGE_KEY = 'yluna-noa-pet-v1';
  const SHEET = '/images/pets/noa.webp';
  const animations = {
    idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
    right: { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    left: { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
    wave: { row: 3, durations: [140, 140, 140, 280], once: true },
    jump: { row: 4, durations: [140, 140, 140, 140, 280], once: true },
    reading: { row: 7, durations: [120, 120, 120, 120, 120, 220] }
  };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; } catch (_) {}
  let visibility = ['open', 'minimized', 'closed'].includes(saved.visibility) ? saved.visibility : 'open';
  let paused = saved.paused === true;
  let baseAnimation = saved.reading === true ? 'reading' : 'idle';
  let position = saved.position && Number.isFinite(saved.position.x) && Number.isFinite(saved.position.y)
    ? { x: Math.max(0, Math.min(1, saved.position.x)), y: Math.max(0, Math.min(1, saved.position.y)) } : null;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let root, sprite, stage, menu, menuButton, bubble, launcher, recall, loading;
  let image, ready = false, failed = false, animation = baseAnimation, frame = 0;
  let timer = null, bubbleTimer = null, drag = null, suppressClickUntil = 0, menuOpen = false;
  let x = 0, y = 0, searchObserver, observedSearch;
  let greetingIndex = 0;
  const greetings = ['老师，今天也有值得留在书页上的小事吗？', '事情可以慢慢整理，休息也不要漏掉哦。', '这一页有让您停下来的地方吗？我也想听听。', '呵呵，刚才是不是又冒出了一个新点子？'];

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ visibility, paused, reading: baseAnimation === 'reading', position }));
    } catch (_) {}
  }
  function inner() { return document.body?.classList.contains('inner-site-active'); }
  function obstructed() {
    return document.body.classList.contains('show-header-drawer') ||
      document.body.classList.contains('gallery-viewer-open') ||
      !!document.querySelector('.search-pop-overlay.active');
  }
  function stop() { clearTimeout(timer); timer = null; }
  function render() {
    if (!sprite) return;
    const row = animations[animation].row;
    sprite.style.backgroundPosition = `${frame / 7 * 100}% ${row / 10 * 100}%`;
    root.dataset.animation = animation;
    root.dataset.frame = String(frame);
  }
  function canAnimate() {
    return ready && inner() && visibility === 'open' && !paused && !motion.matches &&
      !document.hidden && !obstructed() && !menuOpen;
  }
  function schedule() {
    stop();
    if (!root) return;
    root.dataset.animating = String(canAnimate());
    if (!canAnimate()) return;
    timer = setTimeout(() => {
      timer = null;
      frame += 1;
      if (frame >= animations[animation].durations.length) {
        if (animations[animation].once) animation = baseAnimation;
        frame = 0;
      }
      render();
      schedule();
    }, animations[animation].durations[frame]);
  }
  function play(name) {
    animation = name;
    frame = motion.matches || paused ? (name === 'jump' ? 2 : 0) : 0;
    render();
    schedule();
  }
  function clearBubble() {
    clearTimeout(bubbleTimer); bubbleTimer = null;
    if (bubble) { bubble.hidden = true; bubble.textContent = ''; }
  }
  function say(text) {
    clearBubble();
    bubble.textContent = text;
    bubble.hidden = false;
    placePanels();
    bubbleTimer = setTimeout(clearBubble, 3800);
  }
  function limits() {
    const width = root?.offsetWidth || (innerWidth <= 800 ? 72 : 96);
    const height = root?.offsetHeight || (innerWidth <= 800 ? 122 : 148);
    return { minX: 12, maxX: Math.max(12, innerWidth - width - 68), minY: 84, maxY: Math.max(84, innerHeight - height - 16) };
  }
  function place(nextX, nextY) {
    const bounds = limits();
    x = Math.max(bounds.minX, Math.min(bounds.maxX, nextX));
    y = Math.max(bounds.minY, Math.min(bounds.maxY, nextY));
    root.style.left = `${Math.round(x)}px`;
    root.style.top = `${Math.round(y)}px`;
    placePanels();
  }
  function restorePosition() {
    const bounds = limits();
    place(position ? bounds.minX + position.x * (bounds.maxX - bounds.minX) : bounds.maxX,
      position ? bounds.minY + position.y * (bounds.maxY - bounds.minY) : bounds.maxY);
  }
  function savePosition() {
    const b = limits();
    position = { x: (x - b.minX) / Math.max(1, b.maxX - b.minX), y: (y - b.minY) / Math.max(1, b.maxY - b.minY) };
    persist();
  }
  function placePanels() {
    if (!root) return;
    const panelWidth = Math.min(232, innerWidth - 24);
    const left = Math.max(12, Math.min(innerWidth - panelWidth - 12, x + root.offsetWidth - panelWidth));
    for (const panel of [menu, bubble]) {
      panel.style.width = `${panelWidth}px`;
      panel.style.left = `${Math.round(left)}px`;
    }
    if (menuOpen) {
      const height = menu.offsetHeight;
      const above = y - height - 8;
      const top = above >= 76 ? above : Math.min(innerHeight - height - 12, y + root.offsetHeight + 8);
      menu.style.top = `${Math.max(76, top)}px`;
    }
    bubble.style.top = `${Math.max(76, y - (bubble.offsetHeight || 64) - 10)}px`;
  }
  function closeMenu(returnFocus) {
    if (!menu) return;
    menuOpen = false;
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    if (returnFocus && !root.hidden) menuButton.focus({ preventScroll: true });
    schedule();
  }
  function openMenu() {
    clearBubble();
    menuOpen = true;
    menu.hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    placePanels();
    schedule();
    menu.querySelector('button').focus({ preventScroll: true });
  }
  function loadSheet() {
    if (image || ready) return;
    loading.hidden = false;
    image = new Image();
    image.onload = () => {
      if (image.naturalWidth !== 1536 || image.naturalHeight !== 2288) { image.onerror(); return; }
      ready = true; failed = false;
      sprite.style.backgroundImage = `url("${SHEET}")`;
      loading.hidden = true;
      root.dataset.ready = 'true';
      sync();
    };
    image.onerror = () => {
      ready = false; failed = true;
      loading.textContent = '点此重试';
      root.dataset.ready = 'false';
      root.dataset.animating = 'false';
      stop();
    };
    image.src = SHEET;
  }
  function activate() {
    if (failed) {
      image = null; failed = false;
      loading.textContent = '诺亚来啦…';
      loadSheet(); return;
    }
    closeMenu(false);
    play('wave');
    say(greetings[greetingIndex++ % greetings.length]);
  }
  function restore() {
    visibility = 'open';
    persist(); sync();
    play('wave');
    stage.focus({ preventScroll: true });
  }
  function footerRecall() {
    const footer = document.querySelector('.footer');
    if (!footer) return;
    if (!recall?.isConnected) {
      recall = document.createElement('button');
      recall.type = 'button';
      recall.id = 'noa-pet-recall';
      recall.className = 'noa-pet-recall';
      recall.textContent = '召回诺亚';
      recall.addEventListener('click', restore);
      footer.appendChild(recall);
    }
    recall.hidden = !inner() || visibility !== 'closed';
  }
  function updateLabels() {
    menu.querySelector('[data-noa-action="pause"]').textContent = paused ? '继续活动' : '暂停动作';
    menu.querySelector('[data-noa-action="read"]').textContent = baseAnimation === 'reading' ? '休息一会儿' : '陪我读书';
  }
  function make() {
    root = document.createElement('aside');
    root.id = 'noa-inner-pet';
    root.className = 'noa-pet';
    root.setAttribute('aria-label', '诺亚小宠物');
    root.dataset.ready = 'false';
    root.innerHTML = `
      <div class="noa-pet-bubble" role="status" aria-live="polite" hidden></div>
      <div class="noa-pet-body">
        <button class="noa-pet-stage" type="button" aria-label="和诺亚打招呼；可以拖动，或用方向键移动" title="点我打招呼，也可以拖动我">
          <span class="noa-pet-sprite" aria-hidden="true"></span><span class="noa-pet-loading">诺亚来啦…</span>
        </button>
        <button class="noa-pet-menu-button" type="button" aria-label="诺亚的菜单" aria-expanded="false" aria-controls="noa-pet-menu"><span>诺亚</span><span aria-hidden="true">···</span></button>
      </div>
      <button class="noa-pet-launcher" type="button" aria-label="展开诺亚小宠物" hidden>诺亚 <span aria-hidden="true">↗</span></button>
      <div id="noa-pet-menu" class="noa-pet-menu" role="group" aria-label="诺亚的互动菜单" hidden>
        <p class="noa-pet-menu-title">诺亚在这里</p><p class="noa-pet-menu-hint">拖动我，可以换个位置。</p>
        <button type="button" data-noa-action="chat">和诺亚聊聊 ✦</button>
        <button type="button" data-noa-action="wave">打个招呼</button>
        <button type="button" data-noa-action="jump">跳一下</button>
        <button type="button" data-noa-action="read">陪我读书</button>
        <button type="button" data-noa-action="pause">暂停动作</button>
        <button type="button" data-noa-action="minimize">收起诺亚</button>
        <button type="button" data-noa-action="close">关闭 · 可在页脚召回</button>
      </div>`;
    document.body.appendChild(root);
    stage = root.querySelector('.noa-pet-stage');
    sprite = root.querySelector('.noa-pet-sprite');
    menu = root.querySelector('.noa-pet-menu');
    menuButton = root.querySelector('.noa-pet-menu-button');
    bubble = root.querySelector('.noa-pet-bubble');
    launcher = root.querySelector('.noa-pet-launcher');
    loading = root.querySelector('.noa-pet-loading');
    stage.addEventListener('click', event => {
      if (event.detail !== 0 && performance.now() < suppressClickUntil) return;
      activate();
    });
    stage.addEventListener('keydown', event => {
      const moves = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
      if (!moves[event.key]) return;
      event.preventDefault();
      place(x + moves[event.key][0], y + moves[event.key][1]); savePosition();
    });
    stage.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x, y, moved: false };
      stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointermove', event => {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      if (!drag.moved) { drag.moved = true; closeMenu(false); clearBubble(); root.classList.add('is-dragging'); }
      place(drag.x + dx, drag.y + dy);
      const facing = dx < 0 ? 'left' : 'right';
      if (animation !== facing) play(facing);
    });
    function finishDrag(event) {
      if (!drag || drag.id !== event.pointerId) return;
      if (drag.moved) { suppressClickUntil = performance.now() + 500; savePosition(); play(baseAnimation); }
      drag = null;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
      root.classList.remove('is-dragging');
    }
    stage.addEventListener('pointerup', finishDrag);
    stage.addEventListener('pointercancel', finishDrag);
    stage.addEventListener('lostpointercapture', finishDrag);
    menuButton.addEventListener('click', () => menuOpen ? closeMenu(true) : openMenu());
    launcher.addEventListener('click', restore);
    menu.addEventListener('click', event => {
      const action = event.target.closest('[data-noa-action]')?.dataset.noaAction;
      if (!action) return;
      closeMenu(false);
      if (action === 'chat') {
        if (window.__noaChat) window.__noaChat.open(menuButton);
        else {
          let script = document.getElementById('noa-chat-script');
          if (!script) {
            script = document.createElement('script'); script.id = 'noa-chat-script';
            script.src = '/js/noa-chat.js?v=20261106-voice1';
            script.onload = () => window.__noaChat?.open(menuButton);
            script.onerror = () => { script.remove(); say('聊天窗口暂时没打开，请稍后再试。'); };
            document.body.appendChild(script);
          }
        }
        return;
      }
      if (action === 'wave') activate();
      if (action === 'jump') { play('jump'); say('稍微活动一下，再继续吧。'); }
      if (action === 'read') {
        baseAnimation = baseAnimation === 'reading' ? 'idle' : 'reading';
        play(baseAnimation); say(baseAnimation === 'reading' ? '我也翻开书，陪你一起看。' : '那就安静地待一会儿。');
      }
      if (action === 'pause') {
        paused = !paused;
        if (paused) { frame = 0; render(); }
      }
      if (action === 'minimize') visibility = 'minimized';
      if (action === 'close') visibility = 'closed';
      persist(); sync();
      if (visibility === 'minimized') launcher.focus({ preventScroll: true });
      else if (visibility === 'open') stage.focus({ preventScroll: true });
      else recall?.focus({ preventScroll: true });
    });
    render(); restorePosition();
  }
  function observeSearch() {
    const search = document.querySelector('.search-pop-overlay');
    if (search === observedSearch) return;
    searchObserver?.disconnect(); observedSearch = search;
    if (search) {
      searchObserver = new MutationObserver(sync);
      searchObserver.observe(search, { attributes: true, attributeFilter: ['class'] });
    }
  }
  function sync() {
    if (!document.body) return;
    if (!root && !inner()) return;
    if (!root) make();
    footerRecall(); observeSearch(); updateLabels();
    const active = inner() && visibility !== 'closed' && !obstructed();
    root.hidden = !active;
    root.dataset.visibility = visibility;
    root.querySelector('.noa-pet-body').hidden = visibility !== 'open';
    launcher.hidden = visibility !== 'minimized';
    if (!active || visibility !== 'open' || document.hidden) {
      clearBubble(); closeMenu(false);
      if (drag) { drag = null; root.classList.remove('is-dragging'); }
    }
    if (active && visibility === 'open') loadSheet();
    if (active) restorePosition();
    schedule();
  }
  window.__ylunaInnerPet = { sync };
  document.addEventListener('DOMContentLoaded', sync);
  window.addEventListener('pjax:complete', sync);
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('resize', () => { if (root && !root.hidden) restorePosition(); });
  window.visualViewport?.addEventListener('resize', () => { if (root && !root.hidden) restorePosition(); });
  motion.addEventListener('change', () => { if (motion.matches) { frame = 0; render(); } schedule(); });
  document.addEventListener('pointerdown', event => { if (menuOpen && !root.contains(event.target)) closeMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuOpen) { event.preventDefault(); closeMenu(true); }
  });
  function startObserver() {
    if (!document.body) return;
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  else startObserver();
})();
