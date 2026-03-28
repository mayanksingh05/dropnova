import { dataChannel } from "./webrtc.js";

let incomingFile = null;
let receivedSize = 0;
let startTime = 0;

// 🔥 CONTROLLED BUFFER (NO MEMORY SPIKE)
let chunkStore = [];
let flushSize = 0;
const MAX_BUFFER = 5 * 1024 * 1024; // 5MB safe for phones

// 🔥 FINAL FILE
let finalChunks = [];

window.isTabHidden = false;
window.receiverReady = false;

document.addEventListener("visibilitychange", () => {
    window.isTabHidden = document.hidden;
});

// ================= RECEIVER =================
window.handleIncomingData = async function (data) {

    if (typeof data === "string") {
        const msg = JSON.parse(data);

        if (msg.type === "ping") return;

        // ================= FILE META =================
        if (msg.type === "file-meta") {
            incomingFile = msg;
            receivedSize = 0;
            startTime = Date.now();

            chunkStore = [];
            finalChunks = [];
            flushSize = 0;

            window.lastProgressSent = 0;

            router.navigate("receiving");
        }

        // ================= FILE END =================
        if (msg.type === "file-end") {
            console.log("[FILE] complete");

            // 🔥 flush remaining
            if (chunkStore.length) {
                finalChunks.push(new Blob(chunkStore));
                chunkStore = [];
            }

            const blob = new Blob(finalChunks);

            if (!window.receivedFiles) window.receivedFiles = [];
            window.receivedFiles.push({
                name: incomingFile.name,
                size: incomingFile.size,
                blob
            });

            if (dataChannel?.readyState === "open") {
                dataChannel.send(JSON.stringify({ type: "file-received" }));
            }

            const bar = document.querySelector(".progress-bar-fill");
            if (bar) bar.style.width = "100%";

            router.navigate("completed");
        }

        if (msg.type === "ready-to-receive") {
            window.receiverReady = true;
        }

        if (msg.type === "file-received") {
            window.fileAckReceived = true;
        }

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

        if (msg.type === "disconnect") {
            window.peerManuallyDisconnected = true;
            window.cleanupConnection?.();
            showPopup("Other user disconnected");
            router.navigate("home");
            return;
        }

    } else {
        // ================= RECEIVING CHUNK =================

        chunkStore.push(data);
        flushSize += data.byteLength;
        receivedSize += data.byteLength;

        // 🔥 FLUSH EVERY 5MB (KEY FIX)
        if (flushSize >= MAX_BUFFER) {
            finalChunks.push(new Blob(chunkStore));
            chunkStore = [];
            flushSize = 0;
        }

        // 🔥 PROGRESS
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

        // 🔥 SEND PROGRESS
        if (!window.lastProgressSent) window.lastProgressSent = 0;

        const now = Date.now();
        if (now - window.lastProgressSent > 120) {
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

        while (!window.receiverReady) {
            await new Promise(r => setTimeout(r, 100));
        }

        while (dataChannel.readyState !== "open") {
            await new Promise(r => setTimeout(r, 50));
        }

        startTime = Date.now();

        dataChannel.send(JSON.stringify({
            type: "file-meta",
            name: file.name,
            size: file.size
        }));

        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const chunkSize = isMobile ? 32 * 1024 : 128 * 1024;

        let offset = 0;

        while (offset < file.size) {

            while (window.isTabHidden) {
                await new Promise(r => setTimeout(r, 200));
            }

            if (dataChannel.bufferedAmount > 8 * 1024 * 1024) {
                await new Promise(r => setTimeout(r, 1));
                continue;
            }

            const chunk = file.slice(offset, offset + chunkSize);
            const buffer = await chunk.arrayBuffer();

            dataChannel.send(buffer);
            offset += chunkSize;
        }

        dataChannel.send(JSON.stringify({ type: "file-end" }));

        window.fileAckReceived = false;
        while (!window.fileAckReceived) {
            await new Promise(r => setTimeout(r, 50));
        }
    }

    router.navigate("completed");
}