import time
from pynput import mouse
from mss import mss

sct = mss()  # screenshot utility


if __name__ == "__main__":
    # def on_move(x, y):
    #     print(f"Mouse moved to {x}, {y}")

    # mouse_listener = mouse.Listener(on_move=on_move)
    # mouse_listener.start()
    # time.sleep(3)
    # mouse_listener.stop()

    # print(mouse_listener.position)
    # raw = sct.grab(sct.monitors[1])

    # print(raw.width, raw.height)




    mouse_controller = mouse.Controller()

    mouse_controller.position = (691, 1069)
    print("Done")
    