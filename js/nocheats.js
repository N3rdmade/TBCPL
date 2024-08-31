function addNoCheatListeners(doc) {
    doc.oncontextmenu = () => {
        return false;
    };

    doc.onkeydown = e => {
        if (e.key === "F12") {
            return false;
        }
        if ((e.ctrlKey && e.key === "u") || (e.ctrlKey && e.key === "U")) {
            return false;
        }
        if ((e.ctrlKey && e.shiftKey && e.key === "J") || (e.ctrlKey && e.key === "j")) {
            return false;
        }
        if ((e.ctrlKey && e.shiftKey && e.key === "C") || (e.ctrlKey && e.key === "c")) {
            return false;
        }
        if ((e.ctrlKey && e.shiftKey && e.key === "I") || (e.ctrlKey && e.key === "i")) {
            return false;
        }
    };

    doc.addEventListener('keydown', function(e) {
        if ((e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.shiftKey && e.key === 'i')) {
            e.preventDefault();
            return false;
        }
    });
}

function addListenersToIframes() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            addNoCheatListeners(iframeDoc);
        } catch (e) {
            console.error('Could not access iframe document:', e);
        }
    });
}

// Whitelisted IP addresses
const whitelistedIPs = ['49.14.162.17', '103.240.238.721'];

// Check if the IP is whitelisted
function isIPWhitelisted(ip) {
    return whitelistedIPs.includes(ip);
}

// Fetch IP and initiate listeners if not whitelisted
fetch('https://api.ipify.org?format=json')
    .then(response => response.json())
    .then(data => {
        const ip = data.ip;
        if (!isIPWhitelisted(ip)) {
            addNoCheatListeners(document);
            addListenersToIframes();

            // Re-apply listeners to iframes periodically to catch dynamically added iframes
            setInterval(addListenersToIframes, 1000);
        }
    })
    .catch(error => console.error('Error getting IP address:', error));
