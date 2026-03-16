// frontend/screens/receive.js
export const Receive = () => `
    <div class="w-full text-center space-y-8">
        <h2 class="text-2xl font-bold">Connect Device</h2>
        
        <div class="space-y-4">
            <p class="text-sm opacity-60">Enter the 6-digit code shown on the sender's screen</p>
            <div class="flex justify-center gap-2">
                <input type="text" maxlength="6" placeholder="000 000" class="w-full max-w-[240px] text-center text-3xl font-mono py-4 rounded-2xl bg-gray-100 dark:bg-white/5 border border-white/10 focus:border-primary outline-none transition-all" autofocus>
            </div>
            <button onclick="router.navigate('connected')" class="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                Connect
            </button>
        </div>

        <div class="p-4 glass-card flex items-center justify-between text-sm">
            <span>Network Status</span>
            <span class="text-success font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-success"></span>
                Detecting...
            </span>
        </div>

        <button onclick="router.navigate('home')" class="px-8 py-2 text-sm opacity-50 hover:opacity-100 transition-opacity">
            Back
        </button>
    </div>
`;