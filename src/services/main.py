import json
import base64
from io import BytesIO
from typing import Any, Dict

from mss import mss
from websocket_server import WebsocketServer
from PIL import Image
import numpy as np
import cv2

# ================== Globals / Dummy singletons ==================
# Screenshot utility (heavyweight) – initialise once
sct = mss()

# In-memory settings placeholder (acts like previous JS `settings` object)
settings: Dict[str, Any] = {
    "theme": "light",
    "globalShortcuts": {"toggleWindow": "Alt+P"},
}

# Agent placeholder (would normally orchestrate actions)
agent = None  # Will be replaced with a real Agent class later

# Mock conversation data for streaming demo responses
MOCK_DATA = {
    "responses": [
        {
            "role": "assistant",
            "content": "Thought: Let me click on the blue click me button.\nAction: click(start_box='<|box_start|>(200, 325)<|box_end|>')",
        },
        {
            "role": "assistant",
            "content": "Thought: Imma start typing.\nAction: type(content='hello bitch :)')",
        },
        {
            "role": "assistant",
            "content": "Thought: Great. The texts are in. Now let's do multiple lines text as well.\nAction: click(start_box='<|box_start|>(285, 570)<|box_end|>')",
        },
        {
            "role": "assistant",
            "content": "Thought: The text area is focused. I'm going to just test out the typing functionality with some random text.\nAction: type(content='small thing when we when we submit the query right now it will hide the window and take the screenshot I was wondering can we basically like when we option P toggle the window open right before that we take a screenshot and then after the window opens it uses that screenshot as the first one that the user that we submit right after user enters ')",
        },
    ],
    "index": 0,
}


def new_client(client, server):
    print(f"Client connected: {client['id']}")


def client_left(client, server):
    print(f"Client disconnected: {client['id']}")


def stream_response(client, server, content: str):
    """Send a single chunk of streaming text (mimics previous streamResponse)"""
    payload = {
        "type": "response-stream",
        "data": {"type": "text", "content": content},
    }
    server.send_message(client, json.dumps(payload))


def response_end(client, server):
    """Notify that the current stream finished."""
    payload = {"type": "response-end"}
    server.send_message(client, json.dumps(payload))


def send_settings(client, server):
    payload = {"type": "settings", "data": settings}
    server.send_message(client, json.dumps(payload))


def message_received(client, server, message):
    print(f"Received from {client['id']}: {message}")
    try:
        payload = json.loads(message)
    except json.JSONDecodeError:
        return

    action = payload.get("action")

    # ===== submit_query =====
    if action == "submit_query":
        query = payload.get("query", "")
        print(f"[submit_query] {query}")

        response = MOCK_DATA["responses"][MOCK_DATA["index"]]
        MOCK_DATA["index"] += 1
        stream_response(client, server, response["content"])
        if MOCK_DATA["index"] >= len(MOCK_DATA["responses"]):
            MOCK_DATA["index"] = 0

        response_end(client, server)

    # ===== user_confirmed / user_denied =====
    elif action in ("user_confirmed", "user_denied"):
        approved = action == "user_confirmed"
        print(f"[user_response] {'approved' if approved else 'rejected'}")
        acknowledgement = f"User responded with {'YES' if approved else 'NO'} (ack)"
        stream_response(client, server, acknowledgement)

    # ===== transcribe_audio (stub) =====
    elif action == "transcribe_audio":
        print("[transcribe_audio] Received audio data (stub)")
        stream_response(client, server, "Transcription not implemented yet")

    # ===== take_screenshot =====
    elif action == "take_screenshot":
        print("[take_screenshot] Capturing screenshot")
        # 1. grab screen (BGRA bytes)
        raw = sct.grab(sct.monitors[1])
        # 2. wrap BGRA → BGR ndarray (no copy)
        frame_bgr = np.frombuffer(raw.rgb, dtype=np.uint8).reshape(
            raw.height, raw.width, 3
        )
        # 3. convert BGR to RGB for web display
        frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        # 4. encode to JPEG (quality 80)
        ok, jpg = cv2.imencode(".jpg", frame_rgb, [cv2.IMWRITE_JPEG_QUALITY, 80])
        # 5. Base-64 for WebSocket text frame
        b64 = base64.b64encode(jpg).decode()
        payload = {
            "type": "response-stream",
            "data": {"type": "image", "content": f"data:image/jpeg;base64,{b64}"},
        }
        print(f"[take_screenshot] Sent screenshot to {client['id']}")
        server.send_message(client, json.dumps(payload))

    # ===== settings =====
    elif action == "get_user_settings":
        print("[get_user_settings] Sending settings")
        send_settings(client, server)

    elif action == "set_user_settings":
        new_settings = payload.get("settings", {})
        print("[set_user_settings] Incoming:", new_settings)
        old_shortcut = settings.get("globalShortcuts", {}).get("toggleWindow")
        settings.update(new_settings)
        send_settings(client, server)
        
        # If shortcut changed, notify main process
        new_shortcut = settings.get("globalShortcuts", {}).get("toggleWindow")
        if new_shortcut != old_shortcut:
            shortcut_payload = {
                "type": "update-shortcut",
                "shortcut": new_shortcut
            }
            server.send_message(client, json.dumps(shortcut_payload))

    elif action == "get_initial_shortcut":
        print("[get_initial_shortcut] Sending initial shortcut to main process")
        shortcut = settings.get("globalShortcuts", {}).get("toggleWindow", "Alt+P")
        shortcut_payload = {
            "type": "update-shortcut", 
            "shortcut": shortcut
        }
        server.send_message(client, json.dumps(shortcut_payload))

    else:
        print("[unknown_action]", action)


if __name__ == "__main__":
    HOST = "127.0.0.1"
    PORT = 8765
    print(f"Starting WebSocket server on port {PORT}")
    server = WebsocketServer(host=HOST, port=PORT)
    server.set_fn_new_client(new_client)
    server.set_fn_client_left(client_left)
    server.set_fn_message_received(message_received)
    print(f"WebSocket server listening on ws://{HOST}:{PORT}")
    server.run_forever()
