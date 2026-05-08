import { router } from './router.js';
import './fileTransfer.js';
import { cleanupConnection, dataChannel } from './webrtc.js';

// 💀 SWEEP GHOST SERVICE WORKERS 💀
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    });
}

// 🧹 OPFS BOOT WIPE: Clean orphaned files from previous crashed sessions
async function wipeOPFS() {
    try {
        const root = await navigator.storage.getDirectory();
        for await (const [name, handle] of root) {
            await root.removeEntry(name, { recursive: true });
            console.log(`Cleaned orphaned file: ${name}`);
        }
    } catch (e) {
        // OPFS iteration not supported on older browsers, fail silently
    }
}
wipeOPFS();

const dangerousExtensions = ['.exe', '.bat', '.sh', '.cmd', '.vbs', '.msi', '.apk'];

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
    if (savedTheme === 'light') { html.classList.remove('dark'); updateThemeIcons(false); } 
    else { html.classList.add('dark'); updateThemeIcons(true); }

    themeToggle.addEventListener('click', toggleTheme);

    const params = new URLSearchParams(window.location.search);
    if (params.get("screen") === "receive") router.navigate("receive");
    else router.navigate("home");
});

window.cleanupConnection = cleanupConnection;
window.isManualDisconnect = false;
window.__disconnectHandled = false;

setInterval(() => {
    if (window.socket && window.socket.readyState === 1) {
        window.socket.send(JSON.stringify({ type: "ping" }));
    }
}, 3000);

window.handleDisconnect = function () {
    if (window.__disconnectHandled) return;
    window.__disconnectHandled = true;
    window.isManualDisconnect = true;
    window.__cancelTransfer = true; 

    try { window.socket?.send(JSON.stringify({ type: "disconnect" })); } catch {}
    cleanupConnection();
    showDisconnectPopup("You disconnected");
    router.navigate("home");
};

window.handlePeerDisconnect = function () {
    if (window.__disconnectHandled) return;
    window.__disconnectHandled = true;
    window.__cancelTransfer = true; 

    cleanupConnection();
    showDisconnectPopup("Other user disconnected");
    window.receivedFiles = [];
    window.fileQueue = [];
    window.lastSentFile = null;
    window.hideWaitingOverlay(); 
    router.navigate("home");
};

window.showTransferError = function(message) {
    showDisconnectPopup(message);
};

window.showWaitingOverlay = function(count) {
    const old = document.getElementById("waiting-overlay");
    if (old) old.remove();

    const div = document.createElement("div");
    div.id = "waiting-overlay";
    div.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; backdrop-filter: blur(5px);">
            <div style="font-size:50px; margin-bottom:20px; animation: pulseGlow 2s infinite ease-in-out;">⏳</div>
            <h3 style="font-size:22px; font-weight:bold;">Waiting for receiver...</h3>
            <p style="opacity:0.7; margin-top:10px; font-size:14px;">Asking permission to send ${count} file(s)</p>
        </div>
    `;
    document.body.appendChild(div);
};

window.hideWaitingOverlay = function() {
    const div = document.getElementById("waiting-overlay");
    if (div) div.remove();
};

window.showBatchAcceptPrompt = function(files, callback) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const fileListHTML = files.map(f => {
        const ext = f.name.slice((f.name.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
        const warn = dangerousExtensions.includes(`.${ext}`) ? '⚠️' : '';
        return `<p style="font-size:12px; margin:2px 0;">${warn} ${f.name} (${(f.size/1024/1024).toFixed(2)} MB)</p>`;
    }).join('');
    
    const warningHTML = isMobile 
        ? `<p style="font-size:12px; color:#facc15; margin-bottom:15px;">Your mobile browser requires saving each file individually.</p>`
        : `<p style="font-size:12px; color:#22c55e; margin-bottom:15px;">Files will prompt to save natively.</p>`;

    const div = document.createElement("div");
    div.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center;">
            <div style="background:#1e293b; padding:24px; border-radius:16px; text-align:center; max-width:320px; color:white; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="font-size:18px; font-weight:bold; margin-bottom:10px;">Receive ${files.length} File(s)?</h3>
                <div style="max-height: 120px; overflow-y: auto; opacity:0.8; margin-bottom:20px; text-align:left; background:rgba(0,0,0,0.2); padding:8px; border-radius:8px;">
                    ${fileListHTML}
                </div>
                ${warningHTML}
                <div style="display:flex; gap:10px;">
                    <button id="btn-decline-batch" style="flex:1; padding:10px; border-radius:8px; background:rgba(255,0,0,0.2); color:#ff4d4d;">Decline</button>
                    <button id="btn-accept-batch" style="flex:1; padding:10px; border-radius:8px; background:#6366f1; color:white; font-weight:bold;">Accept</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(div);

    document.getElementById("btn-accept-batch").onclick = () => { div.remove(); callback(true); };
    document.getElementById("btn-decline-batch").onclick = () => { div.remove(); callback(false); };
};

window.showSingleSavePrompt = function(filename, callback) {
    const ext = filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
    const isDangerous = dangerousExtensions.includes(`.${ext}`);
    
    const secWarning = isDangerous 
        ? `<p style="color: #ff4d4d; font-size: 12px; font-weight: bold; margin-bottom: 10px;">⚠️ Warning: This file type can be dangerous.</p>` 
        : '';

    const div = document.createElement("div");
    div.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:99999; display:flex; align-items:center; justify-content:center;">
            <div style="background:#1e293b; padding:24px; border-radius:16px; text-align:center; max-width:300px; color:white; border: 1px solid rgba(255,255,255,0.1);">
                <h3 style="font-size:18px; font-weight:bold; margin-bottom:10px;">Save Next File</h3>
                ${secWarning}
                <p style="font-size:14px; opacity:0.8; margin-bottom:20px; word-wrap: break-word;">${filename}</p>
                <button id="btn-save-next" style="width:100%; padding:10px; border-radius:8px; background:#22c55e; color:white; font-weight:bold;">Save File</button>
            </div>
        </div>
    `;
    document.body.appendChild(div);
    document.getElementById("btn-save-next").onclick = () => { div.remove(); callback(); };
};

function showDisconnectPopup(message) {
    const old = document.getElementById("disconnect-popup");
    if (old) old.remove();
    const div = document.createElement("div");
    div.id = "disconnect-popup";
    div.innerHTML = `<div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(255,0,0,0.15); color: #ff4d4d; padding: 12px 20px; border-radius: 12px; font-size: 14px; z-index: 99999; backdrop-filter: blur(10px);">${message}</div>`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

window.addEventListener("beforeunload", () => {
    window.__cancelTransfer = true;
    window.fileQueue = [];
    window.receivedFiles = [];
    window.incomingFile = null;
    try { window.socket?.send(JSON.stringify({ type: "disconnect" })); } catch {}
    try { window.socket?.close(); } catch {}
    try { window.dataChannel?.close(); } catch {}
    try { window.peerConnection?.close(); } catch {}
});