import { createConnection } from "../webrtc.js";

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000);
}

export const Send = () => {
    const code = generateCode();

    const socket = new WebSocket(`wss://dropnova.onrender.com/ws/${code}`);

    socket.onopen = () => {
        console.log("Sender connected");
        window.isSender = true;
        createConnection(socket, true, () => {
            router.navigate("connected");
        });
    };

    window.socket = socket;

    requestAnimationFrame(() => {
        const qrContainer = document.getElementById("qrcode");
        if (!qrContainer) return;

        qrContainer.innerHTML = "";

        const url = `${location.origin}/?screen=receive&code=${code}`;
        new window.QRCode(qrContainer, {
            text: url,
            width: 180,
            height: 180
        });
    });

    return `
    <div class="w-full text-center space-y-8">

        <h2 class="text-3xl font-bold tracking-tight">Pair Device</h2>

        <div class="relative inline-block p-5 rounded-3xl glass-card qr-pulse">
            <div id="qrcode" class="bg-white p-2 rounded-xl"></div>
        </div>

        <div class="space-y-2">
            <p class="text-sm opacity-60">Pairing Code</p>
            <div class="text-5xl font-mono font-bold tracking-widest text-primary">
                ${code}
            </div>
        </div>

        <p class="text-sm px-6 opacity-70">
            Scan QR or enter code on receiver
        </p>

        <button onclick="router.navigate('home')" 
        class="mt-6 px-6 py-2 rounded-xl text-sm opacity-60 hover:opacity-100 transition">
            Cancel
        </button>

    </div>
    `;
};