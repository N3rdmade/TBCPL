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
      emoji.style.animationPlayState = 'running'; // Resume animation
    });
  } else {
    disableEmojisButton.textContent = 'Enable Emojis';
    hallowmojiElements.forEach(emoji => {
      emoji.style.animationPlayState = 'paused'; // Pause animation
    });
  }
});

// Toggle audio
const toggleAudioButton = document.getElementById('toggle-audio');
const audio = new Audio('https://github.com/N3rdmade/TBCPL/blob/main/Scary%20Halloween%20Music.mp3');
let audioEnabled = true;

toggleAudioButton.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  if (audioEnabled) {
    toggleAudioButton.textContent = 'Disable Audio';
    audio.play();
  } else {
    toggleAudioButton.textContent = 'Enable Audio';
    audio.pause();
  }
});

// Volume slider
const volumeSlider = document.getElementById('volume-slider');

volumeSlider.addEventListener('input', (event) => {
  const volume = event.target.value / 100;
  audio.volume = volume;
});
