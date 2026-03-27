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

    // 🔥 route based on QR
    const params = new URLSearchParams(window.location.search);
    const screen = params.get("screen");

    if (screen === "receive") {
        router.navigate("receive");
    } else {
        router.navigate("home");
    }
});

// ================= GLOBALS =================
window.cleanupConnection = cleanupConnection;
window.isManualDisconnect = false;

// ================= MANUAL DISCONNECT =================
window.handleDisconnect = function () {
    console.log("[RTC] manual disconnect");

    window.isManualDisconnect = true;
    window.peerManuallyDisconnected = false;

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

    if (window.isManualDisconnect || window.peerManuallyDisconnected) return;

    console.log("[APP] peer/network disconnected");

    cleanupConnection();

    window.disconnectMessage = "Connection lost";

    // 🔥 go to reconnect screen instead of home
    router.navigate("reconnect");
};