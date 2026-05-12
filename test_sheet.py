import os

import cv2
import numpy as np


def create_canvas():
    # A4 при 300 DPI
    return np.full((3508, 2480, 3), 255, dtype=np.uint8)


# Настройки
aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
sizes_cm = [15, 10, 5]  # Можешь добавить сюда хоть 20 маркеров
spacing = 100
margin_top = 200

current_canvas = create_canvas()
current_y = margin_top
page_idx = 1

print("🚀 Начинаю умную разбивку по листам...")

for i, size_cm in enumerate(sizes_cm):
    size_px = int(size_cm * 118)
    marker = cv2.aruco.generateImageMarker(aruco_dict, i + 1, size_px)
    border = int(size_px * 0.1)
    marker_with_border = cv2.copyMakeBorder(
        marker,
        border,
        border,
        border,
        border,
        cv2.BORDER_CONSTANT,
        value=[255, 255, 255],
    )

    h, w = marker_with_border.shape
    x = (2480 - w) // 2

    # Если маркер не влезает по высоте — создаем новый лист
    if current_y + h > 3508:
        filename = f"sheet_{page_idx}.png"
        cv2.imwrite(filename, current_canvas)
        print(f"📄 Лист {page_idx} готов ({filename})")

        current_canvas = create_canvas()
        current_y = margin_top
        page_idx += 1

    # Рисуем на текущем холсте
    current_canvas[current_y : current_y + h, x : x + w] = cv2.cvtColor(
        marker_with_border, cv2.COLOR_GRAY2BGR
    )
    print(
        f"✅ Маркер ID {i + 1} ({size_cm} см) добавлен на лист {page_idx} (Y={current_y})"
    )
    current_y += h + spacing

# Сохраняем последний лист
filename = f"sheet_{page_idx}.png"
cv2.imwrite(filename, current_canvas)
print(f"📄 Последний лист {page_idx} готов ({filename})")
print("🎉 Готово! Все маркеры распределены.")
