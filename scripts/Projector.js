function perspective(point){
  let x = point[0];
  let y = point[1];
  let z = point[2];
  let perspective = parseInt(zoom.value)
  if (z + perspective < 0) return [undefined, undefined]
  return [
         x / (z + perspective),
         y / (z + perspective)
     ];
}

function project(p) {
  let perspectivePoint = perspective(p);
  let x = perspectivePoint[0];
  let y = perspectivePoint[1];
  return [
        w * (x - (-2)) / (2 - (-2)),
        h * (1 - (y - (-2)) / (2 - (-2)))
    ];
}
function returnPoints(p, i) {
  let projectedPoint = project(p);
  let x = projectedPoint[0];
  let y = projectedPoint[1];

  return [x, y, p[2]]
}

class Projector {
  static {
    this.time = 0
    this.projectedPoints = []
    this.projectedTriangles = []
    this.renderedtriangleCount = 0
  }
  static pInsideScreen(x, y) {
    return (
      x > 0 && x < w &&
      y > 0 && y < h
    )
  }
  static isBetweenfliwflow(p) {
    return (p[2] <= flow && p[2] >= fliw)
  }
  static checkExistanceT(t){
     return this.checkExistanceT2(t[0], t[1], t[2])
  }
  static checkExistanceT2(p1, p2, p3){
     return (
      (p1 != undefined && p2 != undefined && p3 != undefined) &&
      (this.pInsideScreen(p1[0], p1[1]) || this.pInsideScreen(p2[0], p2[1]) || this.pInsideScreen(p3[0], p3[1])) &&
      (this.isBetweenfliwflow(p1) || this.isBetweenfliwflow(p2) || this.isBetweenfliwflow(p3))
     )
  }
  static projectPoints(world){
    world.points.forEach((p, i) => {
      let j = Mathf.rotateX(p, TouchHandler.rx)
      j = Mathf.rotateY(j, TouchHandler.ry)
      
      this.projectedPoints[i] = returnPoints(j)
    })
  }
  static triangleGridColors(world){
    if(view == 3) {
      world.triangles.forEach((t, i) => {
        let r = 255 - Math.abs(t[0][1] * 100),
        g = 255 - Math.abs(t[1][1] * 100),
        b = 255 - Math.abs(t[2][1] * 100);
        world.triangleCol[i] = `rgb(${r},${g}, ${b})`;
      })
    }
    if(view == 4){
      
    }
  }
  static projectTriangles(world){
    world.triangles.forEach((t, i) => {
      let projectedT = []
      t.forEach(p => {
        let j = Mathf.rotateX(p, TouchHandler.rx) 
         j = Mathf.rotateY(j, TouchHandler.ry)
        let projectedP = returnPoints(j)
        projectedT.push(projectedP)
      })
      projectedT.push(i)
      if(this.ccw(projectedT[1], projectedT[2], projectedT[0]) < 0) return
      if(!this.checkExistanceT(projectedT)) return
      this.projectedTriangles.push(projectedT)
    })
  }
  static renderPoints(){
    this.projectedPoints.forEach(p => {
      if(!(p != undefined && this.pInsideScreen(p[0], p[1]) && this.isBetweenfliwflow(p))) return 
      line(p[0], p[1], p[0] + 1, p[1] + 1)
    })
  }
  static ccw(a, b, c) {
   return ((b[0] - a[0]) * (c[1] - a[1])) - ((c[0] - a[0]) * (b[1] - a[1]));
  }
  
  static renderTriangles(wireframe, world){
    if(!wireframe) {
      this.projectedTriangles.sort((a, b) => {
        let c = (a[0][2] + a[1][2] + a[2][2]) / 3
        let d = (b[0][2] + b[1][2] + b[2][2]) / 3
        return d - c
      })
    }
    
    this.projectedTriangles.forEach(t => {
      
      let tricol = world.triangleCol[t[3]]
      if(view == 2) tricol = undefined 
      this.renderedtriangleCount++
      triangle(t[0], t[1], t[2], tricol, !wireframe, tricol)
    })
  }
  static projectWorld(world){
    if(view == 0) this.projectPoints(world)
    this.triangleGridColors(world)
    if(view != 0) this.projectTriangles(world)
  }
  static render(world){
    //rect(0, 0, w, h, "#87CEEB"); //background
    draw.clearRect(0,0,w,h)
    this.time += deltaTime
    if(view == 0) this.renderPoints()
    if(view != 0) this.renderTriangles((view == 1), world)
    text("renderedTriangles " + this.renderedtriangleCount, 10, 90)
    this.projectedPoints = []
    this.projectedTriangles = []
    this.renderedtriangleCount = 0
    
    text("points " + world.points.length, 10, 30)
    text("FPS " + fps + "    " + Math.floor((fps * 100) / 70) + "% fps ", 10, 50)
    text("opera " + Math.floor(opera / 10) + " seg", 10, 60)
    text("seed " + seed + " ", 10, 70)
    text("ver 0.0.2", w - 60, h - 20)
    text("alpha", w - 60, h - 30)
    
    line(TouchHandler.x, TouchHandler.y, TouchHandler.lx, TouchHandler.ly)
  }
}