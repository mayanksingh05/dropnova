import { createConnection } from "../webrtc.js";

function generateCode() {
    return Math.floor(100000 + Math.random() * 900000);
}

export const Send = () => {
    const code = generateCode();

    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/${code}`);

    socket.onopen = () => {
        console.log("Sender connected");

        window.isSender = true;

        createConnection(socket, true, () => {
            router.navigate("connected");
        });
    };

    window.socket = socket;

    setTimeout(() => {
        const qr = document.getElementById("qrcode");
        qr.innerHTML = "";

        new QRCode(qr, {
            text: code.toString(),
            width: 180,
            height: 180
        });
    }, 0);

    return `
    <div class="text-center space-y-6">
        <h2 class="text-2xl font-bold">Pair Device</h2>
        <div id="qrcode"></div>
        <div class="text-3xl font-bold">${code}</div>
    </div>
    `;
};