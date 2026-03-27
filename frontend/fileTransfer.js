import { dataChannel } from "./webrtc.js";

let incomingFile = null;
let receivedBuffers = [];
let receivedSize = 0;

let startTime = 0;

// ================= BACKGROUND HANDLING =================
window.isTabHidden = false;
window.receiverReady = false;

document.addEventListener("visibilitychange", () => {
    window.isTabHidden = document.hidden;
    console.log("[APP]", document.hidden ? "background" : "active");
});


// ================= RECEIVER =================
window.handleIncomingData = function (data) {

    if (typeof data === "string") {
        const msg = JSON.parse(data);

        // 🔥 IGNORE PING
        if (msg.type === "ping") return;

        // ================= FILE META =================
        if (msg.type === "file-meta") {
            console.log("[FILE] meta received:", msg.name);

            incomingFile = msg;
            receivedBuffers = [];
            receivedSize = 0;
            startTime = Date.now();

            window.lastProgressSent = 0;

            router.navigate("receiving");
        }

        // ================= FILE END =================
        if (msg.type === "file-end") {
            console.log("[FILE] complete");

            const blob = new Blob(receivedBuffers);

            if (!window.receivedFiles) window.receivedFiles = [];

            window.receivedFiles.push({
                name: incomingFile.name,
                size: incomingFile.size,
                blob
            });

            // 🔥 SEND ACK
            if (dataChannel?.readyState === "open") {
                dataChannel.send(JSON.stringify({ type: "file-received" }));
            }

            // 🔥 FORCE 100%
            const bar = document.querySelector(".progress-bar-fill");
            if (bar) bar.style.width = "100%";

            router.navigate("completed");
        }

        // ================= READY =================
        if (msg.type === "ready-to-receive") {
            window.receiverReady = true;
        }

        // ================= ACK =================
        if (msg.type === "file-received") {
            window.fileAckReceived = true;
        }

        // ================= SYNCED PROGRESS (SENDER SIDE) =================
        if (msg.type === "progress") {
            if (!window.lastSentFile) return;

            const total = window.lastSentFile.size;
            const received = msg.received;

            const progress = Math.floor((received / total) * 100);

            const elapsed = (Date.now() - startTime) / 1000;
            const speed = (received / 1024 / 1024) / elapsed;

            const bar = document.querySelector(".progress-bar-fill");
            if (bar) {
                bar.style.transition = "width 0.15s linear";
                bar.style.width = progress + "%";
            }

            const stats = document.querySelectorAll(".font-mono span");
            if (stats.length >= 3) {
                stats[0].innerText = progress + "%";
                stats[1].innerText = speed.toFixed(2) + " MB/s";
            }
        }

        // ================= DISCONNECT =================
        if (msg.type === "disconnect") {
            console.log("[RTC] peer disconnected");

            window.peerManuallyDisconnected = true;

            window.cleanupConnection?.();

            window.disconnectMessage = "Other user disconnected";

            router.navigate("home");
            return;
        }

    } else {
        // ================= RECEIVING CHUNK =================
        receivedBuffers.push(data);
        receivedSize += data.byteLength;

        // 🔥 REAL RECEIVER PROGRESS UPDATE
        if (incomingFile) {
            const progress = Math.floor((receivedSize / incomingFile.size) * 100);

            const elapsed = (Date.now() - startTime) / 1000;
            const speed = (receivedSize / 1024 / 1024) / elapsed;

            const bar = document.querySelector(".progress-bar-fill");
            if (bar) {
                bar.style.transition = "width 0.15s linear";
                bar.style.width = progress + "%";
            }

            const stats = document.querySelectorAll(".font-mono span");
            if (stats.length >= 3) {
                stats[0].innerText = progress + "%";
                stats[1].innerText = speed.toFixed(2) + " MB/s";
            }
        }

        // 🔥 SEND PROGRESS TO SENDER (THROTTLED)
        if (!window.lastProgressSent) window.lastProgressSent = 0;

        const now = Date.now();
        if (now - window.lastProgressSent > 100) {
            window.lastProgressSent = now;

            if (dataChannel?.readyState === "open") {
                dataChannel.send(JSON.stringify({
                    type: "progress",
                    received: receivedSize
                }));
            }
        }
    }
};


// ================= FILE SELECT =================
window.handleFileSelect = async function (event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    if (!window.fileQueue) window.fileQueue = [];

    window.fileQueue.push(...files);

    router.navigate("sending");
};


// ================= SENDER =================
export async function sendSelectedFile() {

    if (!window.fileQueue || window.fileQueue.length === 0) return;

    while (window.fileQueue.length > 0) {

        const file = window.fileQueue.shift();
        window.lastSentFile = file;

        console.log("[FILE] sending:", file.name);

        while (!window.receiverReady) {
            await new Promise(r => setTimeout(r, 100));
        }

        while (dataChannel.readyState !== "open") {
            await new Promise(r => setTimeout(r, 50));
        }

        startTime = Date.now();

        // 🔥 SEND META
        dataChannel.send(JSON.stringify({
            type: "file-meta",
            name: file.name,
            size: file.size
        }));

        const chunkSize = 128 * 1024;
        let offset = 0;

        const maxBuffered = 8 * 1024 * 1024;

        while (offset < file.size) {

            while (window.isTabHidden) {
                await new Promise(r => setTimeout(r, 200));
            }

            while (
                dataChannel.bufferedAmount < maxBuffered &&
                offset < file.size
            ) {
                const chunk = file.slice(offset, offset + chunkSize);
                const buffer = await chunk.arrayBuffer();

                dataChannel.send(buffer);
                offset += chunkSize;
            }

            await new Promise(r => setTimeout(r, 2));
        }

        // 🔥 FILE END
        dataChannel.send(JSON.stringify({ type: "file-end" }));

        window.fileAckReceived = false;
        while (!window.fileAckReceived) {
            await new Promise(r => setTimeout(r, 50));
        }

        console.log("[FILE] sent:", file.name);
    }

    router.navigate("completed");
}