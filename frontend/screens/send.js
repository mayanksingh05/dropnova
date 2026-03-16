// frontend/screens/send.js
export const Send = () => `
    <div class="w-full text-center space-y-6">
        <h2 class="text-2xl font-bold">Pair Device</h2>
        
        <div class="relative inline-block p-4 glass-card qr-pulse mb-4">
            <div id="qrcode" class="bg-white p-2 rounded-lg"></div>
        </div>

        <div class="space-y-1">
            <p class="text-sm opacity-60">Pairing Code</p>
            <div class="text-4xl font-mono font-bold tracking-widest text-primary">882 109</div>
        </div>

        <p class="text-sm px-8 opacity-70">Scan the QR code or enter the code on the receiving device to connect.</p>

        <div class="flex items-center justify-center gap-2 text-warning animate-pulse">
            <span class="w-2 h-2 rounded-full bg-warning"></span>
            <span class="text-xs font-bold uppercase">Waiting for connection...</span>
        </div>

        <button onclick="router.navigate('home')" class="mt-4 px-8 py-2 text-sm opacity-50 hover:opacity-100 transition-opacity">
            Cancel
        </button>

        <!-- DEV PREVIEW TRIGGER -->
        <button onclick="router.navigate('connected')" class="fixed bottom-4 right-4 text-[10px] opacity-20">Skip to Connected</button>
    </div>
`;