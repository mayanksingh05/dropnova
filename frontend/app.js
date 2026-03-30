import { router } from './router.js';
import './fileTransfer.js';
import { cleanupConnection, dataChannel } from './webrtc.js';

document.addEventListener('DOMContentLoaded', () => {
    window.router = router;

    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;

    const updateThemeIcons = (isDark) => {
        document.getElementById('theme-icon-dark').style.display = isDark ? 'none' : 'block';
        document.getElementById('theme-icon-light').style.display = isDark ? 'block' : 'none';
    };

    const toggleTheme = () => {
        const isDark = html.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcons(isDark);
    };

    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        html.classList.remove('dark');
        updateThemeIcons(false);
    } else {
        html.classList.add('dark');
        updateThemeIcons(true);
    }

    themeToggle.addEventListener('click', toggleTheme);

    const params = new URLSearchParams(window.location.search);
    const screen = params.get("screen");

    if (screen === "receive") {
        router.navigate("receive");
    } else {
        router.navigate("home");
    }
});

// ================= GLOBAL =================
window.cleanupConnection = cleanupConnection;
window.isManualDisconnect = false;

// ================= MANUAL DISCONNECT =================
window.handleDisconnect = function () {
    window.isManualDisconnect = true;

    try {
        if (dataChannel?.readyState === "open") {
            dataChannel.send(JSON.stringify({ type: "disconnect" }));
        }
    } catch {}

    try {
        if (window.socket && window.socket.readyState === 1) {
            window.socket.send(JSON.stringify({ type: "peer-disconnected" }));
        }
    } catch {}

    cleanupConnection();

    window.disconnectMessage = "You disconnected";
    router.navigate("home");
};
// ================= PEER DISCONNECT =================
window.handlePeerDisconnect = function () {

    if (window.isManualDisconnect || window.peerManuallyDisconnected) return;

    if (window.wasConnectedOnce) {
        cleanupConnection();

        window.disconnectMessage = "Other user disconnected";

        window.receivedFiles = [];
        window.fileQueue = [];
        window.lastSentFile = null;

        router.navigate("home");
        return;
    }

    router.navigate("reconnect");
};

// ================= RECONNECT CANCEL =================
window.cancelReconnect = function () {
    window.isManualDisconnect = true;
    cleanupConnection();
    router.navigate("home");
};

// 🔥 TAB CLOSE DETECTION
window.addEventListener("beforeunload", () => {
    try {
        if (window.dataChannel?.readyState === "open") {
            window.dataChannel.send(JSON.stringify({ type: "disconnect" }));
        }
    } catch {}
});