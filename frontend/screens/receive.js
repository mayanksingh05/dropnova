// frontend/screens/receive.js

window.connectDevice = function () {
    const code = document.getElementById("pair-code").value.trim();
    const storedCode = sessionStorage.getItem("pairCode");

    if (code !== storedCode) {
        alert("Invalid pairing code");
        return;
    }

    router.navigate('connected');
};
export const Receive = () => `
<div class="w-full text-center space-y-8">
    <h2 class="text-2xl font-bold">Connect Device</h2>
    
    <div class="space-y-4">
        <p class="text-sm opacity-60">
        Enter the 6-digit code shown on the sender's screen
        </p>

        <div class="flex justify-center gap-2">
            <input 
                id="pair-code"
                type="text"
                maxlength="6"
                placeholder="000000"
                class="w-full max-w-[240px] text-center text-3xl font-mono py-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-white/10 focus:border-primary outline-none"
                autofocus
            >
        </div>

        <button onclick="connectDevice()" 
        class="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg hover:scale-[1.02]">
            Connect
        </button>
    </div>

    <button onclick="router.navigate('home')" 
    class="px-8 py-2 text-sm opacity-50 hover:opacity-100">
        Back
    </button>
</div>
`;