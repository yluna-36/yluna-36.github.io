// Only decrypted articles supply the attachment keys. The server serves ciphertext.
(() => {
  // The theme moves src into data-src before encryption. Restore embedded
  // previews after unlocking, when the original lazy loader has already run.
  for (const img of document.querySelectorAll('figure img[data-src^="data:image/jpeg;base64,"]')) {
    img.src = img.dataset.src;
    img.removeAttribute('lazyload');
    img.removeAttribute('data-src');
  }
  for (const panel of document.querySelectorAll('details[data-photo-key]')) {
    if (panel.dataset.initialized) continue;
    panel.dataset.initialized = 'true';
    const status = panel.querySelector('[role=status]');
    let loading = false;
    panel.addEventListener('toggle', async () => {
      if (!panel.open || loading || panel.querySelector('a')) return;
      loading = true;
      status.textContent = '正在加载原图…';
      try {
        const response = await fetch(panel.dataset.photoSrc);
        if (!response.ok) throw new Error('Image unavailable');
        const data = new Uint8Array(await response.arrayBuffer());
        const rawKey = Uint8Array.from(panel.dataset.photoKey.match(/../g), pair => parseInt(pair, 16));
        const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
        const bytes = await crypto.subtle.decrypt({name: 'AES-GCM', iv: data.subarray(0, 12)}, key, data.subarray(12));
        const url = URL.createObjectURL(new Blob([bytes], {type: 'image/jpeg'}));
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = '单独打开原图，放大查看';
        const img = new Image();
        img.alt = panel.querySelector('summary').textContent.replace('查看','');
        img.style.cssText = 'display:block;max-width:100%;height:auto';
        img.src = url;
        status.replaceChildren(link);
        panel.append(img);
      } catch {
        status.textContent = '原图加载失败，请收起后重新打开。';
      } finally {
        loading = false;
      }
    });
  }
})();
