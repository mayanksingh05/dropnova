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

    // ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.send(JSON.stringify({
                type: "ice",
                candidate: event.candidate
            }));
        }
    };

    if (isSender) {
        // sender creates data channel
        dataChannel = peerConnection.createDataChannel("file");

        dataChannel.onopen = () => {
            console.log("Data channel open (sender)");
        };

        dataChannel.onmessage = (e) => {
            console.log("Received:", e.data);
        };
    } else {
        // receiver listens
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;

            dataChannel.onopen = () => {
                console.log("Data channel open (receiver)");
            };

            dataChannel.onmessage = (e) => {
                console.log("Received:", e.data);
            };
        };
    }

    // handle messages
    let incomingFile = null;
    let receivedSize = 0;
    let receivedBuffers = [];

    dataChannel.onmessage = async (e) => {
        // TEXT messages (metadata / end signal)
        if (typeof e.data === "string") {
            const msg = JSON.parse(e.data);

            if (msg.type === "file-meta") {
                console.log("Receiving file:", msg.name);

                incomingFile = {
                    name: msg.name,
                    size: msg.size
                };

                receivedSize = 0;
                receivedBuffers = [];

                router.navigate("receiving");
            }

            if (msg.type === "file-end") {
                console.log("File received completely");

                const blob = new Blob(receivedBuffers);

                // 🔥 Auto download
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = incomingFile.name;
                a.click();

                URL.revokeObjectURL(url);

                router.navigate("completed");
            }

            return;
        }

        // BINARY chunks
        receivedBuffers.push(e.data);
        receivedSize += e.data.byteLength;

        console.log(`Received ${receivedSize} / ${incomingFile.size}`);
    };
}

async function startOffer(socket) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: "offer",
        offer: offer
    }));
}