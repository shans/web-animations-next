// Copyright 2014 Google Inc. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
// limitations under the License.

(function(scope, testing) {

  // m/M: moveTo (rel/abs) (x y)+
  // z/Z: closePath
  // l/L: lineTo (x y)+
  // h/H: horzLineTo x+
  // v/V: vertLineTo y+
  // c/C: curveTo (x1 y1 x2 y2 x y)+
  // s/S: smoothCurveTo (x2 y2 x y)+
  // q/Q: quadBezierTo (x1 y1 x y)+
  // t/T: smoothQuadBezierTo (x y)+
  // a/A: arcTo (rx ry x-axis-rotation large-arg-flag sweep-flag x y)+
  //      starts @ current point
  //      ends @ x y
  //      radii rx & ry
  //      oriented by x-axis-rotation (i.e. rx lies along)
  //      larger than 180deg if large-arc-flag
  //      positive angle direction if sweep-flag

  var pathCommands = 'mzlhvcsqta';
  var c = /[a-zA-Z]/g;

  function parsePath(path) {
    var result = [];
    var thisCommand = c.exec(path);
    while (true) {
      var nextCommand = c.exec(path);
      var args = nextCommand ? path.substring(thisCommand.index+1, nextCommand.index) :
          path.substring(thisCommand.index+1);
      args = args.split(/[,\s]+/).filter(function(x) { return x != ''; }).map(Number);
      result.push([thisCommand[0]].concat(args));
      if (nextCommand)
        thisCommand = nextCommand;
      else
        return result;
    }
  }

  function pathLength(path) {
    var length = [];
    var offset = [0, 0];
    var subpath = [0, 0];
    for (var i = 0; i < path.length; i++) {
      length.push(pathSegmentLength(path[i], offset, subpath));
      offset = length[length.length - 1].offset;
      subpath = length[length.length - 1].subpath;
    }
    return length;
  }

  // Calculates the length of the given segment, and returns both it and the offset after
  // the segment is applied.
  function pathSegmentLength(segment, offset, subpath) {
    switch(segment[0]) {
    case 'l':
      var l = Math.sqrt(segment[1] * segment[1] + segment[2] * segment[2]);
      break;
    case 'L':
      var x = segment[1] - offset[0];
      var y = segment[2] - offset[1];
      var l = Math.sqrt(x * x + y * y);
      break;
    case 'h':
    case 'v':
      var l = segment[1];
      break;
    case 'H':
      var l = segment[1] - offset[0];
      break;
    case 'V':
     var l = segment[1] - offset[1];
     break;
    case 'm':
      var l = 0;
      subpath = [segment[1] + offset[0], segment[2] + offset[1]];
      break;
    case 'M':
      var l = 0;
      subpath = [segment[1], segment[2]];
      break;
    case 'z':
    case 'Z':
      var x = offset[0] - subpath[0];
      var y = offset[1] - subpath[1];
      var l = Math.sqrt(x * x + y * y);
      break;
    default:
      console.error('path segment type ' + segment[0] + ' not implemented');
    }
    return {length: l, offset: pathSegmentPosition(1, segment, offset, subpath), subpath: subpath};
  }

  function f(a, b, c, d, m) {
    return a * (1 - m) * (1 - m) * (1 - m) + 3 * b * (1 - m) * (1 - m) * m + 3 * c * (1 - m) * m * m + d * m * m * m
  };

  // finds a t value within 0.001 of distance away from the provided current_t
  function distanceAlongCubic(x0, y0, x1, y1, x2, y2, x3, y3, current_t, distance) {
    var start = current_t;
    var end = current_t + distance;
    var x = f(x0, x1, x2, x3, current_t);
    var y = f(y0, y1, y2, y3, current_t);

    while (1) {
      var xE = f(x0, x1, x2, x3, end) - x;
      var yE = f(y0, y1, y2, y3, end) - y;
      if (Math.sqrt(xE * xE + yE * yE) < distance) {
	end += distance;
      } else {
	break;
      }
    }

    while (1) {
      var mid = (start + end) / 2;
      var xEst = f(x0, x1, x2, x3, mid) - x;
      var yEst = f(y0, y1, y2, y3, mid) - y;
      var dEst = Math.sqrt(xEst * xEst + yEst * yEst);
      if (Math.abs(dEst - distance) < 0.001) {
        return mid;
      }
      if (dEst < distance)
        start = mid;
      else
        end = mid;
    }
  }

  // Calculates the position on the current segment at local fraction, with the segment
  // starting at the provided offset.
  function pathSegmentPosition(fraction, segment, offset, subpath) {
    switch(segment[0]) {
    case 'l':
      return [offset[0] + segment[1] * fraction, offset[1] + segment[2] * fraction];
    case 'L':
      return [offset[0] + (segment[1] - offset[0]) * fraction, offset[1] + (segment[2] - offset[1]) * fraction];
    case 'm':
      if (fraction > 0) {
	return [offset[0] + segment[1], offset[1] + segment[2]];
      }
    case 'M':
      if (fraction > 0) {
	return [segment[1], segment[2]];
      }
      return offset;
    case 'h':
      return [offset[0] + segment[1] * fraction, offset[1]];
    case 'H':
      return [offset[0] + (segment[1] - offset[0]) * fraction, offset[1]];
    case 'v':
      return [offset[0], offset[1] + segment[1] * fraction];
    case 'V':
      return [offset[0], offset[1] + (segment[1] - offset[1]) * fraction];
    case 'z':
    case 'Z':
      return [offset[0] + (subpath[0] - offset[0]) * fraction, offset[1] + (subpath[1] - offset[1]) * fraction];
    default:
      console.error('path segment type ' + segment[0] + ' not implemented');
    }
  };

  function deriveMotionData(path) {
    var cachedMotionData = {};
    cachedMotionData.path = parsePath(path);
    cachedMotionData.length = pathLength(cachedMotionData.path);
    var totalLength = 0;
    for (var i = 0; i < cachedMotionData.length.length; i++) {
      totalLength += cachedMotionData.length[i].length;
    }
    cachedMotionData.totalLength = totalLength;
    return cachedMotionData;
  }

  function applyMotion(motion) {
    var position = scope.parseNumber(motion.position);
    if (motion.cachedMotionData[motion.path] == undefined) {
      motion.cachedMotionData[motion.path] = deriveMotionData(motion.path);
    }
    var data = motion.cachedMotionData[motion.path];
    var segment = 0;
    var position = position * data.totalLength;
    while (position > data.length[segment].length) {
      position -= data.length[segment].length;
      segment += 1;
    }
    var offset = segment > 0 ? data.length[segment - 1].offset : [0, 0];
    var subpath = segment > 0 ? data.length[segment - 1].subpath : [0, 0];
    var p = pathSegmentPosition(position / data.length[segment].length, data.path[segment], offset, subpath);
    return 'translate(' + p[0] + 'px, ' + p[1] + 'px)';
  }

  scope.addPropertiesHandler(
    parsePath,
    function(l, r) {
      return [0, 1, function(v) { v < 0.5 ? l : r}];
    },
    ['motionPath']
  )

  scope.addPropertiesHandler(
    scope.parseNumber,
    scope.mergeNumbers,
    ['motionPosition']
  )

  var _apply = scope.apply;

  scope.apply = function(element, property, value) {
    var isMotion = property.substring(0, 6) == 'motion';
    var isTransform = property == 'transform';
    if (isMotion || isTransform) {
      if (element._transform == undefined)
        element._transform = ['', ''];
      if (isMotion) {
        if (element._motion == undefined) {
          element._motion = {path: '', position: 0, cachedMotionData: {}};
        }
        element._motion[property.substring(6).toLowerCase()] = value;
        value = applyMotion(element._motion);
      }
      element._transform[isMotion ? 0 : 1] = value;
      _apply(element, 'transform', element._transform.join(' '));
    } else {
      _apply(element, property, value);
    }
  }

}(webAnimationsMinifill, webAnimationsTesting));

