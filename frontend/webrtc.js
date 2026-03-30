export let peerConnection;
export let dataChannel;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

// 🔥 ADD TURN ONLY IF NEEDED
setTimeout(() => {
    if (!peerConnection || peerConnection.connectionState === "connected") return;

    console.log("[RTC] enabling TURN fallback");

    peerConnection.setConfiguration({
        iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject"
            }
        ]
    });
}, 2000);

export function createConnection(socket, isSender, onConnected) {
    window.receiverReady = false;
    window.fileAckReceived = false;
    window.peerManuallyDisconnected = false;
    // 🔥 CLEAN PREVIOUS CONNECTION (important for reconnect)
    if (peerConnection) {
        try { peerConnection.close(); } catch {}
    }

    if (window.pingInterval) {
        clearInterval(window.pingInterval);
    }

    peerConnection = new RTCPeerConnection({
        iceServers: config.iceServers,
        iceTransportPolicy: "all", // allow all
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require"
    });

    let remoteDescSet = false;
    let iceQueue = [];
    let connected = false;

    function detectConnectionType() {
        peerConnection.getStats().then(stats => {
            stats.forEach(report => {
                if (report.type === "candidate-pair" && report.selected) {
                    if (report.localCandidateType === "relay") {
                        window.connectionMode = "relay"; // 🌐
                        console.log("[MODE] RELAY (global)");
                    } else {
                        window.connectionMode = "direct"; // ⚡
                        console.log("[MODE] DIRECT (p2p)");
                    }
                }
            });
        });
    }
    // 🔥 PRIORITIZE DIRECT (host/srflx)
    peerConnection.addEventListener("icecandidate", (e) => {
        if (e.candidate) {
            console.log("[ICE]", e.candidate.candidate);
        }
    });

    function safeConnect() {
        window.receivedFiles = [];     // 🔥 reset old received files
        window.lastSentFile = null;    // 🔥 reset sender state
        window.fileQueue = [];         // 🔥 reset queue
        if (!window.sentFiles) {
            window.sentFiles = [];
        }
        window.__sendingStarted = false;
        if (!connected) {
            connected = true;
            window.wasConnectedOnce = true;
            console.log("[RTC] ✅ CONNECTED");

            // 🔥 detect mode
            detectConnectionType();

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

            // 🔥 cancel disconnect timer (recovered)
            if (window.disconnectTimer) {
                clearTimeout(window.disconnectTimer);
                window.disconnectTimer = null;
            }

            safeConnect();
        }

        if (state === "disconnected") {
            console.log("[RTC] disconnected");

            // 🔥 start grace timer (for mobile background / network drop)
            if (window.disconnectTimer) clearTimeout(window.disconnectTimer);

            window.disconnectTimer = setTimeout(() => {
                console.log("[RTC] disconnect timeout → treating as final");

                if (window.handlePeerDisconnect) {
                    window.handlePeerDisconnect();
                }
            }, 4000); // ⏱️ 4 sec grace

            // 🔥 show reconnect UI immediately
            if (!window.isManualDisconnect && !window.peerManuallyDisconnected) {
                router.navigate("reconnect");
            }
        }
        if (state === "failed") {
            console.log("[RTC] connection failed");

            if (window.handlePeerDisconnect) {
                window.handlePeerDisconnect();
            }
        }
    };

    // ================= DATA CHANNEL =================
    function setupChannel(channel) {
        dataChannel = channel;

        console.log("[RTC] 📡 DataChannel ready");

        dataChannel.onopen = () => {
            console.log("[RTC] 🔥 DataChannel OPEN");
            safeConnect();

            // 🔥 ensure receiverReady always reset correctly
            if (!isSender) {
                setTimeout(() => {
                    console.log("[FILE] sending ready-to-receive");
                    dataChannel.send(JSON.stringify({ type: "ready-to-receive" }));
                }, 200); // slight delay for stability
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

            if (window.isManualDisconnect) {
                console.log("[RTC] ignore close (manual)");
                return;
            }

            if (window.handlePeerDisconnect) {
                window.handlePeerDisconnect();
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
    socket.onmessage = async (msg) => {
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
        if (data.type === "peer-disconnected") {
            console.log("[WS] peer disconnected");

            if (window.handlePeerDisconnect) {
                window.handlePeerDisconnect();
            }
        }
    };
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
    try { window.socket?.close(); } catch {}
    window.socket = null;
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