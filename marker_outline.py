import os

import cv2
import numpy as np

# Укажи полный путь, если скрипт "не видит" файл
filename = "clean_marker_1.png"

if not os.path.exists(filename):
    print(f"❌ Файл {filename} не найден в папке {os.getcwd()}")
    exit()

# 1. Загружаем
img = cv2.imread(filename, cv2.IMREAD_GRAYSCALE)

# 2. Находим границы (математическая операция)
# Это нарисует ВСЕ линии между черным и белым
kernel = np.ones((3, 3), np.uint8)
edges = cv2.morphologyEx(img, cv2.MORPH_GRADIENT, kernel)

# 3. Инвертируем: линии станут черными (0), фон — белым (255)
stencil = cv2.bitwise_not(edges)

# 4. Рисуем толстую черную рамку (квадрат кода)
# Толщина 10 пикселей
cv2.rectangle(stencil, (0, 0), (img.shape[1] - 1, img.shape[0] - 1), (0, 0, 0), 10)

# 5. Сохраняем
cv2.imwrite("FINAL_STENCIL.png", stencil)
print("✅ Готово! Файл 'FINAL_STENCIL.png' создан.")
