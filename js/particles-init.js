// Initialize Particles.js - Create container with immediate positioning
function initParticles() {
  console.log('Initializing Particles.js...');
  
  // Create particles container programmatically with immediate positioning
  let particlesContainer = document.getElementById('particles-js');
  if (!particlesContainer) {
    particlesContainer = document.createElement('div');
    particlesContainer.id = 'particles-js';
    
    // Set styles immediately to prevent layout issues
    particlesContainer.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      z-index: -1 !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
      display: block !important;
    `;
    
    // Insert at the beginning of body, not append
    document.body.insertBefore(particlesContainer, document.body.firstChild);
    console.log('Particles container created and positioned');
  }
  
  // Check if particlesJS is available
  if (typeof particlesJS !== 'undefined') {
    const config = getParticlesConfig();
    console.log('Loading particles with config:', config);
    
    // Initialize particles.js
    particlesJS('particles-js', config);
    console.log('Particles.js initialized successfully');
    
    // Double-check positioning after particles.js creates canvas
    setTimeout(() => {
      const container = document.getElementById('particles-js');
      const canvas = document.querySelector('#particles-js canvas');
      
      if (container) {
        container.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: -1 !important;
          pointer-events: none !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
        `;
      }
      
      if (canvas) {
        canvas.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          z-index: -1 !important;
          pointer-events: none !important;
        `;
      }
      
      console.log('Particles positioning re-enforced');
    }, 100);
    
    // Store reference for later use
    window.particlesLoaded = true;
  } else {
    console.error('Particles.js library not loaded!');
    // Retry after a short delay
    setTimeout(initParticles, 500);
  }
}

// Initialize when DOM is ready and library is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, waiting for particles.js library...');
  
  // Wait for particles.js to load
  const checkLibrary = setInterval(function() {
    if (typeof particlesJS !== 'undefined') {
      clearInterval(checkLibrary);
      initParticles();
    }
  }, 100);
  
  // Fallback timeout
  setTimeout(function() {
    if (typeof particlesJS === 'undefined') {
      console.error('Particles.js failed to load after timeout');
      clearInterval(checkLibrary);
    }
  }, 5000);
});

// Handle resize
window.addEventListener('resize', function() {
  if (window.particlesLoaded && typeof pJSDom !== 'undefined' && pJSDom[0]) {
    pJSDom[0].pJS.fn.particlesRefresh();
  }
}, { passive: true });

// Handle visibility change for performance
document.addEventListener('visibilitychange', function() {
  if (window.particlesLoaded && typeof pJSDom !== 'undefined' && pJSDom[0]) {
    if (document.hidden) {
      pJSDom[0].pJS.fn.particlesPause();
    } else {
      pJSDom[0].pJS.fn.particlesPlay();
    }
  }
});