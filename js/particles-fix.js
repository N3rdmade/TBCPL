// Additional particles.js positioning fix
function fixParticlesPositioning() {
  const container = document.getElementById('particles-js');
  const canvas = document.querySelector('#particles-js canvas');
  
  if (container) {
    container.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: -10 !important;
      pointer-events: none !important;
      background: transparent !important;
      margin: 0 !important;
      padding: 0 !important;
    `;
  }
  
  if (canvas) {
    canvas.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: -10 !important;
      pointer-events: none !important;
      margin: 0 !important;
      padding: 0 !important;
    `;
    console.log('Particles positioning fixed');
  }
}

// Run the fix multiple times to ensure it works
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(fixParticlesPositioning, 200);
  setTimeout(fixParticlesPositioning, 1000);
  setTimeout(fixParticlesPositioning, 2000);
});

// Also fix on window resize
window.addEventListener('resize', fixParticlesPositioning);