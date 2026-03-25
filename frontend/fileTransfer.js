import { dataChannel } from "./webrtc.js";

// ✅ used by connected.js (onclick)
window.handleFileSelect = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    window.selectedFile = file; // store globally

    console.log("File selected:", file.name);

    // optional: navigate if you have sending screen
    if (window.router) {
        window.router.navigate("sending");
    }
};

// ✅ REQUIRED by sending.js (this was missing)
export async function sendSelectedFile() {
    const file = window.selectedFile;
    if (!file) return;

    window.lastSentFile = file;

    console.log("📤 Sending:", file.name);

    // ✅ WAIT UNTIL CHANNEL IS REALLY READY
    while (dataChannel.readyState !== "open") {
        await new Promise(r => setTimeout(r, 50));
    }

    // ✅ SMALL DELAY (VERY IMPORTANT)
    await new Promise(r => setTimeout(r, 200));

    // send metadata FIRST
    dataChannel.send(JSON.stringify({
        type: "file-meta",
        name: file.name,
        size: file.size
    }));

    const chunkSize = 16 * 1024;
    let offset = 0;

    while (offset < file.size) {

        // ✅ STRICT FLOW CONTROL
        while (dataChannel.bufferedAmount > 1 * 1024 * 1024) {
            await new Promise(r => setTimeout(r, 50));
        }

        const chunk = file.slice(offset, offset + chunkSize);
        const buffer = await chunk.arrayBuffer();

        dataChannel.send(buffer);
        offset += chunkSize;
    }

    // end signal
    dataChannel.send(JSON.stringify({ type: "file-end" }));

    console.log("✅ File sent");

    if (window.router) {
        router.navigate("completed");
    }
}