'use strict';
var Repeated = function(Test) {
    return function(grid_side, word_list, timeout_ms){
        var start_time = new Date().getTime();
        

        word_list = shuffleArray(word_list);




        this.run = function() {
            var best = 0;
            var grid = [];
            var remaining = timeout_ms;
            var candidates = 0;

            while (remaining > 0) {
                var start = new Date().getTime();
                var candidate = new LookbackCreatorJS(grid_side, word_list, remaining).run();
                candidates++;

                if (candidate.total > best) {
                    best = candidate.total;
                    grid = candidate.grid;
                }
                // subtract elapsed time for this run
                remaining -= (new Date().getTime() - start);
            }

            return {
                "candidates": candidates,
                "grid": grid,
                "total": best
            };
        };
    };
};


function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function LookbackCreatorJS(grid_side, word_list, timeout_ms) {
  var word_list = word_list;
  var grid_side = grid_side;

  var result = [];
  var inserted = [];
  var usati = new Set();
  var candidate = null;
  var usati_candidate = null;
  var positions = [];
  var positions_candidate = [];


  this.run = function() {
    var conta = 0;
    var insert = false;

    //create the raw output
    for (var i1 = 0; i1 < grid_side ; i1++) {
      var row = [];
      for (var i2 = 0; i2 < grid_side ; i2++) {
        row.push("-");
      }
      result.push(row);
    }

    while (conta < word_list.length) {
      if (insertWord(word_list[conta])) {
        conta += 1;
      } else {
        break;
      }
    }

    return {
      "grid": result,
      "total": conta
    };
  }

  function clone(existingArray) {
     var newObj = (existingArray instanceof Array) ? [] : {};
     for (var i3 in existingArray) {
        if (i3 == 'clone') continue;
        if (existingArray[i3] && typeof existingArray[i3] == "object") {
           newObj[i3] = clone(existingArray[i3]);
        } else {
           newObj[i3] = existingArray[i3];
        }
     }
     return newObj;
  }

  function shuffle(array) {
    var m = array.length, t, i4;

    // While there remain elements to shuffle…
    while (m) {

      // Pick a remaining element…
      i4 = Math.floor(Math.random() * m--);

      // And swap it with the current element.
      t = array[m];
      array[m] = array[i4];
      array[i4] = t;
    }

    return array;
  }

  // warning: the result is reversed
  function get_prefix(w, k) {
    var res = "";
    for (var i5=0; i5<k; i5++) {
      res += w[k - i5 - 1];
    }
    return res;
  }

  function get_suffix(w, k) {
    var res2 = "";
    for (var i6=k; i6<w.length; i6++) {
      res2 += w[i6];
    }
    return res2;
  }

  function get_sovrap(w) {
    var result = []

    for (var ii in inserted) {
      var p = word_list[ii];
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
                start_s: get_prefix(w, j + 1),
                end: inserted[ii][i + k],
                end_s: get_suffix(w, j + k),
                len: k + 1,
                usati: set,
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
    var sovrap = get_sovrap(word);
    for (var i in sovrap) {
      var s = sovrap[i];
      var positions = [];

      usati = new Set(s.usati)
      candidate = null
      // insert first part
      insertLetter(Math.floor(s.start / grid_side), s.start % grid_side, 0, s.start_s)
      if (candidate !== null) {
        result = clone(candidate)
        usati = new Set(usati_candidate)
        positions_candidate.reverse()
        positions_candidate.pop()
        positions = positions.concat(positions_candidate)

        candidate = null
        // insert second part
        insertLetter(Math.floor(s.end / grid_side), s.end % grid_side, 0, s.end_s)
        if (candidate !== null) {
          result = clone(candidate)

          positions = positions.concat(s.positions)
          positions_candidate.shift()
          positions = positions.concat(positions_candidate)

          inserted.push(clone(positions))
          return true
        }
      }
    }

    // le sovrapposizioni non hanno aiutato, quindi provo nel modo classico
    // e se non basta nemmeno quello ritorno false

    var pos2 = [];
    for (var i0=0; i0<grid_side; i0++) {
      for (var j0=0; j0<grid_side; j0++) {
        if (result[i0][j0] === "-") {
          pos2.push({"i": i0, "j": j0})
        }
      }
    }

    shuffle(pos2)

    candidate = null
    for (var k0 in pos2) {
      var i11 = pos2[k0].i
      var j11 = pos2[k0].j
      insertLetter(i11, j11, 0, word)
      if (candidate !== null) {
        result = clone(candidate)
        inserted.push(clone(positions_candidate))
        return true
      }
    }
    return false
  }

  var insertLetter = function(x, y, count, word) {
    var old = result[x][y];
    result[x][y] = word[count];
    usati.add(x * grid_side + y);
    positions.push(x * grid_side + y);

    if (count === word.length - 1) {
      // a candidate was found, let's clone it
      candidate = clone(result);
      usati_candidate = new Set(usati);
      positions_candidate = clone(positions);
    } else {
      // list all the positions ("promising" ones first)
      var good_ones = [];
      var bad_ones = [];
      for (var i22=-1; i22<=1; i22++) {
        for (var j22=-1; j22<=1; j22++) {
          if (x+i22>=0 && y+j22>=0 && x+i22<grid_side && y+j22<grid_side) {
            var ci = x+i22;
            var cj = y+j22;
            if (result[ci][cj] === word[count + 1] && !usati.has(ci * grid_side + cj)) {
              good_ones.push({"i": ci, "j": cj})
            } else if (result[ci][cj] === "-") {
              bad_ones.push({"i": ci, "j": cj})
            }
          }
        }
      }

      shuffle(good_ones)
      shuffle(bad_ones)
      var pos = good_ones.concat(bad_ones)

      // try the positions
      for (var k77 in pos) {
        var i88 = pos[k77].i
        var j88 = pos[k77].j
        insertLetter(i88, j88, count + 1, word)
        if (candidate !== null) {
          break
        }
      }
    }

    result[x][y] = old
    usati.delete(x * grid_side + y)
    positions.pop()
  }
}

