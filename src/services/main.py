import base64
import flask
from flask import request, jsonify

from mss import mss
from pynput import mouse, keyboard
import numpy as np
import cv2

app = flask.Flask(__name__)

sct = mss()  # screenshot utility
mouse_controller = mouse.Controller()  # mouse controller
keyboard_controller = keyboard.Controller()  # keyboard controller


@app.route("/echo", methods=["POST"])
def echo():
    data = request.get_json()
    message = data["message"].upper()
    return jsonify({"message": message}), 200


@app.route("/screenshot", methods=["GET"])
def take_screenshot():
    # 1. grab screen (BGRA bytes)
    raw = sct.grab(sct.monitors[1])
    # 2. wrap BGRA → BGR ndarray (no copy)
    frame_bgr = np.frombuffer(raw.rgb, dtype=np.uint8).reshape(raw.height, raw.width, 3)
    # 3. convert BGR to RGB for web display
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    # 4. optionally downscale to max 1280x720 (maintain aspect ratio)
    max_w, max_h = 1280, 720
    h, w = frame_rgb.shape[:2]
    scale = min(max_w / w, max_h / h, 1.0)  # <=1 to avoid upscaling
    if scale < 1.0:
        new_w, new_h = int(w * scale), int(h * scale)
        frame_rgb = cv2.resize(frame_rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
        w, h = new_w, new_h

    # 5. encode to JPEG (quality 80)
    ok, jpg = cv2.imencode(".jpg", frame_rgb, [cv2.IMWRITE_JPEG_QUALITY, 80])

    # 6. Base-64 for WebSocket text frame
    b64 = base64.b64encode(jpg).decode()

    # 7. Return image plus dimensions for debugging
    print(f"Screenshot captured {w}x{h}")
    return jsonify({"image": b64, "width": w, "height": h}), 200


@app.route("/position", methods=["POST"])
def position_mouse():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    return jsonify({"message": "ok"}), 200


@app.route("/click", methods=["POST"])
def click_mouse():
    mouse_controller.click(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/type", methods=["POST"])
def type_text():
    data = request.get_json()
    keyboard_controller.type(data["text"])
    return jsonify({"message": "ok"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8765, threaded=False)
