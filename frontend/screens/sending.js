import { sendSelectedFile } from "../fileTransfer.js";
import { selectedFile } from "../transfer.js";

function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export const Sending = () => {
    const fileName = selectedFile ? selectedFile.name : "Unknown file";
    const fileSize = selectedFile ? formatFileSize(selectedFile.size) : "--";

    // 🔥 WAIT FOR READY FLAG INSTEAD
    async function waitAndSend() {
        while (!window.receiverReady) {
            await new Promise(r => setTimeout(r, 100));
        }

        console.log("[FILE] starting after ready");
        sendSelectedFile();
    }

    waitAndSend();

    return `
    <div class="w-full space-y-8">
        <div class="text-center space-y-2">
            <h2 class="text-xl font-bold">Sending File...</h2>
            <p class="text-sm opacity-60">Do not close this tab</p>
        </div>

        <div class="p-6 glass-card space-y-6">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-2xl">📄</div>
                <div class="flex-1 min-w-0 text-left">
                    <p class="font-bold truncate">${fileName}</p>
                    <p class="text-xs opacity-50">${fileSize}</p>
                </div>
            </div>

            <div class="space-y-2">
                <div class="w-full h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div class="progress-bar-fill h-full bg-primary" style="width: 0%"></div>
                </div>
                <div class="flex justify-between text-xs font-mono opacity-70">
                    <span>Starting...</span>
                    <span>-- MB/s</span>
                    <span>--:-- left</span>
                </div>
            </div>
        </div>

        <button onclick="router.navigate('connected')" class="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-red-400 font-bold hover:bg-red-500/10 transition-colors">
            Cancel Transfer
        </button>
    </div>
    `;
};