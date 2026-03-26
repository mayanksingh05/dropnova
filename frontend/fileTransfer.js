import { dataChannel } from "./webrtc.js";

let incomingFile = null;
let receivedBuffers = [];
let receivedSize = 0;

let startTime = 0;

// ================= BACKGROUND HANDLING =================
window.isTabHidden = false;

document.addEventListener("visibilitychange", () => {
    window.isTabHidden = document.hidden;
    console.log("[APP]", document.hidden ? "background" : "active");
});


// ================= RECEIVER =================
window.handleIncomingData = function (data) {

    if (typeof data === "string") {
        const msg = JSON.parse(data);

        // 🔥 IGNORE PING
        if (msg.type === "ping") {
            console.log("[PING] received");
            return;
        }

        if (msg.type === "file-meta") {
            console.log("[FILE] meta received:", msg.name);

            incomingFile = msg;
            receivedBuffers = [];
            receivedSize = 0;
            startTime = Date.now();

            router.navigate("receiving");
        }

        if (msg.type === "file-end") {
            console.log("[FILE] complete");

            const blob = new Blob(receivedBuffers);

            if (!window.receivedFiles) window.receivedFiles = [];

            // 🔥 PERSIST (DO NOT CLEAR)
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
        if (msg.type === "disconnect") {
            console.log("[RTC] peer disconnected");

            if (window.cleanupConnection) {
                window.cleanupConnection();
            }

            window.disconnectMessage = "Connection closed";

            router.navigate("home");
            return;
        }
    } else {
        receivedBuffers.push(data);
        receivedSize += data.byteLength;

        console.log("[FILE] chunk:", receivedSize);

        // 🔥 RECEIVER PROGRESS + SPEED
        if (incomingFile) {
            const progress = Math.floor((receivedSize / incomingFile.size) * 100);

            const elapsed = (Date.now() - startTime) / 1000;
            const speed = (receivedSize / 1024 / 1024) / elapsed;

            const bar = document.querySelector(".progress-bar-fill");
            if (bar) bar.style.width = progress + "%";

            const stats = document.querySelectorAll(".font-mono span");
            if (stats.length >= 3) {
                stats[0].innerText = progress + "%";
                stats[1].innerText = speed.toFixed(2) + " MB/s";
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

        // 🔥 WAIT FOR RECEIVER READY
        while (!window.receiverReady) {
            await new Promise(r => setTimeout(r, 100));
        }

        // wait for channel open
        while (dataChannel.readyState !== "open") {
            await new Promise(r => setTimeout(r, 50));
        }

        startTime = Date.now();

        // send meta
        dataChannel.send(JSON.stringify({
            type: "file-meta",
            name: file.name,
            size: file.size
        }));

        const chunkSize = 16 * 1024;
        let offset = 0;

        while (offset < file.size) {

            // 🔥 PAUSE IF BACKGROUND
            while (window.isTabHidden) {
                console.log("[APP] paused (background)");
                await new Promise(r => setTimeout(r, 200));
            }

            // FLOW CONTROL
            while (dataChannel.bufferedAmount > 1 * 1024 * 1024) {
                await new Promise(r => setTimeout(r, 50));
            }

            const chunk = file.slice(offset, offset + chunkSize);
            const buffer = await chunk.arrayBuffer();

            dataChannel.send(buffer);
            offset += chunkSize;

            // 🔥 PROGRESS + SPEED
            const progress = Math.floor((offset / file.size) * 100);

            const elapsed = (Date.now() - startTime) / 1000;
            const speed = (offset / 1024 / 1024) / elapsed;

            const bar = document.querySelector(".progress-bar-fill");
            if (bar) bar.style.width = progress + "%";

            const stats = document.querySelectorAll(".font-mono span");
            if (stats.length >= 3) {
                stats[0].innerText = progress + "%";
                stats[1].innerText = speed.toFixed(2) + " MB/s";
            }
        }

        // file end
        dataChannel.send(JSON.stringify({ type: "file-end" }));

        console.log("[FILE] sent:", file.name);
    }

    router.navigate("completed");
}