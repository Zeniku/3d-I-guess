function packNormalOct(n) {
    // 1. Project onto the L1-norm (octahedron)
    let invL1 = 1.0 / (Math.abs(n[0]) + Math.abs(n[1]) + Math.abs(n[2]));
    let x = n[0] * invL1;
    let z = n[2] * invL1; // Use Z as horizontal for terrain

    // 2. Handle the bottom hemisphere (if ny < 0)
    if (n[1] < 0) {
        let tx = x;
        let tz = z;
        x = (1.0 - Math.abs(tz)) * (tx >= 0 ? 1.0 : -1.0);
        z = (1.0 - Math.abs(tx)) * (tz >= 0 ? 1.0 : -1.0);
    }

    // 3. Map from [-1, 1] to [0, 1]
    return [x * 0.5 + 0.5, z * 0.5 + 0.5];
}

let once = 0
class Projector {
  static {
    this.time = 0;
    this.projectedPoints = [];
    this.projectedTriangles = [];
    this.projectedChunks = [];
    this.renderedtriangleCount = 0;
  }
  
  static frustumPlanes = [];

  /**
   * Extracts the 6 planes of the frustum from the Projection * View matrix.
   * We run this once per frame before culling.
   */
  static updateFrustumPlanes() {
    // Get the combined matrix (Matches your shader logic)
    const m = Draw.proj3D; 

    // 2. Safety Check: If it's undefined, don't run yet
    if (!m) {
        console.warn("Frustum matrix not found. Skipping culling for this frame.");
        return;
    }

    const planes = new Float32Array(24);
    // Left Plane
    planes[0] = m[3] + m[0]; planes[1] = m[7] + m[4]; planes[2] = m[11] + m[8]; planes[3] = m[15] + m[12];
    // Right Plane
    planes[4] = m[3] - m[0]; planes[5] = m[7] - m[4]; planes[6] = m[11] - m[8]; planes[7] = m[15] - m[12];
    // Bottom Plane
    planes[8] = m[3] + m[1]; planes[9] = m[7] + m[5]; planes[10] = m[11] + m[9]; planes[11] = m[15] + m[13];
    // Top Plane
    planes[12] = m[3] - m[1]; planes[13] = m[7] - m[5]; planes[14] = m[11] - m[9]; planes[15] = m[15] - m[13];
    // Near Plane
    planes[16] = m[3] + m[2]; planes[17] = m[7] + m[6]; planes[18] = m[11] + m[10]; planes[19] = m[15] + m[14];
    // Far Plane
    planes[20] = m[3] - m[2]; planes[21] = m[7] - m[6]; planes[22] = m[11] - m[10]; planes[23] = m[15] - m[14];

    // Normalize planes
    for (let i = 0; i < 24; i += 4) {
      let length = Math.sqrt(planes[i]**2 + planes[i+1]**2 + planes[i+2]**2);
      planes[i] /= length; planes[i+1] /= length; planes[i+2] /= length; planes[i+3] /= length;
    }
    this.frustumPlanes = planes;
  }

  static isChunkInFrustum(chunk) {
    const px = chunk.x, py = chunk.y, pz = chunk.z;
    // Radius should cover the 3D diagonal of the chunk
    // For 32x32 terrain with potential height variance, 45 is safer.
    const radius = chunk.size * 1.4; 

    for (let i = 0; i < 24; i += 4) {
      // Distance from sphere center to plane: (Normal dot Center) + D
      const dist = this.frustumPlanes[i] * px + 
                   this.frustumPlanes[i+1] * py + 
                   this.frustumPlanes[i+2] * pz + 
                   this.frustumPlanes[i+3];
      
      // If distance is less than negative radius, it's fully behind this plane
      if (dist < -radius) return false;
    }
    return true;
  }

  static projectChunks(world) {
    this.projectedChunks = [];
    this.updateFrustumPlanes(); // Extract planes once per frame

    for (let chunk of world.chunks.values()) {
        if (this.isChunkInFrustum(chunk)) {
            this.projectedChunks.push(chunk);
        }
    }
  }




  
    
    
static renderTriangles(world) {
  this.projectedChunks.forEach(chunk => {
    const { indices, positions, colors, normals } = chunk;

    for (let i = 0; i < indices.length; i += 3) {
      let i0 = indices[i];
      let i1 = indices[i+1];
      let i2 = indices[i+2];
      Draw.batch.ensureCapacity(3);
      
      // Push Vertex with Normal
      Draw.batch.push(
          positions[i0*3], positions[i0*3+1], positions[i0*3+2], // Pos
          normals[i0*3], normals[i0*3+1], normals[i0*3+2],       // Normal
          0, 0,                                                  // UV
          colors[i0*3], colors[i0*3+1], colors[i0*3+2], 1        // Color
      );
      Draw.batch.push(
          positions[i1*3], positions[i1*3+1], positions[i1*3+2],
          normals[i1*3], normals[i1*3+1], normals[i1*3+2],
          0, 0, 
          colors[i1*3], colors[i1*3+1], colors[i1*3+2], 1
      );
      // Vertex 2
      Draw.batch.push(
          positions[i2*3], positions[i2*3+1], positions[i2*3+2],
          normals[i2*3], normals[i2*3+1], normals[i2*3+2],
          0, 0, 
          colors[i2*3], colors[i2*3+1], colors[i2*3+2], 1
      );
    }
  });
}




  static chunkProjectWorld(world) {
    this.projectChunks(world)
    //this.chunkProjectPoints(world);
    //if (view != 0) this.chunkProjectTriangles(world);
  }
  static applyCamera(p) {
    // 1. Translate
    let x = p[0] - TouchHandler.tx;
    let y = p[1] - TouchHandler.ty;
    let z = p[2] - TouchHandler.tz;
    
    // 2. Rotate Y (Yaw) - Use same order as Matrix4
    let cosY = Math.cos(-TouchHandler.ry);
    let sinY = Math.sin(-TouchHandler.ry);
    let x1 = x * cosY - z * sinY;
    let z1 = x * sinY + z * cosY;
    
    // 3. Rotate X (Pitch)
    let cosX = Math.cos(TouchHandler.rx);
    let sinX = Math.sin(TouchHandler.rx);
    let y2 = y * cosX + z1 * sinX;
    let z2 = -y * sinX + z1 * cosX;

    return [x1, y2, z2];
}

  static chunkRender(world) {
    // Clear Both Color AND Depth Buffers
    gl.clearColor(135/255, 206/255, 235/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    this.time += deltaTime;
    Draw.updateMatrices(w, h)
    // Frustum cull chunks here if you want
    this.projectChunks(world);

    // Render the 3D World
    Draw.begin3D();
    this.renderTriangles((view == 1), world);
    Draw.end(); // Flushes 3D mesh to GPU
    

    return this;
  }
  static reset() {
    this.projectedPoints = [];
    this.projectedTriangles = [];
    this.projectedChunks = []
    this.renderedtriangleCount = 0;
  }
}


function lerpGradient(t, colors) {
    t = Math.max(0, Math.min(1, t));
    const segmentCount = colors.length - 1;
    const scaledT = t * segmentCount;
    const index = Math.floor(scaledT);
    
    if (index >= segmentCount) return colors[segmentCount];

    const c1 = colors[index];
    const c2 = colors[index + 1];
    const localT = scaledT - index;

    return [
        c1[0] + (c2[0] - c1[0]) * localT,
        c1[1] + (c2[1] - c1[1]) * localT,
        c1[2] + (c2[2] - c1[2]) * localT
    ];
}
