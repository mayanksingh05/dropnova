export const Receiving = () => `
    <div class="w-full space-y-8">
        <div class="text-center space-y-2">
            <h2 class="text-xl font-bold">Receiving File...</h2>
            <p class="text-sm opacity-60">Downloading automatically</p>
        </div>

        <div class="p-6 glass-card space-y-6">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center text-2xl">📥</div>
                <div class="flex-1 min-w-0 text-left">
                    <p class="font-bold truncate">Incoming file...</p>
                    <p class="text-xs opacity-50">Please wait</p>
                </div>
            </div>

            <div class="w-full h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div class="h-full bg-green-500" style="width: 50%"></div>
            </div>
        </div>
    </div>
`;