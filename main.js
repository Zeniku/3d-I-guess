// main.js
// Create Orthographic Matrix for GLDraw (Maps pixels to -1..1 clip space)
// 0,0 is top-left
//let myPlanet = new PlanetBuilder(10.0, 7, -0.3); 

Draw.init(gl);
//Draw.setMatrix(projectionMatrix);
let grid = new TestWorld();
//grid.init()
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

  // 1. Set Orthographic Matrix for 2D UI (0,0 is Top-Left)
  Draw.proj2D = Matrix4.ortho(0, w, h, 0, -1, 1);
  
  // 2. Set Perspective Matrix for 3D World
  let zoomInput = global.zoomv || 70; // Map zoom to FOV
  Draw.proj3D = Matrix4.perspective(zoomInput, w / h, 0.1, 1000.0);
}

function updatePlayerMovement(deltaTime) {
  const speed = 5 + 0.1 * global.yv || 70;;
  
  // 1. Get raw input from joystick
  let moveX = TouchHandler.joystick.inputX; // Strafe
  let moveZ = TouchHandler.joystick.inputZ; // Forward/Back
  TouchHandler.ty = global.yv || 70;

  // 2. Rotate the move vector by the camera's Y-rotation (Yaw)
  // This ensures 'Forward' is always where you are looking
  let cos = Math.cos(TouchHandler.ry);
  let sin = Math.sin(TouchHandler.ry);

  // Apply Rotation Matrix logic
  let worldDX = moveX * cos - moveZ * sin;
  let worldDZ = moveX * sin + moveZ * cos;

  // 3. Apply to camera position
  TouchHandler.tx += worldDX * speed;
  TouchHandler.tz += worldDZ * speed;
}


function main() {
  now = Date.now();
  let dif = now - before;
  fps = Math.round(1000 / (dif || 1));
  deltaTime = dif / (1000 / 60);
  before = now;
  
  

  updatePlayerMovement()

  // Update chunks based on position
  grid.updateGridPoints(TouchHandler.tx, 0, TouchHandler.tz, Projector.time);
  
  // PHASE 1: Renders the 3D World (Uses Draw.begin3D internally)
  //Projector.chunkRender(grid);
  gl.clearColor(135/255, 206/255, 235/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    
    Draw.updateMatrices(w, h)
    //grid.updateGridPoints(TouchHandler.tx, TouchHandler.ty, TouchHandler.tz, Projector.time)
    // Render the 3D World
    Draw.begin3D();
    Projector.chunkRender(grid)
    //myPlanet.render()
    Draw.end(); // Flushes 3D mesh to GPU
  // PHASE 2: Render 2D UI over the top
  Draw.begin2D();
  TouchHandler.drawUI(); 
  // Any other UI elements (stats, buttons, minimap) go here!
  Draw.end();

  requestAnimationFrame(main);
}


window.onload = (e) => {
  let windowPanel = new WindowPanel({
    title: "Vector sliders",
    x: 10, y: 350,
    width: 300 // Slightly widened to accommodate the side labels better
  });
  
  // Refactored using IDs, separated labels, and method chaining
  windowPanel
    .addSlider("lod", "Lod Value", 0, 1, 1, (v) => { global.lodv = v; })
    .addSlider("zoom", "Camera Zoom", 1, 100, 70, (v) => { global.zoomv = v; })
    .addSlider("y", "Y Level", 1, 1000, 20, (v) => {global.yv = v});
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
  //grid.triangleGridColors()
  if (view > 5) {
    view = 0;
  }
}