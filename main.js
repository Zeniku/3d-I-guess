function loop(f){
  window.requestAnimationFrame(f);
};
let lastZoomVal = 0;
let deltaTime = 0
requestAnimationFrame(
  function loop() {
    now = Date.now();
    deltaTime = (now - before) / (1000 / 60);
    fps = Math.round(1000 / (now - before));
    before = now;
    requestAnimationFrame(loop);
  }
);
let grid = new World()
grid.setGridWorld(0, 0, 0, .1, 2, 0)

function main() {
  
  opera++
  w = innerWidth;
  h = innerHeight;
  canvas.width = w;
  canvas.height = h;
  grid.updateGridPoints(Projector.time)
  Projector.projectWorld(grid)
  Projector.render(grid)
  loop(main)
}

TouchHandler.init()
main()

function set() {
  view += 1
  if (view > 3) {
    view = 0
  }
}