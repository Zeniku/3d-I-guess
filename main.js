function loop(f){
  window.requestAnimationFrame(f);
};
let lastZoomVal = 0;
let deltaTime = 0
requestAnimationFrame(
  function loop() {
    now = Date.now();
    let dif = now - before
    fps = Math.round(1000 / dif);
    deltaTime =  dif / (1000 / 60);
    before = now;
    requestAnimationFrame(loop);
  }
);
let grid = new World()
function main() {
  
  opera++
  w = innerWidth;
  h = innerHeight;
  canvas.width = w;
  canvas.height = h;
  grid.updateGridPoints(Projector.time)
  Projector.render(grid).reset()
  loop(main)
}
window.onload = e => {
  TouchHandler.init()
  main()
}

function set() {
  view += 1
  if (view > 3) {
    view = 0
  }
}