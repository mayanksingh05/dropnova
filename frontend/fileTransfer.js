import { dataChannel } from "./webrtc.js";
import { selectedFile } from "./transfer.js";

const CHUNK_SIZE = 64 * 1024;

export async function sendSelectedFile() {
    if (!dataChannel || dataChannel.readyState !== "open") {
        console.error("Data channel is not open");
        return;
    }

    if (!selectedFile) {
        console.error("No file selected");
        return;
    }

    dataChannel.send(JSON.stringify({
        type: "file-meta",
        name: selectedFile.name,
        size: selectedFile.size
    }));

    let offset = 0;

    while (offset < selectedFile.size) {
        const chunk = selectedFile.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();
        dataChannel.send(buffer);
        offset += CHUNK_SIZE;
        console.log(`Sent ${offset} / ${selectedFile.size}`);
    }

    dataChannel.send(JSON.stringify({
        type: "file-end"
    }));

    console.log("File transfer complete");
}