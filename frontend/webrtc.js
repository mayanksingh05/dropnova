export let peerConnection;
export let dataChannel;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

export function createConnection(socket, isSender, onConnected) {
    window.receiverReady = false;
    window.fileAckReceived = false;
    window.peerManuallyDisconnected = false;

    if (peerConnection) {
        try { peerConnection.close(); } catch {}
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

    function safeConnect() {
        window.receiverReady = false;
        window.fileAckReceived = false;
        window.lastSentFile = null;
        window.fileQueue = [];
        window.__sendingStarted = false;
        window.receivedFiles = [];

        if (!connected) {
            connected = true;
            onConnected && onConnected();
        }
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({ type: "ice", candidate: event.candidate }));
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        if (state === "connected" || state === "completed") {
            window.__disconnectHandled = false;
            safeConnect();
        } else if (state === "disconnected" || state === "failed" || state === "closed") {
            window.handlePeerDisconnect?.();
        }
    };

    function setupChannel(channel) {
        dataChannel = channel;
        // 🔥 CRITICAL FIX: Force binary array for mathematical accuracy
        dataChannel.binaryType = "arraybuffer"; 
        dataChannel.bufferedAmountLowThreshold = 256 * 1024;

        dataChannel.onopen = () => safeConnect();
        dataChannel.onmessage = (event) => window.handleIncomingData?.(event.data);
        dataChannel.onclose = () => {
            if (!window.isManualDisconnect) window.handlePeerDisconnect?.();
        };
    }

    if (isSender) setupChannel(peerConnection.createDataChannel("file"));
    else peerConnection.ondatachannel = (e) => setupChannel(e.channel);

    socket.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);
        
        if (data.type === "room-destroyed" || data.type === "disconnect") {
            window.handlePeerDisconnect?.();
        }
        if (data.type === "offer") {
            await peerConnection.setRemoteDescription(data.offer);
            remoteDescSet = true;
            for (const ice of iceQueue) await peerConnection.addIceCandidate(ice);
            iceQueue = [];
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: "answer", answer }));
        }
        if (data.type === "answer") {
            await peerConnection.setRemoteDescription(data.answer);
            remoteDescSet = true;
            for (const ice of iceQueue) await peerConnection.addIceCandidate(ice);
            iceQueue = [];
        }
        if (data.type === "ice") {
            if (remoteDescSet) await peerConnection.addIceCandidate(data.candidate);
            else iceQueue.push(data.candidate);
        }
        if (data.type === "join" && isSender) {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.send(JSON.stringify({ type: "offer", offer }));
        }
    };
}

export function cleanupConnection() {
    try { peerConnection?.close(); } catch {}
    try { dataChannel?.close(); } catch {}
    window.receiverReady = false;
    try { window.socket?.close(); } catch {}
    window.socket = null;
}