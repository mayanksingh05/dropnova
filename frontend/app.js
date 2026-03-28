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
    window.peerManuallyDisconnected = true;

    try {
        if (dataChannel?.readyState === "open") {
            dataChannel.send(JSON.stringify({ type: "disconnect" }));
        }
    } catch {}

    cleanupConnection();

    showPopup("You disconnected");

    router.navigate("home");
};

// ================= PEER DISCONNECT =================
window.handlePeerDisconnect = function () {

    if (window.isManualDisconnect || window.peerManuallyDisconnected) return;

    // 🔥 if connection was stable before → treat as final disconnect
    if (window.wasConnectedOnce) {
        console.log("[APP] peer left → go home");

        cleanupConnection();

        showPopup("Other user disconnected");

        router.navigate("home");
        return;
    }

    // 🔥 only for unstable / early drops
    console.log("[APP] unstable connection → reconnect");

    router.navigate("reconnect");
};
window.cancelReconnect = function () {
    console.log("[RTC] reconnect cancelled");

    window.isManualDisconnect = true;

    cleanupConnection();

    router.navigate("home");
};
window.showPopup = function (message) {
    const div = document.createElement("div");
    div.className = "fixed top-20 left-1/2 -translate-x-1/2 bg-black/80 text-white px-6 py-3 rounded-xl z-50 shadow-lg text-sm";
    div.innerText = message;

    document.body.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 3000);
};