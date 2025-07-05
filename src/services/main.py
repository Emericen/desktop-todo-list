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


@app.route("/left_click", methods=["POST"])
def left_click():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    mouse_controller.click(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/right_click", methods=["POST"])
def right_click():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    mouse_controller.click(mouse.Button.right)
    return jsonify({"message": "ok"}), 200


@app.route("/middle_click", methods=["POST"])
def middle_click():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    mouse_controller.click(mouse.Button.middle)
    return jsonify({"message": "ok"}), 200


@app.route("/double_click", methods=["POST"])
def double_click():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    mouse_controller.click(mouse.Button.left, 2)
    return jsonify({"message": "ok"}), 200


@app.route("/triple_click", methods=["POST"])
def triple_click():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    mouse_controller.click(mouse.Button.left, 3)
    return jsonify({"message": "ok"}), 200


@app.route("/left_mouse_down", methods=["POST"])
def left_mouse_down():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    mouse_controller.press(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/left_mouse_up", methods=["POST"])
def left_mouse_up():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    mouse_controller.release(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/left_click_drag", methods=["POST"])
def left_click_drag():
    data = request.get_json()
    mouse_controller.position = (data["x1"], data["y1"])
    mouse_controller.press(mouse.Button.left)
    mouse_controller.position = (data["x2"], data["y2"])
    mouse_controller.release(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/key", methods=["POST"])
def press_key():
    data = request.get_json()
    key_str = data["key"]

    # Handle special key combinations
    if "+" in key_str:
        keys = key_str.split("+")
        # Press modifier keys first
        for key in keys[:-1]:
            keyboard_controller.press(
                getattr(keyboard.Key, key.lower(), keyboard.KeyCode.from_char(key))
            )
        # Press main key
        main_key = keys[-1]
        keyboard_controller.press(
            getattr(
                keyboard.Key, main_key.lower(), keyboard.KeyCode.from_char(main_key)
            )
        )
        # Release in reverse order
        keyboard_controller.release(
            getattr(
                keyboard.Key, main_key.lower(), keyboard.KeyCode.from_char(main_key)
            )
        )
        for key in reversed(keys[:-1]):
            keyboard_controller.release(
                getattr(keyboard.Key, key.lower(), keyboard.KeyCode.from_char(key))
            )
    else:
        # Single key press
        key_obj = getattr(
            keyboard.Key, key_str.lower(), keyboard.KeyCode.from_char(key_str)
        )
        keyboard_controller.press(key_obj)
        keyboard_controller.release(key_obj)

    return jsonify({"message": "ok"}), 200


@app.route("/hold_key", methods=["POST"])
def hold_key():
    data = request.get_json()
    key_str = data["key"]
    key_obj = getattr(
        keyboard.Key, key_str.lower(), keyboard.KeyCode.from_char(key_str)
    )
    keyboard_controller.press(key_obj)
    return jsonify({"message": "ok"}), 200


@app.route("/scroll", methods=["POST"])
def scroll():
    data = request.get_json()
    mouse_controller.position = (data["x"], data["y"])
    direction = data["direction"]
    amount = data.get("amount", 1)

    if direction == "up":
        mouse_controller.scroll(0, amount)
    elif direction == "down":
        mouse_controller.scroll(0, -amount)
    elif direction == "left":
        mouse_controller.scroll(-amount, 0)
    elif direction == "right":
        mouse_controller.scroll(amount, 0)

    return jsonify({"message": "ok"}), 200


@app.route("/type", methods=["POST"])
def type_text():
    data = request.get_json()
    keyboard_controller.type(data["text"])
    return jsonify({"message": "ok"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8765, threaded=False)
