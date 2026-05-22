// World.js
function smoothMax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}
function smoothMin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function steppedColor(t, colors) {
    // Clamp t between 0 and 1
    t = Math.max(0, Math.min(1, t));
    
    // Find the exact index without blending
    const segmentCount = colors.length - 1;
    let index = Math.floor(t * (segmentCount + 1)); 
    
    // Make sure we don't go out of bounds
    if (index > segmentCount) index = segmentCount;

    // Return the exact color, no math mixing!
    return [
        colors[index][0],
        colors[index][1],
        colors[index][2]
    ];
}


function perlin(x, y, se) {
  let height = 0;
  let watv = parseInt(document.getElementById('water').value) || 1;
  let mask = Mathf.clamp(1 - simplex.noise2d(4, 0.5, 100, x, y) * 3)
  height = simplex.noise2d(4, 0.5, 50, x, y)
  let water = smoothMin(height, -watv, 0.5)
  let mountains = 0
  mountains = Math.pow(simplex.ridge(4, 0.5, 40, x, y) * 2, 2)
  let res = smoothMax(mountains * (mask), simplex.noise2d(4, 0.5, 30, x, y), 0.5)
  return height + res + water + 1
}

function getTerrainNormal(x, z, seed) {
    const eps = 0.1; // A small offset to check the slope
    
    // Sample the noise function slightly around our exact point
    // Note: your perlin function uses the 2nd argument as the Z axis
    let hL = perlin(x - eps, z, seed);
    let hR = perlin(x + eps, z, seed);
    let hD = perlin(x, z - eps, seed);
    let hU = perlin(x, z + eps, seed);

    // Calculate the slope vectors
    let nx = hL - hR;
    let ny = eps * 2.0; 
    let nz = hD - hU;

    // Normalize the vector
    let mag = Math.sqrt(nx*nx + ny*ny + nz*nz);
    return [nx / mag, ny / mag, nz / mag];
}


class World{
  
}





class TestWorld{
  constructor(){
    this.chunks = []
    
  }
  init(){
    this.chunks = []
  }
    // Inside TestWorld class:
  pointGridColors() {
    this.chunks.forEach((c) => {
      c.pointGridColors();
    });
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
  
  updateGridPoints(camX, y, camZ, time) {
    let zoomInput = parseInt(document.getElementById('zoom').value) || 1;
    let watv = parseInt(document.getElementById('water').value) || 1;
    let lodv = Math.floor(parseInt(document.getElementById('lodScale').value)) || 1;
    
    let update = true
    let t = (zoomInput - 1) / 99; 
    let chunkSize = 32;
    let mapSize = chunkSize * (4 - Math.floor(t)); 

    // 1. THE FIX: Snap the origin to the chunk grid
    // This forces chunks to only spawn at global grid intervals (0, 64, 128...)
    let snappedX = Math.floor(camX / chunkSize) * chunkSize;
    let snappedZ = Math.floor(camZ / chunkSize) * chunkSize;

    // 2. PERFORMANCE CHECK: Only rebuild the arrays if we cross a chunk boundary
    
    //console.log(snappedX, snappedZ, this.lastSnappedX, this.lastSnappedZ, this.lastSnappedX == snappedX,this.lastSnappedZ == snappedZ )
    if (this.lastSnappedX == snappedX &&
        this.lastSnappedZ == snappedZ) update = false
    if (watv == this.lastWatv) update = true
    this.lastWatv = watv
    this.lastZoomVal = zoomInput;
    once = 0
    if(!update) return
    this.chunks = [];
    
    // 3. Pass the SNAPPED coordinates, not the raw camera coordinates
    this.setChunkPoints(snappedX, y, snappedZ, 1, mapSize, chunkSize); 

    this.chunks.forEach(chunk => {
        // Use raw camX/camZ here so LOD updates smoothly based on exact distance
        let dx = chunk.x - camX;
        let dy = chunk.y - TouchHandler.ty;
        let dz = chunk.z - camZ;
        let dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

        let lodStep;
        if (dist < 64 / lodv) {
            lodStep = 0.5; 
        } else if(dist < 96 / lodv){
          lodStep = 1
        } else if (dist < 160 / lodv) {
            lodStep = 2.0;
        } else {
            lodStep = 8.0;
        }

        lodStep = Math.min(32, Math.pow(2, Math.round(Math.log2(lodStep))));
        if (lodStep < 0.0625) lodStep = 0.0625;

        chunk.updateGridPoints(time, lodStep);
    });
    this.pointGridColors();
    //this.triangleGridColors();
    
    this.lastSnappedX = snappedX;
    this.lastSnappedZ = snappedZ;
    // Save the current state
    
    
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
    this.pointOffset = index 
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
  updateGridPoints(time, stepsize) {
    this.points = [];
    this.triangles = [];
    this.triangleCol = []; 
    
    // SAVE THE SEED for the normal calculation later
    this.seed = time * 0.04; 
    
    this.setChunk(stepsize);
    this.setChunkPointHeight(this.seed);
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
    pointGridColors() {
    if (view == 3) {
      this.pointCol = [];
      this.points.forEach((p, i) => {
        let r = (255 - Math.abs(p[1] * 255)) / 255;
        this.pointCol[i] = [r, r, r, 1];
      });
      return;
    }

        if (view == 4) {
      const lightDir = [0.5, 1.0, 0.3];
      const lightMag = Math.sqrt(lightDir[0]**2 + lightDir[1]**2 + lightDir[2]**2);
      const lX = lightDir[0] / lightMag;
      const lY = lightDir[1] / lightMag;
      const lZ = lightDir[2] / lightMag;

      const minHeight = -1.0;
      const maxHeight = 2.0;

      let baseColors = [
        [0.1, 0.3, 0.8], [0.2, 0.6, 0.9], [0.2, 0.6, 0.9],
        [0.9, 0.8, 0.5], [0.9, 0.8, 0.5], 
        [0.2, 0.7, 0.3], [0.2, 0.7, 0.3], [0.2, 0.7, 0.3], 
        [0.9, 0.9, 0.95]
      ];

      this.pointCol = [];

      // Loop through points and calculate lighting directly from the noise!
      this.points.forEach((p, i) => {
        let x = p[0];
        let height = p[1];
        let z = p[2];

        // 1. Get the perfect normal directly from the math
        let normal = getTerrainNormal(x, z, this.seed);
        let nx = normal[0];
        let ny = normal[1];
        let nz = normal[2];

        // 2. Base Color & Biome
        let t_val = (height - minHeight) / (maxHeight - minHeight);
        let baseColor = steppedColor(t_val, baseColors);

        // 3. Cliff Override
        if (ny < 0.8 && height > 0) {
          const rockColor = [0.4, 0.4, 0.42];
          const cliffSeverity = 1.0 - (ny / 5); 
          baseColor = [
            baseColor[0] + (rockColor[0] - baseColor[0]) * cliffSeverity,
            baseColor[1] + (rockColor[1] - baseColor[1]) * cliffSeverity,
            baseColor[2] + (rockColor[2] - baseColor[2]) * cliffSeverity
          ];
        }

        // 4. Lighting Calculation
        let dot = (nx * lX) + (ny * lY) + (nz * lZ);
        let diffuse = Math.max(0, dot);
        const ambient = 0.35; 
        let brightness = ambient + (1.0 - ambient) * diffuse;

        this.pointCol[i] = [
          baseColor[0] * brightness, 
          baseColor[1] * brightness, 
          baseColor[2] * brightness, 
          1.0
        ];
      });
    }

            if (view == 5) {
      this.pointCol = [];

      this.points.forEach((p, i) => {
        let x = p[0];
        let z = p[2];

        // 1. Get the analytical normal from the noise (Chunk-independent!)
        let normal = getTerrainNormal(x, z, this.seed);
        let nx = normal[0];
        let ny = normal[1];
        let nz = normal[2];

        // 2. Map the [-1, 1] range to the [0, 1] color range
        // This is the standard "Tangent Space" normal map coloring
        let r = (nx + 1.0) * 0.5;
        let g = (ny + 1.0) * 0.5;
        let b = (nz + 1.0) * 0.5;

        // X (Left/Right) -> Red
        // Y (Up/Down)    -> Green
        // Z (Forward/Back)-> Blue
        this.pointCol[i] = [r, g, b, 1.0];
      });
    }


  }

  triangleGridColors() {
    if (view == 3) {
      this.triangles.forEach((t, i) => {
        // Normalize 0-255 to 0.0-1.0 for WebGL
        let r = (255 - Math.abs(t[0][1] * 255))/255;
        let g = (255 - Math.abs(t[1][1] * 255))/255;
        let b = (255 - Math.abs(t[2][1] * 255))/255;
        this.triangleCol[i] = [r, g, b, 1];
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
    const minHeight = -1.0;
const maxHeight = 1.0;

let baseColors = [
    [0.1, 0.3, 0.8], // Deep Water
    [0.2, 0.6, 0.9], // Shallow Water
    [0.2, 0.6, 0.9],
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
        const cliffSeverity = 1.0 - (ny / 1.5); // 0 at 0.8, 1 at 0.0
        
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
console.log("world")