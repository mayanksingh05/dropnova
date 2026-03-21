export const Connected = () => {
    const isSender = window.isSender;

    return `
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

        ${
            isSender ? `
            <div class="w-full p-12 border-2 border-dashed border-white/20 rounded-3xl cursor-pointer"
                onclick="document.getElementById('file-input').click()">

                <input type="file" id="file-input" class="hidden"
                onchange="handleFileSelect(event)">

                <div class="text-4xl mb-4">📄</div>
                <p class="font-bold">Select File to Send</p>
            </div>
            ` : `
            <div class="w-full p-12 border-2 border-dashed border-white/10 rounded-3xl">
                <div class="text-4xl mb-4">📥</div>
                <p class="font-bold">Waiting for file...</p>
            </div>
            `
        }

        <button onclick="router.navigate('home')" 
        class="text-red-400 text-sm font-medium hover:underline">
            Disconnect
        </button>

    </div>
    `;
};