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
    for (var i = 0; i < path.length; i++) {
      length.push(pathSegmentLength(path[i], offset));
      offset = length[length.length - 1].offset;
    }
    return length;
  }

  function pathSegmentLength(segment, offset) {
    switch(segment[0]) {
    case 'l':
      var l = Math.sqrt(segment[1] * segment[1] + segment[2] * segment[2]);
      break;
    case 'L':
      var x = segment[1] - offset[0];
      var y = segment[2] - offset[1];
      var l = Math.sqrt(x * x + y * y);
      break;
    default:
      console.error('path segment type ' + segment[0] + ' not implemented');
    }
    return {length: l, offset: pathSegmentPosition(1, segment, offset)};
  }

  function pathSegmentPosition(fraction, segment, offset) {
    switch(segment[0]) {
    case 'l':
      return [offset[0] + segment[1] * fraction, offset[1] + segment[2] * fraction];
    case 'L':
      return [offset[0] + (segment[1] - offset[0]) * fraction, offset[1] + (segment[2] - offset[1]) * fraction];
    default:
      console.error('path segment type ' + segment[0] + ' not implemented');
    }
  };

  function applyMotion(motion) {
    var path = parsePath(motion.path);
    var position = scope.parseNumber(motion.position);
    var length = pathLength(path);
    var totalLength = 0;
    for (var i = 0; i < length.length; i++) {
      totalLength += length[i].length;
    }
    var segment = 0;
    var position = position * totalLength;
    while (position > length[segment].length) {
      position -= length[segment].length;
      segment += 1;
    }
    var offset = segment > 0 ? length[segment - 1].offset : [0, 0];
    var p = pathSegmentPosition(position / length[segment].length, path[segment], offset);
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
          element._motion = {path: '', position: 0};
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

