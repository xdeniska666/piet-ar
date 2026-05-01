import cv2
import numpy as np
from PIL import Image, ImageDraw
import os

# ===== НАСТРОЙКИ =====
ARUCO_DICT = cv2.aruco.DICT_4X4_50
MARKER_SIZE_PX = 400
CELL_SIZE = 40

# Палитра Piet (6 цветов для эстетики)
PIET_COLORS = [
    (255, 100, 100),  # красный
    (255, 255, 100),  # жёлтый
    (100, 255, 100),  # зелёный
    (100, 200, 255),  # голубой
    (150, 100, 255),  # фиолетовый
    (255, 150, 150),  # розовый
]

def generate_piet_pattern(seed, size=8):
    """Генерирует Piet-узор на основе ID маркера"""
    np.random.seed(seed)
    return np.random.randint(0, len(PIET_COLORS), (size, size))

def draw_piet_on_image(img, pattern, offset_x, offset_y, cell_size):
    """Рисует Piet узор на изображении"""
    draw = ImageDraw.Draw(img)
    for i, row in enumerate(pattern):
        for j, color_idx in enumerate(row):
            x1 = offset_x + j * cell_size
            y1 = offset_y + i * cell_size
            x2 = x1 + cell_size
            y2 = y1 + cell_size
            draw.rectangle([x1, y1, x2, y2], fill=PIET_COLORS[color_idx])

def add_calibration_patches(img, patch_size=30):
    """Добавляет эталонные цвета для калибровки"""
    draw = ImageDraw.Draw(img)
    patches = [
        (10, img.height - patch_size - 10, (255,255,255)),
        (10 + patch_size + 5, img.height - patch_size - 10, (0,0,0)),
        (10 + 2*(patch_size + 5), img.height - patch_size - 10, (255,0,0)),
        (10 + 3*(patch_size + 5), img.height - patch_size - 10, (0,255,0)),
        (10 + 4*(patch_size + 5), img.height - patch_size - 10, (0,0,255)),
    ]
    for x, y, color in patches:
        draw.rectangle([x, y, x + patch_size, y + patch_size], fill=color, outline=(0,0,0), width=2)

def generate_hybrid_marker(aruco_id, output_path):
    """Генерирует гибридный маркер: ArUco + Piet + калибровка"""

    # 1. Создаём ArUco маркер (для OpenCV 4.7+)
    aruco_dict = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)

    # Используем generateImageMarker (новый API)
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, aruco_id, MARKER_SIZE_PX)

    # 2. В PIL для рисования
    marker_img_rgb = cv2.cvtColor(marker_img, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(marker_img_rgb)

    # 3. Рисуем Piet внутри
    inner_size = MARKER_SIZE_PX // 2
    offset = (MARKER_SIZE_PX - inner_size) // 2
    piet_size = inner_size // CELL_SIZE
    piet_pattern = generate_piet_pattern(aruco_id, piet_size)
    draw_piet_on_image(pil_img, piet_pattern, offset, offset, CELL_SIZE)

    # 4. Калибровочные плашки
    add_calibration_patches(pil_img)

    # 5. Сохраняем
    pil_img.save(output_path)
    print(f"✅ Маркер ID {aruco_id} → {output_path}")

# ===== ЗАПУСК =====
if __name__ == "__main__":
    os.makedirs("markers", exist_ok=True)

    for marker_id in range(1, 6):
        generate_hybrid_marker(marker_id, f"markers/marker_{marker_id}.png")

    print("\n🎉 Готово! 5 маркеров в папке 'markers'")
    print("📄 Размер: 400x400 пикселей (~5x5 см при 200 DPI)")
    print("🖨️ Печать: матовая бумага + матовая ламинация")
