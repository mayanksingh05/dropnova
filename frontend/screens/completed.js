// frontend/screens/completed.js
export const Completed = () => {
    const file = window.lastSentFile || {};

    const fileName = file.name || "Unknown file";
    const fileSize = file.size
        ? (file.size / (1024 * 1024)).toFixed(2) + " MB"
        : "";

    return `
    <div class="w-full text-center space-y-8">
        <div class="relative inline-block">
            <div class="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center text-4xl animate-bounce">
                ✅
            </div>
            <div class="absolute inset-0 bg-success/20 rounded-full animate-ping"></div>
        </div>

        <div class="space-y-2">
            <h2 class="text-3xl font-bold">Transfer Complete</h2>
            <p class="text-gray-500">File saved to Downloads</p>
        </div>

        <div class="p-4 glass-card inline-block mx-auto text-left">
            <p class="text-sm font-bold opacity-80">${fileName}</p>
            <p class="text-xs opacity-50">${fileSize} • Sent Successfully</p>
        </div>

        <div class="space-y-3 w-full">
            <button onclick="router.navigate('connected')" class="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:scale-[1.02] transition-all">
                Send Another File
            </button>
            <button onclick="router.navigate('home')" class="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">
                Back to Home
            </button>
        </div>
    </div>
    `;
};