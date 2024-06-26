function craterFunction(n, x, y, centerX, centerY, radius, minDepth) {
  // Calculate distance from center
  let cx = x - centerX,
    cy = y - centerY;
  const distance = Math.sqrt(cx * cx + cy * cy);
  // Normalize distance to range 0 to 1
  let px = ((cx * cx) / radius) - (radius / 2);
  let py = ((cy * cy) / radius) - (radius / 2);
  const normalizedDistance = radius / distance;
  // Crater shape using sine function (adjust amplitude as needed)
  let craterShape = Math.max((px) + (py), -minDepth)
  if (normalizedDistance < 1) craterShape *= normalizedDistance * 0.01
  // Apply crater shape based on distance
  return (craterShape); // Adjust offset as needed
}

function ridge(x, y) {
  return Math.pow((Math.abs(x) * -1) + 1, y)
}

function perlin(x, y, se) {
  let n = 0
  nn = Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2)
  let p1 = Mathf.sin(Math.sqrt(nn))
  let p2 = Mathf.sin(x + se) + Mathf.cos(y + se)
  let p3 = Mathf.sin(se + y)
  let p4 = Mathf.sin(x + y + se)
  let p5 = Mathf.cos(x + y - se)
  n += p5
  n -= p1
  n += ridge(p2, 2)
  n -= p3
  //n += ridge(p4, 2)
  n *= 0.2
  n += craterFunction(n, x, y, 0, 0, 3, 2)
  n -= craterFunction(n, x, y, 0, 0, 1, 0.5)
  return n
}
class World {
  constructor(){
    this.points = []
    this.triangles = []
    this.triangleCol = []
  }
  updateGridPoints(time){
    this.points.forEach(p => {
      p[1] = perlin(p[0], p[2], time * 0.04)
    })
    let zoomV = parseInt(zoom.value)
    if(this.lastZoomVal == zoomV) return 
    this.points = []
    this.triangles = []
    this.triangleCol = []
    this.setGridWorld(0,0,0,.25  * (1 + (parseInt(zoom.value) / 25)), 7 + (Math.floor(parseInt(zoom.value)/ 4)),time * 0.04)
    this.lastZoomVal = zoomV
  }
  setGridPoints(X, Y, Z, stepSize, mp, seed){
  let rowLength = 0
    for (let x = -mp; x <= mp; x += stepSize) {
      rowLength++
      for (let z = -mp; z <= mp; z += stepSize) {
        let y = perlin(x,z,seed)
        this.points.push([(x + X) , (y + Y), (z + Z)]);
      }
    }
    return rowLength
  }
  setGridTriangles(rowLength){
    this.points.forEach((p, i) => {
      if(((i+1) % rowLength) == 0) return
      
      let nextP = this.points[i + 1]
      let nextRowP = this.points[i + rowLength]
      let nextRowP1 = this.points[i + rowLength + 1] 
      if(p == undefined || nextP == undefined || nextRowP == undefined || nextRowP1 == undefined) return 
      this.triangles.push([p, nextP, nextRowP1])
      this.triangles.push([p, nextRowP1, nextRowP])
    })
  }
  setGridWorld(X, Y, Z, stepSize, mapSize, seed){
    this.setGridTriangles(this.setGridPoints(X,Y,Z,stepSize,mapSize, seed))
  }
}
