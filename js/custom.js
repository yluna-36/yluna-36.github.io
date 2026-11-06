// PJAX reloads this asset; keep global handlers installed exactly once.
(function () {
if (window.__ylunaCustomInstalled) return;
window.__ylunaCustomInstalled = true;

document.addEventListener('DOMContentLoaded', () => {
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('scroll-reveal-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });

    const initScrollReveal = () => {
        document.querySelectorAll('.home-post-list .home-post-item').forEach(el => {
            if (!el.classList.contains('scroll-reveal-visible')) {
                observer.observe(el);
            }
        });
    };

    initScrollReveal();

    // Keep theme uses pjax, so we need to re-initialize on page switch
    window.addEventListener('pjax:complete', initScrollReveal);
});

// Inner Site Toggle Logic
const outerSiteName = document.querySelector('.site-name')?.textContent.trim() || 'yluna 的个人空间';
const outerSiteLogo = document.querySelector('.logo-image img')?.getAttribute('src') || '/images/logo-icon.png';

// Load the companion only after entering the inner site. Outer visits request no pet assets.
let innerPetLoading = false;
const syncInnerPet = () => {
    if (window.__ylunaInnerPet) {
        window.__ylunaInnerPet.sync();
        return;
    }
    if (!document.body.classList.contains('inner-site-active') || innerPetLoading) return;
    innerPetLoading = true;
    const loadScript = () => {
        if (!document.body.classList.contains('inner-site-active')) {
            innerPetLoading = false;
            return;
        }
        const script = document.createElement('script');
        script.id = 'yluna-inner-pet-script';
        script.src = '/js/inner-pet.js?v=20261107-interactions1';
        script.async = true;
        script.onload = () => {
            innerPetLoading = false;
            window.__ylunaInnerPet?.sync();
        };
        script.onerror = () => {
            innerPetLoading = false;
            script.remove();
        };
        document.body.appendChild(script);
    };
    const existingStyle = document.getElementById('yluna-inner-pet-style');
    if (existingStyle?.sheet) {
        loadScript();
        return;
    }
    const style = existingStyle || document.createElement('link');
    style.id = 'yluna-inner-pet-style';
    style.rel = 'stylesheet';
    style.href = '/css/inner-pet.css?v=20261107-interactions1';
    style.onload = loadScript;
    style.onerror = () => {
        innerPetLoading = false;
        style.remove();
    };
    if (!existingStyle) document.head.appendChild(style);
};

const resolveInnerSite = () => {
    // Explicit switches remain supported; home URLs otherwise define the mode.
    const mode = new URLSearchParams(window.location.search).get('mode');
    if (mode === 'inner' || mode === 'outer') return mode === 'inner';
    const path = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/$/, '');
    if (path === '') return false;
    if (path === '/inner') return true;
    // Shared pages (gallery, articles, etc.) keep the previously selected mode.
    try {
        return localStorage.getItem('inner-site-enabled') === 'true';
    } catch (error) {
        return document.body.classList.contains('inner-site-active');
    }
};

const initInnerSite = () => {
    const isInnerSite = resolveInnerSite();
    try {
        if (isInnerSite) localStorage.setItem('inner-site-enabled', 'true');
        else localStorage.removeItem('inner-site-enabled');
    } catch (error) {
        // URL-based entry and the moon switch also work with storage disabled.
    }
    const firstScreen = document.querySelector('.first-screen-container');

    // Keep identity in sync after full loads, PJAX navigation and history restores.
    const logoText = document.querySelector('.site-name');
    const logoImage = document.querySelector('.logo-image img');
    if (logoText) logoText.textContent = isInnerSite ? 'yluna 的里世界' : outerSiteName;
    if (logoImage) logoImage.setAttribute('src', isInnerSite ? '/images/里站头像.png' : outerSiteLogo);
    if (isInnerSite && /^\/inner(?:\/|\/index\.html)?$/.test(window.location.pathname)) {
        document.title = 'yluna 的里世界';
    } else if (document.title === 'yluna 的里世界') {
        document.title = outerSiteName;
    }
    
    // Favicon swapping
    let faviconLink = document.querySelector("link[rel~='icon']");
    if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
    }
    
    if (isInnerSite) {
        document.body.classList.add('inner-site-active');
        faviconLink.href = '/images/里站头像.png';
        if (firstScreen) {
            const innerBgImages = [
                '/images/里站背景图.jpg',
                'https://cdn.jsdelivr.net/gh/yluna-36/image-bed@main/img/309F7D03-BF1A-4B4A-9563-A11FDC1100FD.jpeg',
                'https://cdn.jsdelivr.net/gh/yluna-36/image-bed@main/img/230ADD76-567A-46E8-8FE7-5E4F033A80B5_1_105_c.jpeg',
                'https://cdn.jsdelivr.net/gh/yluna-36/image-bed@main/img/FA115AE7-2939-4E92-936D-7C8D3C0A96FB_1_105_c.jpeg',
                'https://cdn.jsdelivr.net/gh/yluna-36/image-bed@main/img/49DADDA0-A1CB-4E81-AC32-D33A12293330_1_105_c.jpeg',
                'https://cdn.jsdelivr.net/gh/yluna-36/image-bed@main/img/B1EB3B0B-AEB0-4DD1-8FEB-25DC03175E56_1_105_c.jpeg'
            ];
            const randomBg = innerBgImages[Math.floor(Math.random() * innerBgImages.length)];
            firstScreen.style.setProperty('background-image', `url('${randomBg}')`, 'important');
        }
    } else {
        document.body.classList.remove('inner-site-active');
        faviconLink.href = '/images/logo-icon.png';
        if (firstScreen) {
            firstScreen.style.removeProperty('background-image');
        }
    }

    // Keep the five-click moon easter egg on both desktop and mobile.
    const mountMoon = (menu, id, className) => {
        if (!menu || document.getElementById(id)) return;
        const item = document.createElement('li');
        item.id = id;
        item.className = className;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secret-moon-button';
        button.setAttribute('aria-label', '月亮');
        button.innerHTML = '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
        item.appendChild(button);
        menu.appendChild(item);
        let clicks = 0;
        let resetTimer;
        button.addEventListener('click', () => {
            clearTimeout(resetTimer);
            clicks += 1;
            if (clicks >= 5) {
                // Another tab may have changed storage; toggle this page's mode.
                const active = document.body.classList.contains('inner-site-active');
                window.location.href = active ? '/' : '/inner/';
                clicks = 0;
            }
            resetTimer = setTimeout(() => { clicks = 0; }, 1000);
        });
    };
    mountMoon(document.querySelector('.pc .menu-list'), 'secret-inner-trigger', 'menu-item flex-start border-box');
    mountMoon(document.querySelector('.drawer-menu-list'), 'secret-inner-trigger-mobile', 'drawer-menu-item secret-moon-item');

    // 4. Modify Home links (e.g. Logo, Home menu item) to point to /inner/ when inner site is active
    const homeLinks = document.querySelectorAll('a[href="/"], a[data-original-href="/"]');
    homeLinks.forEach(link => {
        if (isInnerSite) {
            if (!link.dataset.originalHref) {
                link.dataset.originalHref = link.getAttribute('href');
            }
            link.setAttribute('href', '/inner/');
        } else {
            if (link.dataset.originalHref) {
                link.setAttribute('href', link.dataset.originalHref);
            }
        }
    });
    syncInnerPet();
};

document.addEventListener('DOMContentLoaded', initInnerSite);
window.addEventListener('pjax:complete', initInnerSite);
window.addEventListener('pageshow', event => {
    if (event.persisted) initInnerSite();
});

// =========================================================
// Multi-Language Auto Translation (Powered by translate.js + Edge Neural Engine)
// =========================================================
const SUPPORTED_LANGUAGES = [
    { id: 'chinese_simplified', label: '🇨🇳 简体中文', short: '简中' },
    { id: 'english', label: '🇺🇸 English', short: 'EN' },
    { id: 'japanese', label: '🇯🇵 日本語', short: '日本語' },
    { id: 'korean', label: '🇰🇷 한국어', short: '한국어' },
    { id: 'chinese_traditional', label: '🇭🇰 繁體中文', short: '繁中' },
    { id: 'french', label: '🇫🇷 Français', short: 'FR' },
    { id: 'spanish', label: '🇪🇸 Español', short: 'ES' }
];

const getSavedLang = () => {
    try {
        return localStorage.getItem('translate_to_language') || (window.translate && window.translate.storage && window.translate.storage.get('to')) || 'chinese_simplified';
    } catch (e) {
        return 'chinese_simplified';
    }
};

const updateLangUI = (langId) => {
    const found = SUPPORTED_LANGUAGES.find(l => l.id === langId) || SUPPORTED_LANGUAGES[0];
    const labelEl = document.getElementById('keep-current-lang-label');
    if (labelEl) {
        labelEl.textContent = found.short === '简中' ? '🌐 语言 / Lang' : `🌐 ${found.short}`;
    }
    document.querySelectorAll('.keep-lang-option').forEach(el => {
        if (el.dataset.lang === langId) {
            el.classList.add('active-lang');
        } else {
            el.classList.remove('active-lang');
        }
    });
};

window.switchSiteLanguage = (langId) => {
    try {
        localStorage.setItem('translate_to_language', langId);
    } catch (e) {}
    updateLangUI(langId);
    const mobileMenu = document.getElementById('keep-lang-mobile-popup');
    if (mobileMenu) {
        mobileMenu.classList.remove('open');
        document.getElementById('keep-lang-mobile-btn')?.setAttribute('aria-expanded', 'false');
    }
    if (window.translate && typeof window.translate.changeLanguage === 'function') {
        window.translate.changeLanguage(langId);
    }
};

const injectLanguageSwitcherUI = () => {
    const currentLang = getSavedLang();
    const found = SUPPORTED_LANGUAGES.find(l => l.id === currentLang) || SUPPORTED_LANGUAGES[0];

    // 1. Desktop Menu Injection (.pc .menu-list)
    const pcMenuList = document.querySelector('.header-wrapper .pc .menu-list');
    if (pcMenuList && !document.getElementById('keep-lang-menu-item')) {
        const li = document.createElement('li');
        li.id = 'keep-lang-menu-item';
        li.className = 'menu-item flex-start border-box has-sub-menu ignore';

        const subItemsHtml = SUPPORTED_LANGUAGES.map(l => `
            <li class="sub-menu-item border-box ignore">
                <a class="menu-text-color border-box flex-start keep-lang-option ${l.id === currentLang ? 'active-lang' : ''}"
                   data-lang="${l.id}"
                   href="javascript:void(0);"
                   onclick="window.switchSiteLanguage('${l.id}')">
                    ${l.label}
                </a>
            </li>
        `).join('');

        li.innerHTML = `
            <a class="menu-text-color border-box ignore" href="javascript:void(0);">
                <span id="keep-current-lang-label" class="ignore">${found.short === '简中' ? '🌐 语言 / Lang' : '🌐 ' + found.short}</span>
                <i class="menu-text-color collapse-icon fa-solid fa-angle-down"></i>
            </a>
            <ul class="sub-menu-list border-box ignore">
                ${subItemsHtml}
            </ul>
        `;

        // Insert right before the search icon or secret trigger
        const searchItem = pcMenuList.querySelector('.menu-item.search');
        if (searchItem) {
            pcMenuList.insertBefore(li, searchItem);
        } else {
            pcMenuList.appendChild(li);
        }
    }

    // 2. Mobile Header Button + Popup Injection (.mobile)
    const mobileBar = document.querySelector('.header-wrapper .drawer-menu-list');
    if (mobileBar && !document.getElementById('keep-lang-mobile-btn')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-controls', 'keep-lang-mobile-popup');
        btn.id = 'keep-lang-mobile-btn';
        btn.className = 'keep-lang-mobile-trigger ignore';
        btn.title = 'Language / 言語 / 语言';
        btn.innerHTML = '<i class="fa-solid fa-language" aria-hidden="true"></i><span>语言 / Language</span>';

        const popup = document.createElement('div');
        popup.id = 'keep-lang-mobile-popup';
        popup.className = 'keep-lang-mobile-popup ignore';
        popup.innerHTML = SUPPORTED_LANGUAGES.map(l => `
            <button type="button" class="keep-lang-mobile-item keep-lang-option ignore ${l.id === currentLang ? 'active-lang' : ''}"
                 data-lang="${l.id}"
                 onclick="window.switchSiteLanguage('${l.id}')">
                ${l.label}
            </button>
        `).join('');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = popup.classList.toggle('open');
            btn.setAttribute('aria-expanded', String(open));
        });



        const item = document.createElement('li');
        item.className = 'drawer-menu-item language-drawer-item';
        item.append(btn, popup);
        mobileBar.insertBefore(item, document.getElementById('secret-inner-trigger-mobile'));
    }

    updateLangUI(currentLang);
};

const initSiteTranslate = () => {
    injectLanguageSwitcherUI();

    const configureAndRunTranslate = () => {
        if (!window.translate) return;
        try {
            window.translate.selectLanguageTag.show = false;
            window.translate.language.setLocal('chinese_simplified');
            window.translate.service.use('client.edge');
            if (window.translate.ignore && window.translate.ignore.class) {
                ['ignore', 'code-container', 'highlight', 'Keep-lang-option'].forEach(cls => {
                    if (window.translate.ignore.class.data.indexOf(cls) === -1) {
                        window.translate.ignore.class.push(cls);
                    }
                });
            }
            if (!window._translateListenerStarted) {
                window.translate.listener.start();
                window._translateListenerStarted = true;
            }
            const saved = localStorage.getItem('translate_to_language');
            if (saved && saved !== 'chinese_simplified') {
                window.translate.changeLanguage(saved);
            } else {
                window.translate.execute();
            }
        } catch (err) {
            console.warn('Translate init warning:', err);
        }
    };

    if (window.translate) {
        configureAndRunTranslate();
    } else if (!document.getElementById('translate-js-sdk')) {
        const script = document.createElement('script');
        script.id = 'translate-js-sdk';
        script.src = '/js/translate.min.js';
        script.async = true;
        script.onload = configureAndRunTranslate;
        document.head.appendChild(script);
    }
};

document.addEventListener('click', () => {
    document.getElementById('keep-lang-mobile-popup')?.classList.remove('open');
    document.getElementById('keep-lang-mobile-btn')?.setAttribute('aria-expanded', 'false');
});

document.addEventListener('DOMContentLoaded', initSiteTranslate);
window.addEventListener('pjax:complete', initSiteTranslate);


// Meal Notes entry: keep the mobile shortcut visible without opening the drawer.
(function () {
  function mealLink(className) {
    var a = document.createElement('a');
    a.href = '/meals/'; a.textContent = '食记'; a.className = className;
    a.setAttribute('aria-label', '打开朝夕食记入口');
    a.addEventListener('click', function (event) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); event.stopPropagation(); window.location.assign(a.href);
    });
    return a;
  }
  function mountMealEntry() {
    var mobile = document.querySelector('.header-content .right .mobile');
    if (mobile && !mobile.querySelector('[data-meal-entry]')) {
      var a = mealLink('menu-text-color border-box');
      a.dataset.mealEntry = 'mobile';
      a.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin-right:4px;font-size:15px;font-weight:600;white-space:nowrap';
      mobile.prepend(a);
    }

  }
  mountMealEntry();
  if (!window.__mealEntryInstalled) {
    window.__mealEntryInstalled = true;
    document.addEventListener('DOMContentLoaded', mountMealEntry);
    document.addEventListener('pjax:complete', mountMealEntry);
  }
})();


// Compact player and a clear reading entry, without interrupting either playlist.
(function () {
    function initResponsiveUI() {
        const player = document.getElementById('spotify-player-container');
        if (player && !document.getElementById('spotify-player-toggle')) {
            const toggle = document.createElement('button');
            toggle.id = 'spotify-player-toggle';
            toggle.type = 'button';
            toggle.setAttribute('aria-controls', 'spotify-outer spotify-inner');
            const narrow = window.matchMedia('(max-width: 800px)');
            const sync = () => {
                const open = !narrow.matches || player.classList.contains('is-expanded');
                toggle.setAttribute('aria-expanded', String(open));
                toggle.setAttribute('aria-label', open ? '收起音乐播放器' : '展开音乐播放器');
                toggle.innerHTML = open ? '<span aria-hidden="true">×</span><span>收起</span>' : '<i class="fa-solid fa-music" aria-hidden="true"></i><span>音乐</span>';
                player.querySelectorAll('iframe').forEach(frame => {
                    frame.tabIndex = open ? 0 : -1;
                    frame.title = frame.id === 'spotify-inner' ? '里站音乐' : '我的歌单';
                });
            };
            toggle.addEventListener('click', () => {
                player.classList.toggle('is-expanded');
                sync();
            });
            player.prepend(toggle);
            narrow.addEventListener('change', sync);
            sync();
        }
        const content = document.querySelector('.home-content-container');
        const firstScreen = document.querySelector('.first-screen-content');
        if (content && firstScreen && !firstScreen.querySelector('.home-reading-link')) {
            content.id = 'home-content';
            const link = document.createElement('a');
            link.href = '#home-content';
            link.className = 'home-reading-link';
            link.textContent = '往下看看 ↓';
            link.addEventListener('click', event => {
                event.preventDefault();
                content.scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
            });
            firstScreen.querySelector('.bottom-placeholder').appendChild(link);
        }
        const menuButton = document.querySelector('.menu-bar');
        if (menuButton && !menuButton.hasAttribute('role')) {
            menuButton.setAttribute('role', 'button');
            menuButton.tabIndex = 0;
            menuButton.setAttribute('aria-label', '打开或收起导航');
            menuButton.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    menuButton.click();
                }
            });
        }
    }
    // Keep keyboard focus out of closed drawers, and make icon controls usable
    // without a mouse. Rebind only to new nodes after PJAX replaces the header.
    const narrowHeader = window.matchMedia('(max-width: 1100px)');
    let searchOpener;
    document.addEventListener('click', event => {
        const trigger = event.target.closest('.search-popup-trigger');
        if (trigger) searchOpener = trigger;
        if (!event.target.closest('.pc .has-sub-menu')) {
            document.querySelectorAll('.pc .is-dropdown-open').forEach(menu => {
                menu.classList.remove('is-dropdown-open');
                menu.querySelector(':scope > a')?.setAttribute('aria-expanded', 'false');
            });
        }
    }, true);
    function keyboardButton(element, label) {
        if (!element || element.dataset.keyboardReady) return;
        element.dataset.keyboardReady = 'true';
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', label);
        element.tabIndex = 0;
        element.addEventListener('keydown', event => {
            if (event.target === element && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault(); event.stopPropagation(); element.click();
            }
        });
    }
    function syncDrawer() {
        const open = narrowHeader.matches && document.body.classList.contains('show-header-drawer');
        const drawer = document.querySelector('.header-drawer');
        if (drawer) { drawer.id = 'site-mobile-navigation'; drawer.inert = !open; }
        const button = document.querySelector('.menu-bar');
        button?.setAttribute('aria-expanded', String(open));
        button?.setAttribute('aria-controls', 'site-mobile-navigation');
    }
    function initInteractionAccess() {
        syncDrawer();
        const desktopMenu = document.querySelector('.header-wrapper .pc .menu-list');
        if (desktopMenu && !desktopMenu.classList.contains('interaction-nav-ready')) {
            desktopMenu.classList.add('interaction-nav-ready');
            const menus = [...desktopMenu.querySelectorAll(':scope > .has-sub-menu')];
            const select = selected => menus.forEach(menu => {
                const open = menu === selected;
                menu.classList.toggle('is-dropdown-open', open);
                menu.querySelector(':scope > a')?.setAttribute('aria-expanded', String(open));
            });
            menus.forEach(menu => {
                menu.querySelector(':scope > a')?.addEventListener('click', () => select(menu));
                menu.addEventListener('pointerenter', () => select(menu));
                menu.addEventListener('pointerleave', () => {
                    if (!menu.contains(document.activeElement) && menu.classList.contains('is-dropdown-open')) select(null);
                });
                menu.addEventListener('focusin', () => select(menu));
                menu.addEventListener('focusout', () => queueMicrotask(() => {
                    if (!menu.contains(document.activeElement) && !menu.matches(':hover') && menu.classList.contains('is-dropdown-open')) select(null);
                }));
                menu.addEventListener('keydown', event => {
                    if (event.key === 'Escape') {
                        event.preventDefault(); menu.querySelector(':scope > a')?.focus(); select(null);
                    }
                });
            });
            select(null);
        }
        document.querySelectorAll('.search-popup-trigger').forEach(element => keyboardButton(element, '搜索本站'));
        const overlay = document.querySelector('.search-pop-overlay');
        if (overlay && !overlay.dataset.accessReady) {
            overlay.dataset.accessReady = 'true';
            const popup = overlay.querySelector('.search-popup');
            popup.setAttribute('role', 'dialog'); popup.setAttribute('aria-modal', 'true');
            popup.setAttribute('aria-label', '搜索本站');
            overlay.querySelector('.search-input')?.setAttribute('aria-label', '搜索关键词');
            keyboardButton(overlay.querySelector('.close-popup-btn'), '关闭搜索');
            keyboardButton(overlay.querySelector('.search-input-field-pre'), '清空搜索');
            let wasOpen = false;
            const syncSearch = () => {
                const open = overlay.classList.contains('active');
                const focusInside = overlay.contains(document.activeElement);
                overlay.inert = !open;
                if (!open && wasOpen && focusInside && searchOpener?.isConnected) searchOpener.focus({ preventScroll: true });
                wasOpen = open;
            };
            new MutationObserver(syncSearch).observe(overlay, { attributes: true, attributeFilter: ['class'] });
            overlay.addEventListener('keydown', event => {
                if (event.key !== 'Tab') return;
                const focusable = [...overlay.querySelectorAll('input, a[href], [tabindex="0"]')].filter(element => element.getClientRects().length);
                const first = focusable[0], last = focusable[focusable.length - 1];
                if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
                    event.preventDefault(); (event.shiftKey ? last : first)?.focus();
                }
            });
            syncSearch();
        }
        document.querySelectorAll('.home-section-title[onclick]').forEach(title => {
            if (title.dataset.keyboardReady) return;
            keyboardButton(title, title.textContent.trim());
            const content = title.nextElementSibling;
            if (content?.id) {
                title.setAttribute('aria-controls', content.id);
                const sync = () => title.setAttribute('aria-expanded', String(getComputedStyle(content).display !== 'none'));
                new MutationObserver(sync).observe(content, { attributes: true, attributeFilter: ['style'] }); sync();
            }
            keyboardButton(title.querySelector('[id^="lock-"]'), '解锁此板块');
        });
    }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && document.body.classList.contains('show-header-drawer') && !document.querySelector('.search-pop-overlay.active')) {
            event.preventDefault();
            document.body.classList.remove('show-header-drawer');
            document.querySelector('.menu-bar')?.focus({ preventScroll: true });
        }
    });
    narrowHeader.addEventListener('change', () => {
        if (!narrowHeader.matches) document.body.classList.remove('show-header-drawer');
        syncDrawer();
    });
    document.addEventListener('DOMContentLoaded', () => {
        initInteractionAccess();
        new MutationObserver(syncDrawer).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    });
    window.addEventListener('pjax:complete', initInteractionAccess);
    document.addEventListener('DOMContentLoaded', initResponsiveUI);
    window.addEventListener('pjax:complete', initResponsiveUI);
})();

})();
