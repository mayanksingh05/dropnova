export let peerConnection;
export let dataChannel;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

let isReadyToReceive = false;

export function createConnection(socket, isSender, onConnected) {
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

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "ice",
                candidate: event.candidate
            }));
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log("[RTC] ICE:", peerConnection.iceConnectionState);

        if (
            peerConnection.iceConnectionState === "connected" ||
            peerConnection.iceConnectionState === "completed"
        ) {
            safeConnect();
        }
    };

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
        };

        // 🔥 RECEIVE LOGIC
        dataChannel.onmessage = (event) => {
            if (window.handleIncomingData) {
                window.handleIncomingData(event.data);
            }
        };
    }

    if (isSender) {
        setupChannel(peerConnection.createDataChannel("file"));
    } else {
        peerConnection.ondatachannel = (e) => {
            setupChannel(e.channel);
        };
    }

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

async function startOffer(socket) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: "offer",
        offer
    }));
}