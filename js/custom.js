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
const initInnerSite = () => {
    // 1. Check URL for override
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    
    if (mode === 'inner') {
        localStorage.setItem('inner-site-enabled', 'true');
    } else if (mode === 'outer') {
        localStorage.removeItem('inner-site-enabled');
    }

    // 2. Apply class based on state
    const isInnerSite = localStorage.getItem('inner-site-enabled') === 'true';
    const firstScreen = document.querySelector('.first-screen-container');
    
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

    // 3. Hidden trigger (5 clicks on a special icon in the top right menu)
    let secretIcon = document.getElementById('secret-inner-trigger');
    
    // Inject the icon if it doesn't exist yet
    if (!secretIcon) {
        const menuList = document.querySelector('.menu-list') || document.querySelector('.header-menu');
        if (menuList) {
            secretIcon = document.createElement('li');
            secretIcon.id = 'secret-inner-trigger';
            secretIcon.className = 'menu-item flex-start border-box'; // Keep theme menu item class
            
            // Use a subtle icon, e.g., a moon
            const aTag = document.createElement('a');
            aTag.className = 'menu-text-color border-box';
            aTag.style.cursor = 'default';
            aTag.innerHTML = '<i class="menu-text-color menu-icon fa-solid fa-moon" style="opacity: 0.3; margin-left: 15px;"></i>';
            
            secretIcon.appendChild(aTag);
            menuList.appendChild(secretIcon);
            
            let clickCount = 0;
            let clickTimer;
            
            secretIcon.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent any default action
                clickCount++;
                clearTimeout(clickTimer);
                
                if (clickCount >= 5) {
                    const currentPath = window.location.pathname;
                    if (currentPath === '/inner/' || currentPath === '/inner/index.html') {
                        // Exit inner site
                        localStorage.removeItem('inner-site-enabled');
                        window.location.href = '/';
                    } else {
                        // Enter inner site
                        localStorage.setItem('inner-site-enabled', 'true');
                        window.location.href = '/inner/';
                    }
                    clickCount = 0;
                }
                
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 1000);
            });
        }
    }

    // 4. Modify Home links (e.g. Logo, Home menu item) to point to /inner/ when inner site is active
    const homeLinks = document.querySelectorAll('a[href="/"]');
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
};

document.addEventListener('DOMContentLoaded', initInnerSite);
window.addEventListener('pjax:complete', initInnerSite);

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
    const mobileBar = document.querySelector('.header-wrapper .mobile');
    if (mobileBar && !document.getElementById('keep-lang-mobile-btn')) {
        const btn = document.createElement('div');
        btn.id = 'keep-lang-mobile-btn';
        btn.className = 'icon-item keep-lang-mobile-trigger ignore';
        btn.title = 'Language / 言語 / 语言';
        btn.innerHTML = '<i class="fa-solid fa-language" style="font-size: 1.2rem;"></i>';

        const popup = document.createElement('div');
        popup.id = 'keep-lang-mobile-popup';
        popup.className = 'keep-lang-mobile-popup ignore';
        popup.innerHTML = SUPPORTED_LANGUAGES.map(l => `
            <div class="keep-lang-mobile-item keep-lang-option ignore ${l.id === currentLang ? 'active-lang' : ''}"
                 data-lang="${l.id}"
                 onclick="window.switchSiteLanguage('${l.id}')">
                ${l.label}
            </div>
        `).join('');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            popup.classList.toggle('open');
        });

        document.addEventListener('click', () => {
            popup.classList.remove('open');
        });

        mobileBar.insertBefore(btn, mobileBar.firstChild);
        const headerWrapper = document.querySelector('.header-wrapper');
        if (headerWrapper && !document.getElementById('keep-lang-mobile-popup')) {
            headerWrapper.appendChild(popup);
        }
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

document.addEventListener('DOMContentLoaded', initSiteTranslate);
window.addEventListener('pjax:complete', initSiteTranslate);

