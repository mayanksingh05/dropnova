import { dataChannel } from "./webrtc.js";

let incomingFile = null;
let receivedBuffers = [];
let receivedSize = 0;

// 🔥 RECEIVER HANDLER
window.handleIncomingData = function (data) {

    if (typeof data === "string") {
        const msg = JSON.parse(data);

        if (msg.type === "file-meta") {
            console.log("[FILE] meta received", msg.name);

            incomingFile = msg;
            receivedBuffers = [];
            receivedSize = 0;

            router.navigate("receiving");
        }

        if (msg.type === "file-end") {
            console.log("[FILE] complete");

            const blob = new Blob(receivedBuffers);

            // store file
            if (!window.receivedFiles) window.receivedFiles = [];

            window.receivedFiles.push({
                name: incomingFile.name,
                size: incomingFile.size,
                blob
            });

            router.navigate("completed");
        }

        if (msg.type === "ready-to-receive") {
            console.log("[FILE] receiver ready");
            window.receiverReady = true;
        }

    } else {
        receivedBuffers.push(data);
        receivedSize += data.byteLength;

        console.log("[FILE] chunk", receivedSize);
    }
};


// sender select
window.handleFileSelect = async function (event) {
    const file = event.target.files[0];
    if (!file) return;

    window.selectedFile = file;

    router.navigate("sending");
};


// sender send
export async function sendSelectedFile() {
    const file = window.selectedFile;
    if (!file) return;

    window.lastSentFile = file;

    console.log("[FILE] sending:", file.name);

    // 🔥 WAIT FOR READY SIGNAL
    while (!window.receiverReady) {
        await new Promise(r => setTimeout(r, 100));
    }

    while (dataChannel.readyState !== "open") {
        await new Promise(r => setTimeout(r, 50));
    }

    dataChannel.send(JSON.stringify({
        type: "file-meta",
        name: file.name,
        size: file.size
    }));

    const chunkSize = 16 * 1024;
    let offset = 0;

    while (offset < file.size) {

        while (dataChannel.bufferedAmount > 1 * 1024 * 1024) {
            await new Promise(r => setTimeout(r, 50));
        }

        const chunk = file.slice(offset, offset + chunkSize);
        const buffer = await chunk.arrayBuffer();

        dataChannel.send(buffer);
        offset += chunkSize;
    }

    dataChannel.send(JSON.stringify({ type: "file-end" }));

    console.log("[FILE] sent complete");

    router.navigate("completed");
}