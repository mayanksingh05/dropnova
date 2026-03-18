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
    socket.onmessage = async (msg) => {
        const data = JSON.parse(msg.data);

        if (data.type === "offer") {
            await peerConnection.setRemoteDescription(data.offer);
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);

            socket.send(JSON.stringify({
                type: "answer",
                answer: answer
            }));
        }

        if (data.type === "answer") {
            await peerConnection.setRemoteDescription(data.answer);
        }

        if (data.type === "ice") {
            await peerConnection.addIceCandidate(data.candidate);
        }
    };

    // sender starts offer
    if (isSender) {
        startOffer(socket);
    }
}

async function startOffer(socket) {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.send(JSON.stringify({
        type: "offer",
        offer: offer
    }));
}