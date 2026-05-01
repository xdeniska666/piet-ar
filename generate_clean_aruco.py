import cv2
import os

ARUCO_DICT = cv2.aruco.DICT_4X4_50
MARKER_SIZE_PX = 400

os.makedirs("clean_markers", exist_ok=True)

for marker_id in range(1, 6):
    aruco_dict = cv2.aruco.getPredefinedDictionary(ARUCO_DICT)
    marker_img = cv2.aruco.generateImageMarker(aruco_dict, marker_id, MARKER_SIZE_PX)
    cv2.imwrite(f"clean_markers/clean_marker_{marker_id}.png", marker_img)
    print(f"✅ Чистый маркер {marker_id} сохранён")

print("🎉 Готово! Чистые маркеры в папке 'clean_markers'")