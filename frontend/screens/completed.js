// frontend/screens/completed.js

export const Completed = () => {
    const isSender = window.isSender;

    const files = window.receivedFiles || [];
    const sentFile = window.lastSentFile || {};

    const formatSize = (bytes) => {
        if (!bytes) return "";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const message = isSender
        ? "File sent successfully"
        : "File received successfully";

    const actionText = isSender
        ? "Send Another File"
        : "Receive More Files";

    // 🔥 RECEIVER FILE LIST UI
    const receivedList = files.map((file, i) => `
        <div class="p-4 glass-card flex items-center justify-between gap-4">
            <div class="text-left min-w-0">
                <p class="font-bold truncate">${file.name}</p>
                <p class="text-xs opacity-50">${formatSize(file.size)}</p>
            </div>

            <button 
                onclick="downloadFile(${i})"
                class="px-4 py-2 rounded-xl bg-primary text-white text-sm hover:scale-105 transition">
                ⬇
            </button>
        </div>
    `).join("");

    // 🔥 SENDER FILE UI
    const senderBox = `
        <div class="p-4 glass-card inline-block mx-auto text-left">
            <p class="text-sm font-bold opacity-80">${sentFile.name || "Unknown file"}</p>
            <p class="text-xs opacity-50">${formatSize(sentFile.size)} • Sent Successfully</p>
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

        ${
            isSender
                ? senderBox
                : `<div class="space-y-3">${receivedList || "<p class='opacity-50'>No files received</p>"}</div>`
        }

        <div class="space-y-3 w-full">
            <button onclick="router.navigate('connected')" 
            class="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:scale-[1.02] transition-all">
                ${actionText}
            </button>

            <button onclick="router.navigate('home')" 
            class="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">
                Back to Home
            </button>
        </div>

    </div>
    `;
};

// 🔥 DOWNLOAD FUNCTION
window.downloadFile = function(index) {
    const file = window.receivedFiles[index];
    if (!file) return;

    const url = URL.createObjectURL(file.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
};