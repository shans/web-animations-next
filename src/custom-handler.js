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

(function(scope) {

  var consumeNumber = scope.consumeParenthesised.bind(null, scope.parseNumber);
  var consumeNumberList = scope.consumeRepeated.bind(undefined, consumeNumber, /^/);
  function parseNumberList(string) {
    console.log(string);
    var result = consumeNumberList(string);
    console.log(result);
    if (result && result[1] == '') {
      return result[0];
    }
  }
  var mergeNumberList = scope.mergeNestedRepeated.bind(undefined, scope.mergeNumbers, ' ');

  window.addCustomHandler = function(property, type) {
    switch (type) {
      case 'number':
        scope.addPropertiesHandler(scope.parseNumber, scope.mergeNumbers, [property]);
        return;
      case 'list<number>':
        scope.addPropertiesHandler(parseNumberList, mergeNumberList, [property]);
        return;
    }
  };
})(webAnimationsMinifill);
