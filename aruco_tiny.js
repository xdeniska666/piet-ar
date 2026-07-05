/* Склеенная версия: CV + AR 
  Полный код для работы без внешних зависимостей
*/

var CV = CV || {};

CV.Image = function(width, height){
  this.width = width || 0;
  this.height = height || 0;
  this.data = [];
};

CV.grayscale = function(imageSrc, imageDst){
  var src = imageSrc.data, dst = imageDst.data, len = src.length, i = 0, j = 0;
  if (dst.length !== len / 4) {
    imageDst.data = new Uint8Array(len / 4);
    dst = imageDst.data;
  }  
  for (; i < len; i += 4){
    dst[j ++] = (src[i] * 0.299 + src[i + 1] * 0.587 + src[i + 2] * 0.114 + 0.5) >>> 0;
  }
  imageDst.width = imageSrc.width;
  imageDst.height = imageSrc.height;
  return imageDst;
};

CV.threshold = function(imageSrc, imageDst, threshold){
  var src = imageSrc.data, dst = imageDst.data, len = src.length, i = 0;
  for (; i < len; ++ i){
    dst[i] = src[i] > threshold? 255: 0;
  }
  return imageDst;
};

CV.adaptiveThreshold = function(imageSrc, imageDst, kernelSize, threshold){
  var src = imageSrc.data, dst = imageDst.data, len = src.length,
      width = imageSrc.width, height = imageSrc.height, y = 0, x = 0;

  if (imageDst.data.length !== len){
    imageDst.data = new Uint8Array(len);
    dst = imageDst.data;
  } 

  for (y = 0; y < height; ++ y){
    var offset = y * width;
    for (x = 0; x < width; ++ x){
      var sum = 0, count = 0;
      for (var ky = -kernelSize; ky <= kernelSize; ++ ky){
        var ny = y + ky;
        if (ny >= 0 && ny < height){
          var noffset = ny * width;
          for (var kx = -kernelSize; kx <= kernelSize; ++ kx){
            var nx = x + kx;
            if (nx >= 0 && nx < width){
              sum += src[noffset + nx];
              count++;
            }
          }
        }
      }
      var mean = sum / count;
      dst[offset + x] = src[offset + x] < (mean - threshold) ? 255 : 0;
    }
  }

  imageDst.width = width;
  imageDst.height = height;
  return imageDst;
};

// Выносим visited в глобальный кеш слоя CV, чтобы не плодить объекты в памяти
CV.visitedCache = null;

CV.findContours = function(imageSrc, contours) {  
  var src = imageSrc.data, width = imageSrc.width, height = imageSrc.height;
  var totalPixels = width * height;

  if (!CV.visitedCache || CV.visitedCache.length !== totalPixels) {
    CV.visitedCache = new Uint8Array(totalPixels);
  } else {
    CV.visitedCache.fill(0);
  }
  var visited = CV.visitedCache;      

  // Направления: вправо, вниз, влево, вверх
  var dx = [1, 0, -1, 0];
  var dy = [0, 1, 0, -1];

  for (var y = 1; y < height - 1; ++y) {
    for (var x = 1; x < width - 1; ++x) {
      var idx = y * width + x;
      
      // Ищем белую пиксель-границу на черном фоне (в ArUco контуры инвертированы или выделены)
      if (src[idx] === 255 && !visited[idx]) {
        // Проверяем, крайний ли это пиксель
        if (src[idx - 1] === 0 || src[idx + 1] === 0 || src[idx - width] === 0 || src[idx + width] === 0) {
        
          var contour = [];
          var cx = x, cy = y;
          var currIdx = idx;
          var dir = 0;
          var stepped = false;
            
          // Трассировка границы по цепочке
          do {
            contour.push({x: cx, y: cy});
            visited[currIdx] = 1;
            stepped = false;
            
            for (var i = 0; i < 4; ++i) {
              var nDir = (dir + i) % 4;
              var nx = cx + dx[nDir];
              var ny = cy + dy[nDir];
              var nIdx = ny * width + nx;
            
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (src[nIdx] === 255 && !visited[nIdx]) {
                  cx = nx;
                  cy = ny;
                  currIdx = nIdx;
                  dir = (nDir + 3) % 4; // Разворот вектора поиска
                  stepped = true;
                  break;
                }  
              }
            }
          } while (stepped && (cx !== x || cy !== y) && contour.length < 2000);
 
          if (contour.length > 15) { // Минимальный фильтр шума по длине
            contours.push(contour);
          } 
        }
      }
    }
  }
  return contours;
};

CV.perimeter = function(contour){
  var len = contour.length, p = 0, i = 0, j = len - 1, dx = 0, dy = 0;
  for (; i < len; j = i ++){
    dx = contour[i].x - contour[j].x;
    dy = contour[i].y - contour[j].y;
    p += Math.sqrt(dx * dx + dy * dy);
  }
  return p;
};

CV.approxPolyDP = function(contour, epsilon){
  var len = contour.length, maxIdx = 0, maxDist = 0, d = 0, i = 1,
      dx = 0, dy = 0, lenInv = 0, approx = [];

  if (len > 2){
    dx = contour[len - 1].x - contour[0].x;
    dy = contour[len - 1].y - contour[0].y;
    lenInv = 1.0 / Math.sqrt(dx * dx + dy * dy);
    
    for (; i < len - 1; ++ i){
      d = Math.abs((contour[i].y - contour[0].y) * dx - (contour[i].x - contour[0].x) * dy) * lenInv;
      if (d > maxDist){
        maxDist = d;
        maxIdx = i;
      }
    }
    
    if (maxDist > epsilon){
      approx = approx.concat( CV.approxPolyDP(contour.slice(0, maxIdx + 1), epsilon) );
      approx = approx.concat( CV.approxPolyDP(contour.slice(maxIdx), epsilon) );
    }else{
      approx = [contour[0], contour[len - 1]];
    }
  }else{
    approx = contour;  
  }

  return approx;
};

var AR = AR || {};

AR.Marker = function(id, corners){
  this.id = id;
  this.corners = corners;
};

AR.Detector = function(){
  this.grey = new CV.Image();
  this.thres = new CV.Image();
  this.contours = [];
  this.candidates = [];
  this.minSize = 10;
};

AR.Detector.prototype.detect = function(imageSrc){
  // Защита от пустых данных
  if (!imageSrc || !imageSrc.data) return [];

  // Очищаем дебаг прошлых кадров
  window.debugCandidateInfo = null;
  window.lastReadMatrix = null;

  CV.grayscale(imageSrc, this.grey);
  // Адаптивный порог
  CV.adaptiveThreshold(this.grey, this.thres, 7, 2);

  this.contours = [];
  CV.findContours(this.thres, this.contours);
  
  this.candidates = [];
  var i = 0, len = this.contours.length, contour = null, approx = null;

  for (; i < len; ++ i){
    contour = this.contours[i];

    if (contour.length > 30){
      // Рассчитываем epsilon от реального периметра контура
      approx = CV.approxPolyDP(contour, CV.perimeter(contour) * 0.05);
  
      if (approx.length === 4 && this.isConvex(approx)){
          this.candidates.push(approx);
      }
    }
  }
  
  // Записываем реальное количество выживших кандидатов для нашей телеметрии
  window.realCandidatesCount = this.candidates.length;
  
  // Передаем кандидатов в канонический конвейер поиска маркеров
  var markers = this.findMarkers(this.thres, this.candidates);

  if (imageSrc.returnContours) {    
    return this.contours;
  }
  
  return markers;
};

AR.Detector.prototype.findMarkers = function(imageThres, candidates) {
  var markers = [];

  for (var i = 0; i < candidates.length; ++i) {
    // Временный вызов старого getMarker, на Шаге 2 мы переведем его на warp
    var marker = this.getMarker(imageThres, candidates[i]);
    if (marker) {
      markers.push(marker);
    }  
  }

  if (markers.length === 0) {
    window.prevCorners = null;
  }
  
  return markers;
};

// МАТЕМАТИЧЕСКИЙ ДВИЖОК ГЕОМЕТРИИ (WARP)
CV.getPerspectiveTransform = function(src, size) {
  var x0 = src[0].x, y0 = src[0].y,
      x1 = src[1].x, y1 = src[1].y,
      x2 = src[2].x, y2 = src[2].y,
      x3 = src[3].x, y3 = src[3].y;

  var dx1 = x1 - x2, dy1 = y1 - y2;
  var dx2 = x3 - x2, dy2 = y3 - y2;
  var sx = x0 - x1 + x2 - x3;
  var sy = y0 - y1 + y2 - y3;
  var gDen = dx1 * dy2 - dx2 * dy1;
  
  if (Math.abs(gDen) < 1e-7) return null;

  var g = (sx * dy2 - dx2 * sy) / gDen;
  var h = (dx1 * sy - sx * dy1) / gDen;

  var a = x1 - x0 + g * x1;
  var b = x3 - x0 + h * x3;
  var c = x0;
  var d = y1 - y0 + g * y1;
  var e = y3 - y0 + h * y3;
  var f = y0;

  return [a, b, c, d, e, f, g, h, 1.0];
};

CV.warp = function(imageSrc, M, size) {
  var imageDst = new CV.Image(size, size);
  imageDst.data = new Uint8Array(size * size);

  var src = imageSrc.data, dst = imageDst.data;
  var width = imageSrc.width, height = imageSrc.height;

  var a = M[0], b = M[1], c = M[2],
      d = M[3], e = M[4], f = M[5],
      g = M[6], h = M[7];

  var idx = 0;
  for (var y = 0; y < size; ++y) {
    for (var x = 0; x < size; ++x) {
      var den = g * x + h * y + 1.0;
      var sx = Math.floor((a * x + b * y + c) / den);
      var sy = Math.floor((d * x + e * y + f) / den);
      
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
        dst[idx++] = src[sy * width + sx];
      } else {
        dst[idx++] = 0;
      }
    }
  }
  return imageDst;
};
          
AR.Detector.prototype.isConvex = function(contour){
  var len = contour.length, i = 0, j = 0, k = 0, sign = 0;
  for (; i < len; ++ i){
    j = (i + 1) % len;
    k = (i + 2) % len;
    var z = (contour[j].x - contour[i].x) * (contour[k].y - contour[j].y) -
            (contour[j].y - contour[i].y) * (contour[k].x - contour[j].x);
    if (i === 0){
      sign = z > 0? 1: z < 0? -1: 0;
    }else if (z * sign < 0){  
      return false;
    }
  }
  return true;
};

// Глобальный буфер для вывода матрицы на экран дебага
window.lastReadMatrix = null;
window.matrixHistory = [];
window.prevCorners = null;

AR.Detector.prototype.getMarker = function(imageThres, candidate) {
  if (!imageThres || !imageThres.data) return null;

  var corners = [];
  try { 
    if (candidate && candidate.corners && candidate.corners[0]) {
      corners = candidate.corners;
    } else if (candidate && candidate[0] && typeof candidate[0].x === 'number') {
      corners = candidate;
    } else if (candidate && typeof candidate[0] === 'number') {
      corners = [
        { x: candidate[0], y: candidate[1] },
        { x: candidate[2], y: candidate[3] },
        { x: candidate[4], y: candidate[5] },
        { x: candidate[6], y: candidate[7] }
      ];  
    } else if (candidate && candidate.points && candidate.points[0]) {
      corners = candidate.points;
    }
  } catch(e) {
    return null;
  }

  if (!corners || corners.length < 4 || !corners[0]) return null; 

  // Вычисляем матрицу гомографии для выравнивания маркера в квадрат 49x49 пикселей
  // Маркер 7x7 ячеек, по 7 пикселей на ячейку = 49 пикселей
  var cellSize = 7;
  var markerSize = 7 * cellSize; 
  
  var M = CV.getPerspectiveTransform(corners, markerSize);
  if (!M) return null;

  // Вырезаем и выравниваем маркер
  var warped = CV.warp(imageThres, M, markerSize);
  var warpedSrc = warped.data;

  var fullMatrix = [];

  // Сканируем маркер по сетке 7x7 ячеек
  for (var i = 0; i < 7; ++i) {
    fullMatrix[i] = [];
    for (var j = 0; j < 7; ++j) {
      
      // Мажоритарное голосование: считаем белые пиксели внутри ячейки
      var whitePixels = 0;
      var totalPixels = 0;
      
      // Пропускаем крайние пиксели ячейки (отступ 1 пиксель), чтобы избежать влияния границ
      for (var cy = 1; cy < cellSize - 1; ++cy) {
        var pixelY = i * cellSize + cy;
        var rowOffset = pixelY * markerSize;
        
        for (var cx = 1; cx < cellSize - 1; ++cx) {
          var pixelX = j * cellSize + cx;
          
          if (warpedSrc[rowOffset + pixelX] === 255) {
            whitePixels++;
          }
          totalPixels++;
        }
      }

      // Если больше половины пикселей белые — ячейка белая (1), иначе черная (0)
      fullMatrix[i][j] = (whitePixels > (totalPixels / 2)) ? 1 : 0;
    }
  }

  // Проверка внешней рамки (должна быть полностью черной)
  var whiteBorderPixels = 0;
  for (var i = 0; i < 7; ++i) {
    if (fullMatrix[0][i] === 1) whiteBorderPixels++;
    if (fullMatrix[6][i] === 1) whiteBorderPixels++;
    if (i > 0 && i < 6) {
      if (fullMatrix[i][0] === 1) whiteBorderPixels++;
      if (fullMatrix[i][6] === 1) whiteBorderPixels++;
    }
  }

  // Если в черной рамке слишком много белых ячеек, это не маркер
  if (whiteBorderPixels > 3) {
    if (typeof window.debugCandidateInfo === 'function') {
      window.debugCandidateInfo("Отсев: Белая рамка (" + whiteBorderPixels + " ячеек)");
    } 
    return null;
  }   

  // Извлекаем внутреннее ядро 5x5 бит
  var bits = [];
  for (var i = 0; i < 5; ++i) {
    bits[i] = [];
    for (var j = 0; j < 5; ++j) {
      bits[i][j] = fullMatrix[i + 1][j + 1];
    }
  }

  var bestId = -1;
  var bestRotation = 0;
  var minErrors = 99; 

  for (var rotation = 0; rotation < 4; ++rotation) {
    var currentId = 0;
    var rotationErrors = 0;

    for (var y = 0; y < 5; ++y) {
      var rowBits = 0;
      for (var x = 0; x < 5; ++x) {
        var rx = x, ry = y;
        if (rotation === 1) { rx = y; ry = 4 - x; }
        else if (rotation === 2) { rx = 4 - x; ry = 4 - y; }
        else if (rotation === 3) { rx = 4 - y; ry = x; }

        rowBits = (rowBits << 1) | bits[ry][rx];
      }
      
      var dataBits = (rowBits >> 3) & 3; 
      var parityBits = rowBits & 7;      

      var p0 = (dataBits >> 1) & 1;
      var p1 = dataBits & 1;
      var expectedParity = (p0 << 2) | (p1 << 1) | (p0 ^ p1);

      var diff = parityBits ^ expectedParity;
      while (diff > 0) {
        if (diff & 1) rotationErrors++;
        diff >>>= 1;
      }
      
      currentId = (currentId << 2) | dataBits;
    }

    if (rotationErrors < minErrors) { 
      minErrors = rotationErrors;
      bestId = currentId;
      bestRotation = rotation;
    }
  }

  // Разрешенные ID для Piet-AR
  var VALID_PIET_IDS = [0, 6, 48];

  // Разрешаем максимум 1 ошибку (расстояние Хэмминга)
  if (bestId >= 0 && minErrors <= 1 && VALID_PIET_IDS.indexOf(bestId) !== -1) {
    var isSameMarker = false;
    if (window.prevCorners) {
      var dist = Math.sqrt(Math.pow(corners[0].x - window.prevCorners[0].x, 2) + Math.pow(corners[0].y - window.prevCorners[0].y, 2));
      if (dist < 30) isSameMarker = true;
    }
      
    var smoothCorners = [];
    if (isSameMarker) {
      for (var c = 0; c < 4; c++) {
        smoothCorners.push({
          x: window.prevCorners[c].x * 0.75 + corners[c].x * 0.25,
          y: window.prevCorners[c].y * 0.75 + corners[c].y * 0.25
        });
      }
    } else {
      smoothCorners = corners;
      window.matrixHistory = [];
    }    

    var rotatedBits = [];
    for (var y = 0; y < 5; ++y) {
      rotatedBits[y] = [];
      for (var x = 0; x < 5; ++x) {
        var rx = x, ry = y;
        if (bestRotation === 1) { rx = y; ry = 4 - x; }
        else if (bestRotation === 2) { rx = 4 - x; ry = 4 - y; }
        else if (bestRotation === 3) { rx = 4 - y; ry = x; }
        rotatedBits[y][x] = bits[ry][rx];
      }
    }

    if (typeof window.debugCandidateInfo === 'function') {
      window.debugCandidateInfo("Успех: Маркер ID " + bestId + " (Ошибок: " + minErrors + ")");
    }
    if (typeof window.debugCurrentMatrix === 'function') {
      window.debugCurrentMatrix(rotatedBits);
    }

    window.lastReadMatrix = rotatedBits;
    window.prevCorners = smoothCorners;      
  
    return new AR.Marker(bestId, smoothCorners);
  }  
  
  return null;
};