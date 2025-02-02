function addNoCheatListeners(doc) {
    doc.oncontextmenu = () => false;

    doc.onkeydown = e => {
        if (
            e.key === "F12" ||
            (e.ctrlKey && (e.key === "u" || e.key === "U")) ||
            (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "C" || e.key === "I")) ||
            (e.ctrlKey && (e.key === "j" || e.key === "c" || e.key === "i"))
        ) {
            e.preventDefault();
            return false;
        }
    };
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

// Apply listeners to the main document
addNoCheatListeners(document);
addListenersToIframes();

// Re-apply listeners to iframes periodically to catch dynamically added iframes
setInterval(addListenersToIframes, 1000);
