// Global.js
let canvas = document.querySelector("canvas");

// Change context to WebGL
// Try WebGL 2 first, then fall back to WebGL 1 if it fails
let gl = canvas.getContext("webgl2", { alpha: false }) || 
         canvas.getContext("webgl", { alpha: false }) || 
         canvas.getContext("experimental-webgl");
let global = {}

let w = 0;
let h = 0;
let ax = 0, ay = 0, nx = 0, ny = 0;

// Setup Dimensions
w = innerWidth;
h = innerHeight;
canvas.width = w;
canvas.height = h;



let abs = Math.abs;
let view = 0;
let seed = 0;

let before, now, fps;
before = Date.now();
fps = 0;


function craterFunction(n, x, y, centerX, centerY, radius, minDepth) {
  let cx = x - centerX,
    cy = y - centerY;
  const distance = Math.sqrt(cx * cx + cy * cy);
  let px = ((cx * cx) / radius) - (radius / 2);
  let py = ((cy * cy) / radius) - (radius / 2);
  const normalizedDistance = radius / distance;
  let craterShape = Math.max((px) + (py), -minDepth)
  if (normalizedDistance < 1) craterShape *= normalizedDistance * 0.01
  return (craterShape);
}

function ridge(x, y) {
  return Math.pow((Math.abs(x) * -1) + 1, y)
}
