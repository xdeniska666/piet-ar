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

/*CV.otsu = function(imageSrc){
  var src = imageSrc.data, len = src.length, i, hist = [], threshold = 0, sum = 0, sumB = 0, wB = 0, wF = 0, max = 0, mu;
  
  for (i = 0; i < 256; ++ i){
    hist[i] = 0;
  }
  for (i = 0; i < len; ++ i){
    hist[src[i]] ++;
  }
  for (i = 0; i < 256; ++ i){
    sum += i * hist[i];
  }
  for (i = 0; i < 256; ++ i){
    wB += hist[i];
    if (0 === wB) continue;
    wF = len - wB;
    if (0 === wF) break;
    sumB += i * hist[i];
    mu = sumB / wB - (sum - sumB) / wF;
    if (wB * wF * mu * mu > max){
      max = wB * wF * mu * mu;
      threshold = i;
    }
  }

  return threshold;
};*/

CV.findContours = function(imageSrc, contours) {  
  var src = imageSrc.data, width = imageSrc.width, height = imageSrc.height;
  var visited = new Uint8Array(width * height);

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
  /*this.homography = new CV.Image();*/
  this.contours = [];
  this.candidates = [];
};

AR.Detector.prototype.detect = function(imageSrc){
  CV.grayscale(imageSrc, this.grey);
  // Адаптивный порог под мелкое разрешение
  CV.adaptiveThreshold(this.grey, this.thres, 7, 7);

  this.contours = [];
  CV.findContours(this.thres, this.contours);
  
  this.candidates = [];
  var i = 0, len = this.contours.length, contour = null, approx = null;

  for (; i < len; ++ i){
    contour = this.contours[i];

    // Отрезанный лимит площади маркера (не менее 5% от ширины)
    if (contour.length > imageSrc.width * 0.15){
      // Рассчитываем epsilon от реального периметра контура
      approx = CV.approxPolyDP(contour, CV.perimeter(contour) * 0.05);
  
      if (approx.length === 4){
        if (this.isConvex(approx)){
          var minDist = 999999;
          for (var j = 0; j < 4; ++ j){
            var dx = approx[j].x - approx[(j + 1) % 4].x;
            var dy = approx[j].y - approx[(j + 1) % 4].y;
            var dist = dx * dx + dy * dy;
            if (dist < minDist) minDist = dist;
          }  
          if (minDist > 100){
            this.candidates.push(approx);
          }
        }
      }
    }
  }
  
  // Разбор кандидатов в маркеры
  var markers = [];
  for (i = 0; i < this.candidates.length; ++ i){
    var marker = this.getMarker(this.thres, this.candidates[i]);
    if (marker){
      markers.push(marker);
    }
  }

  // Если вызывающая программа просит сырые контуры для отладки
  if (imageSrc.returnContours) {    
    return this.contours;
  }
  
  return markers;
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

AR.Detector.prototype.getMarker = function(imageThres, imageCorners) {
  var width = imageThres.width;
  var height = imageThres.height;
  var src = imageThres.data;

  // Прямая интерполяция координат внутри четырехугольника (без гомографии)
  function getPointInQuad(corners, perX, perY) {
    // Интерполируем верхнюю грань (между углами 0 и 1)
    var topX = corners[0].x + (corners[1].x - corners[0].x) * perX;
    var topY = corners[0].y + (corners[1].y - corners[0].y) * perX;
    
    // Интерполируем нижнюю грань (между углами 3 и 2)
    var botX = corners[3].x + (corners[2].x - corners[3].x) * perX;
    var botY = corners[3].y + (corners[2].y - corners[3].y) * perX;
    
    // Финальная вертикальная интерполяция между полученными точками
    return {
      x: topX + (botX - topX) * perY,
      y: topY + (botY - topY) * perY
    };
  }

  var fullMatrix = [];
  var fullMatrixInv = [];

  // Строим сетку 7x7, включая внешнюю рамку маркера
  for (var i = 0; i < 7; ++i) {
    fullMatrix[i] = [];
    fullMatrixInv[i] = [];
    var yPercent = (i + 0.5) / 7;

    for (var j = 0; j < 7; ++j) {
      var xPercent = (j + 0.5) / 7;
      
      var pt = getPointInQuad(imageCorners, xPercent, yPercent);
      
      var cx = Math.floor(pt.x);
      var cy = Math.floor(pt.y);
      
      cx = Math.max(0, Math.min(width - 1, cx));
      cy = Math.max(0, Math.min(height - 1, cy));
      
      var idx = cy * width + cx;
      var val = (src[idx] > 127) ? 1 : 0;
      
      fullMatrix[i][j] = val;
      fullMatrixInv[i][j] = (val === 1) ? 0 : 1;
    }
  }

  // Вырезаем центральное ядро Piet-AR 5x5 (отсекаем рамку безопасности)
  var bits = [];
  var invBits = [];
  for (var i = 0; i < 5; ++i) {
    bits[i] = [];
    invBits[i] = [];
    for (var j = 0; j < 5; ++j) {
      bits[i][j] = fullMatrix[i + 1][j + 1];
      invBits[i][j] = fullMatrixInv[i + 1][j + 1];
    }
  }

  // ЖЕЛЕЗОБЕТОННО: Сохраняем результат в буфер ДО любых проверок на ошибки
  window.lastReadMatrix = bits;

  var realDataset = [
    [1, 1, 1, 1, 0],
    [0, 0, 1, 1, 1],
    [1, 1, 1, 1, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 0, 0, 1]
  ];

  var bestErrors = 100;

  for (var rotation = 0; rotation < 4; ++rotation) {
    var eOut = 0, eOutInv = 0;

    for (var y = 0; y < 5; ++y) {
      for (var x = 0; x < 5; ++x) {
        var rx = x, ry = y;
        if (rotation === 1) { rx = y; ry = 4 - x; }
        else if (rotation === 2) { rx = 4 - x; ry = 4 - y; }
        else if (rotation === 3) { rx = 4 - y; rx = x; } // Исправлен индекс поворота

        var target = realDataset[y][x];

        if (bits[ry][rx] !== target) eOut++;
        if (invBits[ry][rx] !== target) eOutInv++;
      }
    }
    
    var minCur = Math.min(eOut, eOutInv);
    if (minCur < bestErrors) {
      bestErrors = minCur;
    }
  }

  // Порог фильтрации шумов кадра
  if (bestErrors <= 6) {
    return new AR.Marker(100, imageCorners);
  }

  return null;
};  