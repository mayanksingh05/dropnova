export let peerConnection;
export let dataChannel;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

export function createConnection(socket, isSender, onConnected) {
    peerConnection = new RTCPeerConnection(config);

    let remoteDescSet = false;
    let iceQueue = [];
    let connected = false;

    function safeConnect() {
        if (!connected) {
            connected = true;
            console.log("✅ CONNECTED");
            onConnected && onConnected();
        }
    }

    // ICE sending
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "ice",
                candidate: event.candidate
            }));
        }
    };

    // ICE state
    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE:", peerConnection.iceConnectionState);

        if (
            peerConnection.iceConnectionState === "connected" ||
            peerConnection.iceConnectionState === "completed"
        ) {
            safeConnect();
        }
    };

    // DataChannel setup
    function setupChannel(channel) {
        dataChannel = channel;

        console.log("📡 DataChannel ready");

        dataChannel.onopen = () => {
            console.log("🔥 DataChannel OPEN");
            safeConnect();
        };
    }

    if (isSender) {
        setupChannel(peerConnection.createDataChannel("file"));
    } else {
        peerConnection.ondatachannel = (e) => {
            setupChannel(e.channel);
        };
    }

    // signaling
    socket.addEventListener("message", async (msg) => {
        const data = JSON.parse(msg.data);
        console.log("📩", data);

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

        // 🔥 sender starts ONLY when receiver joins
        if (data.type === "join" && isSender) {
            startOffer(socket);
        }
    });

    // receiver announces ready
    if (!isSender) {
        socket.send(JSON.stringify({ type: "ready" }));
    }
}

async function startOffer(socket) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: "offer",
        offer
    }));
}