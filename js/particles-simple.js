
// Lightweight particles only for high-end devices
document.addEventListener('DOMContentLoaded', function() {
  // Skip particles on low-end devices completely
  const isLowEndDevice = (
    window.innerWidth <= 768 ||
    window.innerHeight <= 600 ||
    navigator.deviceMemory < 4 ||
    navigator.hardwareConcurrency < 4
  );

  if (isLowEndDevice) {
    console.log('Skipping particles.js for low-end device');
    return;
  }

  console.log('Initializing lightweight particles.js...');

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

  document.body.appendChild(particlesDiv);

  if (typeof particlesJS !== 'undefined') {
    // Ultra-lightweight config for better performance
    particlesJS('particles-js', {
      particles: {
        number: {
          value: 30, // Reduced from 80 to 30
          density: {
            enable: false // Disable density calculations
          }
        },
        color: {
          value: '#ff69b4'
        },
        shape: {
          type: 'circle'
        },
        opacity: {
          value: 0.3, // Reduced opacity
          random: false
        },
        size: {
          value: 2, // Smaller particles
          random: false // Disable randomization
        },
        line_linked: {
          enable: true,
          distance: 100, // Shorter connections
          color: '#ff69b4',
          opacity: 0.2, // Lower opacity
          width: 0.5 // Thinner lines
        },
        move: {
          enable: true,
          speed: 1, // Slower movement
          direction: 'none',
          random: false,
          straight: false,
          out_mode: 'out',
          bounce: false
        }
      },
      interactivity: {
        detect_on: 'canvas',
        events: {
          onhover: {
            enable: false // Disable hover interactions
          },
          onclick: {
            enable: false
          },
          resize: true
        }
      },
      retina_detect: false // Disable retina detection for performance
    });

    console.log('Lightweight particles.js loaded successfully!');

  } else {
    console.error('Particles.js library not loaded!');
  }
});