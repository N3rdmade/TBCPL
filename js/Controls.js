// controls.js

// Toggle emoji animation
const disableEmojisButton = document.getElementById('disable-emojis');
const hallowmojiElements = document.querySelectorAll('.hallowmoji');

let emojisEnabled = true;
disableEmojisButton.addEventListener('click', () => {
  emojisEnabled = !emojisEnabled;
  if (emojisEnabled) {
    disableEmojisButton.textContent = 'Disable Emojis';
    hallowmojiElements.forEach(emoji => {
      emoji.style.display = 'block'; // Make emojis visible
      emoji.style.animationPlayState = 'running'; // Resume animation
    });
  } else {
    disableEmojisButton.textContent = 'Enable Emojis';
    hallowmojiElements.forEach(emoji => {
      emoji.style.display = 'none'; // Hide emojis
      emoji.style.animationPlayState = 'paused'; // Pause animation
    });
  }
});

// Toggle audio
const toggleAudioButton = document.getElementById('toggle-audio');
const volumeSlider = document.getElementById('volume-slider');

const audio = new Audio('https://github.com/N3rdmade/TBCPL/blob/main/Scary%20Halloween%20Music.mp3?raw=true'); // Ensure the URL is correct and points directly to the audio file
let audioEnabled = false; // Start with audio disabled

// Initialize button text based on audioEnabled state
toggleAudioButton.textContent = 'Enable Audio';

// Add event listener for audio button
toggleAudioButton.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  if (audioEnabled) {
    toggleAudioButton.textContent = 'Disable Audio';
    audio.play().catch(error => console.log('Error playing audio:', error)); // Play audio
  } else {
    toggleAudioButton.textContent = 'Enable Audio';
    audio.pause(); // Pause audio
    audio.currentTime = 0; // Reset audio to start
  }
});

// Volume slider
volumeSlider.addEventListener('input', (event) => {
  const volume = event.target.value / 100;
  audio.volume = volume;
});
