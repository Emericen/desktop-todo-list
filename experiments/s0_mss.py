import numpy as np
import cv2
import mss
import os
import time
from datetime import datetime

time.sleep(3)

sct = mss.mss()

raw = sct.grab(sct.monitors[1])
# 2. wrap BGRA → BGR ndarray (no copy)
frame_bgr = np.frombuffer(raw.rgb, dtype=np.uint8).reshape(
    raw.height, raw.width, 3
)
# 3. convert BGR to RGB for web display
frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
# 4. encode to JPEG (quality 80)
ok, jpg = cv2.imencode(".jpg", frame_rgb, [cv2.IMWRITE_JPEG_QUALITY, 80])

# Save to desktop
desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"screenshot_{timestamp}.jpg"
filepath = os.path.join(desktop_path, filename)

with open(filepath, "wb") as f:
    f.write(jpg.tobytes())

print(f"Screenshot saved to: {filepath}")

