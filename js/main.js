// Main JavaScript for TBCPL
document.addEventListener('DOMContentLoaded', function() {
    // 1. Core Elements
    const searchInput = document.getElementById('searchInput');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const slideDots = document.querySelectorAll('.slide-dot');
    const categoriesContainer = document.getElementById('categories-container');
    const searchAnchor = document.getElementById('searchAnchor');
    const footer = document.querySelector('.footer');
    const menuToggle = document.querySelector('.menu-toggle') || document.getElementById('navToggle');
    const nav = document.querySelector('.nav') || document.getElementById('navMenu');

    // 2. Device Detection
    const isDesktop = !('ontouchstart' in window) && window.innerWidth > 1024;

    // 3. Reveal Animation Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    // 4. Content Loading Engine (The Fix)
    async function loadLinks() {
        try {
            const response = await fetch('links.json');
            const data = await response.json();
            
            if (!categoriesContainer) {
                console.error("Categories container not found!");
                return;
            }

            // Clear container before loading to prevent duplicates
            categoriesContainer.innerHTML = '';

            data.categories.forEach(category => {
                const sec = document.createElement('div');
                sec.className = 'section';
                sec.setAttribute('data-category', category.id);
                sec.innerHTML = `<h2 class="section-header">${category.name}</h2><div class="links-grid"></div>`;
                
                category.sites.filter(s => s.enabled !== false).forEach(site => {
                    const link = document.createElement('a');
                    link.href = site.url;
                    link.target = '_blank';
                    link.className = 'link-card';
                    link.setAttribute('data-name', site.name);
                    link.innerHTML = `<img src="${site.logo}" class="card-logo" alt="${site.name}">`;
                    sec.querySelector('.links-grid').appendChild(link);
                });
                categoriesContainer.appendChild(sec);
                observer.observe(sec);
            });
            
            // Apply initial filter state
            applyFilter();
        } catch (e) {
            console.error("Error loading links:", e);
        }
    }

    // 5. Filtering & Presentation Logic
    function applyFilter() {
        if (!searchInput) return;
        const query = searchInput.value.toLowerCase();
        const activeBtn = document.querySelector('.filter-btn.active');
        if (!activeBtn) return;
        const filter = activeBtn.dataset.filter;
        
        slideDots.forEach(d => d.classList.toggle('active', d.dataset.filter === filter));

        document.querySelectorAll('.section').forEach(sec => {
            const cards = sec.querySelectorAll('.link-card');
            let hasVisible = false;
            
            cards.forEach(card => {
                const name = card.dataset.name ? card.dataset.name.toLowerCase() : "";
                const match = name.includes(query) && (sec.dataset.category === filter);
                card.style.display = match ? 'flex' : 'none';
                if (match) hasVisible = true;
            });
            
            sec.style.display = hasVisible ? 'block' : 'none';
            if (hasVisible) {
                setTimeout(() => sec.classList.add('active'), 10);
            }
        });
    }

    function triggerSlideChange(filterName) {
        filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === filterName));
        applyFilter();
        
        if (searchAnchor) {
            const lockPos = Math.floor(searchAnchor.offsetTop - 60);
            window.scrollTo({ 
                top: lockPos, 
                behavior: isDesktop ? 'auto' : 'smooth' 
            });
        }
    }

    // 6. Event Listeners
    if (searchInput) searchInput.addEventListener('input', applyFilter);
    filterBtns.forEach(btn => btn.addEventListener('click', () => triggerSlideChange(btn.dataset.filter)));
    slideDots.forEach(dot => dot.addEventListener('click', () => triggerSlideChange(dot.dataset.filter)));

    // 7. Desktop Presentation Mode
    if (isDesktop) {
        window.addEventListener('scroll', () => {
            const activeBtn = document.querySelector('.filter-btn.active');
            if (!searchAnchor || !activeBtn || activeBtn.dataset.filter === 'movies') return;

            const lockPos = Math.floor(searchAnchor.offsetTop - 60);
            if (Math.abs(window.scrollY - lockPos) > 5) {
                window.scrollTo({ top: lockPos, behavior: 'auto' });
            }
        });

        let slideCooldown = false;
        window.addEventListener('wheel', (e) => {
            if (slideCooldown) { e.preventDefault(); return; }

            const isAtBottom = footer && footer.getBoundingClientRect().bottom <= window.innerHeight + 50;
            const btns = Array.from(document.querySelectorAll('.filter-btn'));
            const activeIdx = btns.findIndex(b => b.classList.contains('active'));

            if (activeIdx > 0) {
                e.preventDefault(); 
                if (Math.abs(e.deltaY) < 30) return;
                slideCooldown = true;
                let nextIdx = e.deltaY > 0 ? (activeIdx + 1) : (activeIdx - 1);
                if (nextIdx >= 0 && nextIdx < btns.length) triggerSlideChange(btns[nextIdx].dataset.filter);
                setTimeout(() => slideCooldown = false, 700);
            } else if (isAtBottom && e.deltaY > 30) {
                e.preventDefault();
                slideCooldown = true;
                triggerSlideChange(btns[1].dataset.filter);
                setTimeout(() => slideCooldown = false, 700);
            }
        }, { passive: false });
    }

    // 8. Mobile Menu & Modal (Original Features)
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }

    const qrTrigger = document.getElementById('qr-trigger');
    const qrModal = document.getElementById('qr-modal');
    if (qrTrigger && qrModal) {
        qrTrigger.addEventListener('click', () => {
            qrModal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        });
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            qrModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    // 9. Original Console Branding
    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                            TBCPL                             ║
    ║                   The Best Couch Potato List                 ║
    ║                                                              ║
    ║  Built with ❤️ by Hellhorde                                  ║
    ║  Optimized for performance and accessibility                 ║
    ║                                                              ║
    ║  Features:                                                   ║
    ║  • Mobile-first responsive design                            ║
    ║  • Smooth animations and transitions                         ║
    ║  • Accessibility focused                                     ║
    ║  • Performance optimized                                     ║
    ║                                                              ║
    ║  GitHub: https://github.com/N3rdmade/TBCPL/                  ║
    ║  Discord: https://discord.gg/BPxzYVY5UU                      ║
    ╚══════════════════════════════════════════════════════════════╝
    `);

    // 10. Performance & Service Worker
    function trackPerformance() {
        if ('performance' in window) {
            window.addEventListener('load', () => {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    if (perfData) console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                }, 1000);
            });
        }
    }
    trackPerformance();

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW failed:', err));
        });
    }

    // Initialize content
    loadLinks();
});
