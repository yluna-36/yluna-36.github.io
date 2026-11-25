'use strict';

const form = document.querySelector('#feedback');
const message = document.querySelector('#message');
const send = document.querySelector('#send');
const statusLine = document.querySelector('#status');
const inbox = 'https://yluna-meet-20261124-default-rtdb.asia-southeast1.firebasedatabase.app/feedbackInbox/';
let pending;

function newSlot() {
  return crypto.getRandomValues(new Uint8Array(1))[0].toString(16).padStart(2, '0');
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (send.disabled) return;
  const text = message.value.trim();
  if (!text) {
    statusLine.textContent = '请先写一点内容。';
    message.focus();
    return;
  }
  if (pending?.text !== text) pending = {slot:newSlot(), receipt:crypto.randomUUID(), text};
  send.disabled = true;
  message.readOnly = true;
  statusLine.textContent = '正在发送…';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await fetch(inbox + pending.slot + '.json?print=silent', {
        method:'PUT', credentials:'omit', referrerPolicy:'no-referrer', signal:controller.signal,
        body:JSON.stringify({text, receipt:pending.receipt, created:{'.sv':'timestamp'}})
      });
      if (response.ok) {
        pending = undefined;
        form.reset();
        statusLine.textContent = '收到，谢谢你的建议。';
        return;
      }
      if (response.status !== 401 && response.status !== 403) throw Error('network');
      pending.slot = newSlot();
    }
    statusLine.textContent = '意见箱暂时无法接收。你可以稍后再试，或通过首页联系我。';
  } catch {
    statusLine.textContent = '暂时没收到发送确认。文字还在，可以再点一次发送。';
  } finally {
    clearTimeout(timer);
    message.readOnly = false;
    send.disabled = false;
  }
});
send.disabled = false;
