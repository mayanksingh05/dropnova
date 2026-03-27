export const Reconnect = () => `
    <div class="w-full text-center space-y-8">

        <div class="text-4xl animate-pulse">🔄</div>

        <div class="space-y-2">
            <h2 class="text-2xl font-bold">Reconnecting...</h2>
            <p class="text-gray-500">Trying to restore connection</p>
        </div>

        <button onclick="cancelReconnect()" 
        class="w-full py-4 rounded-2xl bg-red-500/20 text-red-400 font-bold hover:bg-red-500/30 transition">
            Cancel Reconnection
        </button>

    </div>
`;