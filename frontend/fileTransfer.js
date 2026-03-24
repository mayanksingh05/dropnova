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

    if (!file) {
        console.error("No file selected");
        return;
    }

    console.log("📤 Sending:", file.name);

    // send metadata
    dataChannel.send(JSON.stringify({
        type: "file-meta",
        name: file.name,
        size: file.size
    }));

    const chunkSize = 16 * 1024;
    let offset = 0;

    while (offset < file.size) {
        const chunk = file.slice(offset, offset + chunkSize);
        const buffer = await chunk.arrayBuffer();

        dataChannel.send(buffer);
        offset += chunkSize;
    }

    dataChannel.send(JSON.stringify({ type: "file-end" }));

    console.log("✅ File sent");

    if (window.router) {
        window.router.navigate("completed");
    }
}