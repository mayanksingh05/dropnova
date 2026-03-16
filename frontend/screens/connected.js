// frontend/screens/connected.js
export const Connected = () => `
    <div class="w-full text-center space-y-8">
        <div class="inline-flex items-center gap-4 p-4 glass-card px-8">
            <div class="text-2xl">📱</div>
            <div class="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
            <div class="text-2xl">💻</div>
        </div>

        <div class="space-y-2">
            <h2 class="text-2xl font-bold">Devices Connected</h2>
            <p class="text-success text-sm font-medium">Secure P2P Channel Established</p>
        </div>

        <div id="drop-zone" class="w-full p-12 border-2 border-dashed border-white/20 rounded-3xl hover:border-primary/50 hover:bg-primary/5 transition-all group cursor-pointer" onclick="document.getElementById('file-input').click()">
            <input type="file" id="file-input" class="hidden" onchange="router.navigate('sending')">
            <div class="text-4xl mb-4 group-hover:scale-110 transition-transform">📄</div>
            <p class="font-bold">Select or Drop Files</p>
            <p class="text-xs opacity-50 mt-1">Up to 2GB per transfer</p>
        </div>

        <button onclick="router.navigate('home')" class="text-red-400 text-sm font-medium hover:underline">
            Disconnect
        </button>
    </div>
`;