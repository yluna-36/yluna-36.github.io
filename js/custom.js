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
    if (isInnerSite) {
        document.body.classList.add('inner-site-active');
    } else {
        document.body.classList.remove('inner-site-active');
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
                    if (localStorage.getItem('inner-site-enabled') === 'true') {
                        localStorage.removeItem('inner-site-enabled');
                        document.body.classList.remove('inner-site-active');
                    } else {
                        localStorage.setItem('inner-site-enabled', 'true');
                        document.body.classList.add('inner-site-active');
                    }
                    clickCount = 0;
                }
                
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 1000);
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', initInnerSite);
window.addEventListener('pjax:complete', initInnerSite);
