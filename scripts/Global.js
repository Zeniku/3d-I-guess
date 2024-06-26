let canvas = document.querySelector("canvas");
let draw = canvas.getContext("2d");

let row = 0
let flow = 100
let fliw = -100
let opera = 0

let w = 0;
let h = 0;
let ax = 0,
  ay = 0,
  nx = 0,
  ny = 0;
w = innerWidth;
  h = innerHeight;
  canvas.width = w;
  canvas.height = h;
let abs = Math.abs
let view = 0
let seed = 0

let before, now, fps;
before = Date.now();
fps = 0;