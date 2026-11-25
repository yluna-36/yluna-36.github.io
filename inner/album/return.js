(() => {
    if (new URLSearchParams(location.search).get('from') === 'friend-album') {
        try {
            if (sessionStorage.getItem('friend-album-return') === 'yes') {
                history.replaceState({...history.state, returnFromFriendAlbum:true}, '');
                sessionStorage.removeItem('friend-album-return');
            }
        } catch {}
    }
    // Return to the previously unlocked album without copying its invitation into shared storage.
    document.querySelector('.friend-album-link')?.addEventListener('click', event => {
        const link = event.target.closest?.('.friend-album-link');
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey ||
            event.ctrlKey || event.shiftKey || event.altKey) return;
        const nav = window.navigation;
        const entry = nav?.entries().slice().reverse().find(entry =>
            entry.index < nav.currentEntry.index && entry.url &&
            new URL(entry.url).pathname === '/inner/album/' && entry.getState()?.friendAlbumOpened);
        if (entry) {
            event.preventDefault();
            nav.traverseTo(entry.key).finished.catch(() => location.assign(link.href));
        } else if (new URLSearchParams(location.search).get('from') === 'friend-album' &&
                   history.length > 1 && history.state?.returnFromFriendAlbum) {
            event.preventDefault();
            history.back();
        }
    }, true);
})();
