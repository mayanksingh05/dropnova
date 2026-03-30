import { dataChannel } from "./webrtc.js";

// ================= STATE =================
let incomingFile = null;
let receivedSize = 0;
let fileBuffer = [];

let currentFileId = null;
let currentFileSize = 0;

window.receiverReady = false;
window.fileAckReceived = false;
window.fileQueue = [];
window.sentFiles = [];

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

// ================= UI =================
function createFileUI(id, name, type) {
    const list = document.getElementById("transfer-list");
    if (!list) return;

    const color = type === "send" ? "bg-primary" : "bg-green-500";
    const label = type === "send" ? "Sending..." : "Receiving...";

    list.innerHTML += `
<div id="file-${id}" class="p-4 glass-card space-y-2 text-left">
    <p class="font-bold text-sm truncate">${name}</p>

    <div class="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div id="bar-${id}" class="h-full ${color}" style="width:0%"></div>
    </div>

    <div class="flex justify-between text-xs font-mono opacity-70">
        <span id="percent-${id}">0%</span>
        <span>${label}</span>
        <span>--</span>
    </div>
</div>`;
}

// ================= RECEIVER =================
window.handleIncomingData = async function (data) {

    if (typeof data === "string") {
        const msg = JSON.parse(data);

        // META
        if (msg.type === "file-meta") {

            incomingFile = msg;
            receivedSize = 0;
            fileBuffer = [];
            window.incomingFile = msg;

            targetProgress[msg.id] = 0;
            displayedProgress[msg.id] = 0;
            startProgressEngine();

            // 🔥 go to receiving screen
            router.navigate("receiving");

            // notify sender ready
            setTimeout(() => {
                if (dataChannel?.readyState === "open") {
                    dataChannel.send(JSON.stringify({ type: "ready" }));
                }
            }, 50);
        }

        // READY
        else if (msg.type === "ready") {
            window.receiverReady = true;
        }

        // PROGRESS (sender side)
        else if (msg.type === "progress" && window.isSender) {
            if (!currentFileSize) return;

            const percent = Math.floor((msg.received / currentFileSize) * 100);

            if (!targetProgress[msg.id]) {
                targetProgress[msg.id] = 0;
                displayedProgress[msg.id] = 0;
            }

            targetProgress[msg.id] = percent;
        }

        // END (receiver)
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

            // 🔥 go completed (receiver)
            setTimeout(() => {
                router.navigate("completed");
            }, 1200);
        }

        // ACK (sender)
        else if (msg.type === "ack") {
            window.fileAckReceived = true;

            if (window.lastSentFile) {
                window.sentFiles.push({
                    name: window.lastSentFile.name,
                    size: window.lastSentFile.size
                });
            }

            // 🔥 go completed (sender)
            setTimeout(() => {
                router.navigate("completed");
            }, 1200);
        }

        // DISCONNECT
        else if (msg.type === "disconnect") {
            window.handlePeerDisconnect();
        }

    } else {
        // CHUNKS (receiver)
        fileBuffer.push(data);
        receivedSize += data.byteLength;

        const percent = Math.floor((receivedSize / incomingFile.size) * 100);
        targetProgress[incomingFile.id] = percent;

        // throttle progress send
        if (!window.lastProgressSent) window.lastProgressSent = 0;

        if (Date.now() - window.lastProgressSent > 100) {
            window.lastProgressSent = Date.now();

            if (dataChannel?.readyState === "open") {
                dataChannel.send(JSON.stringify({
                    type: "progress",
                    id: incomingFile.id,
                    received: receivedSize
                }));
            }
        }
    }
};

// ================= FILE SELECT =================
window.handleFileSelect = function (event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // 🔥 ONLY ONE FILE AT A TIME
    window.fileQueue = [files[0]];

    if (!window.__sendingStarted) {
        window.__sendingStarted = true;
        waitForChannel();
    }
};

async function waitForChannel() {
    let wait = 0;

    while (
        (!dataChannel || dataChannel.readyState !== "open") &&
        wait < 10000
    ) {
        await new Promise(r => setTimeout(r, 100));
        wait += 100;
    }

    if (!dataChannel || dataChannel.readyState !== "open") {
        console.error("[SEND] channel failed");
        return;
    }

    processQueue();
}

// ================= QUEUE =================
async function processQueue() {
    while (window.fileQueue.length > 0) {
        const file = window.fileQueue.shift();
        await sendFile(file);
    }

    window.__sendingStarted = false;
}

// ================= SENDER =================
async function sendFile(file) {

    const fileId = Date.now() + "_" + file.name;

    currentFileId = fileId;
    currentFileSize = file.size;

    window.lastSentFile = file;
    window.receiverReady = false;
    window.fileAckReceived = false;

    targetProgress[fileId] = 0;
    displayedProgress[fileId] = 0;
    startProgressEngine();

    await waitForTransferList();
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

    // WAIT READY
    let wait = 0;
    while (!window.receiverReady && wait < 10000) {
        await new Promise(r => setTimeout(r, 50));
        wait += 50;
    }

    // SEND CHUNKS (FAST + SAFE)
    let offset = 0;
    const chunkSize = 64 * 1024;

    while (offset < file.size) {

        // 🔥 buffer control (important mobile)
        if (dataChannel.bufferedAmount > 512 * 1024) {
            await new Promise(r => setTimeout(r, 2));
            continue;
        }

        const chunk = file.slice(offset, offset + chunkSize);
        const buffer = await chunk.arrayBuffer();

        dataChannel.send(buffer);
        offset += chunkSize;
    }

    dataChannel.send(JSON.stringify({ type: "file-end" }));

    // WAIT ACK
    let ackWait = 0;
    while (!window.fileAckReceived && ackWait < 10000) {
        await new Promise(r => setTimeout(r, 50));
        ackWait += 50;
    }
}

export { processQueue };
async function waitForTransferList() {
    let tries = 0;

    while (!document.getElementById("transfer-list") && tries < 60) {
        await new Promise(r => setTimeout(r, 30));
        tries++;
    }
}