// World.js
function perlin(x, y, se) {
  let height = 0;
  height = simplex.noise2d(5, 0.5, 100, x, y)
  let mountains = 0
  mountains = Math.pow(simplex.ridge(5, .5, 100, x, y), 4)
  mountains *= simplex.noise2d(5, .5, 70, x, y)
  height += Mathf.lerp(mountains, height, 0.4)
  return height
}


class TestWorld{
  constructor(){
    this.chunks = []
    
  }
  init(){
    this.chunks = []
    this.setChunkPoints
  }
  triangleGridColors(){
    this.chunks.forEach((c, i)=>{
      c.triangleGridColors()
    })
  }
  
  setChunkPoints(X, Y, Z, stepSize, mp, chunkSize = 1) {
    let rowLength = 0
    let index = 0
    for (let x = -mp; x <= mp; x += chunkSize) {
      rowLength++
      for (let z = -mp; z <= mp; z += chunkSize) {
        let chunk = new Chunk(x + X, Y ,z + Z, chunkSize, index)
        chunk.setChunk(stepSize)
        this.chunks.push(chunk);
        index++
      }
    }
    return rowLength
  }
  setGridPointHeight(seed) {
    this.chunks.forEach(p => {
      p.setGridPointHeight(seed)
    })
  }
    updateGridPoints(x,y,z,time) {
    let zoomInput = parseInt(document.getElementById('zoom').value);
    //if (this.lastZoomVal === zoomInput) return;

    // 1. NORMALIZE ZOOM (0 to 1)
    let t = (zoomInput - 1) / 99; 
    
    // 2. CALCULATE MAP SIZE (Larger when zoomed out)
    let chunkSize = 16;
    let mapSize = chunkSize * (1 + Math.floor(t * 15)); 

    // 3. CALCULATE GLOBAL DETAIL BIAS
    // When t=0 (zoomed in), globalBias is 1.
    // When t=1 (zoomed out), globalBias is 4 (everything is 4x blockier).
    let globalBias = Math.pow(2, Math.floor(t * 3)); 

    this.chunks = [];
    this.setChunkPoints(Math.floor(x), Math.floor(y), Math.floor(z), 1, mapSize, chunkSize); 

    this.chunks.forEach(chunk => {
        // 4. CALCULATE DISTANCE TO CAMERA
        let dx = chunk.x - TouchHandler.tx;
        let dy = chunk.y - TouchHandler.ty;
        let dz = chunk.z - TouchHandler.tz;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // 5. COMBINE DISTANCE + ZOOM BIAS
        let lodStep;
        if (dist < 64) {
            lodStep = 0.5 * globalBias; 
        } else if (dist < 160) {
            lodStep = 2.0 * globalBias;
        } else {
            lodStep = 8.0 * globalBias;
        }

        // 6. SNAP TO SAFE DIVISOR
        // We must ensure the final stepSize is a power of 2 that divides 32 perfectly.
        // Safe: 0.25, 0.5, 1, 2, 4, 8, 16, 32
        lodStep = Math.min(32, Math.pow(2, Math.round(Math.log2(lodStep))));
        if (lodStep < 0.25) lodStep = 0.25;

        chunk.updateGridPoints(time, lodStep);
    });

    this.triangleGridColors();
    this.lastZoomVal = zoomInput;
}
}
class Chunk {
  constructor(x, y, z, size, index){
    this.x = x
    this.y = y
    this.z = z
    this.size = size
    this.triangles = []
    this.trianglesCol = []
    this.points = []
    this.index = index
    //this.setChunk(10)
    this.pointOffset = index * size
  }
  setChunk(stepsize){
    this.setChunkTriangles(this.setChunkPoints(this.x, this.y, this.z, stepsize))
  }
  setChunkPointHeight(seed) {
    this.points.forEach(p => {
      p[1] = perlin(p[0], p[2], seed)
    })
  }
  
  setChunkPoints(X, Y, Z, stepSize) {
    let rowLength = 0
    let index = 0
    let hsize = this.size / 2
    for (let x = -hsize; x <= hsize; x += stepSize) {
      rowLength++
      for (let z = -hsize; z <= hsize; z += stepSize) {
        this.points.push([(x + X), (Y), (z + Z), index]);
        index++
      }
    }
    return rowLength
  }
  
    updateGridPoints(time, stepsize) {
    this.points = [];
    this.triangles = [];
    this.triangleCol = []; // Clears old colors
    
    this.setChunk(stepsize);
    this.setChunkPointHeight(time * 0.04);
  }

  setChunkTriangles(rowLength) {
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
  triangleGridColors() {
    if (view == 3) {
      this.triangles.forEach((t, i) => {
        // Normalize 0-255 to 0.0-1.0 for WebGL
        let r = (255 - Math.abs(t[0][1] * 100)) / 255;
        let g = (255 - Math.abs(t[1][1] * 100)) / 255;
        let b = (255 - Math.abs(t[2][1] * 100)) / 255;
        this.triangleCol[i] = [r, g, b, 1.0];
      });
    }
    if(view == 4){
      // Define a base color for the terrain (e.g., a nice green: R:0.2, G:0.7, B:0.3)
// Define your light direction and pre-normalize it
const lightDir = [0.5, 1.0, 0.3];
const lightMag = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2);
const lX = lightDir[0] / lightMag;
const lY = lightDir[1] / lightMag;
const lZ = lightDir[2] / lightMag;

this.triangles.forEach((t, i) => {
    const v0 = t[0];
    const v1 = t[1];
    const v2 = t[2];

    // 1. Calculate Face Normal (for lighting and steepness)
    const ux = v1[0] - v0[0], uy = v1[1] - v0[1], uz = v1[2] - v0[2];
    const vx = v2[0] - v0[0], vy = v2[1] - v0[1], vz = v2[2] - v0[2];

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;

    const mag = Math.sqrt(nx*nx + ny*ny + nz*nz);
    if (mag > 0) { nx /= mag; ny /= mag; nz /= mag; } else { ny = 1.0; }

    // 2. Calculate Average Height
    // Assuming Y is your up/down axis. If Z is up in your engine, use index [2]
    let avgHeight = (v0[1] + v1[1] + v2[1]) / 3.0;

    // 3. Determine Base Color based on Steepness and Height
    let baseColor;
    
    // Check steepness first. If ny is less than 0.6, it's a steep slope.
    const minHeight = -2.0;
const maxHeight = 2.0;

let baseColors = [
    [0.1, 0.3, 0.8], // Deep Water
    [0.2, 0.6, 0.9],// Shallow Water
    [0.9, 0.8, 0.5], // Sand
    [0.9, 0.8, 0.5], 
    [0.2, 0.7, 0.3], [0.2, 0.7, 0.3], [0.2, 0.7, 0.3], // Grass
    [0.9, 0.9, 0.95] // Snow
];
    // ... (Your existing Normal and avgHeight calculation) ...

    // 2. Normalize height to 0-1 range
    let t_val = (avgHeight - minHeight) / (maxHeight - minHeight);
    
    // 3. Get the interpolated biome color
    baseColor = lerpGradient(t_val, baseColors);

    // 4. Cliff Override (Keep this separate for sharp rock faces)
    // If it's steep (ny < 0.8) and above water (avgHeight > 0)
    if (ny < 0.8 && avgHeight > 0) {
        // Optional: Lerp between the baseColor and Rock for a softer cliff transition
        const rockColor = [0.4, 0.4, 0.42];
        const cliffSeverity = 1.0 - (ny / 3); // 0 at 0.8, 1 at 0.0
        
        baseColor = [
            baseColor[0] + (rockColor[0] - baseColor[0]) * cliffSeverity,
            baseColor[1] + (rockColor[1] - baseColor[1]) * cliffSeverity,
            baseColor[2] + (rockColor[2] - baseColor[2]) * cliffSeverity
        ];
    }
    

    

    // 4. Calculate Lighting (Dot Product)
    let dot = (nx * lX) + (ny * lY) + (nz * lZ);
    let diffuse = Math.max(0, dot);
    const ambient = 0.35; 
    let brightness = ambient + (1.0 - ambient) * diffuse;

    // 5. Apply lighting to the chosen base color
    let r = baseColor[0] * brightness;
    let g = baseColor[1] * brightness;
    let b = baseColor[2] * brightness;

    this.triangleCol[i] = [r, g, b, 1.0];
});

    }
  }
}