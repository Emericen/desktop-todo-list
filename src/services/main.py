import time
import platform
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

# Global variables to store original screen dimensions
original_width = 1280
original_height = 720

# Global variable to store the latest screenshot frame
latest_screenshot = None

# macOS display scaling factor
display_scale = 1.0

def get_display_scale():
    """Get display scaling factor on macOS"""
    try:
        if platform.system() == "Darwin":
            import subprocess
            print("Getting display scale on macOS")
            result = subprocess.run(['system_profiler', 'SPDisplaysDataType'], 
                                  capture_output=True, text=True)
            if 'Retina' in result.stdout:
                return 2.0  # Most common Retina scaling
        return 1.0
    except:
        return 1.0

def scale_coordinates(x, y):
    """Scale coordinates from 1280x720 to actual screen size"""
    global display_scale
    actual_x = int((x / 1280) * original_width / display_scale)
    actual_y = int((y / 720) * original_height / display_scale)
    return actual_x, actual_y


@app.route("/echo", methods=["POST"])
def echo():
    data = request.get_json()
    message = data["message"].upper()
    return jsonify({"message": message}), 200


@app.route("/screenshot", methods=["GET"])
def take_screenshot():
    global original_width, original_height, latest_screenshot, display_scale
    
    # 1. grab screen (BGRA bytes)
    raw = sct.grab(sct.monitors[1])
    
    # 2. store original dimensions for coordinate scaling
    original_width = raw.width
    original_height = raw.height
    
    # 3. detect display scaling on first run
    if display_scale == 1.0:
        display_scale = get_display_scale()
        print(f"Detected display scale: {display_scale}")
    
    # 4. wrap BGRA → BGR ndarray (no copy)
    frame_bgr = np.frombuffer(raw.rgb, dtype=np.uint8).reshape(raw.height, raw.width, 3)
    # 5. convert BGR to RGB for web display
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    # 6. resize to exactly 1280x720 (may distort aspect ratio)
    frame_rgb = cv2.resize(frame_rgb, (1280, 720), interpolation=cv2.INTER_AREA)

    # 7. store latest screenshot for annotation
    latest_screenshot = frame_rgb.copy()

    # 8. encode to JPEG (quality 80)
    ok, jpg = cv2.imencode(".jpg", frame_rgb, [cv2.IMWRITE_JPEG_QUALITY, 80])

    # 9. Base-64 for WebSocket text frame
    b64 = base64.b64encode(jpg).decode()

    # 10. Return just the image (dimensions are always 1280x720)
    print(f"Screenshot captured: {original_width}x{original_height} -> 1280x720, scale: {display_scale}")
    return jsonify({"image": b64}), 200


@app.route("/annotate", methods=["POST"])
def annotate_screenshot():
    global latest_screenshot
    
    if latest_screenshot is None:
        return jsonify({"error": "No screenshot available"}), 400
    
    data = request.get_json()
    x, y = int(data["x"]), int(data["y"])
    
    # Create a copy and draw annotation
    annotated = latest_screenshot.copy()
    cv2.circle(annotated, (x, y), 10, (255, 0, 0), 2)  # Red circle
    cv2.circle(annotated, (x, y), 2, (255, 0, 0), -1)  # Red dot center
    
    # Encode to JPEG
    ok, jpg = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
    b64 = base64.b64encode(jpg).decode()
    
    return jsonify({"image": b64}), 200


@app.route("/position", methods=["POST"])
def position_mouse():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    mouse_controller.position = (actual_x, actual_y)
    return jsonify({"message": "ok"}), 200


@app.route("/click", methods=["POST"])
def click_mouse():
    mouse_controller.click(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/left_click", methods=["POST"])
def left_click():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    print(f"LEFT CLICK @ {actual_x}, {actual_y}")
    mouse_controller.position = (actual_x, actual_y)
    time.sleep(0.1)
    mouse_controller.click(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/right_click", methods=["POST"])
def right_click():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    print(f"RIGHT CLICK @ {actual_x}, {actual_y}")
    mouse_controller.position = (actual_x, actual_y)
    time.sleep(0.1)
    mouse_controller.click(mouse.Button.right)
    return jsonify({"message": "ok"}), 200


@app.route("/middle_click", methods=["POST"])
def middle_click():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    mouse_controller.position = (actual_x, actual_y)
    time.sleep(0.1)
    mouse_controller.click(mouse.Button.middle)
    return jsonify({"message": "ok"}), 200


@app.route("/double_click", methods=["POST"])
def double_click():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    print(f"DOUBLE CLICK @ {actual_x}, {actual_y}")
    mouse_controller.position = (actual_x, actual_y)
    mouse_controller.click(mouse.Button.left, 2)
    return jsonify({"message": "ok"}), 200


@app.route("/triple_click", methods=["POST"])
def triple_click():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    mouse_controller.position = (actual_x, actual_y)
    mouse_controller.click(mouse.Button.left, 3)
    return jsonify({"message": "ok"}), 200


@app.route("/left_mouse_down", methods=["POST"])
def left_mouse_down():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    mouse_controller.position = (actual_x, actual_y)
    mouse_controller.press(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/left_mouse_up", methods=["POST"])
def left_mouse_up():
    data = request.get_json()
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    mouse_controller.position = (actual_x, actual_y)
    mouse_controller.release(mouse.Button.left)
    return jsonify({"message": "ok"}), 200


@app.route("/left_click_drag", methods=["POST"])
def left_click_drag():
    data = request.get_json()
    actual_x1, actual_y1 = scale_coordinates(data["x1"], data["y1"])
    actual_x2, actual_y2 = scale_coordinates(data["x2"], data["y2"])
    print(f"LEFT CLICK DRAG {actual_x1}, {actual_y1} -> {actual_x2}, {actual_y2}")
    mouse_controller.position = (actual_x1, actual_y1)
    time.sleep(0.1)
    mouse_controller.press(mouse.Button.left)
    time.sleep(0.1)
    mouse_controller.position = (actual_x2, actual_y2)
    time.sleep(0.1)
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
    actual_x, actual_y = scale_coordinates(data["x"], data["y"])
    mouse_controller.position = (actual_x, actual_y)
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
    print(f"TYPE TEXT {request.get_json()}")
    data = request.get_json()
    keyboard_controller.type(data["text"])
    return jsonify({"message": "ok"}), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8765, threaded=False)
