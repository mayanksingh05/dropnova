import { createConnection } from "../webrtc.js";

window.connectDevice = function () {
    const code = document.getElementById("pair-code").value.trim();

    const socket = new WebSocket(`ws://127.0.0.1:8000/ws/${code}`);

    socket.onopen = () => {
        console.log("Receiver connected");

        window.isSender = false;

        createConnection(socket, false, () => {
            router.navigate("connected");
        });
    };

    window.socket = socket;
};

export const Receive = () => `
<div class="text-center space-y-6">
    <input id="pair-code" placeholder="Enter code" />
    <button onclick="connectDevice()">Connect</button>
</div>
`;