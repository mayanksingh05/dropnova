let streams = {};

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', event => {
    const data = event.data;
    
    if (data.type === 'START_STREAM') {
        const url = data.url;
        streams[url] = {
            port: event.ports[0],
            controller: null,
            queue: [],
            size: data.size,
            isEnded: false
        };

        event.ports[0].onmessage = (e) => {
            const msg = e.data;
            const streamInfo = streams[url];
            if (!streamInfo) return;

            if (msg.type === 'CHUNK') {
                if (streamInfo.controller) {
                    try { streamInfo.controller.enqueue(new Uint8Array(msg.chunk)); } catch(err){}
                } else {
                    streamInfo.queue.push(new Uint8Array(msg.chunk));
                }
            } else if (msg.type === 'END') {
                streamInfo.isEnded = true;
                if (streamInfo.controller) {
                    try {
                        streamInfo.controller.close();
                        streamInfo.port.postMessage({ type: 'STREAM_DRAINED' });
                    } catch(err) {}
                }
            } else if (msg.type === 'ABORT') {
                if (streamInfo.controller) {
                    try { streamInfo.controller.error("Aborted"); } catch(e){}
                }
                delete streams[url];
            }
        };

        // 🔥 HANDSHAKE 1: Tell main thread we are awake!
        event.ports[0].postMessage({ type: 'STREAM_READY' });
    }
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (url.pathname.startsWith('/sw-download/')) {
        const streamInfo = streams[url.pathname];
        
        if (!streamInfo) {
            event.respondWith(new Response("Not Found", { status: 404 }));
            return; 
        }

        const filename = decodeURIComponent(url.pathname.split('/').pop().replace(/^\d+_/, ''));

        const stream = new ReadableStream({
            start(controller) {
                streamInfo.controller = controller;
                
                while(streamInfo.queue.length > 0) {
                    controller.enqueue(streamInfo.queue.shift());
                }
                
                // 🔥 HANDSHAKE 2: If file finished before user clicked save
                if (streamInfo.isEnded) {
                    controller.close();
                    streamInfo.port.postMessage({ type: 'STREAM_DRAINED' });
                }
            },
            cancel() {
                streamInfo.port.postMessage({ type: 'CANCELLED' });
                delete streams[url.pathname];
            }
        });

        const headers = new Headers({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': streamInfo.size.toString()
        });

        event.respondWith(new Response(stream, { headers }));
    }
});