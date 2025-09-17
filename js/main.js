// Main JavaScript for TBCPL
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            menuToggle.classList.toggle('active');
            nav.classList.toggle('active');
        });

        // Close mobile menu when clicking on nav links
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                menuToggle.classList.remove('active');
                nav.classList.remove('active');
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!menuToggle.contains(e.target) && !nav.contains(e.target)) {
                menuToggle.classList.remove('active');
                nav.classList.remove('active');
            }
        });
    }

    // QR Code modal functionality
    const qrTrigger = document.getElementById('qr-trigger');
    const qrModal = document.getElementById('qr-modal');
    const modalClose = document.querySelector('.modal-close');

    if (qrTrigger && qrModal && modalClose) {
        qrTrigger.addEventListener('click', function() {
            qrModal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });

        modalClose.addEventListener('click', function() {
            qrModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        // Close modal when clicking outside
        qrModal.addEventListener('click', function(e) {
            if (e.target === qrModal) {
                qrModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && qrModal.style.display === 'block') {
                qrModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }

    // Smooth scroll for navigation links
    const smoothScrollLinks = document.querySelectorAll('a[href^="#"]');
    smoothScrollLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.offsetTop - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');

                // Add staggered animation to site cards
                if (entry.target.classList.contains('sites-grid')) {
                    const cards = entry.target.querySelectorAll('.site-card');
                    cards.forEach((card, index) => {
                        setTimeout(() => {
                            card.classList.add('animate-in');
                        }, index * 50); // Stagger by 50ms
                    });
                }
            }
        });
    }, observerOptions);

    // Observe sections for scroll animations
    const sections = document.querySelectorAll('.section, .hero');
    sections.forEach(section => {
        observer.observe(section);
    });

    // Add CSS animation keyframes dynamically
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .site-card {
            opacity: 1;
            transform: translateY(0);
        }

        .site-card.animate-in {
            animation: fadeInUp 0.6s ease forwards;
        }
    `;
    document.head.appendChild(style);

    // Header scroll effect
    let lastScrollTop = 0;
    const header = document.querySelector('.header');

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.style.transform = 'translateY(-100%)';
        } else {
            // Scrolling up
            header.style.transform = 'translateY(0)';
        }

        lastScrollTop = scrollTop;
    }, { passive: true });

    // Add loading states for images
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', function() {
                this.classList.add('loaded');
            });
            img.addEventListener('error', function() {
                this.classList.add('error');
                // Optionally add a fallback image or placeholder
            });
        }
    });

    // Performance optimization: Lazy loading for images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                }
            });
        });

        // For future lazy loading implementation
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // Add search functionality (future enhancement)
    function addSearchFunctionality() {
        const searchInput = document.querySelector('.search-input');
        const siteCards = document.querySelectorAll('.site-card');

        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();

                siteCards.forEach(card => {
                    const siteName = card.querySelector('.site-name').textContent.toLowerCase();
                    if (siteName.includes(searchTerm)) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        }
    }

    // Theme switching functionality (for future use)
    function addThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', function() {
                document.body.classList.toggle('light-theme');
                localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
            });
        }

        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        }
    }

    // Console message for developers
    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                            TBCPL                             ║
    ║                  The Best Couch Potato List                  ║
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
    ║  GitHub: https://github.com/N3rdmade/TBCPL/                 ║
    ║  Discord: https://discord.gg/Dsts8Y2jWz                    ║
    ╚══════════════════════════════════════════════════════════════╝
    `);

    // Analytics and performance tracking (if needed)
    function trackPerformance() {
        if ('performance' in window) {
            window.addEventListener('load', function() {
                setTimeout(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                    console.log('DOM Content Loaded:', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart, 'ms');
                }, 1000);
            });
        }
    }

    trackPerformance();

    // Error handling for any uncaught errors
    window.addEventListener('error', function(e) {
        console.warn('An error occurred:', e.error);
        // Optionally send to error tracking service
    });

    // Service Worker registration (for future PWA features)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }
});