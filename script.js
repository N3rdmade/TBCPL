document.addEventListener('DOMContentLoaded', function() {
    var popup = document.getElementById('audio-popup');
    var enableButton = document.getElementById('enable-audio');
    var disableButton = document.getElementById('disable-audio');

    // Show the popup
    popup.style.display = 'flex';

    enableButton.addEventListener('click', function() {
        // Logic to enable audio
        popup.style.display = 'none';
    });

    disableButton.addEventListener('click', function() {
        // Logic to disable audio
        popup.style.display = 'none';
    });
});
