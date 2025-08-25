// Advanced Mouse Effects
class MouseEffects {
  constructor() {
    this.isMobile = window.innerWidth <= 600;
    if (this.isMobile) return; // Skip on mobile for performance
    
    this.trails = [];
    this.cursor = { x: 0, y: 0, prevX: 0, prevY: 0 };
    this.isMoving = false;
    this.moveTimeout = null;
    
    this.init();
  }

  init() {
    this.createCustomCursor();
    this.bindEvents();
  }

  createCustomCursor() {
    // Only add click ripple styles, no custom cursor
    const style = document.createElement('style');
    style.textContent = `
      @keyframes ripple-expand {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        100% {
          transform: scale(4);
          opacity: 0;
        }
      }
      
      .click-ripple {
        position: fixed;
        width: 20px;
        height: 20px;
        border: 2px solid #ff69b4;
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        animation: ripple-expand 0.6s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    document.addEventListener('mousemove', (e) => {
      this.cursor.x = e.clientX;
      this.cursor.y = e.clientY;
    }, { passive: true });

    document.addEventListener('click', (e) => {
      this.createClickEffect();
    }, { passive: true });
  }

  // Removed updateCursor, setMoving, and createTrail methods since we don't need them

  createClickEffect() {
    // Create multiple ripple effects for better visual impact
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.cssText = `
          left: ${this.cursor.x - 10}px;
          top: ${this.cursor.y - 10}px;
          animation-delay: ${i * 0.1}s;
        `;
        
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 800);
      }, i * 50);
    }
  }
}

// Initialize mouse effects on desktop only
document.addEventListener('DOMContentLoaded', function() {
  if (window.innerWidth > 600) {
    setTimeout(() => {
      window.mouseEffects = new MouseEffects();
    }, 1000);
  }
});