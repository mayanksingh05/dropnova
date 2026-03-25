from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

rooms = {}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []
    # ❌ LIMIT TO 2 USERS
    if len(rooms[room_id]) >= 2:
        await websocket.close()
        return

    rooms[room_id].append(websocket)

    # 🔥 notify others someone joined
    for conn in rooms[room_id]:
        if conn != websocket:
            await conn.send_text('{"type":"join"}')

    try:
        while True:
            data = await websocket.receive_text()

            for connection in rooms[room_id]:
                if connection != websocket:
                    await connection.send_text(data)

    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)