import matplotlib.pyplot as plt


def annotate_image(image_path, x, y):
    image = plt.imread(image_path)
    plt.imshow(image)
    plt.scatter(x, y, color="red", marker="x")
    plt.show()


if __name__ == "__main__":
    annotate_image("resources/screenshot-macos.jpg", 22, 42)
