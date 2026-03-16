// frontend/screens/home.js
export const Home = () => `
    <div class="text-center w-full space-y-8">
        <div class="space-y-2">
            <h1 class="text-5xl font-extrabold tracking-tighter">DropNova ⚡</h1>
            <p class="text-gray-500 dark:text-gray-400">Fast, Peer-to-Peer file sharing.</p>
        </div>

        <div class="grid grid-cols-1 gap-4 w-full">
            <button onclick="router.navigate('send')" class="p-8 glass-card border-primary/20 hover:border-primary transition-all group">
                <div class="text-4xl mb-2">📤</div>
                <div class="text-xl font-bold">Send File</div>
                <p class="text-sm opacity-60">Share from this device</p>
            </button>

            <button onclick="router.navigate('receive')" class="p-8 glass-card border-success/20 hover:border-success transition-all group">
                <div class="text-4xl mb-2">📥</div>
                <div class="text-xl font-bold">Receive File</div>
                <p class="text-sm opacity-60">Get from another device</p>
            </button>
        </div>

        <div class="pt-8 space-y-4">
            <p class="text-xs uppercase tracking-widest opacity-50 font-bold">Offline Mode</p>
            <button class="w-full py-3 rounded-2xl bg-gray-200 dark:bg-white/5 font-medium hover:bg-gray-300 dark:hover:bg-white/10 transition-colors">
                Download Desktop App
            </button>
            <button class="w-full py-3 rounded-2xl border-2 border-gray-200 dark:border-white/5 font-medium opacity-60">
                Get Android App
            </button>
        </div>
    </div>
`;