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

    // 3. Hidden trigger (5 clicks on logo)
    const logo = document.querySelector('.site-name') || document.querySelector('.site-logo') || document.querySelector('.header-info');
    if (logo && !logo.dataset.innerSiteListener) {
        let clickCount = 0;
        let clickTimer;
        
        logo.addEventListener('click', (e) => {
            clickCount++;
            clearTimeout(clickTimer);
            
            if (clickCount >= 5) {
                // Toggle state
                if (localStorage.getItem('inner-site-enabled') === 'true') {
                    localStorage.removeItem('inner-site-enabled');
                    document.body.classList.remove('inner-site-active');
                } else {
                    localStorage.setItem('inner-site-enabled', 'true');
                    document.body.classList.add('inner-site-active');
                }
                clickCount = 0;
                
                // Prevent default navigation if it's a link
                e.preventDefault(); 
            }
            
            clickTimer = setTimeout(() => {
                clickCount = 0;
            }, 1000); // Reset click count after 1 second of inactivity
        });
        logo.dataset.innerSiteListener = "true";
    }
};

document.addEventListener('DOMContentLoaded', initInnerSite);
window.addEventListener('pjax:complete', initInnerSite);
