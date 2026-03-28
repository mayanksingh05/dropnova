export const Connected = () => {
    const isSender = window.isSender;

    const mode = window.connectionMode === "relay"
        ? "🌐 Global Mode (slower)"
        : "⚡ Fast Mode (same network)";

    return `
    <div class="w-full text-center space-y-10">

        <div class="flex items-center justify-center gap-4">
            <div class="text-3xl">📱</div>
            <div class="w-16 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
            <div class="text-3xl">💻</div>
        </div>

        <div class="space-y-2">
            <h2 class="text-2xl font-bold">Devices Connected</h2>
            <p class="text-green-400 text-sm">Secure connection established</p>
            <p class="text-xs opacity-70">${mode}</p>
            <p class="text-xs opacity-50">
                Tip: Same WiFi / Hotspot = much faster ⚡
            </p>
        </div>

        ${
            isSender ? `
            <div class="w-full space-y-4">

                <div class="w-full p-12 border-2 border-dashed border-white/20 
                rounded-3xl cursor-pointer hover:border-primary transition-all duration-300"
                onclick="document.getElementById('file-input').click()">

                    <input type="file" id="file-input" class="hidden" multiple
                    onchange="handleFileSelect(event)">

                    <div class="text-5xl mb-4">📄</div>
                    <p class="font-bold text-lg">Select Files</p>
                    <p class="text-sm opacity-60 mt-2">Multiple supported</p>
                </div>

                <div id="selected-files" class="w-full space-y-2"></div>

                <div class="w-full space-y-2">
                    <p class="text-sm opacity-60 text-left">Transfers</p>
                    <div id="transfer-list" class="space-y-3"></div>
                </div>

            </div>
            ` : `
            <div class="w-full space-y-2">
                <p class="text-sm opacity-60 text-left">Incoming Files</p>
                <div id="transfer-list" class="space-y-3"></div>
            </div>
            `
        }

        <button onclick="handleDisconnect()" 
        class="text-red-400 text-sm hover:underline">
            Disconnect
        </button>

    </div>
    `;
};