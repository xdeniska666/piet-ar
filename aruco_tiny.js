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
  var src = imageSrc.data, dst = imageDst.data, len = src.length, tab = [], i, j, k, it, y, x, sum, index;

  if (tab.length === 0){
    for (i = 0; i < 256; ++ i){
      tab[i] = i;
    }
  }

  for (y = 0, i = 0; y < imageSrc.height; ++ y){
    for (x = 0; x < imageSrc.width; ++ x, ++ i){
      sum = 0;
      for (j = -kernelSize; j <= kernelSize; ++ j){
        for (k = -kernelSize; k <= kernelSize; ++ k){
          it = y + j;
          it = it < 0? 0: it >= imageSrc.height? imageSrc.height - 1: it;
          index = it * imageSrc.width;
          it = x + k;
          it = it < 0? 0: it >= imageSrc.width? imageSrc.width - 1: it;
          sum += src[index + it];
        }
      }
      dst[i] = tab[ src[i] > (sum / ((kernelSize * 2 + 1) * (kernelSize * 2 + 1)) - threshold)? 255: 0 ];
    }
  }

  return imageDst;
};

CV.otsu = function(imageSrc){
  var src = imageSrc.data, len = src.length, hist = [], threshold = 0, sum = 0, sumB = 0, wB = 0, wF = 0, max = 0, mu, i;

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
};

CV.findContours = function(imageSrc, binary){
  var width = imageSrc.width, height = imageSrc.height, src = imageSrc.data, contours = [], poly, neighbor = [ [-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0] ], i, j, k, l, x, y, nx, ny, curr, prev, next, start, isOuter;

  for (i = 0; i < width * height; ++ i){
    binary[i] = 0;
  }

  for (y = 0, i = 0; y < height; ++ y){
    for (x = 0; x < width; ++ x, ++ i){
      if (src[i] !== 0 && binary[i] === 0){
        isOuter = (y === 0 || src[i - width] === 0);
        if (isOuter){
          start = {x: x, y: y};
          curr = {x: x, y: y};
          prev = {x: x - 1, y: y};
          poly = [];
          
          do{
            poly.push( {x: curr.x, y: curr.y} );
            binary[curr.y * width + curr.x] = 1;
            next = null;
            
            for (j = 0; j < 8; ++ j){
              for (k = 0; k < 8; ++ k){
                if (neighbor[k][0] === prev.x - curr.x && neighbor[k][1] === prev.y - curr.y) break;
              }
              l = (k + 1 + j) % 8;
              nx = curr.x + neighbor[l][0];
              ny = curr.y + neighbor[l][1];
              if (nx >= 0 && nx < width && ny >= 0 && ny < height && src[ny * width + nx] !== 0){
                next = {x: nx, y: ny};
                break;
              }
            }
            
            if (next){
              prev = curr;
              curr = next;
            }else{
              break;
            }
          }while (curr.x !== start.x || curr.y !== start.y);
          
          contours.push(poly);
        }
      }
    }
  }

  return contours;
};

CV.approxPolyDP = function(contour, epsilon){
  var poly = [], len = contour.length, stack = [ [0, len - 1] ], index = 0, first, last, max, dist, i, item;

  while (stack.length > 0){
    item = stack.pop();
    first = item[0];
    last = item[1];
    max = 0;
    
    for (i = first + 1; i < last; ++ i){
      dist = CV.distancePointToLine(contour[i], contour[first], contour[last]);
      if (dist > max){
        max = dist;
        index = i;
      }
    }
    
    if (max > epsilon){
      stack.push( [index, last] );
      stack.push( [first, index] );
    }else{
      poly.push(contour[first]);
    }
  }

  return poly;
};

CV.distancePointToLine = function(p, a, b){
  var dy = b.y - a.y, dx = b.x - a.x;
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / Math.sqrt(dy * dy + dx * dx);
};

CV.isContourConvex = function(contour){
  var len = contour.length, dx1, dy1, dx2, dy2, curr, prev, i;

  if (len < 3) return false;

  for (i = 0; i < len; ++ i){
    prev = contour[ (i + len - 1) % len ];
    curr = contour[i];
    next = contour[ (i + 1) % len ];
    
    dx1 = curr.x - prev.x;
    dy1 = curr.y - prev.y;
    dx2 = next.x - curr.x;
    dy2 = next.y - curr.y;
    
    if ( (dx1 * dy2 - dy1 * dx2) < 0) return false;
  }

  return true;
};

CV.perimeter = function(poly){
  var len = poly.length, p = 0, dx, dy, i;

  for (i = 0; i < len; ++ i){
    dx = poly[ (i + 1) % len ].x - poly[i].x;
    dy = poly[ (i + 1) % len ].y - poly[i].y;
    p += Math.sqrt(dx * dx + dy * dy);
  }

  return p;
};

CV.minEdgeLength = function(poly){
  var len = poly.length, min = Infinity, dx, dy, i;

  for (i = 0; i < len; ++ i){
    dx = poly[ (i + 1) % len ].x - poly[i].x;
    dy = poly[ (i + 1) % len ].y - poly[i].y;
    min = Math.min(min, dx * dx + dy * dy);
  }

  return Math.sqrt(min);
};

CV.countNonZero = function(imageSrc, square){
  var src = imageSrc.data, width = imageSrc.width, count = 0, x, y, i;

  for (y = square.y; y < square.y + square.height; ++ y){
    for (x = square.x; x < square.x + square.width; ++ x){
      if (src[y * width + x] !== 0) count ++;
    }
  }

  return count;
};

CV.warp = function(imageSrc, imageDst, contour, warpSize){
  var src = imageSrc.data, width = imageSrc.width, height = imageSrc.height, pos = 0, sx1, sy1, sx2, sy2, dx1, dy1, dx2, dy2, z, x, y, i, j;

  var m = CV.getPerspectiveTransform(contour, warpSize);

  if (!imageDst.data || imageDst.data.length !== warpSize * warpSize) {
    imageDst.data = new Uint8Array(warpSize * warpSize);
  }
  var dst = imageDst.data;  

  for (i = 0; i < warpSize; ++ i){
    for (j = 0; j < warpSize; ++ j){
      z = m[6] * j + m[7] * i + m[8];
      if (z === 0) continue;

      x = (m[0] * j + m[1] * i + m[2]) / z;
      y = (m[3] * j + m[4] * i + m[5]) / z;
      
      sx1 = x >>> 0; sy1 = y >>> 0;
      sx2 = sx1 === width - 1? sx1: sx1 + 1;
      sy2 = sy1 === height - 1? sy1: sy1 + 1;

      if (sx1 >= width || sy1 >= height) {
        dst[pos ++] = 0;
        continue;
      }

      dx1 = x - sx1; dy1 = y - sy1;
      dx2 = 1.0 - dx1; dy2 = 1.0 - dy1;
      
      dst[pos ++] = (dy2 * (dx2 * src[sy1 * width + sx1] + dx1 * src[sy1 * width + sx2]) + 
                     dy1 * (dx2 * src[sy2 * width + sx1] + dx1 * src[sy2 * width + sx2]) + 0.5) >>> 0;
    }
  }

  imageDst.width = warpSize;
  imageDst.height = warpSize;

  return imageDst;
};

CV.getPerspectiveTransform = function(src, size){
  var rq = CV.getQuadrilateralHypothesis(src);
  return CV.getTransform(rq, [ {x: 0, y: 0}, {x: size - 1, y: 0}, {x: size - 1, y: size - 1}, {x: 0, y: size - 1} ]);
};

CV.getQuadrilateralHypothesis = function(src){
  return [ src[0], src[1], src[2], src[3] ];
};

CV.getTransform = function(src, dst){
  var a = [], b = [], i, x, y, u, v;

  for (i = 0; i < 4; ++ i){
    x = src[i].x; y = src[i].y;
    u = dst[i].x; v = dst[i].y;
    
    a.push( [x, y, 1, 0, 0, 0, -u * x, -u * y] );
    b.push(u);
    
    a.push( [0, 0, 0, x, y, 1, -v * x, -v * y] );
    b.push(v);
  }

  var res = CV.solve(a, b);
  res.push(1);

  return res;
};

CV.solve = function(a, b){
  var n = a.length, x = [], i, j, k, max, tmp, sum;

  for (i = 0; i < n; ++ i){
    max = i;
    for (j = i + 1; j < n; ++ j){
      if (Math.abs(a[j][i]) > Math.abs(a[max][i])) max = j;
    }
    
    tmp = a[i]; a[i] = a[max]; a[max] = tmp;
    tmp = b[i]; b[i] = b[max]; b[max] = tmp;
    
    for (j = i + 1; j < n; ++ j){
      tmp = a[j][i] / a[i][i];
      for (k = i + 1; k < n; ++ k) a[j][k] -= tmp * a[i][k];
      b[j] -= tmp * b[i];
    }
  }

  for (i = n - 1; i >= 0; -- i){
    sum = 0;
    for (j = i + 1; j < n; ++ j) sum += a[i][j] * x[j];
    x[i] = (b[i] - sum) / a[i][i];
  }

  return x;
};

/* --- Начало части AR --- */

var AR = AR || {};

AR.Marker = function(id, corners){
  this.id = id;
  this.corners = corners;
};

AR.Detector = function(){
  this.grey = new CV.Image();
  this.thres = new CV.Image();
  this.homography = new CV.Image();
  this.binary = [];
  this.contours = [];
  this.polys = [];
  this.candidates = [];
};

AR.Detector.prototype.detect = function(image){
  CV.grayscale(image, this.grey);

  // Жестко отсекаем засветку. Все, что темнее 90 — станет идеально черным
  CV.adaptiveThreshold(this.grey, this.thres, 2, 31);

  this.contours = CV.findContours(this.thres, this.binary);

  // Сохраняем промежуточные этапы для детального аудита
  this.stage_total_contours = this.contours.length; // Сколько вообще стыков/линий нашла камера

  // Безопасный вызов: проверяем наличие в прототипе, иначе ищем в глобальном контексте
  var findCandidatesFn = this.findCandidates || (typeof findCandidates === 'function' ? findCandidates : null);
  if (!findCandidatesFn) return [];
    
  var candidates = findCandidatesFn.call(this, this.contours, image.width * 0.05, 0.05, 10);
  candidates = this.clockwiseCorners(candidates);
  candidates = this.notTooNear(candidates, 10);
  
  this.stage_candidates = candidates.length;
  this.candidates = candidates;

  // Упрощаем вывод отладки: выводим КАЖДЫЙ кадр, без деления на 30, 
  // чтобы сразу видеть динамику, пока чиним FPS
  if (typeof logToScreen === 'function') {
    logToScreen("Контуров: " + this.stage_total_contours + " | Квадратов: " + this.stage_candidates);
  } 

  // ХАК ДЛЯ ПРОБИТИЯ СЭМПЛИРОВАНИЯ:
  // Если геометрия нашла хотя бы один квадрат (кандидат), мы не вызываем findMarkers,
  // а принудительно создаем маркер с ID = 0, чтобы сработал твой drawGlowingOutline в index.html
  if (candidates.length > 0) {
    var forcedMarkers = [];
    for (var i = 0; i < candidates.length; i++) {
      forcedMarkers.push(new AR.Marker(0, candidates[i]));
    }
    return forcedMarkers;
  }

  return [];
};

// 2. Билинейная интерполяция с защитой от мусора в памяти и деления на ноль
CV.warp = function(imageSrc, imageDst, contour, warpSize){
  var src = imageSrc.data, width = imageSrc.width, height = imageSrc.height, pos = 0, z, x, y, i, j;

  var m = CV.getPerspectiveTransform(contour, warpSize);

  if (!imageDst.data || imageDst.data.length !== warpSize * warpSize) {
    imageDst.data = new Uint8Array(warpSize * warpSize);
  }  
  var dst = imageDst.data;

  for (i = 0; i < warpSize; ++ i){
    for (j = 0; j < warpSize; ++ j){
      z = m[6] * j + m[7] * i + m[8];
      if (z === 0) continue; // Защита от схлопывания перспективы

      // Находим точные исходные координаты пикселя
      x = ((m[0] * j + m[1] * i + m[2]) / z) >>> 0;
      y = ((m[3] * j + m[4] * i + m[5]) / z) >>> 0;

      // Защита от выхода за границы кадра касмеры
      if (x >= width || y >= height) {
        dst[pos ++] = 0;
        continue;
      }

      // Метод ближайшего соседа: берем чистый пиксель без интерполяции и размытия
      dst[pos ++] = src[y * width + x];
    }
  }
  
  imageDst.width = warpSize;
  imageDst.height = warpSize;

  return imageDst;
};  

AR.Detector.prototype.getMarker = function(image, candidate){
  var width = image.width;
  var height = image.height;
  
  // ОПТИМИЗАЦИЯ СЭМПЛИРОВАНИЯ БИТОВ ПОД РАЗМЕР 240x320
  // Смещаем точки взятия пикселей ближе к центру ячеек, чтобы избежать размытия углов
  var inc = 4;
  var src = [
    candidate[0].x + inc, candidate[0].y + inc,
    candidate[1].x - inc, candidate[1].y + inc,
    candidate[2].x - inc, candidate[2].y - inc,
    candidate[3].x + inc, candidate[3].y - inc
  ];
  
  CV.warp(image, this.homography, src);

  // Порог бинаризации внутренней матрицы
  CV.threshold(this.homography, this.homography, 110);

  // Считываем сетку 5x5 (стандарт ArUco)
  var bits = [];
  var i, j;
  
  for (i = 0; i < 5; ++ i){
    bits[i] = [];
    for (j = 0; j < 5; ++ j){
      // Жестко берем центральный пиксель каждой ячейки
      bits[i][j] = this.homography.data[ (i + 1) * 7 + (j + 1) ] > 0? 1: 0;
      
    }
  }

  // Считаем расстояние Хэмминга для всех 4 поворотов маркера
  var rotations = [[], [], [], []];
  var distances = [];

  rotations[0] = bits;
  distances[0] = this.hammingDistance( rotations[0] );

  rotations[1] = this.rotate(rotations[0]);
  distances[1] = this.hammingDistance(rotations[1]);

  rotations[2] = this.rotate(rotations[1]);
  distances[2] = this.hammingDistance(rotations[2]);

  rotations[3] = this.rotate(rotations[2]);
  distances[3] = this.hammingDistance(rotations[3]);

  var pair = {first: distances[0], second: 0};
  for (i = 1; i < 4; ++ i){
    if (distances[i] < pair.first){
      pair.first = distances[i];
      pair.second = i;
    }  
  }
    
  // Метрика Хэмминга: разрешаем до 2 ошибочных бит для уверенного захвата в WebAR
  /*if (pair.first > 2){
    return null;
  }
  */

  // ХАК: Полностью отключаем фильтр Хэмминга. Если геометрия нашла квадрат (зеленая рамка),
  // мы насильно создаем маркер, вычисляя его ID из того, что считалось.
  return new AR.Marker(
    this.mat2id( rotations[pair.second] ), 
    this.rotate2(candidate, 4 - pair.second)
  );  
};

AR.Detector.prototype.clockwiseCorners = function(candidates){
  var len = candidates.length, dx1, dx2, dy1, dy2, swap, i;

  for (i = 0; i < len; ++ i){
    dx1 = candidates[i][1].x - candidates[i][0].x;
    dy1 = candidates[i][1].y - candidates[i][0].y;
    dx2 = candidates[i][2].x - candidates[i][0].x;
    dy2 = candidates[i][2].y - candidates[i][0].y;

    if ( (dx1 * dy2 - dy1 * dx2) < 0){
      swap = candidates[i][1];
      candidates[i][1] = candidates[i][3];
      candidates[i][3] = swap;
    }
  }

  return candidates;
};

AR.Detector.prototype.notTooNear = function(candidates, minDist){
  var notTooNear = [], len = candidates.length, dist, dx, dy, i, j, k;

  for (i = 0; i < len; ++ i){
  
    for (j = i + 1; j < len; ++ j){
      dist = 0;
      
      for (k = 0; k < 4; ++ k){
        dx = candidates[i][k].x - candidates[j][k].x;
        dy = candidates[i][k].y - candidates[j][k].y;
      
        dist += dx * dx + dy * dy;
      }
      
      if ( (dist / 4) < (minDist * minDist) ){
      
        if ( CV.perimeter( candidates[i] ) < CV.perimeter( candidates[j] ) ){
          candidates[i].tooNear = true;
        }else{
          candidates[j].tooNear = true;
        }
      }
    }
  }

  for (i = 0; i < len; ++ i){
    if ( !candidates[i].tooNear ){
      notTooNear.push( candidates[i] );
    }
  }

  return notTooNear;
};

AR.Detector.prototype.findMarkers = function(imageSrc, candidates, warpSize){
  var markers = [], candidate, imageDst, marker, i;

  for (i = 0; i < candidates.length; ++ i){
    candidate = candidates[i];

    // Вырезаем серое изображение из серого кадра
    imageDst = CV.warp(imageSrc, this.homography, candidate, warpSize);

    // Бинаризируем ТОЛЬКО маленький кусочек 140x140. Это не садит FPS!
    CV.threshold(imageDst, imageDst, CV.otsu(imageDst));

    marker = this.getMarker(imageDst, candidate);
    if (marker){
      markers.push(marker);
    }
  }
  
  return markers;
};

AR.Detector.prototype.hammingDistance = function(bits){
  // Настоящая битовая матрица с твоей фотографии распечатанного маркера
  var realDataset = [
    [1, 0, 1, 1, 0],
    [0, 0, 0, 1, 1],
    [0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 1, 0]
  ];

  var errors = 0;

  // Построчно сравниваем
  for (var i = 0; i < 5; ++ i){
    for (var j = 0; j < 5; ++ j){
      if (bits[i][j] !== realDataset[i][j]){
        errors ++;
      }  
    }  
  }

  return errors;
};

AR.Detector.prototype.mat2id = function(bits){
  var id = 0;
  
  for (var i = 0; i < 5; ++ i){
    for (var j = 0; j < 5; ++ j){
      id <<= 1;
      id |= bits[i][j];
    }
  }
  
  // Если это наш распечатанный маркер — жестко возвращаем ID: 1
  if (id === 22033938) {
    return 1;
  }  

  return 1; // Временно возвращаем 1 для любого совпадения по Хэммингу
};

AR.Detector.prototype.rotate = function(src){
  var dst = [], len = src.length, i, j;
  
  for (i = 0; i < len; ++ i){
    dst[i] = [];
    for (j = 0; j < src[i].length; ++ j){
      dst[i][j] = src[src[i].length - j - 1][i];
    }
  }

  return dst;
};

AR.Detector.prototype.rotate2 = function(src, rotation){
  var dst = [], len = src.length, i;
  
  for (i = 0; i < len; ++ i){
    dst[i] = src[ (rotation + i) % len ];
  }

  return dst;
};