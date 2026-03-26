export let peerConnection;
export let dataChannel;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

export function createConnection(socket, isSender, onConnected) {

    // 🔥 CLEAN PREVIOUS CONNECTION (important for reconnect)
    if (peerConnection) {
        try { peerConnection.close(); } catch {}
    }

    if (window.pingInterval) {
        clearInterval(window.pingInterval);
    }

    peerConnection = new RTCPeerConnection(config);

    let remoteDescSet = false;
    let iceQueue = [];
    let connected = false;

    function safeConnect() {
        if (!connected) {
            connected = true;
            console.log("[RTC] ✅ CONNECTED");
            onConnected && onConnected();
        }
    }

    // ================= ICE =================
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "ice",
                candidate: event.candidate
            }));
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        console.log("[RTC] ICE:", state);

        if (state === "connected" || state === "completed") {
            safeConnect();
        }

        // 🔥 AUTO RECONNECT
        if (state === "disconnected" || state === "failed") {
            console.log("[RTC] reconnecting...");

            setTimeout(() => {
                if (window.socket) {
                    createConnection(window.socket, window.isSender, () => {
                        router.navigate("connected");
                    });
                }
            }, 1000);
        }
    };

    // ================= DATA CHANNEL =================
    function setupChannel(channel) {
        dataChannel = channel;

        console.log("[RTC] 📡 DataChannel ready");

        dataChannel.onopen = () => {
            console.log("[RTC] 🔥 DataChannel OPEN");
            safeConnect();

            // receiver sends READY
            if (!isSender) {
                console.log("[FILE] sending ready-to-receive");
                dataChannel.send(JSON.stringify({ type: "ready-to-receive" }));
            }

            // 🔥 KEEP ALIVE
            window.pingInterval = setInterval(() => {
                if (dataChannel && dataChannel.readyState === "open") {
                    dataChannel.send(JSON.stringify({ type: "ping" }));
                    console.log("[PING] sent");
                }
            }, 3000);
        };

        dataChannel.onmessage = (event) => {
            if (window.handleIncomingData) {
                window.handleIncomingData(event.data);
            }
        };

        dataChannel.onclose = () => {
            console.log("[RTC] DataChannel closed");

            if (window.pingInterval) {
                clearInterval(window.pingInterval);
            }
        };
    }

    // ================= CHANNEL INIT =================
    if (isSender) {
        setupChannel(peerConnection.createDataChannel("file"));
    } else {
        peerConnection.ondatachannel = (e) => {
            setupChannel(e.channel);
        };
    }

    // ================= SIGNALING =================
    socket.addEventListener("message", async (msg) => {
        const data = JSON.parse(msg.data);
        console.log("[WS]", data);

        if (data.type === "offer") {
            await peerConnection.setRemoteDescription(data.offer);
            remoteDescSet = true;

            for (const ice of iceQueue) {
                await peerConnection.addIceCandidate(ice);
            }
            iceQueue = [];

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.send(JSON.stringify({
                type: "answer",
                answer
            }));
        }

        if (data.type === "answer") {
            await peerConnection.setRemoteDescription(data.answer);
            remoteDescSet = true;

            for (const ice of iceQueue) {
                await peerConnection.addIceCandidate(ice);
            }
            iceQueue = [];
        }

        if (data.type === "ice") {
            if (remoteDescSet) {
                await peerConnection.addIceCandidate(data.candidate);
            } else {
                iceQueue.push(data.candidate);
            }
        }

        if (data.type === "join" && isSender) {
            startOffer(socket);
        }
    });
}
export function cleanupConnection() {
    console.log("[RTC] cleanup");

    try { peerConnection?.close(); } catch {}
    try { dataChannel?.close(); } catch {}

    if (window.pingInterval) {
        clearInterval(window.pingInterval);
        window.pingInterval = null;
    }

    window.receiverReady = false;
}
// ================= OFFER =================
async function startOffer(socket) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: "offer",
        offer
    }));
}