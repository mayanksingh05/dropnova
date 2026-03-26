// frontend/app.js
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

    router.navigate('home');
});

// ================= GLOBALS =================
window.cleanupConnection = cleanupConnection;
window.isManualDisconnect = false;

// ================= MANUAL DISCONNECT =================
window.handleDisconnect = function () {
    console.log("[RTC] manual disconnect");

    window.isManualDisconnect = true;

    try {
        if (dataChannel && dataChannel.readyState === "open") {
            dataChannel.send(JSON.stringify({ type: "disconnect" }));
        }
    } catch {}

    cleanupConnection();

    window.disconnectMessage = "You disconnected";
    router.navigate("home");
};

// ================= PEER DISCONNECT =================
window.handlePeerDisconnect = function () {
    // 🔥 prevent double trigger
    if (window.isManualDisconnect) return;

    console.log("[APP] peer disconnected");

    cleanupConnection();

    window.disconnectMessage = "Other user disconnected";

    router.navigate("home");
};