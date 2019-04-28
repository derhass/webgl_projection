var createX = function(x) {
  var mx = x;

  return {
    getX: function() {
      return mx;
    },
  }
}

var xs = [];

for(var i = 0; i < 10; i++) {
  xs.push(createX(i));
}

console.log('xs:');
for(var i = 0; i < 10; i++) {
  console.log(xs[i].getX());
}

//###############################

var createY = function(y) {
  return (function() {
    var my = y;

    return {
      getY: function() {
        return my;
      }
    }
  })();
}

var ys = [];

for(var i = 0; i < 10; i++) {
  ys.push(createY(i));
}

console.log('ys:');
for(var i = 0; i < 10; i++) {
  console.log(ys[i].getY());
}
