// Main JavaScript for TBCPL
// ==========================================
// TBCPL - Smart Presentation Engine
// ==========================================

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
        } else {
            entry.target.classList.remove('active'); 
        }
    });
}, { threshold: 0.1 });

async function loadLinks() {
    try {
        const response = await fetch('links.json');
        const data = await response.json();
        const container = document.getElementById('categories-container');
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
            container.appendChild(sec);
            observer.observe(sec);
        });
    } catch (e) { console.error(e); }
}

window.addEventListener('DOMContentLoaded', async () => {
    await loadLinks();
    applyFilter(); 
});

const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const slideDots = document.querySelectorAll('.slide-dot');

function applyFilter() {
    const query = searchInput.value.toLowerCase();
    const filter = document.querySelector('.filter-btn.active').dataset.filter;
    
    // Sync side dots
    slideDots.forEach(d => d.classList.remove('active'));
    document.querySelector(`.slide-dot[data-filter="${filter}"]`).classList.add('active');

    let delay = 0; 

    document.querySelectorAll('.section').forEach(sec => {
        const cards = sec.querySelectorAll('.link-card');
        let hasVisible = false;
        
        cards.forEach(card => {
            const match = card.dataset.name.toLowerCase().includes(query) && (sec.dataset.category === filter);
            card.style.display = match ? 'flex' : 'none';
            if (match) hasVisible = true;
        });
        
        if (hasVisible) {
            sec.style.display = 'block';
            sec.classList.remove('active');
            setTimeout(() => { sec.classList.add('active'); }, 20 + delay);
            delay += 50; 
        } else {
            sec.style.display = 'none';
            sec.classList.remove('active');
        }
    });
}

searchInput.addEventListener('input', applyFilter);

function triggerSlideChange(filterName) {
    filterBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.filter-btn[data-filter="${filterName}"]`).classList.add('active');
    
    applyFilter();
    
    const anchor = document.getElementById('searchAnchor');
    const lockPos = Math.floor(anchor.offsetTop - 60);
    window.scrollTo({ top: lockPos, behavior: 'auto' }); 
}

filterBtns.forEach(btn => btn.addEventListener('click', function() {
    triggerSlideChange(this.dataset.filter);
}));

slideDots.forEach(dot => dot.addEventListener('click', function() {
    triggerSlideChange(this.dataset.filter);
}));

// ==========================================
// SCROLL SENSOR & ABSOLUTE LOCK
// ==========================================

window.addEventListener('scroll', () => {
    if (window.innerWidth <= 768) return; 

    const anchor = document.getElementById('searchAnchor');
    if (!anchor) return;
    const lockPos = Math.floor(anchor.offsetTop - 60);

    const activeBtn = document.querySelector('.filter-btn.active');
    if (!activeBtn) return;
    
    if (activeBtn.dataset.filter !== 'movies') {
        if (Math.abs(window.scrollY - lockPos) > 3) {
            window.scrollTo({ top: lockPos, behavior: 'auto' });
        }
    }
});

let slideCooldown = false;

window.addEventListener('wheel', (e) => {
    if (window.innerWidth <= 768) return;

    if (slideCooldown) {
        e.preventDefault();
        return;
    }

    const anchor = document.getElementById('searchAnchor');
    if (!anchor) return;
    
    const footer = document.querySelector('.footer');
    const footerRect = footer.getBoundingClientRect();
    const isAtBottom = footerRect.bottom <= window.innerHeight + 10;

    const btns = Array.from(document.querySelectorAll('.filter-btn'));
    const activeIdx = btns.findIndex(b => b.classList.contains('active'));

    if (activeIdx > 0) {
        e.preventDefault(); 
        
        if (e.deltaY > 30) {
            slideCooldown = true;
            let nextIdx = (activeIdx + 1) % btns.length; 
            triggerSlideChange(btns[nextIdx].dataset.filter);
            setTimeout(() => slideCooldown = false, 600);
        } 
        else if (e.deltaY < -30) {
            slideCooldown = true;
            triggerSlideChange(btns[activeIdx - 1].dataset.filter);
            setTimeout(() => slideCooldown = false, 600);
        }
    } 
    else {
        if (e.deltaY > 0) {
            if (isAtBottom) {
                e.preventDefault(); 
                if (e.deltaY < 30) return;
                
                slideCooldown = true;
                triggerSlideChange(btns[1].dataset.filter);
                setTimeout(() => slideCooldown = false, 600);
            }
        } 
    }
}, { passive: false });

document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navMenu').classList.toggle('active');
});

// ==========================================
// DEVELOPER SIGNATURE
// ==========================================
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
║  • Smart Presentation Engine                                 ║
║  • AMOLED Purple Glass Theme                                 ║
║                                                              ║
║  GitHub: https://github.com/N3rdmade/TBCPL/                  ║
║  Discord: https://discord.gg/BPxzYVY5UU                      ║
╚══════════════════════════════════════════════════════════════╝
`);
