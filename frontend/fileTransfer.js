import { dataChannel } from "./webrtc.js";

let incomingFile = null;
let receivedSize = 0;
let startTime = 0;

let currentSendProgress = 0;
let currentFileSize = 0;
let currentFileStartTime = 0;
let currentFileId = null;

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
            incomingFile.id = msg.id;
            // 🔥 create UI card (receiver)
            const list = document.getElementById("transfer-list");
            if (list) {
                list.innerHTML += `
                    <div id="file-${msg.id}" class="p-4 glass-card space-y-2 text-left">
                        <p class="font-bold text-sm truncate">${msg.name}</p>

                        <div class="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div id="bar-${msg.id}" class="h-full bg-green-500" style="width:0%"></div>
                        </div>

                        <div class="flex justify-between text-xs font-mono opacity-70">
                            <span id="percent-${msg.id}">0%</span>
                            <span id="speed-${msg.id}">0 MB/s</span>
                            <span id="eta-${msg.id}">--</span>
                        </div>
                    </div>
                `;
            }
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

            // 🔥 ONLY sender updates UI
            if (window.isSender) {

                const id = msg.id;
                const received = msg.received;

                const total = window.lastSentFile.size;

                const percent = Math.floor((received / total) * 100);

                const elapsed = (Date.now() - currentFileStartTime) / 1000;
                const speed = (received / 1024 / 1024) / elapsed;

                const remaining = total - received;
                const eta = speed > 0 ? (remaining / 1024 / 1024 / speed) : 0;

                const bar = document.getElementById(`bar-${id}`);
                const p = document.getElementById(`percent-${id}`);
                const s = document.getElementById(`speed-${id}`);
                const e = document.getElementById(`eta-${id}`);

                if (bar) bar.style.width = percent + "%";
                if (p) p.innerText = percent + "%";
                if (s) s.innerText = speed.toFixed(2) + " MB/s";
                if (e) e.innerText = eta.toFixed(1) + "s";
            }

            return;
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
            const id = incomingFile.id;

            const percent = Math.floor((receivedSize / incomingFile.size) * 100);

            const elapsed = (Date.now() - startTime) / 1000;
            const speed = (receivedSize / 1024 / 1024) / elapsed;

            const remaining = incomingFile.size - receivedSize;
            const eta = speed > 0 ? (remaining / 1024 / 1024 / speed) : 0;

            const bar = document.getElementById(`bar-${id}`);
            const p = document.getElementById(`percent-${id}`);
            const s = document.getElementById(`speed-${id}`);
            const e = document.getElementById(`eta-${id}`);

            if (bar) bar.style.width = percent + "%";
            if (p) p.innerText = percent + "%";
            if (s) s.innerText = speed.toFixed(2) + " MB/s";
            if (e) e.innerText = eta.toFixed(1) + "s";
        }

        // 🔥 SEND PROGRESS
        if (!window.lastProgressSent) window.lastProgressSent = 0;

        const now = Date.now();
        if (now - window.lastProgressSent > 120) {
            window.lastProgressSent = now;

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
window.handleFileSelect = async function (event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    if (!window.fileQueue) window.fileQueue = [];

    window.fileQueue.push(...files);

    // 🔥 show selected files
    const container = document.getElementById("selected-files");
    if (container) {
        container.innerHTML = files.map(f => `
            <div class="p-3 glass-card text-left text-sm">
                ${f.name}
            </div>
        `).join("");
    }

    router.navigate("sending");
};

// ================= SENDER =================
export async function sendSelectedFile() {

    if (!window.fileQueue || window.fileQueue.length === 0) return;

    while (window.fileQueue.length > 0) {

        const file = window.fileQueue.shift();

        if (!window.sentFiles) window.sentFiles = [];

        const fileId = Date.now() + "_" + file.name;
        currentFileId = fileId;

        window.sentFiles.push(file);

        const sentBox = document.getElementById("sent-files");

        if (sentBox) {
            sentBox.innerHTML += `
                <div id="file-${fileId}" class="p-4 glass-card space-y-2 text-left">
                    <p class="font-bold text-sm truncate">${file.name}</p>

                    <div class="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                        <div id="bar-${fileId}" class="h-full bg-primary" style="width:0%"></div>
                    </div>

                    <div class="flex justify-between text-xs font-mono opacity-70">
                        <span id="percent-${fileId}">0%</span>
                        <span id="speed-${fileId}">0 MB/s</span>
                        <span id="eta-${fileId}">--</span>
                    </div>
                </div>
            `;
        }
        window.lastSentFile = file;

        while (!window.receiverReady) {
            await new Promise(r => setTimeout(r, 100));
        }

        while (dataChannel.readyState !== "open") {
            await new Promise(r => setTimeout(r, 50));
        }

        startTime = Date.now();
        currentFileSize = file.size;
        currentFileStartTime = Date.now();

        dataChannel.send(JSON.stringify({
            type: "file-meta",
            id: currentFileId,
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
        const bar = document.getElementById(`bar-${currentFileId}`);
        const p = document.getElementById(`percent-${currentFileId}`);
        const e = document.getElementById(`eta-${currentFileId}`);

        if (bar) bar.style.width = "100%";
        if (p) p.innerText = "100%";
        if (e) e.innerText = "Done";

        window.fileAckReceived = false;
        while (!window.fileAckReceived) {
            await new Promise(r => setTimeout(r, 50));
        }
    }

    router.navigate("completed");
}