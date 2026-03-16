// frontend/screens/receiving.js
export const Receiving = () => `
    <div class="w-full space-y-8">
        <div class="text-center space-y-2">
            <h2 class="text-xl font-bold">Incoming File</h2>
            <p class="text-sm opacity-60 font-medium text-primary">Pixel 7 Pro wants to send a file</p>
        </div>

        <div class="p-8 glass-card text-center space-y-4">
            <div class="text-5xl">📁</div>
            <div>
                <p class="font-bold text-lg">Project_Assets.zip</p>
                <p class="text-sm opacity-50">45.8 MB</p>
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
            <button onclick="router.navigate('connected')" class="py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">
                Decline
            </button>
            <button onclick="router.navigate('sending')" class="py-4 rounded-2xl bg-success text-white font-bold shadow-lg shadow-success/20 hover:scale-[1.02] transition-all">
                Accept
            </button>
        </div>
    </div>
`;