'use strict';
var Generator = function(Test) {
    return function(gridSide, wordList, timeOut){
        this.run = function() {
            var best = 0;
            var grid = [];
            var remainingTime = timeOut;
            var candidateCount = 0;
            var start;
            var candidate;

            while (remainingTime > 0) {
                start = new Date().getTime();
                candidate = new LookbackCreatorJS(gridSide, wordList, remainingTime).run();
                candidateCount++;
                if (candidate.total > best) {
                    best = candidate.total;
                    grid = candidate.grid;
                }
                remainingTime -= (new Date().getTime() - start);
            }

            return {
                candidateCount: candidateCount,
                grid: grid,
                total: best
            };
        };
    };
};

function LookbackCreatorJS(gridSide, wordList, timeOut) {
  // the grid. A simple 2 dim. array
  var result = [];
  // store letter positions for every word inserted.
  var inserted = [];
  // store, for a word, inserted letter positions.
  var positions = [];

  var used = new Set();
  var candidate = null;
  var usedCandidate = null;
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

  /* Returns common substring of word and already inserted words */
  function getSubstrings(word) {
    var substrings = []
    var wordLen = word.length;

    // loop over inserted words
    for (var ii in inserted) {
      var word2 = wordList[ii];
      var word2Len = word2.length;
      for (var i=0; i<word2Len; i++) {
        for (var j=0; j<wordLen; j++) {
          for (var k=0; i+k<word2Len && j+k<wordLen; k++) {
            if (word[j + k] === word2[i + k]) {
              var set = new Set();
              for (var kk=0; kk<=k; kk++) {
                set.add(inserted[ii][i + kk]);
              }
              var pos1 = [];
              for (var kk=0; kk<=k; kk++) {
                pos1.push(inserted[ii][i + kk])
              }

              substrings.push({
                start: inserted[ii][i],
                start_s: getPrefix(word, j + 1),
                end: inserted[ii][i + k],
                end_s: getSuffix(word, j + k),
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

    // Sort by length. Longer substring will be tested first.
    substrings.sort(function(a, b) {
      return b.len - a.len
    })

    return substrings;
  }

  var insertWord = function(word) {
    if (insertUsingSetLetters(word)) {
      return true;
    };
    if (insertClassical(word)) {
      return true;
    };
    return false;
  }

  var insertClassical = function(word){
    var potentialCells = [];
    for (var i=0; i<gridSide; i++) {
      for (var j=0; j<gridSide; j++) {
        if (isFree(i,j)) {
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
  }

  var insertUsingSetLetters = function(word){
    var substrings = getSubstrings(word);
    // try to insert by reusing already set letters.
    // loop over substrings who are sorted desc by length.
    for (var i in substrings) {
      var substring = substrings[i];
      var positions = [];
      used = new Set(substring.used)
      candidate = null
      // insert first part of word
      insertLetter(Math.floor(substring.start / gridSide), substring.start % gridSide, 0, substring.start_s)
      if (candidate !== null) {
        result = clone(candidate)
        used = new Set(usedCandidate)
        positionCandidate.reverse()
        positionCandidate.pop()
        positions = positions.concat(positionCandidate)
        candidate = null
        // insert second part of word
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
    return false;
  }

  // Recursive function. 
  // insert letter into grid, retrieve potential next letter positions
  var insertLetter = function(x, y, index, word) {
    var cellId = getCellId(x,y)
    var old = result[x][y];

    result[x][y] = word[index];
    used.add(cellId);
    positions.push(cellId);

    if (index === word.length - 1) {
      // Word is finished > Candidate found, let's clone it.
      candidate = clone(result);
      usedCandidate = new Set(used);
      positionCandidate = clone(positions);
    } else {
      var potentialPositions = getNextLetterPotentialPositions(x, y, index, word);

      // try the potentialPosition
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

  // Get all the potential positions for the next letter ("promising" ones first)
  var getNextLetterPotentialPositions = function(x, y, index, word){
    var potentialPositions = [];
    var good_ones = [];
    var bad_ones = [];
    for (var i=-1; i<=1; i++) {
      for (var j=-1; j<=1; j++) {
        if (x+i>=0 && y+j>=0 && x+i<gridSide && y+j<gridSide) {
          var ci = x+i;
          var cj = y+j;
          if (result[ci][cj] === word[index + 1] && !used.has(getCellId(ci,cj))) {
            good_ones.push({"i": ci, "j": cj})
          } else if (isFree(ci,cj)) {
            bad_ones.push({"i": ci, "j": cj})
          }
        }
      }
    }

    shuffle(good_ones);
    shuffle(bad_ones);
    potentialPositions = good_ones.concat(bad_ones);

    return potentialPositions 
  }

  var getCellId = function(x, y) {
    return x * gridSide + y;
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

  function isFree(x,y) {
    if (result[x][y] === "-") {
      return true;
    }

    return false;
  }
}
