export const Sending = () => {

    const file = window.incomingFile || {};

    return `
    <div class="w-full space-y-8">

        <div class="text-center space-y-2">
            <h2 class="text-xl font-bold">Sending File...</h2>
            <p class="text-sm opacity-60">Do not close this tab</p>
        </div>

        <div class="p-4 glass-card space-y-3 text-left">

            <p class="font-bold text-sm truncate">${file.name || "Preparing..."}</p>

            <div class="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div id="bar-${file.id}" class="h-full bg-primary" style="width:0%"></div>
            </div>

            <div class="flex justify-between text-xs font-mono opacity-70">
                <span id="percent-${file.id}">0%</span>
                <span>Sending...</span>
                <span>${window.currentSpeed || "0"} MB/s</span>
            </div>

        </div>

        <button onclick="cancelTransfer()" 
        class="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-red-400 font-bold hover:bg-red-500/10 transition">
            Cancel Transfer
        </button>

    </div>
    `;
};