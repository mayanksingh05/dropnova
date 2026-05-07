export const Connected = () => {
    const isSender = window.isSender;

    return `
    <div class="w-full text-center space-y-8">

        <div class="relative inline-block">
            <div class="w-24 h-24 bg-success/20 rounded-full flex items-center justify-center text-4xl animate-pulse">
                🔗
            </div>
            <div class="absolute inset-0 bg-success/20 rounded-full animate-ping" style="animation-duration: 3s;"></div>
        </div>

        <div class="space-y-2">
            <h2 class="text-3xl font-bold">Device Connected</h2>
            <p class="text-gray-400">
                ${isSender ? "Select files to send to the receiver" : "Waiting for sender to select files..."}
            </p>
        </div>

        ${isSender ? `
        <div class="space-y-3 w-full">
            <input type="file" id="file-input" multiple class="hidden" onchange="handleFileSelect(event)">
            
            <button onclick="document.getElementById('file-input').click()" 
            class="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
                <span class="text-xl">📁</span> Select Files
            </button>
        </div>
        ` : `
        <div class="p-6 glass-card border-success/20 animate-pulse">
            <p class="opacity-70">Ready to receive incoming files</p>
        </div>
        `}

        <div class="pt-4 space-y-3 w-full">
            <button onclick="handleDisconnect()" 
            class="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-red-400 font-bold hover:bg-red-500/10 transition">
                Disconnect Session
            </button>
        </div>

    </div>
    `;
};