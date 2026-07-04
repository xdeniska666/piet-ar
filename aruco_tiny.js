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
  this.contour = [];
  this.poly = [];
  this.candidate = [];
  this.candidates = [];

  // Жестко снижаем порог фильтрации по размеру для низкого разрешения кадра
  this.minSize = 10; // Было значительно больше, из-за чего отсекались маркеры
};

AR.Detector.prototype.detect = function(imageSrc){
  // Защита от пустых данных
  if (!imageSrc || !imageSrc.data) return [];

  // Очищаем дебаг прошлых кадров, чтобы не было ложного спама
  window.debugCandidateInfo = null;
  window.lastReadMatrix = null;

  CV.grayscale(imageSrc, this.grey);
  // Адаптивный порог под мелкое разрешение
  CV.adaptiveThreshold(this.grey, this.thres, 7, 7);

  this.contours = [];
  CV.findContours(this.thres, this.contours);
  
  this.candidates = [];
  var i = 0, len = this.contours.length, contour = null, approx = null;

  for (; i < len; ++ i){
    contour = this.contours[i];

    // Ослабляем фильтр: пропускаем даже небольшие контуры
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
window.matrixHistory = [];
window.prevCorners = null;

AR.Detector.prototype.getMarker = function(imageThres, candidate) {
  // 1. Проверяем, что картинка вообще существует, используя правильное имя аргумента
  if (!imageThres || !imageThres.data) return null;

  // 2. Спокойно вытаскиваем параметры
  var width = imageThres.width;
  var height = imageThres.height;
  var src = imageThres.data;

  var corners = [];

  // Универсальный парсинг углов кандидатов
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

  if (!corners || corners.length < 4 || !corners[0]) {
    return null;
  } 

  // Билинейная интерполяция
  function getPointInQuad(c, perX, perY) {
    var topX = c[0].x + (c[1].x - c[0].x) * perX;
    var topY = c[0].y + (c[1].y - c[0].y) * perX;
    var botX = c[3].x + (c[2].x - c[3].x) * perX;
    var botY = c[3].y + (c[2].y - c[3].y) * perX;
    return {
      x: topX + (botX - topX) * perY,
      y: topY + (botY - topY) * perY
    };
  }

  var fullMatrix = [];
  var minPct = 0.04;
  var maxPct = 0.96;
  var pctRange = maxPct - minPct;
  var debugCtx = document.getElementById('canvasID') ? document.getElementById('canvasID').getContext('2d') : null;

  // Шаг 1. Считываем внешнюю рамку и внутреннее ядро (сетка 7x7)
  for (var i = 0; i < 7; ++i) {
    fullMatrix[i] = [];
    var yPercent = minPct + ((i + 0.5) / 7) * pctRange;
    for (var j = 0; j < 7; ++j) {
      var xPercent = minPct + ((j + 0.5) / 7) * pctRange;
      var pt = getPointInQuad(corners, xPercent, yPercent);

      var cx = Math.floor(pt.x);
      var cy = Math.floor(pt.y);
      cx = Math.max(0, Math.min(width - 1, cx));
      cy = Math.max(0, Math.min(height - 1, cy));
      var idx = cy * width + cx;

      // Выводим в консоль координаты сканирования, чтобы увидеть, куда летят лучи
      if (i === 3 && j === 3) {
        console.log("Центр сканируется в пикселях кадра: X =", cx, "Y =", cy, "Яркость:", src[idx]);
      }

      fullMatrix[i][j] = (src[idx] > 60) ? 1 : 0;
    }
  }

  // Шаг 2. Проверка черной рамки маркера (она должна быть черной, т.е. нулями)
  var whiteBorderPixels = 0;
  for (var i = 0; i < 7; ++i) {
    if (fullMatrix[0][i] === 1) whiteBorderPixels++;
    if (fullMatrix[6][i] === 1) whiteBorderPixels++;
    if (i > 0 && i < 6) {
      if (fullMatrix[i][0] === 1) whiteBorderPixels++;
      if (fullMatrix[i][6] === 1) whiteBorderPixels++;
    }
  }

  // Если на рамке больше 3 белых пикселей - это гарантированный мусор (клавиатура)
  if (whiteBorderPixels > 3) {
    if (typeof window.debugCandidateInfo === 'function') {
      window.debugCandidateInfo("Отсев: Белая рамка (" + whiteBorderPixels + " пикс.)");
    }  
    window.prevCorners = null;
    return null;
  }   

  // Шаг 3. Выделяем внутреннюю матрицу 5x5 
  var bits = [];
  for (var i = 0; i < 5; ++i) {
    bits[i] = [];
    for (var j = 0; j < 5; ++j) {
      bits[i][j] = fullMatrix[i + 1][j + 1];
    }
  }

  // Шаг 4. Декодирование ID по правилам контрольных сумм ArUco (коды Хэмминга)
  var bestId = -1;
  var bestRotation = 0;

  // Снижаем допуск ошибок
  var minErrors = 4; 

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
      
      var dataBits = (rowBits >> 3) & 3; // 2 бита данных для словарей типа 4x4
      var parityBits = rowBits & 7;      // 3 бита четности

      // Вычисляем правильную четность для считанных данных
      var p0 = (dataBits >> 1) & 1;
      var p1 = dataBits & 1;
      var expectedParity = (p0 << 2) | (p1 << 1) | (p0 ^ p1);

      // Считаем ошибочные биты в этой строке
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

  // Белый список маркеров, которые физически используются в Piet-AR.
  // Сюда нужно внести только те ID, которые ты реально распечатал или выводишь на экран.
  // Любые другие ID, сгенерированные шумом клавиатуры, будут мгновенно отсекаться.
  var VALID_PIET_IDS = [6, 48];

  // Шаг 5. Если маркер прошел валидацию, отдаем его
  if (bestId >= 0 && VALID_PIET_IDS.indexOf(bestId) !== -1) {
    // Сглаживание траектории углов (LERP) между кадрами
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

    // Сохраняем развернутую матрицу для отладочного экрана телеметрии
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

    // Логирование успешного распознавания в интерфейс
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
  
  // Лог отсева, если маркер не подошел под Хэмминг
  if (typeof window.debugCandidateInfo === 'function') {
    window.debugCandidateInfo("Отсев: Ошибка Хэмминга или невалидный ID (мин ошибок: " + minErrors + ", найден ID: " + bestId + ")");
  }
  
  window.prevCorners = null;
  return null;
};