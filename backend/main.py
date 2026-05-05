from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()
rooms = {}

@app.get("/")
def root():
    return {"status": "alive"}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []

    # Limit to 2 users
    if len(rooms[room_id]) >= 2:
        await websocket.close()
        return

    rooms[room_id].append(websocket)

    # Notify others someone joined
    for conn in rooms[room_id]:
        if conn != websocket:
            await conn.send_text('{"type":"join"}')

    try:
        while True:
            data = await websocket.receive_text()

            # 🔥 Heartbeat response
            if data == '{"type":"ping"}':
                await websocket.send_text('{"type":"pong"}')
                continue

            for connection in rooms[room_id]:
                if connection != websocket:
                    await connection.send_text(data)

    except WebSocketDisconnect:
        if room_id in rooms and websocket in rooms[room_id]:
            rooms[room_id].remove(websocket)

        # 🔥 Notify remaining peer and instantly destroy the ghost room
        for conn in rooms.get(room_id, []):
            try:
                await conn.send_text('{"type":"room-destroyed"}')
            except:
                pass

        if room_id in rooms:
            del rooms[room_id]