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
let grid = new TestWorld();
grid.init()
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
  
  
moveJoy.update(currentTouches, h);

// 2. Define your rotation angle (Yaw)
const angleX = TouchHandler.rx;
//const angleY = TouchHandler.ry;
const speed = 0.4 * deltaTime;

// 3. Rotate the joystick vector
// We calculate how much of the "Push" goes into World-X and World-Z
// Note: If movement feels 'flipped', change the signs (+/-) below.
let dx = (moveJoy.inputX * Math.cos(angleX)) + (moveJoy.inputZ * Math.sin(angleX));
let dz = (moveJoy.inputZ * Math.cos(angleX)) - (moveJoy.inputX * Math.sin(angleX));

// 4. Update the Camera Position
TouchHandler.tx += dx * speed;
TouchHandler.tz += dz * speed;
// 3. Render 3D World (This calls projectPoints, which now applies tx and tz!)
grid.updateGridPoints(TouchHandler.tx,0,TouchHandler.tz,Projector.time);
Projector.chunkRender(grid).reset();

// 4. Render UI
Draw.begin();
moveJoy.draw();
Draw.end();

  //requestAnimationFrame(main);
  // 2. Update logic
  

  // 3. Render logic
  // Projector.render now handles gl.clear and Draw.begin/end
  //Projector.render(grid).reset();

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
  grid.triangleGridColors()
  if (view > 4) {
    view = 0;
  }
}
// Inside your requestAnimationFrame loop in main.js:

// 1. Get Joystick Input

// 1. Get the joystick input

