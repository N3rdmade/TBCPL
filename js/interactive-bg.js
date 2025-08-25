// Interactive Background System
class InteractiveBackground {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.mouse = { x: 0, y: 0, moved: false };
    this.isMobile = window.innerWidth <= 600;
    this.isTablet = window.innerWidth <= 1024 && window.innerWidth > 600;
    this.animationId = null;
    this.lastTime = 0;
    this.fps = this.isMobile ? 30 : 60;
    this.fpsInterval = 1000 / this.fps;
    
    console.log('Initializing Interactive Background...');
    this.init();
  }

  init() {
    this.createCanvas();
    this.initParticles();
    this.bindEvents();
    this.startAnimation();
  }

  createCanvas() {
    // Remove old canvas if exists
    const oldCanvas = document.getElementById('interactive-bg');
    if (oldCanvas) oldCanvas.remove();

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'interactive-bg';
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1;
      pointer-events: none;
      background: transparent;
    `;
    
    document.body.insertBefore(this.canvas, document.body.firstChild);
    this.ctx = this.canvas.getContext('2d');
    
    console.log('Canvas created:', this.canvas);
    this.resize();
  }

  initParticles() {
    this.particles = [];
    
    // Adaptive particle count based on device performance
    let particleCount = 80; // Default for high-end desktop
    
    if (this.isMobile) {
      particleCount = 15;
    } else if (this.isTablet) {
      particleCount = 35;
    } else if (window.devicePerformance) {
      // Use performance score if available
      switch (window.devicePerformance.level) {
        case 'low': particleCount = 30; break;
        case 'medium': particleCount = 50; break;
        case 'high': particleCount = 80; break;
      }
    }
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * (this.isMobile ? 0.5 : 1),
        vy: (Math.random() - 0.5) * (this.isMobile ? 0.5 : 1),
        size: Math.random() * (this.isMobile ? 2 : 3) + 1,
        opacity: Math.random() * 0.5 + 0.3,
        color: this.getRandomColor(),
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  getRandomColor() {
    const colors = ['#ff69b4', '#9370db', '#00ffff', '#ffffff', '#ff1493'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  bindEvents() {
    if (!this.isMobile) {
      document.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        this.mouse.moved = true;
      }, { passive: true });

      document.addEventListener('click', (e) => {
        this.createExplosion(e.clientX, e.clientY);
      }, { passive: true });
    }

    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    // Update particle positions if they're outside new bounds
    this.particles.forEach(particle => {
      if (particle.x > this.canvas.width) particle.x = this.canvas.width;
      if (particle.y > this.canvas.height) particle.y = this.canvas.height;
    });
  }

  createExplosion(x, y) {
    const explosionParticles = this.isMobile ? 8 : 15;
    
    for (let i = 0; i < explosionParticles; i++) {
      const angle = (Math.PI * 2 * i) / explosionParticles;
      const velocity = this.isMobile ? 2 : 4;
      
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        size: Math.random() * 3 + 2,
        opacity: 1,
        color: this.getRandomColor(),
        life: 60, // frames to live
        pulsePhase: 0
      });
    }
  }

  updateParticles() {
    this.particles = this.particles.filter(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      // Bounce off edges
      if (particle.x <= 0 || particle.x >= this.canvas.width) {
        particle.vx *= -0.8;
        particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
      }
      if (particle.y <= 0 || particle.y >= this.canvas.height) {
        particle.vy *= -0.8;
        particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
      }

      // Mouse interaction (desktop only)
      if (!this.isMobile && this.mouse.moved) {
        const dx = this.mouse.x - particle.x;
        const dy = this.mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const force = (100 - distance) / 100;
          particle.vx += dx * force * 0.01;
          particle.vy += dy * force * 0.01;
        }
      }

      // Apply friction
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // Pulse effect
      particle.pulsePhase += 0.05;
      particle.size += Math.sin(particle.pulsePhase) * 0.1;

      // Handle explosion particles
      if (particle.life !== undefined) {
        particle.life--;
        particle.opacity = particle.life / 60;
        return particle.life > 0;
      }

      return true;
    });
  }

  drawParticles() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw connections (desktop only, limited for performance)
    if (!this.isMobile) {
      this.ctx.strokeStyle = 'rgba(255, 105, 180, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.globalAlpha = 1;
      
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < Math.min(i + 5, this.particles.length); j++) {
          const dx = this.particles[i].x - this.particles[j].x;
          const dy = this.particles[i].y - this.particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 120) {
            this.ctx.globalAlpha = (120 - distance) / 120 * 0.5;
            this.ctx.beginPath();
            this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
            this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
            this.ctx.stroke();
          }
        }
      }
    }

    // Draw particles with stronger visibility
    this.particles.forEach(particle => {
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.fillStyle = particle.color;
      
      // Add glow effect first
      if (!this.isMobile) {
        this.ctx.shadowColor = particle.color;
        this.ctx.shadowBlur = particle.size * 3;
      }
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Reset shadow
      this.ctx.shadowBlur = 0;
    });
    
    this.ctx.globalAlpha = 1;
  }

  animate(currentTime) {
    if (currentTime - this.lastTime >= this.fpsInterval) {
      this.updateParticles();
      this.drawParticles();
      this.lastTime = currentTime;
    }
    
    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }

  startAnimation() {
    this.animationId = requestAnimationFrame((time) => this.animate(time));
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing background...');
  // Wait a bit for the page to settle
  setTimeout(() => {
    try {
      window.interactiveBG = new InteractiveBackground();
      console.log('Interactive background initialized successfully');
    } catch (error) {
      console.error('Error initializing interactive background:', error);
    }
  }, 500);
});

// Handle visibility change to pause/resume animation
document.addEventListener('visibilitychange', function() {
  if (window.interactiveBG) {
    if (document.hidden) {
      window.interactiveBG.destroy();
    } else {
      setTimeout(() => {
        window.interactiveBG = new InteractiveBackground();
      }, 100);
    }
  }
});