(function () {
  'use strict';
  if (window.__noaChat) return;
  const API = 'https://noa-pet-api-643360244067.asia-east1.run.app';
  const TOKEN_KEY = 'yluna-noa-session-v1';
  let panel, input, log, status, send, returnFocus, busy = false, timer, until = 0, token = '', pending;
  let history = [], contextEpoch = 0;
  const encoder = new TextEncoder();
  function shorten(text, maxBytes = 750) {
    let result = '', size = 0;
    for (const character of text) { size += encoder.encode(character).length; if (size > maxBytes) break; result += character; }
    return result;
  }
  function recentHistory() {
    const result = []; let bytes = 0;
    for (let i = history.length - 2; i >= Math.max(0, history.length - 4); i -= 2) {
      const pair = history.slice(i, i + 2).map(item => ({ role: item.role, content: shorten(item.content) }));
      const size = pair.reduce((sum, item) => sum + encoder.encode(item.content).length, 0);
      if (bytes + size > 1800) break;
      bytes += size; result.unshift(...pair);
    }
    return result;
  }
  const allowedPaths = new Set(['/inner/', '/about/', '/spark/', '/interview/', '/books/', '/gallery/', '/archives/', '/spark/companion-design-scrap/', '/2026/11/05/personal-site-refresh/']);
  function navigation(links) {
    if (!Array.isArray(links)) return;
    const nav = document.createElement('nav'); nav.className = 'noa-chat-links'; nav.setAttribute('aria-label', '相关站内页面');
    for (const link of links.slice(0, 3)) {
      if (!link || !allowedPaths.has(link.path) || typeof link.title !== 'string') continue;
      const anchor = document.createElement('a'); anchor.href = link.path; anchor.textContent = link.title.slice(0, 65) + ' ↗'; nav.appendChild(anchor);
    }
    if (nav.children.length) log.appendChild(nav);
    log.scrollTop = log.scrollHeight;
  }
  try { token = localStorage.getItem(TOKEN_KEY) || ''; } catch (_) {}
  const messages = {
    user_day_limit: '今天已经聊了 10 次啦，明天再来找我吧。',
    ip_day_limit: '这个网络今天的聊天次数用完了，明天再来吧。',
    daily_call_limit: '今天来聊天的朋友很多，我先休息一下，明天见。',
    monthly_call_limit: '这段时间的聊天额度用完啦，我先安静陪你。',
    lifetime_call_limit: '这期聊天额度已用完，我仍然会在这里陪你。',
    expired: '这期聊天服务已到期，等站长续好后再聊吧。',
    invalid_session: '连接凭证过期了，再点一次发送就好。',
    upstream_timeout: '这次没有及时收到回答，先稍等一下。',
    upstream_failed: '聊天服务暂时没有回应，稍后再试吧。',
    origin_denied: '请在站长的正式网站里和我聊天。',
    invalid_request: '消息有点长啦，试着简短一些吧。',
    invalid_context: '这页对话暂时接不上了，可以清空后重新聊。'
  };
  function line(who, text) {
    const item = document.createElement('p'); item.className = `noa-chat-line noa-chat-${who}`;
    const label = document.createElement('span'); label.textContent = who === 'user' ? '你' : '诺亚';
    const content = document.createElement('span'); content.textContent = text;
    item.append(label, content); log.appendChild(item);
    while (log.children.length > 24) log.firstElementChild.remove();
    log.scrollTop = log.scrollHeight;
  }
  function viewport() {
    if (!panel) return;
    const view = window.visualViewport;
    panel.style.setProperty('--noa-view-height', `${view?.height || innerHeight}px`);
    panel.style.setProperty('--noa-view-top', `${view?.offsetTop || 0}px`);
    panel.classList.toggle('noa-chat-compact', (view?.height || innerHeight) < 480);
  }
  function updateButton() {
    const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
    send.disabled = busy || remaining > 0 || !input.value.trim();
    send.textContent = busy ? '正在想…' : remaining ? `${remaining} 秒后再聊` : '发送';
    clearTimeout(timer);
    if (remaining) timer = setTimeout(updateButton, 500);
  }
  function close() {
    if (!panel) return;
    panel.hidden = true;
    if (returnFocus?.isConnected && document.body.classList.contains('inner-site-active')) returnFocus.focus({ preventScroll: true });
  }
  async function request(path, body, auth) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(API + path, { method: 'POST', mode: 'cors', credentials: 'omit',
        headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
        body: JSON.stringify(body), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw Object.assign(new Error(data.code || 'service_unavailable'), data);
      return data;
    } finally { clearTimeout(timeout); }
  }
  async function submit(event) {
    event.preventDefault();
    const message = input.value.trim();
    if (busy || Date.now() < until || !message) return;
    if (new TextEncoder().encode(message).length > 1200) { status.textContent = '消息有点长啦，请缩短到约 400 个汉字以内。'; return; }
    if (!pending || pending.message !== message) pending = { message, requestId: crypto.randomUUID(), history: recentHistory(), page: location.pathname.slice(0, 240) };
    const attempt = pending;
    const epoch = contextEpoch;
    busy = true; input.readOnly = true; status.textContent = '诺亚正在认真听…'; updateButton();
    try {
      if (!token) {
        token = (await request('/v1/session', {})).token;
        try { localStorage.setItem(TOKEN_KEY, token); } catch (_) {}
      }
      const data = await request('/v1/chat', attempt, token);
      if (epoch !== contextEpoch) { until = Date.now() + 15000; return; }
      if (data.duplicate) {
        status.textContent = data.status === 'pending' ? '这条消息还在处理中，请稍等；不会重复扣次数。' : '这条消息已经处理过了。若回答未收到，请换一条消息再聊。';
        if (data.status !== 'pending') pending = null;
      } else if (data.result?.text) {
        line('user', message); line('assistant', data.result.text);
        history.push({ role: 'user', content: message }, { role: 'assistant', content: data.result.text });
        history = history.slice(-4);
        navigation(data.result.links);
        input.value = ''; pending = null;
        status.textContent = data.tier === 'economy' ? '轻聊模式 · 我会回答得简短一点。' : '我在这里，慢慢聊。';
      }
      until = Date.now() + 15000;
    } catch (error) {
      if (epoch !== contextEpoch) return;
      if (error.code === 'invalid_session') {
        token = ''; try { localStorage.removeItem(TOKEN_KEY); } catch (_) {}
      }
      if (error.retryAfterMs) until = Date.now() + Math.min(error.retryAfterMs, 86400000);
      status.textContent = messages[error.code] || (error.retryAfterMs ? '稍微等一会儿，再来聊吧。' : '暂时连接不上，等网络恢复后再试。');
    } finally { busy = false; input.readOnly = false; updateButton(); }
  }
  function make() {
    panel = document.createElement('section'); panel.className = 'noa-chat'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', '和诺亚聊聊');
    panel.innerHTML = `<header class="noa-chat-header"><div><strong>诺亚 <span>✦</span></strong><small>生盐诺亚 · 里站书记 · 非官方 AI</small></div><button type="button" class="noa-chat-close" aria-label="关闭聊天">×</button></header><div class="noa-chat-log" role="log" aria-live="polite" aria-label="聊天记录"></div><div class="noa-chat-topics" aria-label="聊天话题"><button type="button" data-topic="介绍一下这个网站的主人吧。">介绍站长</button><button type="button" data-topic="你了解这个网页吗？带我逛逛吧。">带我逛逛</button><button type="button" data-topic="诺亚，你和优香平时是怎么相处的？">聊聊诺亚</button></div><p class="noa-chat-status" role="status"></p><form class="noa-chat-form"><label for="noa-chat-input">想和我说点什么？</label><textarea id="noa-chat-input" rows="2" maxlength="1200" placeholder="老师，今天想聊些什么？"></textarea><div class="noa-chat-actions"><button type="button" class="noa-chat-clear">清空对话</button><button type="submit" class="noa-chat-send">发送</button></div></form><p class="noa-chat-note">每天 10 次，间隔 15 秒。AI 会收到消息及最近两轮对话，请勿填写隐私；本页对话在刷新或清空后重置。</p>`;
    document.body.appendChild(panel);
    input = panel.querySelector('textarea'); log = panel.querySelector('.noa-chat-log');
    status = panel.querySelector('.noa-chat-status'); send = panel.querySelector('.noa-chat-send');
    panel.querySelector('.noa-chat-close').addEventListener('click', close);
    panel.querySelector('form').addEventListener('submit', submit);
    panel.querySelector('.noa-chat-clear').addEventListener('click', () => {
      contextEpoch++; history = []; pending = null; input.value = ''; log.replaceChildren();
      status.textContent = '这一页的对话已经清空，我们重新开始吧。'; updateButton();
    });
    panel.querySelector('.noa-chat-topics').addEventListener('click', event => {
      const topic = event.target.closest('[data-topic]')?.dataset.topic;
      if (!topic || busy) return;
      input.value = topic; updateButton(); input.focus({ preventScroll: true });
    });
    input.addEventListener('input', updateButton);
    input.addEventListener('keydown', event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !event.isComposing) submit(event); });
    panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); close(); } });
    line('assistant', '老师，欢迎回来。我是生盐诺亚，今天也在这里陪您。想先认识一下站长，还是翻翻这里的文章？');
    new MutationObserver(() => {
      if (!document.body.classList.contains('inner-site-active') || document.body.classList.contains('gallery-viewer-open') || document.body.classList.contains('show-header-drawer')) { panel.hidden = true; }
    }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', viewport);
    window.visualViewport?.addEventListener('resize', viewport);
    window.visualViewport?.addEventListener('scroll', viewport);
  }
  window.__noaChat = { open(trigger) {
    if (!document.body.classList.contains('inner-site-active')) return;
    if (!panel) make();
    returnFocus = trigger; panel.hidden = false; viewport(); updateButton();
    panel.querySelector('.noa-chat-close').focus({ preventScroll: true });
  } };
})();
