// frontend/screens/send.js
import { createConnection } from "../webrtc.js";
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000);
}

export const Send = () => {
    const code = generateCode();
    sessionStorage.setItem("pairCode", code);
    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/${code}`);
    socket.onopen = () => {
        console.log("Sender connected");
        window.isSender = true; // ✅ REQUIRED
        createConnection(socket, true, () => {
            router.navigate("connected");
        });
    };
    window.socket = socket;

    setTimeout(() => {
        const qrContainer = document.getElementById("qrcode");
        qrContainer.innerHTML = "";

        new QRCode(qrContainer, {
            text: code.toString(),
            width: 180,
            height: 180
        });
    }, 0);

    return `
    <div class="w-full text-center space-y-6">
        <h2 class="text-2xl font-bold">Pair Device</h2>
        
        <div class="relative inline-block p-4 glass-card qr-pulse mb-4">
            <div id="qrcode" class="bg-white p-2 rounded-lg"></div>
        </div>

        <div class="space-y-1">
            <p class="text-sm opacity-60">Pairing Code</p>
            <div class="text-4xl font-mono font-bold tracking-widest text-primary">${code}</div>
        </div>

        <p class="text-sm px-8 opacity-70">
        Scan the QR code or enter the code on the receiving device.
        </p>

        <button onclick="router.navigate('home')" class="mt-4 px-8 py-2 text-sm opacity-50 hover:opacity-100">
            Cancel
        </button>
    </div>
    `;
};