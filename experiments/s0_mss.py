import numpy as np
from PIL import Image
import mss
import os
import time
from datetime import datetime

time.sleep(3)

sct = mss.mss()

raw = sct.grab(sct.monitors[1])
# Convert to PIL Image
img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

# Resize to below 720p while maintaining aspect ratio
max_width, max_height = 1280, 720
if img.width > max_width or img.height > max_height:
    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

# Save to desktop
desktop_path = os.path.join(os.path.expanduser("~"), "Desktop")
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
filename = f"screenshot_{timestamp}.jpg"
filepath = os.path.join(desktop_path, filename)

img.save(filepath, "JPEG", quality=80)

print(f"Screenshot saved to: {filepath}")
print(f"Final dimensions: {img.width}x{img.height}")
