import asyncio
import time
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

app = FastAPI()

# Format: { "room_id": {"connections": [websocket1, ...], "last_active": timestamp} }
rooms = {}

async def cleanup_zombie_rooms():
    """Background task to remove rooms inactive for > 2 hours"""
    while True:
        await asyncio.sleep(600)  # Check every 10 minutes
        current_time = time.time()
        stale_rooms = []
        
        for room_id, data in rooms.items():
            if current_time - data["last_active"] > 7200:
                stale_rooms.append(room_id)
                
        for room_id in stale_rooms:
            for conn in rooms[room_id]["connections"]:
                try:
                    await conn.close()
                except:
                    pass
            del rooms[room_id]

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(cleanup_zombie_rooms())

@app.get("/")
def root():
    return {"status": "alive"}

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    if room_id not in rooms:
        rooms[room_id] = {"connections": [], "last_active": time.time()}

    # Limit to 2 users (Basic security against 3rd party eavesdropping)
    if len(rooms[room_id]["connections"]) >= 2:
        await websocket.close(code=1008)
        return

    rooms[room_id]["connections"].append(websocket)
    rooms[room_id]["last_active"] = time.time()

    # Notify others someone joined
    for conn in rooms[room_id]["connections"]:
        if conn != websocket:
            await conn.send_text('{"type":"join"}')

    try:
        while True:
            data = await websocket.receive_text()
            rooms[room_id]["last_active"] = time.time()  # Update activity timestamp

            # Heartbeat ping/pong
            if data == '{"type":"ping"}':
                await websocket.send_text('{"type":"pong"}')
                continue

            for connection in rooms[room_id]["connections"]:
                if connection != websocket:
                    await connection.send_text(data)

    except WebSocketDisconnect:
        if room_id in rooms and websocket in rooms[room_id]["connections"]:
            rooms[room_id]["connections"].remove(websocket)

        # Notify remaining peer and instantly destroy room
        for conn in rooms.get(room_id, {}).get("connections", []):
            try:
                await conn.send_text('{"type":"peer-disconnected"}')
            except:
                pass

        if room_id in rooms:
            del rooms[room_id]