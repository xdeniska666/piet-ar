from PIL import Image, ImageDraw, ImageFont
import numpy as np

class PietEncoder:
    def __init__(self):
        # Каноническая палитра Piet (20 цветов)
        self.palette = {
            # (R,G,B): (name, hue_shift, brightness)
            (255, 192, 192): ("LtRed", 0, 1),
            (255, 0, 0): ("Red", 0, 2),
            (192, 0, 0): ("DkRed", 0, 3),
            (255, 255, 192): ("LtYel", 1, 1),
            (255, 255, 0): ("Yel", 1, 2),
            (192, 192, 0): ("DkYel", 1, 3),
            (192, 255, 192): ("LtGrn", 2, 1),
            (0, 255, 0): ("Grn", 2, 2),
            (0, 192, 0): ("DkGrn", 2, 3),
            (192, 255, 255): ("LtCyn", 3, 1),
            (0, 255, 255): ("Cyn", 3, 2),
            (0, 192, 192): ("DkCyn", 3, 3),
            (192, 192, 255): ("LtBlu", 4, 1),
            (0, 0, 255): ("Blu", 4, 2),
            (0, 0, 192): ("DkBlu", 4, 3),
            (255, 192, 255): ("LtMag", 5, 1),
            (255, 0, 255): ("Mag", 5, 2),
            (192, 0, 192): ("DkMag", 5, 3),
            (255, 255, 255): ("Wht", -1, 0),
            (0, 0, 0): ("Blk", -1, -1)
        }
        
        # Обратный индекс для поиска по (hue, brightness)
        self.color_index = {}
        for rgb, (name, hue, bright) in self.palette.items():
            self.color_index[(hue, bright)] = rgb
    
    def encode_data(self, data_bytes, marker_size=8, cell_size=50):
        """
        Кодирует данные в Piet-изображение
        data_bytes: байты для кодирования (например, b"PRICE:99.90")
        """
        # Добавляем маркер начала и контрольную сумму
        encoded = [0xFF] + list(data_bytes) + [self.checksum(data_bytes)]
        
        # Преобразуем байты в последовательность цветовых переходов
        codel_colors = self.bytes_to_piet_colors(encoded)
        
        # Создаем сетку codel'ов (маркер будет квадратным)
        grid_size = int(np.ceil(np.sqrt(len(codel_colors))))
        # Заполняем пустые ячейки черным (стоп-код)
        while len(codel_colors) < grid_size * grid_size:
            codel_colors.append((0, 0, 0))
        
        # Создаем изображение
        img_size = marker_size * cell_size
        img = Image.new("RGB", (img_size, img_size), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        # Рисуем сетку
        for i, rgb in enumerate(codel_colors):
            row = i // grid_size
            col = i % grid_size
            x1 = col * cell_size
            y1 = row * cell_size
            x2 = x1 + cell_size
            y2 = y1 + cell_size
            
            draw.rectangle([x1, y1, x2, y2], fill=rgb, outline=(0,0,0), width=2)
            
            # Добавляем текст для отладки (в реальном AR не нужно)
            if rgb != (0,0,0):
                draw.text((x1+5, y1+5), f"{self.get_color_name(rgb)}", 
                         fill=(255,255,255) if sum(rgb) < 384 else (0,0,0))
        
        return img
    
    def bytes_to_piet_colors(self, byte_array):
        """Преобразует байты в последовательность цветов Piet"""
        colors = []
        last_hue = 0
        last_bright = 2
        
        for byte in byte_array:
            # Используем 4 бита для hue (0-17, но у нас только 6 цветов)
            # и 4 бита для brightness shift
            hue = (byte >> 4) % 6  # 0-5 (Red, Yellow, Green, Cyan, Blue, Magenta)
            bright_change = (byte & 0x0F) % 3  # 0-2 (no change, +1, -1)
            
            # Вычисляем новую яркость
            if bright_change == 1:
                last_bright = min(3, last_bright + 1)
            elif bright_change == 2:
                last_bright = max(1, last_bright - 1)
            
            # Получаем RGB цвет
            rgb = self.color_index.get((hue, last_bright), (0, 0, 0))
            colors.append(rgb)
            last_hue = hue
        
        return colors
    
    def checksum(self, data_bytes):
        """Простая контрольная сумма для верификации"""
        return sum(data_bytes) % 256
    
    def get_color_name(self, rgb):
        """Возвращает имя цвета для отладки"""
        return self.palette.get(tuple(rgb), ("Unknown",))[0]
    
    def add_ar_marker_border(self, img, border_size=20):
        """Добавляет AR-маркер поверх Piet для быстрого детекта"""
        width, height = img.size
        bordered = Image.new("RGB", (width + border_size*2, height + border_size*2), (0,0,0))
        bordered.paste(img, (border_size, border_size))
        
        draw = ImageDraw.Draw(bordered)
        # Рисуем простой fiducial marker по углам
        marker_size = 15
        positions = [(0,0, marker_size, marker_size), 
                    (bordered.width-marker_size, 0, bordered.width, marker_size),
                    (0, bordered.height-marker_size, marker_size, bordered.height),
                    (bordered.width-marker_size, bordered.height-marker_size, 
                     bordered.width, bordered.height)]
        
        for (x1,y1,x2,y2) in positions:
            draw.rectangle([x1,y1,x2,y2], fill=(255,255,255))
            draw.rectangle([x1+3,y1+3,x2-3,y2-3], fill=(0,0,0))
        
        return bordered

# Пример использования
if __name__ == "__main__":
    encoder = PietEncoder()
    
    # Кодируем товар: SKU + цена
    product_data = b"SKU:84732|PRICE:1299.00|CURR:RUB"
    
    img = encoder.encode_data(product_data, marker_size=12, cell_size=45)
    
    # Добавляем AR-рамку для быстрого распознавания
    img_with_ar = encoder.add_ar_marker_border(img)
    
    img_with_ar.save("piet_ar_marker.png")
    print(f"Сохранен AR-маркер с закодированными данными: {product_data}")
    print("Размер маркера:", img_with_ar.size)