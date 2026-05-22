function smoothMax(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
}
function smoothMin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
function smoothClamp(value, min = 0, max = 1, t = 0.5) {
    return smoothMax(smoothMin(value, max, 0.5), min, 0.5);
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


function perlin(x, y, seed) {
    // 1. BASE TERRAIN (The "Foundation")
    // Use a very smooth, low-frequency noise for the general "land vs sea"
    let warp = simplex.noise2d(4, 0.5, 500, x + 100, y + 100); 
    let warpX = x + warp * 50
    let warpY = y + warp * 50
    let baseHeight = simplex.noise2d(4, 0.5, 500, warpX, warpY); 
    let mask = smoothClamp(simplex.noise2d(6, 0.5, 200, warpX, warpY)) 
    // 2. MOUNTAIN FEATURES (The "Detail")
    // Use ridge noise for the sharp bits
    let ridge1 = simplex.ridge(4, 0.5, 500, x, y);
    let ridge2 = simplex.ridge(6, 0.5, 100, x, y);
    // Lague's Trick: Raise to a power to make valleys flat and peaks sharp
    let mountainHeight = Math.max(0, ridge1 * 0.6 + ridge2 * 0.4) * 200;

    // 3. MASKING
    // Only allow mountains to appear where the base height is already high (above sea level)
    let mountainMask = smoothMax(0, baseHeight, 0.2); 
    let oceanMask = smoothMin(0, baseHeight, 0.2)
    
    // Final Composition
    let finalHeight = baseHeight + (mountainHeight * mountainMask * mask * mask);

    // 4. WATER LEVEL (The Lague Way)
    // Instead of smoothMin, we just clamp or handle it in the renderer
    // But for a single value return:
    let waterLevel = 2 * oceanMask;
    return (finalHeight + waterLevel)
}

function getTerrainNormal(x, z, seed, waterLevel) {
    const eps = 0.1;
    let hL = perlin(x - eps, z, seed, waterLevel);
    let hR = perlin(x + eps, z, seed, waterLevel);
    let hD = perlin(x, z - eps, seed, waterLevel);
    let hU = perlin(x, z + eps, seed, waterLevel);

    let nx = hL - hR;
    let ny = eps * 2.0; 
    let nz = hD - hU;

    // Normalize the vector
    let mag = Math.sqrt(nx*nx + ny*ny + nz*nz);
    return [nx / mag, ny / mag, nz / mag];
}


class Chunk {
  constructor(x, y, z, size) {
this.x = x;
    this.y = y;
    this.z = z;
    this.size = size;
    
    this.lodCache = {}; 
    this.positions = null;
    this.colors = null;
    this.indices = null;
    this.currentLod = null; 
    this.normals = null; // New storage for raw normals
  }

  buildMesh(stepSize, waterLevel, seed) {
    if (this.currentLod === stepSize) return; 
    
    if (this.lodCache[stepSize]) {
      const cached = this.lodCache[stepSize];
      this.positions = cached.positions;
      this.colors = cached.colors;
      this.normals = cached.normals; // Retrieve normals from cache
      this.indices = cached.indices;
      this.currentLod = stepSize;
      return;
    }

    const pointsPerRow = Math.floor(this.size / stepSize) + 1;
    const vCount = pointsPerRow * pointsPerRow;
    
    this.positions = new Float32Array(vCount * 3);
    this.colors = new Float32Array(vCount * 3);
    this.normals = new Float32Array(vCount * 3); // Initialize normals array
    
    let vIdx = 0;
    const hsize = this.size / 2;
    for (let xOffset = -hsize; xOffset <= hsize; xOffset += stepSize) {
      for (let zOffset = -hsize; zOffset <= hsize; zOffset += stepSize) {
        const px = xOffset + this.x;
        const pz = zOffset + this.z;

        const h = perlin(px, pz, seed, waterLevel);
        const normal = getTerrainNormal(px, pz, seed, waterLevel);
        
        // NEW: Get raw color without light math
        const color = this.getRawBiomeColor(h, normal[1], waterLevel);

        const i3 = vIdx * 3;
        // Position
        this.positions[i3] = px;
        this.positions[i3 + 1] = h;
        this.positions[i3 + 2] = pz;

        // Normal (Raw - to be used by Shader)
        this.normals[i3] = normal[0];
        this.normals[i3 + 1] = normal[1];
        this.normals[i3 + 2] = normal[2];

        // Color (Raw - no lighting applied)
        this.colors[i3] = color[0];
        this.colors[i3 + 1] = color[1];
        this.colors[i3 + 2] = color[2];
        
        vIdx++;
      }
    }

    // Index buffer generation remains the same
    const numSquares = pointsPerRow - 1;
    this.indices = new Uint32Array(numSquares * numSquares * 6);
    let iIdx = 0;
    for (let r = 0; r < numSquares; r++) {
      for (let c = 0; c < numSquares; c++) {
        let row1 = r * pointsPerRow;
        let row2 = (r + 1) * pointsPerRow;
        this.indices[iIdx++] = row1 + c;
        this.indices[iIdx++] = row1 + c + 1;
        this.indices[iIdx++] = row2 + c + 1;
        this.indices[iIdx++] = row1 + c;
        this.indices[iIdx++] = row2 + c + 1;
        this.indices[iIdx++] = row2 + c;
      }
    }
    
    this.lodCache[stepSize] = {
      positions: this.positions,
      colors: this.colors,
      normals: this.normals, // Cache the normals too
      indices: this.indices
    };
  }

  // Simplified: Only determines base texture/biome
  getRawBiomeColor(height, ny, waterLevel) {
    // Normalize height to 0–1
    let h = (height + 1) * 0.5;

    // --- DEFINE BIOME COLORS ---
    const deepWater = [0.1, 0.3, 0.8];
    const shallowWater = [0.2, 0.6, 0.9];
    const sand = [0.9, 0.8, 0.5];
    const grass = [0.2, 0.7, 0.3];
    const rock = [0.4, 0.4, 0.42];
    const snow = [0.9, 0.9, 0.95];

    // --- SMOOTH INTERPOLATION FUNCTION ---
    function lerp(a, b, t) {
        return [
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t,
            a[2] + (b[2] - a[2]) * t
        ];
    }

    function smoothstep(edge0, edge1, x) {
        let t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }

    let color;

    // --- BIOME BLENDING ---
    if (h < 0.3) {
        // Deep → shallow water
        let t = smoothstep(0.0, 0.3, h);
        color = lerp(deepWater, shallowWater, t);

    } else if (h < 0.4) {
        // Shallow water → sand
        let t = smoothstep(0.3, 0.4, h);
        color = lerp(shallowWater, sand, t);

    } else if (h < 0.7) {
        // Sand → grass
        let t = smoothstep(0.4, 0.7, h);
        color = lerp(sand, grass, t);

    } else if (h < 0.9) {
        // Grass → rock
        let t = smoothstep(0.7, 0.9, h);
        color = lerp(grass, rock, t);

    } else {
        // Rock → snow
        let t = smoothstep(0.9, 1.0, h);
        color = lerp(rock, snow, t);
    }

    // --- CLIFF OVERRIDE (based on slope) ---
    if (ny < 0.8 && height > waterLevel) {
        let cliff = smoothstep(0.8, 0.3, ny); // smoother falloff
        color = lerp(color, rock, cliff);
    }

    return color;
}
}
