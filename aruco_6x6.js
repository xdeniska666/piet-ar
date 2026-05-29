// ==========================================
// 1. Модуль CV (cv.js) - Математическое ядро
// ==========================================
var CV = CV || {};

CV.Image = function(width, height, data){
  this.width = width || 0;
  this.height = height || 0;
  this.data = data || [];
};

CV.toGrey = function(src, dst){
  var srcData = src.data, dstData = dst.data, len = srcData.length, i = 0, j = 0;
  dst.width = src.width;
  dst.height = src.height;
  for (; i < len; i += 4){
    dstData[j ++] = (srcData[i] * 0.299 + srcData[i + 1] * 0.587 + srcData[i + 2] * 0.114) + 0.5 >> 0;
  }
};

CV.threshold = function(src, dst, threshold){
  var srcData = src.data, dstData = dst.data, len = srcData.length, i = 0;
  dst.width = src.width;
  dst.height = src.height;
  for (; i < len; ++ i){
    dstData[i] = srcData[i] < threshold? 0: 255;
  }
};

CV.adaptiveThreshold = function(src, dst, kernelSize, threshold){
  var srcData = src.data, dstData = dst.data, len = srcData.length,
      width = src.width, height = src.height, i, j, k, tab = [];

  dst.width = width;
  dst.height = height;

  for (i = 0; i < 766; ++ i){
    tab[i] = i - 255 < -threshold? 255: 0;
  }

  // Интегральное изображение для быстрого порога
  var integral = [], sum = 0;
  for (i = 0; i < width; ++ i){
    sum += srcData[i];
    integral[i] = sum;
  }
  for (i = 1; i < height; ++ i){
    sum = 0;
    for (j = 0; j < width; ++ j){
      sum += srcData[i * width + j];
      integral[i * width + j] = integral[(i - 1) * width + j] + sum;
    }
  }

  var r = kernelSize >> 1, x1, y1, x2, y2, count;
  for (i = 0; i < height; ++ i){
    for (j = 0; j < width; ++ j){
      x1 = j - r; x2 = j + r; y1 = i - r; y2 = i + r;
      if (x1 < 0) x1 = 0; if (x2 >= width) x2 = width - 1;
      if (y1 < 0) y1 = 0; if (y2 >= height) y2 = height - 1;
      count = (x2 - x1 + 1) * (y2 - y1 + 1);
      sum = integral[y2 * width + x2] - integral[y1 * width + x2] - integral[y2 * width + x1] + integral[y1 * width + x1];
      dstData[i * width + j] = tab[ srcData[i * width + j] - (sum / count >> 0) + 255 ];
    }
  }
};

CV.findContours = function(src, binary){
  var width = src.width, height = src.height, data = binary.data,
      contours = [], contoursLen = 0, neighbor = [ [-1,0], [-1,-1], [0,-1], [1,-1], [1,0], [1,1], [0,1], [-1,1] ],
      i, j, k, x, y, pos, state, n, n_pos, d, d_pos, start_pos, curr_pos, count, contour, hole;

  for (i = 1; i < height - 1; ++ i){
    for (j = 1; j < width - 1; ++ j){
      pos = i * width + j;
      if (data[pos] !== 0){
        state = 0;
        if (data[pos] === 255 && data[pos - 1] === 0){ state = 1; }
        else if (data[pos] >= 128 && data[pos + 1] === 0){ state = 2; hole = true; }

        if (state !== 0){
          contour = [];
          contour.hole = hole;
          contour.initialPos = pos;
          
          curr_pos = pos;
          d = (state === 1)? 0: 4;
          start_pos = -1;

          while (start_pos !== pos || d_pos !== curr_pos){
            if (start_pos === -1){ start_pos = curr_pos; }
            n = (d + 6) % 8;
            for (k = 0; k < 8; ++ k){
              n_pos = curr_pos + neighbor[n][1] * width + neighbor[n][0];
              if (data[n_pos] !== 0){ break; }
              n = (n + 1) % 8;
            }
            if (k === 8){
              data[curr_pos] = -contoursLen - 1;
              contour.push({x: j, y: i});
              break;
            }
            d_pos = n_pos;
            d = n;
            
            x = curr_pos % width;
            y = (curr_pos / width) >> 0;
            contour.push({x: x, y: y});
            
            if (data[curr_pos] === 255){ data[curr_pos] = -contoursLen - 1; }
            curr_pos = d_pos;
          }
          contours.push(contour);
          contoursLen ++;
        }
      }
    }
  }
  return contours;
};

CV.approxPolyDP = function(contour, epsilon){
  var slice = {start: 0, end: contour.length - 1},
      stack = [slice], poly = [], maxDist, dist, i, pos, p, le;

  while(stack.length > 0){
    slice = stack.pop();
    maxDist = 0;
    pos = 0;
    var p1 = contour[slice.start], p2 = contour[slice.end];

    for (i = slice.start + 1; i < slice.end; ++ i){
      p = contour[i];
      dist = CV.getDistanceToLine(p, p1, p2);
      if (dist > maxDist){ maxDist = dist; pos = i; }
    }

    if (maxDist > epsilon){
      stack.push({start: pos, end: slice.end});
      stack.push({start: slice.start, end: pos});
    } else {
      poly.push(p1);
    }
  }
  return poly;
};

CV.getDistanceToLine = function(p, p1, p2){
  var dx = p2.x - p1.x, dy = p2.y - p1.y, num;
  if (dx === 0 && dy === 0) return Math.sqrt((p.x - p1.x)*(p.x - p1.x) + (p.y - p1.y)*(p.y - p1.y));
  num = Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x);
  return num / Math.sqrt(dx * dx + dy * dy);
};

CV.getDistance = function(p1, p2){
  return Math.sqrt((p2.x - p1.x)*(p2.x - p1.x) + (p2.y - p1.y)*(p2.y - p1.y));
};

CV.isContourConvex = function(contour){
  var orientation = 0, len = contour.length, i, j, k, z;
  for (i = 0; i < len; ++ i){
    j = (i + 1) % len; k = (i + 2) % len;
    z = (contour[j].x - contour[i].x) * (contour[k].y - contour[j].y) - (contour[j].y - contour[i].y) * (contour[k].x - contour[j].x);
    if (z < 0){ orientation |= 1; } else if (z > 0){ orientation |= 2; }
    if (orientation === 3) return false;
  }
  return true;
};

CV.warp = function(src, dst, contour, size){
  var srcData = src.data, dstData = dst.data, width = src.width,
      m = CV.getPerspectiveTransform(contour, size), i, j, pos, x, y, w;

  dst.width = size; dst.height = size;

  for (i = 0; i < size; ++ i){
    for (j = 0; j < size; ++ j){
      w = m[6] * j + m[7] * i + m[8];
      x = ((m[0] * j + m[1] * i + m[2]) / w) >> 0;
      y = ((m[3] * j + m[4] * i + m[5]) / w) >> 0;
      pos = y * width + x;
      dstData[i * size + j] = srcData[pos];
    }
  }
};

CV.getPerspectiveTransform = function(src, size){
  var rq = [ [0,0], [size-1,0], [size-1,size-1], [0,size-1] ],
      a = [], b = [], i, x, y, u, v;

  for (i = 0; i < 4; ++ i){
    x = src[i].x; y = src[i].y; u = rq[i][0]; v = rq[i][1];
    a.push([x, y, 1, 0, 0, 0, -u*x, -u*y]); b.push(u);
    a.push([0, 0, 0, x, y, 1, -v*x, -v*y]); b.push(v);
  }
  return CV.solve(a, b);
};

CV.solve = function(a, b){
  var n = a.length, i, j, k, maxrow, tmp, x = [];
  for (i = 0; i < n; ++ i) { a[i].push(b[i]); }
  for (i = 0; i < n; ++ i) {
    maxrow = i;
    for (j = i + 1; j < n; ++ j) { if (Math.abs(a[j][i]) > Math.abs(a[maxrow][i])) maxrow = j; }
    tmp = a[i]; a[i] = a[maxrow]; a[maxrow] = tmp;
    for (j = i + 1; j < n; ++ j) {
      var c = a[j][i] / a[i][i];
      for (k = i; k <= n; ++ k) { a[j][k] -= c * a[i][k]; }
    }
  }
  for (i = n - 1; i >= 0; -- i) {
    tmp = a[i][n];
    for (j = i + 1; j < n; ++ j) { tmp -= a[i][j] * x[j]; }
    x[i] = tmp / a[i][i];
  }
  return x;
};


// ==========================================
// 2. Модуль AR (aruco.js) - Детектор маркеров 6x6
// ==========================================
var AR = AR || {};

AR.Marker = function(id, corners){
  this.id = id;
  this.corners = corners;
};

AR.Detector = function(){
  this.grey = new CV.Image();
  this.thres = new CV.Image();
  this.homography = new CV.Image();
  this.contours = [];
  this.polygons = [];
};

AR.Detector.prototype.detect = function(imageSource){
  CV.toGrey(imageSource, this.grey);
  // Используем классический threshold вместо капризного адаптивного
  CV.threshold(this.grey, this.thres, 100);
  
  this.contours = CV.findContours(this.grey, this.thres);
  this.polygons = this.findCandidates(this.contours, imageSource.width * 0.05, 0.05, true);
  this.polygons = this.clockwiseCorners(this.polygons);
  
  return this.identifyMarkers(this.polygons, imageSource);
};

AR.Detector.prototype.findCandidates = function(contours, minSize, epsilon, open){
  var candidates = [], isCandidate, i, j;
  
  for (i = 0; i < contours.length; ++ i){
    if (contours[i].length >= minSize){
      var poly = CV.approxPolyDP(contours[i], contours[i].length * epsilon);
      
      if (poly.length === 4 && CV.isContourConvex(poly)){
        isCandidate = true;
        
        for (j = 0; j < 3; j++){
          if (CV.getDistance(poly[j], poly[j + 1]) < 10){ isCandidate = false; break; }
        }
        
        if (isCandidate){ candidates.push(poly); }
      }
    }
  }
  return candidates;
};

AR.Detector.prototype.clockwiseCorners = function(candidates){
  var i, dx1, dy1, dx2, dy2;
  for (i = 0; i < candidates.length; ++ i){
    dx1 = candidates[i][1].x - candidates[i][0].x;
    dy1 = candidates[i][1].y - candidates[i][0].y;
    dx2 = candidates[i][2].x - candidates[i][0].x;
    dy2 = corners = candidates[i][2].y - candidates[i][0].y;
    
    if ( (dx1 * dy2 - dy1 * dx2) < 0 ){
      var s = candidates[i][0];
      candidates[i][0] = candidates[i][3];
      candidates[i][3] = s;
      s = candidates[i][1];
      candidates[i][1] = candidates[i][2];
      candidates[i][2] = s;
    }
  }
  return candidates;
};

AR.Detector.prototype.identifyMarkers = function(candidates, imageSource){
  var markers = [], i;
  for (i = 0; i < candidates.length; ++ i){
    var marker = this.getMarkerCode(candidates[i], imageSource);
    if (marker){ markers.push(marker); }
  }
  return markers;
};

AR.Detector.prototype.getMarkerCode = function(contour, imageSource){
  // Для оригинального словаря 6x6 матрица трансформации берется размером 7х7 ячеек
  CV.warp(this.grey, this.homography, contour, 7);
  
  var bytes = [], i, j, y, x, val;
  
  // Проверяем внешнюю черную рамку маркера
  for (y = 0; y < 7; ++ y){
    var inc = (y === 0 || y === 6)? 1: 6;
    for (x = 0; x < 7; x += inc){
      if (this.homography.data[y * 7 + x] > 128){ return null; }
    }
  }
  
  // Извлекаем биты данных из внутренней матрицы 5x5 битов контрольной суммы
  for (y = 1; y < 6; ++ y){
    var line = 0;
    for (x = 1; x < 6; ++ x){
      val = (this.homography.data[y * 7 + x] > 128)? 1: 0;
      line |= (val << (5 - x));
    }
    bytes.push(line);
  }
  
  var id = this.getMarkerId(bytes);
  if (id !== -1){ return new AR.Marker(id, contour); }
  return null;
};

AR.Detector.prototype.getMarkerId = function(bytes){
  // Матрица кодов и контрольных сумм классического словаря DICT_ARUCO_ORIGINAL
  var ids = [ [16,4,1,32,8], [20,5,20,5,20], [28,7,23,30,31], [4,1,4,1,4], [12,3,9,14,15] ];
  var i, j, k;
  
  var resultId = 0;
  for (i = 0; i < 5; ++ i){
    var bits = 0;
    if ( (bytes[i] & 1) !== 0 ) bits |= 1;
    if ( (bytes[i] & 4) !== 0 ) bits |= 2;
    resultId |= (bits << (2 * i));
  }
  return resultId;
};