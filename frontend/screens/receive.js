import { createConnection } from "../webrtc.js";

window.connectDevice = function () {
    const code = document.getElementById("pair-code").value.trim();

    if (code.length !== 6 || isNaN(code)) {
        alert("Enter valid code");
        return;
    }

    const socket = new WebSocket(`wss://dropnova.onrender.com/ws/${code}`);

    socket.onopen = () => {
        console.log("Receiver connected");

        window.isSender = false;

        createConnection(socket, false, () => {
            router.navigate("connected");
        });
    };

    socket.onerror = () => {
        alert("Connection failed. Check network.");
    };

    socket.onclose = () => {
        if (window.isManualDisconnect) return;

        // 🔥 allow disconnect handler to run
        window.__disconnectHandled = false;

        window.handlePeerDisconnect?.();
    };

    window.socket = socket;
};

export const Receive = () => {

    // 🔥 auto-connect if QR used
    requestAnimationFrame(() => {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
            const input = document.getElementById("pair-code");
            if (input) {
                input.value = code;

                setTimeout(() => {
                    connectDevice();
                }, 200);
            }
        }
    });

    return `
<div class="w-full text-center space-y-8">

    <h2 class="text-3xl font-bold tracking-tight">Connect Device</h2>

    <p class="text-sm opacity-60 px-6">
        Enter the 6-digit code shown on sender
    </p>

    <input 
        id="pair-code"
        maxlength="6"
        placeholder="000000"
        class="w-full max-w-[260px] text-center text-4xl font-mono py-4 rounded-2xl 
        bg-gray-100 dark:bg-white/5 border border-white/10 
        focus:border-primary outline-none transition"
    >

    <div class="space-y-3 w-full max-w-[260px] mx-auto">
        <button onclick="connectDevice()" 
        class="w-full py-4 rounded-2xl bg-primary text-white font-bold 
        shadow-lg hover:scale-[1.03] transition">
            Connect
        </button>

        <button onclick="router.navigate('home')" 
        class="w-full text-sm opacity-50 hover:opacity-100 transition">
            Back
        </button>
    </div>

</div>
`;
};