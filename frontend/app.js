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
window.__disconnectHandled = false;

// ================= MANUAL DISCONNECT =================
window.handleDisconnect = function () {

    if (window.__disconnectHandled) return;
    window.__disconnectHandled = true;

    window.isManualDisconnect = true;

    try {
        if (window.socket && window.socket.readyState === 1) {
            window.socket.send(JSON.stringify({ type: "disconnect" }));
        }
    } catch {}

    try {
        if (dataChannel?.readyState === "open") {
            dataChannel.send(JSON.stringify({ type: "disconnect" }));
        }
    } catch {}

    cleanupConnection();

    // 🔥 SHOW POPUP IMMEDIATELY
    showDisconnectPopup("You disconnected");

    router.navigate("home");
};

// ================= PEER DISCONNECT =================
window.handlePeerDisconnect = function () {

    if (window.__disconnectHandled) return;
    window.__disconnectHandled = true;

    cleanupConnection();

    // 🔥 SHOW POPUP IMMEDIATELY
    showDisconnectPopup("Other user disconnected");

    // reset state
    window.receivedFiles = [];
    window.fileQueue = [];
    window.lastSentFile = null;

    router.navigate("home");
};

// ================= TEMPORARY DISCONNECT =================
window.handleTemporaryDisconnect = function () {
    if (window.__disconnectHandled) return;

    if (window.currentScreen !== "reconnect") {
        router.navigate("reconnect");
    }
};

// ================= RECONNECT SUCCESS =================
window.handleReconnectSuccess = function () {
    if (window.currentScreen === "reconnect") {
        router.navigate("connected");
    }
};

// ================= CANCEL RECONNECT =================
window.cancelReconnect = function () {
    window.handleDisconnect();
};

// ================= GLOBAL POPUP FUNCTION =================
function showDisconnectPopup(message) {

    // remove existing popup
    const old = document.getElementById("disconnect-popup");
    if (old) old.remove();

    const div = document.createElement("div");
    div.id = "disconnect-popup";

    div.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255,0,0,0.15);
            color: #ff4d4d;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 99999;
            backdrop-filter: blur(10px);
        ">
            ${message}
        </div>
    `;

    document.body.appendChild(div);

    setTimeout(() => {
        div.remove();
    }, 3000);
}

// ================= TAB CLOSE =================
window.addEventListener("beforeunload", () => {
    try {
        if (window.socket && window.socket.readyState === 1) {
            window.socket.send(JSON.stringify({ type: "disconnect" }));
        }
    } catch {}
});