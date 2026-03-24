import { createConnection } from "../webrtc.js";

window.connectDevice = function () {
    const code = document.getElementById("pair-code").value.trim();

    if (code.length !== 6 || isNaN(code)) {
        alert("Enter valid code");
        return;
    }

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

    <button onclick="connectDevice()" 
    class="w-full max-w-[260px] py-4 rounded-2xl bg-primary text-white font-bold 
    shadow-lg hover:scale-[1.03] transition">
        Connect
    </button>

    <button onclick="router.navigate('home')" 
    class="text-sm opacity-50 hover:opacity-100 transition">
        Back
    </button>

</div>
`;