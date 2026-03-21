import { dataChannel } from "./webrtc.js";
import { selectedFile } from "./transfer.js";

const CHUNK_SIZE = 64 * 1024;

export async function sendSelectedFile() {
    if (!dataChannel) {
        console.error("DataChannel not found");
        return;
    }

    // ✅ Wait until channel is OPEN (important fix)
    if (dataChannel.readyState !== "open") {
        console.log("Waiting for data channel...");

        await new Promise(resolve => {
            dataChannel.onopen = () => {
                console.log("Data channel opened (delayed)");
                resolve();
            };
        });
    }

    if (!selectedFile) {
        console.error("No file selected");
        return;
    }

    // ✅ Send metadata
    dataChannel.send(JSON.stringify({
        type: "file-meta",
        name: selectedFile.name,
        size: selectedFile.size
    }));

    let offset = 0;

    while (offset < selectedFile.size) {

        // ✅ FLOW CONTROL (important)
        if (dataChannel.bufferedAmount > 65536) {
            await new Promise(r => setTimeout(r, 10));
            continue;
        }

        const chunk = selectedFile.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();

        dataChannel.send(buffer);

        offset += CHUNK_SIZE;

        console.log(`Sent ${offset}/${selectedFile.size}`);
    }

    // ✅ End signal
    dataChannel.send(JSON.stringify({
        type: "file-end"
    }));

    console.log("File transfer complete");
}