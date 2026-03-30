export let peerConnection;
export let dataChannel;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

// 🔥 TURN fallback
setTimeout(() => {
    if (!peerConnection || peerConnection.connectionState === "connected") return;

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

    if (peerConnection) {
        try { peerConnection.close(); } catch {}
    }

    if (window.pingInterval) {
        clearInterval(window.pingInterval);
    }

    peerConnection = new RTCPeerConnection({
        iceServers: config.iceServers,
        iceTransportPolicy: "all",
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
                    window.connectionMode =
                        report.localCandidateType === "relay" ? "relay" : "direct";
                }
            });
        });
    }

    function safeConnect() {
        // 🔥 CLEAN STATE (CRITICAL FIX)
        window.receiverReady = false;
        window.fileAckReceived = false;
        window.lastSentFile = null;
        window.fileQueue = [];
        window.__sendingStarted = false;

        if (!connected) {
            connected = true;
            window.wasConnectedOnce = true;

            detectConnectionType();
            onConnected && onConnected();
        }
    }

    // ICE
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

        if (state === "connected" || state === "completed") {
            if (window.disconnectTimer) {
                clearTimeout(window.disconnectTimer);
                window.disconnectTimer = null;
            }
            safeConnect();
        }

        if (state === "disconnected") {
            if (window.disconnectTimer) clearTimeout(window.disconnectTimer);

            window.disconnectTimer = setTimeout(() => {
                if (window.handlePeerDisconnect) {
                    window.handlePeerDisconnect();
                }
            }, 4000);

            if (!window.isManualDisconnect && !window.peerManuallyDisconnected) {
                router.navigate("reconnect");
            }
        }

        if (state === "failed") {
            window.handlePeerDisconnect?.();
        }
    };

    // DATA CHANNEL
    function setupChannel(channel) {
        dataChannel = channel;

        dataChannel.onopen = () => {
            safeConnect();

            window.pingInterval = setInterval(() => {
                if (dataChannel?.readyState === "open") {
                    dataChannel.send(JSON.stringify({ type: "ping" }));
                }
            }, 3000);
        };

        dataChannel.onmessage = (event) => {
            window.handleIncomingData?.(event.data);
        };

        dataChannel.onclose = () => {
            if (window.pingInterval) clearInterval(window.pingInterval);

            if (window.isManualDisconnect) return;

            window.handlePeerDisconnect?.();
        };
    }

    if (isSender) {
        setupChannel(peerConnection.createDataChannel("file"));
    } else {
        peerConnection.ondatachannel = (e) => {
            setupChannel(e.channel);
        };
    }

    socket.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);
        if (data.type === "force-disconnect") {
            window.handlePeerDisconnect?.();
        }

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
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            socket.send(JSON.stringify({
                type: "offer",
                offer
            }));
        }

        if (data.type === "peer-disconnected") {
            window.handlePeerDisconnect?.();
        }
    };
}

export function cleanupConnection() {
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