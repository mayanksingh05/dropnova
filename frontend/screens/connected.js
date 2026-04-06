setTimeout(() => {
    const list = document.getElementById("transfer-list");
    if (list) list.innerHTML = "";
}, 0);
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
        </div>

        ${
            isSender ? `
            <div class="w-full space-y-4">

                <!-- 🔥 smaller box -->
                <div class="w-full p-8 border-2 border-dashed border-white/20 
                rounded-3xl cursor-pointer hover:border-primary transition-all duration-300"
                onclick="document.getElementById('file-input').click()">

                    <input type="file" id="file-input" multiple class="hidden"
                    onchange="handleFileSelect(event)">

                    <div class="text-4xl mb-3">📄</div>
                    <p class="font-bold text-base">Select File</p>
                    <p class="text-xs opacity-60 mt-1">Send to connected device</p>
                </div>

            </div>
            ` : `
            <div class="w-full space-y-4">

                <!-- 🔥 dummy box for receiver -->
                <div class="w-full p-8 border-2 border-dashed border-white/10 
                rounded-3xl opacity-60">

                    <div class="text-4xl mb-3">📥</div>
                    <p class="font-bold text-base">Waiting for files</p>
                    <p class="text-xs opacity-60 mt-1">Files will appear automatically</p>

                </div>

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