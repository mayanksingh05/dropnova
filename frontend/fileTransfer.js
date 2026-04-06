import { dataChannel } from "./webrtc.js";

// ================= STATE =================
let incomingFile = null;
let receivedSize = 0;
let fileBuffer = [];

let lastTime = 0;
let lastBytes = 0;

let currentFileId = null;
let currentFileSize = 0;

window.receiverReady = false;
window.fileAckReceived = false;
window.fileQueue = [];
window.sentFiles = [];
window.currentSpeed = "0";

window.__cancelTransfer = false; // 🔥 NEW

// ================= PROGRESS ENGINE =================
const targetProgress = {};
const displayedProgress = {};
let animationRunning = false;

function startProgressEngine() {
    if (animationRunning) return;
    animationRunning = true;

    function loop() {
        for (const id in targetProgress) {
            if (displayedProgress[id] === undefined) {
                displayedProgress[id] = 0;
            }

            let current = displayedProgress[id];
            const target = targetProgress[id];

            current += (target - current) * 0.25;

            if (Math.abs(target - current) < 0.3) {
                current = target;
            }

            displayedProgress[id] = current;

            const percent = Math.floor(current);

            const bar = document.getElementById(`bar-${id}`);
            const p = document.getElementById(`percent-${id}`);

            if (bar) bar.style.width = percent + "%";
            if (p) p.innerText = percent + "%";
        }

        requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
}

// ================= RECEIVER =================
window.handleIncomingData = async function (data) {

    if (typeof data === "string") {
        const msg = JSON.parse(data);

        if (msg.type === "file-meta") {

            incomingFile = msg;
            receivedSize = 0;
            fileBuffer = [];
            window.currentSpeed = "0";
            window.__speedSamples = [];

            window.incomingFile = msg;

            targetProgress[msg.id] = 0;
            displayedProgress[msg.id] = 0;
            startProgressEngine();

            router.navigate("receiving");

            setTimeout(() => {
                if (dataChannel?.readyState === "open") {
                    dataChannel.send(JSON.stringify({ type: "ready" }));
                }
            }, 50);
        }

        else if (msg.type === "ready") {
            window.receiverReady = true;
        }

        else if (msg.type === "progress" && window.isSender) {

            if (!currentFileSize) return;

            const percent = Math.floor((msg.received / currentFileSize) * 100);

            if (!targetProgress[msg.id]) {
                targetProgress[msg.id] = 0;
                displayedProgress[msg.id] = 0;
            }

            targetProgress[msg.id] = percent;
            window.currentSpeed = msg.speed || "0";
        }

        else if (msg.type === "file-end") {

            const blob = new Blob(fileBuffer);

            if (!window.receivedFiles) window.receivedFiles = [];
            window.receivedFiles.push({
                name: incomingFile.name,
                size: incomingFile.size,
                blob
            });

            targetProgress[incomingFile.id] = 100;

            if (dataChannel?.readyState === "open") {
                dataChannel.send(JSON.stringify({ type: "ack" }));
            }

            setTimeout(() => {
                router.navigate("completed");
            }, 1200);
        }

        else if (msg.type === "ack") {

            window.fileAckReceived = true;

            if (window.lastSentFile) {
                window.sentFiles.push({
                    name: window.lastSentFile.name,
                    size: window.lastSentFile.size
                });
            }
        }

        else if (msg.type === "disconnect") {
            window.handlePeerDisconnect();
        }

    } else {
        // ===== CHUNKS =====

        fileBuffer.push(data);
        receivedSize += data.byteLength;

        if (!window.__speedSamples) window.__speedSamples = [];

        const now = Date.now();

        window.__speedSamples.push({
            time: now,
            bytes: receivedSize
        });

        window.__speedSamples = window.__speedSamples.filter(s => now - s.time <= 2000);

        if (window.__speedSamples.length >= 2) {
            const first = window.__speedSamples[0];
            const last = window.__speedSamples[window.__speedSamples.length - 1];

            const timeDiff = (last.time - first.time) / 1000;
            const byteDiff = last.bytes - first.bytes;

            if (timeDiff > 0) {
                const speed = byteDiff / timeDiff;
                window.currentSpeed = (speed / (1024 * 1024)).toFixed(2);
            }
        }

        const percent = Math.floor((receivedSize / incomingFile.size) * 100);
        targetProgress[incomingFile.id] = percent;

        if (!window.lastProgressSent) window.lastProgressSent = 0;

        if (Date.now() - window.lastProgressSent > 100) {
            window.lastProgressSent = Date.now();

            if (dataChannel?.readyState === "open") {
                dataChannel.send(JSON.stringify({
                    type: "progress",
                    id: incomingFile.id,
                    received: receivedSize,
                    speed: window.currentSpeed
                }));
            }
        }
    }
};

// ================= FILE SELECT =================
window.handleFileSelect = function (event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    window.fileQueue.push(...files); // 🔥 MULTI FILE

    if (!window.__sendingStarted) {
        window.__sendingStarted = true;
        window.__cancelTransfer = false;
        waitForChannel();
    }
};

// ================= QUEUE =================
async function processQueue() {
    while (window.fileQueue.length > 0) {

        if (window.__cancelTransfer) break;

        const file = window.fileQueue.shift();
        await sendFile(file);
    }

    window.__sendingStarted = false;

    if (!window.__cancelTransfer) {
        router.navigate("completed");
    }
}

// ================= CANCEL =================
window.cancelTransfer = function () {
    window.__cancelTransfer = true;
    window.fileQueue = [];
    window.receiverReady = false;
    window.fileAckReceived = false;

    router.navigate("connected"); // 🔥 stay connected
};

// ================= SENDER =================
async function sendFile(file) {

    if (window.__cancelTransfer) return;

    const fileId = Date.now() + "_" + file.name;

    currentFileId = fileId;
    currentFileSize = file.size;

    window.lastSentFile = file;
    window.receiverReady = false;
    window.fileAckReceived = false;

    targetProgress[fileId] = 0;
    displayedProgress[fileId] = 0;
    startProgressEngine();

    window.incomingFile = {
        id: fileId,
        name: file.name
    };

    router.navigate("sending");

    dataChannel.send(JSON.stringify({
        type: "file-meta",
        id: fileId,
        name: file.name,
        size: file.size
    }));

    let wait = 0;
    while (!window.receiverReady && wait < 10000) {
        if (window.__cancelTransfer) return;
        await new Promise(r => setTimeout(r, 50));
        wait += 50;
    }

    let offset = 0;
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    const chunkSize = isMobile ? 16 * 1024 : 64 * 1024;

    while (offset < file.size) {

        if (window.__cancelTransfer) return;

        const limit = isMobile ? 256 * 1024 : 512 * 1024;

        if (dataChannel.bufferedAmount > limit) {
            await new Promise(r => setTimeout(r, isMobile ? 5 : 2));
            continue;
        }

        const chunk = file.slice(offset, offset + chunkSize);
        const buffer = await chunk.arrayBuffer();

        dataChannel.send(buffer);
        offset += chunkSize;
    }

    dataChannel.send(JSON.stringify({ type: "file-end" }));

    let ackWait = 0;
    while (!window.fileAckReceived && ackWait < 10000) {
        if (window.__cancelTransfer) return;
        await new Promise(r => setTimeout(r, 50));
        ackWait += 50;
    }
}

async function waitForChannel() {
    let wait = 0;

    while ((!dataChannel || dataChannel.readyState !== "open") && wait < 10000) {
        await new Promise(r => setTimeout(r, 100));
        wait += 100;
    }

    if (!dataChannel || dataChannel.readyState !== "open") {
        console.error("[SEND] channel failed");
        return;
    }

    processQueue();
}

export { processQueue };