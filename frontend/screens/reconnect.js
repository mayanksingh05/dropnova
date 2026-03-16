// frontend/screens/reconnect.js
export const Reconnect = () => `
    <div class="w-full text-center space-y-8">
        <div class="w-20 h-20 bg-warning/20 text-warning rounded-full flex items-center justify-center text-4xl mx-auto">
            ⚠️
        </div>

        <div class="space-y-2">
            <h2 class="text-2xl font-bold">Connection Lost</h2>
            <p class="text-gray-500 px-8">The other device disconnected or the network was interrupted.</p>
        </div>

        <div class="space-y-3 w-full">
            <button onclick="router.navigate('send')" class="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:scale-[1.02] transition-all">
                Retry Connection
            </button>
            <button onclick="router.navigate('home')" class="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">
                Return Home
            </button>
        </div>
    </div>
`;