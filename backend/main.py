# backend/main.py

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# store active connections
rooms = {}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = []

    rooms[room_id].append(websocket)

    try:
        while True:
            data = await websocket.receive_text()

            # send message to other peer
            for connection in rooms[room_id]:
                if connection != websocket:
                    await connection.send_text(data)

    except WebSocketDisconnect:
        rooms[room_id].remove(websocket)