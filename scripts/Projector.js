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

  return [x, y, p[2], i]
}
let once = 0
let twice = 0
class Projector {
  static {
    this.time = 0;
    this.projectedPoints = [];
    this.projectedTriangles = [];
    this.projectedChunks = [];
    this.renderedtriangleCount = 0;
  }

  static pInsideScreen(x, y) {
    return (x > 0 && x < w && y > 0 && y < h);
  }

  static isBetweenfliwflow(p) {
    return (p[2] <= flow && p[2] >= fliw);
  }

  static checkExistanceT(t) {
  const p1 = t[0], p2 = t[1], p3 = t[2];
  if (!p1 || !p2 || !p3) return false;

  // 1. Find the boundaries of the triangle
  const minX = Math.min(p1[0], p2[0], p3[0]);
  const maxX = Math.max(p1[0], p2[0], p3[0]);
  const minY = Math.min(p1[1], p2[1], p3[1]);
  const maxY = Math.max(p1[1], p2[1], p3[1]);

  // 2. Check if the Triangle Box overlaps the Screen Box (0,0 to w,h)
  const isInsideScreen = (minX < w && maxX > 0 && minY < h && maxY > 0);

  // 3. Keep your Z-axis (depth) check
  const isVisibleDepth = (this.isBetweenfliwflow(p1) || 
                          this.isBetweenfliwflow(p2) || 
                          this.isBetweenfliwflow(p3));

  return isInsideScreen && isVisibleDepth;
}

  static checkExistanceP(p){
    return (this.pInsideScreen(p[0], p[1]) && this.isBetweenfliwflow(p1))
  }
  static projectChunks(world) {
    this.projectedChunks = []; // Clear previous frame's visible chunks
    
    world.chunks.forEach(chunk => {
        let hsize = chunk.size * 0.5;
        let x = chunk.x - hsize;
        let z = chunk.z - hsize;
        
        // Use 4 corners. Note: If your terrain has high mountains, 
        // you might want to include Y-bounds too, but corners usually suffice.
        let bounds = [
            [x, chunk.y, z],
            [x + chunk.size, chunk.y, z],
            [x, chunk.y, z + chunk.size],
            [x + chunk.size, chunk.y, z + chunk.size]
        ];

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let allBehindCamera = true;
        let anyPointValid = false;

        bounds.forEach(p => {
            // 1. Translation & Rotation
            let tx = p[0] - TouchHandler.tx;
            let ty = p[1] - TouchHandler.ty; 
            let tz = p[2] - TouchHandler.tz;
            let j = Mathf.rotateY(Mathf.rotateX([tx, ty, tz], TouchHandler.rx), TouchHandler.ry);
            
            // 2. Projection
            let projected = returnPoints(j, 0); 
            let px = projected[0];
            let py = projected[1];
            let pz = projected[2];

            // If perspective() returned undefined, px/py will be undefined
            if (px !== undefined && py !== undefined) {
                allBehindCamera = false;
                anyPointValid = true;
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
            }
        });

        if (allBehindCamera) return; // Skip chunk if it's entirely behind the near plane

        // 3. The Overlap Check
        // Does the chunk's screen-space box overlap the screen [0, 0, w, h]?
        const overlapsScreen = (minX < w && maxX > 0 && minY < h && maxY > 0);
        
        // Optional: Z-distance check (fliw/flow)
        // You can check if the chunk is within your fog/render distance here
        
        if (overlapsScreen) {
            this.projectedChunks.push(chunk);
        }
    });
}

  
    static chunkProjectPoints(world) {
    let cLength = this.projectedChunks.length;
    for (let c = 0; c < cLength; c++) {
      let chunk = this.projectedChunks[c];
      let length = chunk.points.length;
      
      // NEW: Record the starting index in the global array for this chunk's points
      chunk.pointOffset = this.projectedPoints.length; 

      for (let i = 0; i < length; i++) {
        let p = chunk.points[i];
        
        // 1. TRANSLATION
        let translatedX = p[0] - TouchHandler.tx;
        let translatedY = p[1] - TouchHandler.ty; 
        let translatedZ = p[2] - TouchHandler.tz;

        // 2. ROTATION
        let j = Mathf.rotateX([translatedX, translatedY, translatedZ], TouchHandler.rx);
        j = Mathf.rotateY(j, TouchHandler.ry);
        
        // Push the projected point. (No need to attach the chunk index manually anymore)
        this.projectedPoints.push(returnPoints(j, p[3]));
      }
    }
  }

    

static chunkProjectTriangles(world) {
  let cLength = this.projectedChunks.length;
  for (let c = 0; c < cLength; c++) {
    let chunk = this.projectedChunks[c];
    let length = chunk.triangles.length;
    let offset = chunk.pointOffset; 

    for (let k = 0; k < length; k++) {
      let t = chunk.triangles[k];
      if (!t) continue;
      
      let projectedT = [];
      for (let h = 0; h < 3; h++) {
        projectedT.push(this.projectedPoints[offset + t[h][3]]);
      }
      
      if (!projectedT[0] || !projectedT[1] || !projectedT[2]) continue;

      // NEW: Store the triangle index (k) AND the chunk reference
      projectedT.push(k);     // index 3: Triangle Index
      projectedT.push(chunk); // index 4: The Chunk object itself

      if (this.ccw(projectedT[2], projectedT[0], projectedT[1]) < 0) continue;
      if (!this.checkExistanceT(projectedT)) continue;
      
      this.projectedTriangles.push(projectedT);
    }
  }
}

  static renderTriangles(wireframe, world) {
  if (!wireframe) {
    this.projectedTriangles.sort((a, b) => {
      let c = (a[0][2] + a[1][2] + a[2][2]) / 3;
      let d = (b[0][2] + b[1][2] + b[2][2]) / 3;
      return d - c;
    });
  }

  this.projectedTriangles.forEach(t => {
    // t[3] is the index, t[4] is the chunk reference
    let triIndex = t[3];
    let chunk = t[4];
    
    // Default to white if for some reason the color isn't there
    let color = [1, 1, 1, 1];

    // Access the pre-calculated color!
    if (chunk && chunk.triangleCol && chunk.triangleCol[triIndex]) {
        color = chunk.triangleCol[triIndex];
    }
    
    // Overrides for specific view modes
    if (view == 2) color = [0.9, 0.9, 0.7, 1];
    
    if (wireframe || view == 2) {
      let col = (view == 2) ? [0.5, 0.5, 0.5, 1] : [0, 0, 0, 1];
      Draw.color(col);
      Lines.line(t[0][0], t[0][1], t[1][0], t[1][1]);
      Lines.line(t[1][0], t[1][1], t[2][0], t[2][1]);
      Lines.line(t[2][0], t[2][1], t[0][0], t[0][1]);
    }

    if (!wireframe) {
      Draw.batch.ensureCapacity(3);
      Draw.batch.setTexture(Draw.whiteTex);
      // Pushing the pre-calculated color to the GPU batch
      Draw.batch.push(t[0][0], t[0][1], 0, 0, ...color);
      Draw.batch.push(t[1][0], t[1][1], 0, 0, ...color);
      Draw.batch.push(t[2][0], t[2][1], 0, 0, ...color);
    }
  });
}



  static chunkRender(world) {
    // Clear Screen
    gl.clearColor(135/255, 206/255, 235/255, 1.0); // SkyBlue
    gl.clear(gl.COLOR_BUFFER_BIT);

    Draw.begin();
    
    this.time += deltaTime;
    this.chunkProjectWorld(world);

    if (view == 0) {
      this.projectedPoints.forEach(p => {
        if (p && this.pInsideScreen(p[0], p[1]) && this.isBetweenfliwflow(p)) {
          Draw.color(1, 1, 1, 1);
          Draw.fillRect(p[0], p[1], 2, 2);
        }
      });
    }

    if (view != 0) {
      this.renderTriangles((view == 1), world);
    }

    // Flush batch to see the 3D world before drawing UI on top
    Draw.flush();
    
    // UI Elements (Optional: could be in the same batch if matrix is shared)
    // this.renderStat(world); 
    
    Draw.end();
    return this;
  }
  
  static ccw(a, b, c) {
    return ((b[0] - a[0]) * (c[1] - a[1])) - ((c[0] - a[0]) * (b[1] - a[1]));
  }
  
  static projectWorld(world) {
    this.projectPoints(world);
    if (view != 0) this.projectTriangles(world);
  }
  static chunkProjectWorld(world) {
    this.projectChunks(world)
    this.chunkProjectPoints(world);
    if (view != 0) this.chunkProjectTriangles(world);
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
