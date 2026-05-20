import cv2
import os

# 1. Задаем оригинальный словарь ArUco (сетка 5x5), который жестко зашит в jsaruco
ARUCO_DICT = cv2.aruco.DICT_ARUCO_ORIGINAL

# Размер одного маркера в пикселях (с запасом для чёткости)
MARKER_SIZE_PX = 400

# Создаем папку для чистого листа, если её нет
os.makedirs("test_sheet", exist_ok=True)

print("Starting: Generaciya CHB markerov 5x5...")

# Получаем словарь один раз перед циклом
aruco_dict = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)

# Генерируем 5 тестовых маркеров
for marker_id in range(1, 6):
    # Генерируем изображение маркера
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, marker_id, MARKER_SIZE_PX)
    
    # Добавляем белую рамку в 10% от размера маркера (40 пикселей)
    border_px = int(MARKER_SIZE_PX * 0.1)
    marker_with_border = cv2.copyMakeBorder(
        marker_img,
        border_px, border_px, border_px, border_px,
        cv2.BORDER_CONSTANT,
        value=255 # белый цвет
    )
    
    # Сохраняем файл
    file_path = f"test_sheet/aruco_5x5_id_{marker_id}.png"
    cv2.imwrite(file_path, marker_with_border)
    print(f"OK: Marker ID {marker_id} saved: {file_path}")

print("Done! Files saved in 'test_sheet' folder.")
