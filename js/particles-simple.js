// Super simple particles.js initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing particles.js...');
  
  // Create particles container with JavaScript ONLY
  const particlesDiv = document.createElement('div');
  particlesDiv.id = 'particles-js';
  particlesDiv.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    z-index: 0 !important;
    pointer-events: none !important;
    background: transparent !important;
  `;
  
  // Add to body
  document.body.appendChild(particlesDiv);
  
  if (typeof particlesJS !== 'undefined') {
    // Basic particles config
    particlesJS('particles-js', {
      particles: {
        number: {
          value: window.innerWidth > 600 ? 80 : 40,
          density: {
            enable: true,
            value_area: 800
          }
        },
        color: {
          value: '#ff69b4'
        },
        shape: {
          type: 'circle'
        },
        opacity: {
          value: 0.5,
          random: false
        },
        size: {
          value: 3,
          random: true
        },
        line_linked: {
          enable: true,
          distance: 150,
          color: '#ff69b4',
          opacity: 0.4,
          width: 1
        },
        move: {
          enable: true,
          speed: 2,
          direction: 'none',
          random: false,
          straight: false,
          out_mode: 'out',
          bounce: false
        }
      },
      interactivity: {
        detect_on: 'window',
        events: {
          onhover: {
            enable: window.innerWidth > 600,
            mode: 'repulse'
          },
          onclick: {
            enable: true,
            mode: 'push'
          },
          resize: true
        },
        modes: {
          repulse: {
            distance: 120,
            duration: 0.8,
            speed: 1
          },
          push: {
            particles_nb: 4
          }
        }
      },
      retina_detect: true
    });
    
    console.log('Particles.js loaded successfully!');
    
    // Ensure canvas is properly configured
    setTimeout(() => {
      const canvas = document.querySelector('#particles-js canvas');
      if (canvas) {
        canvas.style.zIndex = '0';
        canvas.style.opacity = '1';
        canvas.style.visibility = 'visible';
        canvas.style.pointerEvents = 'none';
        console.log('Canvas configured for desktop:', canvas);
      }
    }, 500);
    
  } else {
    console.error('Particles.js not loaded!');
  }
});