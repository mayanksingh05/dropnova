// frontend/webrtc.js

export let peerConnection;
export let dataChannel;

const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

export function createConnection(socket, isSender) {
    peerConnection = new RTCPeerConnection(config);

    // ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "ice",
                candidate: event.candidate
            }));
        }
    };

    // 🔥 IMPORTANT: CONNECTION STATE FIX
    peerConnection.oniceconnectionstatechange = () => {
        console.log("ICE state:", peerConnection.iceConnectionState);

        if (
            peerConnection.iceConnectionState === "connected" ||
            peerConnection.iceConnectionState === "completed"
        ) {
            console.log("ICE fully connected");

            if (window.router) {
                window.router.navigate("connected");
            }
        }
    };

    // FILE STATE
    let incomingFile = null;
    let receivedSize = 0;
    let receivedBuffers = [];

    function setupDataChannel(channel) {
        dataChannel = channel;

        console.log("DataChannel ready");

        dataChannel.onopen = () => {
            console.log("Data channel open");

            // backup navigation
            if (window.router) {
                window.router.navigate("connected");
            }
        };

        dataChannel.onmessage = (e) => {

            // TEXT
            if (typeof e.data === "string") {
                const msg = JSON.parse(e.data);

                if (msg.type === "file-meta") {
                    incomingFile = {
                        name: msg.name,
                        size: msg.size
                    };

                    receivedSize = 0;
                    receivedBuffers = [];

                    console.log("Receiving:", incomingFile.name);

                    window.router.navigate("receiving");
                }

                if (msg.type === "file-end") {
                    console.log("File complete");

                    const blob = new Blob(receivedBuffers);

                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = incomingFile.name;
                    a.click();

                    URL.revokeObjectURL(url);

                    window.router.navigate("completed");
                }

                return;
            }

            // BINARY
            receivedBuffers.push(e.data);
            receivedSize += e.data.byteLength;

            console.log(`Received ${receivedSize}/${incomingFile?.size}`);
        };
    }

    // SENDER
    if (isSender) {
        const channel = peerConnection.createDataChannel("file");
        setupDataChannel(channel);
    }

    // RECEIVER
    peerConnection.ondatachannel = (event) => {
        setupDataChannel(event.channel);
    };

    // SIGNALING
    socket.addEventListener("message", async (msg) => {
        const data = JSON.parse(msg.data);

        if (data.type === "offer") {
            await peerConnection.setRemoteDescription(data.offer);

            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.send(JSON.stringify({
                type: "answer",
                answer
            }));
        }

        if (data.type === "answer") {
            await peerConnection.setRemoteDescription(data.answer);
        }

        if (data.type === "ice") {
            await peerConnection.addIceCandidate(data.candidate);
        }
    });

    // START
    if (isSender) {
        startOffer(socket);
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