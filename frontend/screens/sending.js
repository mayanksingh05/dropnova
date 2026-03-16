// frontend/screens/sending.js
export const Sending = () => `
    <div class="w-full space-y-8">
        <div class="text-center space-y-2">
            <h2 class="text-xl font-bold">Sending File...</h2>
            <p class="text-sm opacity-60">Do not close this tab</p>
        </div>

        <div class="p-6 glass-card space-y-6">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-2xl">🎬</div>
                <div class="flex-1 min-w-0 text-left">
                    <p class="font-bold truncate">vacation_vlog_2024.mp4</p>
                    <p class="text-xs opacity-50">142.5 MB</p>
                </div>
            </div>

            <div class="space-y-2">
                <div class="w-full h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div class="progress-bar-fill h-full bg-primary" style="width: 65%"></div>
                </div>
                <div class="flex justify-between text-xs font-mono opacity-70">
                    <span>65%</span>
                    <span>12 MB/s</span>
                    <span>00:08 left</span>
                </div>
            </div>
        </div>

        <button onclick="router.navigate('connected')" class="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-red-400 font-bold hover:bg-red-500/10 transition-colors">
            Cancel Transfer
        </button>

        <button onclick="router.navigate('completed')" class="fixed bottom-4 right-4 text-[10px] opacity-20">Simulate Success</button>
    </div>
`;