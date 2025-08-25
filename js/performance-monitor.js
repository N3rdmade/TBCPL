// Performance Monitor for Interactive Background
class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.isMonitoring = false;
    this.lowPerformanceCount = 0;
    this.adaptiveQuality = 'high';
    
    // Only monitor in development or when needed
    if (window.location.hostname === 'localhost' || window.location.search.includes('debug')) {
      this.startMonitoring();
    }
  }

  startMonitoring() {
    this.isMonitoring = true;
    this.createDebugPanel();
    this.monitor();
  }

  createDebugPanel() {
    const panel = document.createElement('div');
    panel.id = 'performance-panel';
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 150px;
    `;
    document.body.appendChild(panel);
  }

  monitor() {
    if (!this.isMonitoring) return;
    
    const now = performance.now();
    this.frameCount++;
    
    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;
      
      this.updateDebugPanel();
      this.adaptPerformance();
    }
    
    requestAnimationFrame(() => this.monitor());
  }

  updateDebugPanel() {
    const panel = document.getElementById('performance-panel');
    if (panel) {
      const memoryInfo = performance.memory ? 
        `Memory: ${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB` : 
        'Memory: N/A';
      
      panel.innerHTML = `
        <div>FPS: ${this.fps}</div>
        <div>Quality: ${this.adaptiveQuality}</div>
        <div>${memoryInfo}</div>
        <div>Particles: ${window.interactiveBG ? window.interactiveBG.particles.length : 0}</div>
      `;
      
      // Color code based on performance
      if (this.fps >= 50) {
        panel.style.borderLeft = '4px solid #00ff00';
      } else if (this.fps >= 30) {
        panel.style.borderLeft = '4px solid #ffff00';
      } else {
        panel.style.borderLeft = '4px solid #ff0000';
      }
    }
  }

  adaptPerformance() {
    // Detect low performance
    if (this.fps < 30) {
      this.lowPerformanceCount++;
    } else {
      this.lowPerformanceCount = 0;
    }

    // Adapt quality based on performance
    if (this.lowPerformanceCount > 3 && window.interactiveBG) {
      if (this.adaptiveQuality === 'high') {
        this.reduceQuality();
        this.adaptiveQuality = 'medium';
      } else if (this.adaptiveQuality === 'medium' && this.lowPerformanceCount > 6) {
        this.reduceQuality();
        this.adaptiveQuality = 'low';
      }
    }
  }

  reduceQuality() {
    if (window.interactiveBG) {
      // Reduce particle count
      const targetCount = Math.max(10, Math.floor(window.interactiveBG.particles.length * 0.7));
      window.interactiveBG.particles.splice(targetCount);
      
      // Reduce FPS
      window.interactiveBG.fps = Math.max(20, window.interactiveBG.fps - 10);
      window.interactiveBG.fpsInterval = 1000 / window.interactiveBG.fps;
      
      console.log(`Performance adapted: ${this.adaptiveQuality} quality, ${targetCount} particles`);
    }
  }

  static checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  static checkDeviceMemory() {
    return navigator.deviceMemory || 4; // Default to 4GB if not available
  }

  static getPerformanceScore() {
    let score = 100;
    
    // Check device memory
    const memory = this.checkDeviceMemory();
    if (memory < 2) score -= 40;
    else if (memory < 4) score -= 20;
    
    // Check WebGL support
    if (!this.checkWebGLSupport()) score -= 20;
    
    // Check mobile device
    if (/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) score -= 30;
    
    // Check screen size
    if (window.screen.width < 1024) score -= 10;
    
    return Math.max(0, score);
  }
}

// Auto-adjust settings based on device capabilities
document.addEventListener('DOMContentLoaded', function() {
  const performanceScore = PerformanceMonitor.getPerformanceScore();
  
  // Store performance score for other scripts to use
  window.devicePerformance = {
    score: performanceScore,
    level: performanceScore > 70 ? 'high' : performanceScore > 40 ? 'medium' : 'low'
  };
  
  // Start monitoring if needed
  window.performanceMonitor = new PerformanceMonitor();
  
  console.log(`Device Performance Score: ${performanceScore} (${window.devicePerformance.level})`);
});