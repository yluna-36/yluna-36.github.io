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
