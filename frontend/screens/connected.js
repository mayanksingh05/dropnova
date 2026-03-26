export const Connected = () => {
    const isSender = window.isSender;

    return `
    <div class="w-full text-center space-y-10">

        <div class="flex items-center justify-center gap-4">
            <div class="text-3xl">📱</div>
            <div class="w-16 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
            <div class="text-3xl">💻</div>
        </div>

        <div class="space-y-2">
            <h2 class="text-2xl font-bold">Devices Connected</h2>
            <p class="text-green-400 text-sm">Secure P2P channel ready</p>
        </div>

        ${
            isSender ? `
            <div class="w-full p-12 border-2 border-dashed border-white/20 
            rounded-3xl cursor-pointer hover:border-primary transition-all duration-300"
            onclick="document.getElementById('file-input').click()">

                <input type="file" id="file-input" class="hidden"
                onchange="handleFileSelect(event)">

                <div class="text-5xl mb-4">📄</div>
                <p class="font-bold text-lg">Select File</p>
                <p class="text-sm opacity-60 mt-2">Click to upload</p>
            </div>
            ` : `
            <div class="w-full p-12 border-2 border-dashed border-white/10 
            rounded-3xl animate-pulse">

                <div class="text-5xl mb-4">📥</div>
                <p class="font-bold text-lg">Waiting for file</p>
                <p class="text-sm opacity-60 mt-2">Sender will start transfer</p>
            </div>
            `
        }

        <button onclick="handleDisconnect()" 
        class="text-red-400 text-sm hover:underline">
            Disconnect
        </button>

    </div>
    `;
};