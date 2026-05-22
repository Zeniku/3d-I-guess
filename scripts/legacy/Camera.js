class Camera{
  constructor(x, y, z){
    this.x = x;
    this.y = y;
    this.z = z;
  }
  move(axis, speed){
    this[axis] += speed
  }
  perspective(point){
    let x = point[0];
    let y = point[1];
    let z = point[2];
    let perspective = parseInt(zoom.value)
    if ((z - this.z) + perspective < 0) return [undefined, undefined]
    return [
      x + this.x / (z - this.z) + perspective,
      y + this.y / (z - this.z) + perspective
    ];
  }
  project(p) {
    let perspectivePoint = this.perspective(p);
    let x = perspectivePoint[0];
    let y = perspectivePoint[1];
    return [
      w * (x - (-2)) / (2 - (-2)),
      h * (1 - (y - (-2)) / (2 - (-2)))
    ];
  }
  returnPoints(p, i) {
    let projectedPoint = this.project(p);
    let x = projectedPoint[0];
    let y = projectedPoint[1];
  
    return [x, y, p[2]]
  }
}