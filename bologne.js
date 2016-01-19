'use strict';
var Generator = function(Test) {
    return function(gridSide, wordList, timeOut){
        this.run = function() {
            var best = 0;
            var grid = [];
            var remainingTime = timeOut;
            var candidateCount = 0;

            while (remainingTime > 0) {
                var start = new Date().getTime();
                wordList = shuffleArray(wordList);
                var candidate = new LookbackCreatorJS(gridSide, wordList, remainingTime).run();
                candidateCount++;
                if (candidate.total > best) {
                    best = candidate.total;
                    grid = candidate.grid;
                }
                remainingTime -= (new Date().getTime() - start);
            }

            return {
                "candidateCount": candidateCount,
                "grid": grid,
                "total": best
            };
        };
    };
};


function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = array[i];
        array[i] = array[j];
        array[j] = tmp;
    }
    return array;
}

function LookbackCreatorJS(gridSide, wordList, timeOut) {
  var wordList = wordList;
  var gridSide = gridSide;

  var result = [];
  var inserted = [];
  var used = new Set();
  var candidate = null;
  var usedCandidate = null;
  var positions = [];
  var positionCandidate = [];


  this.run = function() {
    var insertedWordCount = 0;
    var insert = false;

    // Initialize grid
    for (var i = 0; i < gridSide ; i++) {
      var row = [];
      for (var j = 0; j < gridSide ; j++) {
        row.push("-");
      }
      result.push(row);
    }

    // loop over word to insert them
    while (insertedWordCount < wordList.length) {
      if (insertWord(wordList[insertedWordCount])) {
        insertedWordCount += 1;
      } else {
        break;
      }
    }

    return {
      "grid": result,
      "total": insertedWordCount
    };
  }

  function clone(array) {
     var newObj = (array instanceof Array) ? [] : {};
     for (var i in array) {
        if (i == 'clone') continue;
        if (array[i] && typeof array[i] == "object") {
           newObj[i] = clone(array[i]);
        } else {
           newObj[i] = array[i];
        }
     }
     return newObj;
  }

  function shuffle(array) {
    var m = array.length, t, i;
    while (m) {
      i = Math.floor(Math.random() * m--);
      t = array[m];
      array[m] = array[i];
      array[i] = t;
    }

    return array;
  }

    // warning: the result is reversed
    function getPrefix(word, k) {
      var prefix = "";
      for (var i=0; i<k; i++) {
        prefix += word[k - i - 1];
      }

      return prefix;
    }

  function getSuffix(word, k) {
    var suffix = "";
    for (var i=k; i<word.length; i++) {
      suffix += word[i];
    }

    return suffix;
  }

  function getSubstrings(w) {
    var result = []

    for (var ii in inserted) {
      var p = wordList[ii];
      // find all common substrings of word "w" and word "p"
      for (var i=0; i<p.length; i++) {
        for (var j=0; j<w.length; j++) {
          for (var k=0; i+k<p.length && j+k<w.length; k++) {
            if (w[j + k] === p[i + k]) {
              var set = new Set();
              for (var kk=0; kk<=k; kk++) {
                set.add(inserted[ii][i + kk]);
              }
              var pos1 = [];
              for (var kk=0; kk<=k; kk++) {
                pos1.push(inserted[ii][i + kk])
              }

              // new candidate
              result.push({
                start: inserted[ii][i],
                start_s: getPrefix(w, j + 1),
                end: inserted[ii][i + k],
                end_s: getSuffix(w, j + k),
                len: k + 1,
                used: set,
                positions: pos1
              })
            } else {
              break
            }
          }
        }
      }
    }

    // sort by length
    result.sort(function(a, b) {
      return b.len - a.len
    })

    return result;
  }

  var insertWord = function(word) {
    var substrings = getSubstrings(word);
    for (var i in substrings) {
      var substring = substrings[i];
      var positions = [];

      used = new Set(substring.used)
      candidate = null
      // insert first part
      insertLetter(Math.floor(substring.start / gridSide), substring.start % gridSide, 0, substring.start_s)
      if (candidate !== null) {
        result = clone(candidate)
        used = new Set(usedCandidate)
        positionCandidate.reverse()
        positionCandidate.pop()
        positions = positions.concat(positionCandidate)
        candidate = null
        // insert second part
        insertLetter(Math.floor(substring.end / gridSide), substring.end % gridSide, 0, substring.end_s)
        if (candidate !== null) {
          result = clone(candidate)
          positions = positions.concat(substring.positions)
          positionCandidate.shift()
          positions = positions.concat(positionCandidate)
          inserted.push(clone(positions))
          return true
        }
      }
    }

    // insert word without existing substring
    var potentialCells = [];
    for (var i=0; i<gridSide; i++) {
      for (var j=0; j<gridSide; j++) {
        if (result[i][j] === "-") {
          potentialCells.push({"i": i, "j": j})
        }
      }
    }
    shuffle(potentialCells);

    candidate = null
    for (var k in potentialCells) {
      var i = potentialCells[k].i
      var j = potentialCells[k].j
      insertLetter(i, j, 0, word)
      if (candidate !== null) {
        result = clone(candidate)
        inserted.push(clone(positionCandidate))
        return true
      }
    }
    return false
  }

  var insertLetter = function(x, y, index, word) {
    var cellId = getCellId(x,y)
    var old = result[x][y];

    result[x][y] = word[index];
    used.add(cellId);
    positions.push(cellId);

    if (index === word.length - 1) {
      // a candidate was found, let's clone it
      candidate = clone(result);
      usedCandidate = new Set(used);
      positionCandidate = clone(positions);
    } else {
      // list all the positions ("promising" ones first)
      var good_ones = [];
      var bad_ones = [];
      for (var i=-1; i<=1; i++) {
        for (var j=-1; j<=1; j++) {
          if (x+i>=0 && y+j>=0 && x+i<gridSide && y+j<gridSide) {
            var ci = x+i;
            var cj = y+j;
            if (result[ci][cj] === word[index + 1] && !used.has(getCellId(ci,cj))) {
              good_ones.push({"i": ci, "j": cj})
            } else if (result[ci][cj] === "-") {
              bad_ones.push({"i": ci, "j": cj})
            }
          }
        }
      }

      shuffle(good_ones);
      shuffle(bad_ones);
      var potentialPositions = good_ones.concat(bad_ones);

      // try the potentialPositionsitions
      for (var k in potentialPositions) {
        var i = potentialPositions[k].i;
        var j = potentialPositions[k].j;
        insertLetter(i, j, index + 1, word);
        if (candidate !== null) {
          break;
        }
      }
    }

    result[x][y] = old;
    used.delete(cellId);
    positions.pop();
  }

  var getCellId = function(x, y) {
    return x * gridSide + y;
  }

}

