// World.js
function perlin(x, y, se) {
  let height = 0;
  height = simplex.noise2d(5, 0.5, 100, x, y)
  let mountains = Math.pow(simplex.ridge(5, .5, 100, x, y),3)
  mountains *= simplex.noise2d(4, .5,70, x, y)
  height += mountains
  return height
}

class World {
  constructor() {
    this.points = []
    this.triangles = []
    this.triangleCol = []
    this.lastZoomVal = 0
  }
  init(time){
    this.points = []
    this.triangles = []
    this.triangleCol = []
    this.setGridWorld(0, 0, 0, .25 * (1 + (parseInt(zoom.value) / 10)), 7 + (Math.floor(parseInt(zoom.value) / 0.5)), time * 0.04)
    this.setGridPointHeight(time * 0.04)
    Projector.triangleGridColors(this);
  }
  updateGridPoints(time) {
    //this.setGridPointHeight(time * 0.04)
    let zoomV = parseInt(zoom.value)
    if (this.lastZoomVal == zoomV) return
    this.points = []
    this.triangles = []
    this.triangleCol = []
    this.setGridWorld(0, 0, 0, .25 * (1 + (parseInt(zoom.value) / 10)), 7 + (Math.floor(parseInt(zoom.value) / 0.5)), time * 0.04)
    this.setGridPointHeight(time * 0.04)
    Projector.triangleGridColors(this);
    this.lastZoomVal = zoomV
  }

  setGridPointHeight(seed) {
    this.points.forEach(p => {
      p[1] = perlin(p[0], p[2], seed)
    })
  }

  setGridPoints(X, Y, Z, stepSize, mp) {
    let rowLength = 0
    for (let x = -mp; x <= mp; x += stepSize) {
      rowLength++
      for (let z = -mp; z <= mp; z += stepSize) {
        this.points.push([(x + X), (Y), (z + Z)]);
      }
    }
    return rowLength
  }

  setGridTriangles(rowLength) {
    this.points.forEach((p, i) => {
      if (((i + 1) % rowLength) == 0) return

      let nextP = this.points[i + 1]
      let nextRowP = this.points[i + rowLength]
      let nextRowP1 = this.points[i + rowLength + 1]
      if (p == undefined || nextP == undefined || nextRowP == undefined || nextRowP1 == undefined) return
      this.triangles.push([p, nextP, nextRowP1])
      this.triangles.push([p, nextRowP1, nextRowP])
    })
  }

  setGridWorld(X, Y, Z, stepSize, mapSize, seed) {
    this.setGridTriangles(this.setGridPoints(X, Y, Z, stepSize, mapSize, seed))
  }
}
