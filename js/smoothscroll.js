/* ==========================================
   TBCPL Smooth Scroll (Powered by Lenis)
   Replaces the legacy 2014 script to fix stuttering on all modern browsers.
   This script handles physical mouse wheel momentum for a modern, smooth-wheel feeling.
   ========================================== */

// We create a global 'lenis' variable so index.html can use it for auto-centering.
window.lenis = new Lenis({
    duration: 1.2, // Controls the float/inertia time. Higher = longer glide.
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Perfect deceleration curve.
    smoothWheel: true,
    wheelMultiplier: 1.2, // Makes the scroll wheel feel highly responsive.
});

// The animation loop that keeps the scrolling buttery smooth
function raf(time) {
    window.lenis.raf(time);
    requestAnimationFrame(raf);
}

requestAnimationFrame(raf);