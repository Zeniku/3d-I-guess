// main.js
// Create Orthographic Matrix for GLDraw (Maps pixels to -1..1 clip space)
// 0,0 is top-left
let projectionMatrix = new Float32Array([
  2 / w, 0, 0,
  0, -2 / h, 0,
  -1, 1, 1
]);
Draw.init(gl);
Draw.setMatrix(projectionMatrix);
let grid = new World();

/**
 * Handles resizing the canvas and updating the WebGL viewport 
 * and projection matrix to match the new dimensions.
 */
function handleResize() {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;
  gl.viewport(0, 0, w, h);

  // Robust Orthographic Matrix (Top-Left 0,0)
  const mat = new Float32Array([
    2 / w,  0,      0,
    0,     -2 / h,  0,
    -1,     1,      1
  ]);
  
  Draw.setMatrix(mat);
}

function main() {
  // 1. Timing calculations
  now = Date.now();
  let dif = now - before;
  fps = Math.round(1000 / (dif || 1)); // Prevent division by zero
  deltaTime = dif / (1000 / 60);
  before = now;
  
  opera++; // Simulation tick counter

  // 2. Update logic
  grid.updateGridPoints(Projector.time);

  // 3. Render logic
  // Projector.render now handles gl.clear and Draw.begin/end
  Projector.render(grid).reset();

  // 4. Request next frame
  requestAnimationFrame(main);
}

window.onload = (e) => {
  TouchHandler.init();
  //grid.init(0)
  // Initialize dimensions
  handleResize();
  window.addEventListener('resize', handleResize);
  
  // Start the loop
  before = Date.now();
  requestAnimationFrame(main);
};

// Toggle view modes
function set() {
  view += 1;
  Projector.triangleGridColors(grid)
  if (view > 4) {
    view = 0;
  }
}
