(function() {
    // Whitelisted IP addresses
    const whitelistedIPs = ['49.14.162.17', '2405:201:a006:9027:5104:a4b0:5ff9:c333'];

    // Check if the IP is whitelisted
    function isIPWhitelisted(ip) {
        return whitelistedIPs.includes(ip);
    }

    // Function to detect devtools using debugger
    function detectDebugger() {
        const start = new Date();
        debugger; // Pause execution if dev tools are open
        const end = new Date();
        if (end - start > 100) {
            // Do nothing, just pause
        }
    }

    // Fetch IP and initiate detection if not whitelisted
    fetch('https://api.ipify.org?format=json')
        .then(response => response.json())
        .then(data => {
            const ip = data.ip;
            if (!isIPWhitelisted(ip)) {
                // Add listener to detect devtools using devtools-detector library
                devtoolsDetector.addListener(isOpen => {
                    if (isOpen) {
                        detectDebugger();
                    }
                });

                // Launch the detector from the devtools-detector library
                devtoolsDetector.launch();

                // Periodically check for dev tools using debugger
                setInterval(detectDebugger, 1000);
            }
        })
        .catch(error => console.error('Error getting IP address:', error));
})();
