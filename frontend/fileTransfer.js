import { dataChannel } from "./webrtc.js";

let fileWriter = null; 
let transferMode = null; 
let incomingFile = null;
let receivedSize = 0;
let currentFileId = null;
let currentFileSize = 0;

let writeQueue = Promise.resolve();

window.batchAccepted = false;
window.batchDeclined = false;
window.receiverReady = false;
window.fileAckReceived = false;
window.fileQueue = [];
window.sentFiles = [];
window.__cancelTransfer = false;

// 🔥 NEW: Store chunks for mobile Blob
window.fileBuffer = []; 

function safeSend(data) {
    if (dataChannel && dataChannel.readyState === "open") {
        try { dataChannel.send(data); return true; } catch (e) { return false; }
    }
    return false;
}

function clearMemory() {
    incomingFile = null;
    receivedSize = 0;
    window.fileBuffer = []; // Free RAM
}

const targetProgress = {};
const displayedProgress = {};
let animationRunning = false;

function startProgressEngine() {
    if (animationRunning) return;
    animationRunning = true;
    function loop() {
        for (const id in targetProgress) {
            if (displayedProgress[id] === undefined) displayedProgress[id] = 0;
            let current = displayedProgress[id];
            const target = targetProgress[id];
            
            current += (target - current) * 0.25;
            if (Math.abs(target - current) < 0.3) current = target;
            
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

// ================= RECEIVER LOGIC =================
window.handleIncomingData = function (data) {
    writeQueue = writeQueue.then(async () => {
        if (window.__cancelTransfer) return;

        if (typeof data === "string") {
            const msg = JSON.parse(data);

            if (msg.type === "cancel" || msg.type === "error") {
                window.__cancelTransfer = true;
                window.showTransferError(msg.type === "cancel" ? "Transfer cancelled by peer." : "Peer network error.");
                clearMemory();
                router.navigate("connected");
                return;
            }

            if (msg.type === "batch-request") {
                const accepted = await new Promise(resolve => window.showBatchAcceptPrompt(msg.files, resolve));
                if (accepted) safeSend(JSON.stringify({ type: "batch-accept" }));
                else safeSend(JSON.stringify({ type: "batch-decline" }));
            }
            else if (msg.type === "batch-accept") window.batchAccepted = true;
            else if (msg.type === "batch-decline") window.batchDeclined = true;
            
            else if (msg.type === "file-start") {
                clearMemory(); 
                incomingFile = msg;
                window.incomingFile = msg;
                
                targetProgress[msg.id] = 0;
                displayedProgress[msg.id] = 0;
                startProgressEngine();
                router.navigate("receiving");

                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                if (!isMobile && 'showSaveFilePicker' in window) {
                    // DESKTOP: Native API
                    transferMode = "native";
                    try {
                        const ext = msg.name.split('.').pop().toLowerCase();
                        const mimeType = ext === 'mp4' ? 'video/mp4' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'application/octet-stream';
                        
                        await new Promise(resolve => window.showSingleSavePrompt(msg.name, resolve));
                        const handle = await window.showSaveFilePicker({ 
                            suggestedName: msg.name,
                            types: [{ description: `${ext.toUpperCase()} File`, accept: { [mimeType]: [`.${ext}`] } }]
                        });
                        fileWriter = await handle.createWritable();
                        safeSend(JSON.stringify({ type: "ready" }));
                    } catch (e) {
                        safeSend(JSON.stringify({ type: "error" }));
                    }
                } else {
                    // 🔥 MOBILE: Rock-solid Blob Fallback
                    transferMode = "blob";
                    window.fileBuffer = [];
                    safeSend(JSON.stringify({ type: "ready" }));
                }
            }
            else if (msg.type === "ready") window.receiverReady = true;
            
            else if (msg.type === "progress" && window.isSender) {
                if (!currentFileSize) return;
                targetProgress[msg.id] = Math.floor((msg.received / currentFileSize) * 100);
            }
            
            else if (msg.type === "file-end") {
                targetProgress[incomingFile.id] = 100;
                if (!window.receivedFiles) window.receivedFiles = [];
                window.receivedFiles.push({ name: incomingFile.name, size: incomingFile.size });

                if (transferMode === "native") {
                    if (fileWriter) { await fileWriter.close(); fileWriter = null; }
                    safeSend(JSON.stringify({ type: "ack" }));
                } else {
                    // 🔥 MOBILE: Generate the internal Chrome download link
                    const blob = new Blob(window.fileBuffer);
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = incomingFile.name;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    
                    // Cleanup URL object after download triggers
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                    
                    window.fileBuffer = []; // Free RAM immediately
                    safeSend(JSON.stringify({ type: "ack" }));
                }
            }
            else if (msg.type === "ack") {
                window.fileAckReceived = true;
                if (window.lastSentFile) window.sentFiles.push({ name: window.lastSentFile.name, size: window.lastSentFile.size });
            }
            else if (msg.type === "batch-complete") {
                setTimeout(() => router.navigate("completed"), 1000);
            }
        } else {
            // ================= WRITING CHUNKS =================
            if (transferMode === "native") {
                try { if (fileWriter) await fileWriter.write(data); } catch(e) { return; }
            } else {
                // 🔥 MOBILE: Store chunk in RAM
                window.fileBuffer.push(data);
            }
            
            receivedSize += data.byteLength;
            targetProgress[incomingFile.id] = Math.floor((receivedSize / incomingFile.size) * 100);

            if (Date.now() - (window.lastProgressSent || 0) > 100) {
                window.lastProgressSent = Date.now();
                safeSend(JSON.stringify({ type: "progress", id: incomingFile.id, received: receivedSize }));
            }
        }
    }).catch(err => {
        console.error("Critical Queue Failure:", err);
    });
};

window.handleFileSelect = function (event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    window.fileQueue.push(...files);
    if (!window.__sendingStarted) {
        window.__sendingStarted = true;
        window.__cancelTransfer = false;
        waitForChannel();
    }
};

window.cancelTransfer = function () {
    window.__cancelTransfer = true;
    safeSend(JSON.stringify({ type: "cancel" }));
    window.fileQueue = []; 
    clearMemory();
    window.hideWaitingOverlay();
    router.navigate("connected");
};


// ================= SENDER BATCH LOGIC =================

async function processQueue() {
    if (window.fileQueue.length === 0) return;

    const filesMeta = window.fileQueue.map(f => ({ id: Date.now() + "_" + f.name, name: f.name, size: f.size }));
    window.batchAccepted = false;
    window.batchDeclined = false;

    window.showWaitingOverlay(filesMeta.length);

    if (!safeSend(JSON.stringify({ type: "batch-request", files: filesMeta }))) {
        window.hideWaitingOverlay();
        window.__sendingStarted = false;
        return;
    }

    while (!window.batchAccepted && !window.batchDeclined && !window.__cancelTransfer) {
        if (dataChannel?.readyState !== "open") {
            window.__cancelTransfer = true;
            break;
        }
        await new Promise(r => setTimeout(r, 100));
    }

    window.hideWaitingOverlay();

    if (window.batchDeclined || window.__cancelTransfer) {
        window.__sendingStarted = false;
        window.fileQueue = []; 
        if (window.batchDeclined) window.showTransferError("Transfer declined.");
        return; 
    }

    while (window.fileQueue.length > 0) {
        if (window.__cancelTransfer) break;
        const file = window.fileQueue.shift();
        await sendFile(file);
    }

    window.__sendingStarted = false;

    if (!window.__cancelTransfer && dataChannel?.readyState === "open") {
        safeSend(JSON.stringify({ type: "batch-complete" }));
        router.navigate("completed");
    }
}

async function sendFile(file) {
    if (window.__cancelTransfer) return;

    if (dataChannel) {
        dataChannel.bufferedAmountLowThreshold = 1024 * 1024; 
    }

    const fileId = Date.now() + "_" + file.name;
    currentFileId = fileId;
    currentFileSize = file.size;
    window.lastSentFile = file;
    window.receiverReady = false;
    window.fileAckReceived = false;

    targetProgress[fileId] = 0;
    displayedProgress[fileId] = 0;
    startProgressEngine();

    window.incomingFile = { id: fileId, name: file.name };
    router.navigate("sending");

    if (!safeSend(JSON.stringify({ type: "file-start", id: fileId, name: file.name, size: file.size }))) return;

    while (!window.receiverReady && !window.__cancelTransfer) {
        if (dataChannel?.readyState !== "open") {
            window.__cancelTransfer = true;
            break;
        }
        await new Promise(r => setTimeout(r, 50));
    }

    let offset = 0;
    const chunkSize = 64 * 1024; 

    while (offset < file.size) {
        if (window.__cancelTransfer || dataChannel?.readyState !== "open") {
            window.__cancelTransfer = true;
            break;
        }

        if (dataChannel.bufferedAmount > dataChannel.bufferedAmountLowThreshold) {
            await new Promise(resolve => {
                dataChannel.addEventListener('bufferedamountlow', resolve, { once: true });
            });
        }

        const chunk = file.slice(offset, offset + chunkSize);
        
        if (!safeSend(await chunk.arrayBuffer())) {
            window.__cancelTransfer = true;
            break;
        }
        
        offset += chunkSize;
    }

    if (!window.__cancelTransfer && dataChannel?.readyState === "open") {
        safeSend(JSON.stringify({ type: "file-end" }));
        while (!window.fileAckReceived && !window.__cancelTransfer) {
            if (dataChannel?.readyState !== "open") {
                window.__cancelTransfer = true;
                break;
            }
            await new Promise(r => setTimeout(r, 50));
        }
    }
}

async function waitForChannel() {
    while ((!dataChannel || dataChannel.readyState !== "open")) {
        await new Promise(r => setTimeout(r, 100));
    }
    processQueue();
}

export { processQueue };