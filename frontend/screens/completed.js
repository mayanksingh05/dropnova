export const Completed = () => {
    const isSender = window.isSender;
    const files = window.receivedFiles || [];

    const formatSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const message = isSender ? "File sent successfully" : "File received successfully";
    const actionText = isSender ? "Send Another File" : "Receive More Files";

    const receivedList = files.map((file) => `
        <div class="p-4 glass-card flex items-center justify-between gap-4">
            <div class="text-left min-w-0">
                <p class="font-bold truncate">${file.name}</p>
                <p class="text-xs opacity-50">${formatSize(file.size)} • Saved to disk</p>
            </div>
        </div>
    `).join("");

    const sentFiles = window.sentFiles || [];

    const senderBox = `
    <div class="w-full space-y-2">
        ${sentFiles.map(file => `
            <div class="p-4 glass-card flex items-center justify-between gap-4">
                <div class="text-left min-w-0">
                    <p class="font-bold truncate">${file.name}</p>
                    <p class="text-xs opacity-50">
                        ${formatSize(file.size)} • Sent Successfully
                    </p>
                </div>
            </div>
        `).join("")}
    </div>
    `;

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
            <p class="text-gray-400">${message}</p>
        </div>

        ${isSender ? senderBox : `<div class="space-y-3">${receivedList || "<p class='opacity-50'>No files received</p>"}</div>`}

        <div class="space-y-3 w-full max-w-[260px] mx-auto">
            <button onclick="router.navigate('connected')" 
            class="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg hover:scale-[1.03] transition">
                ${actionText}
            </button>
            
            <button onclick="handleDisconnect()" 
            class="w-full mt-2 text-sm opacity-50 hover:opacity-100 transition text-red-400">
                Disconnect Session
            </button>
        </div>

    </div>
    `;
};