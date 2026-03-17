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
    this.time = 0;
    this.projectedPoints = [];
    this.projectedTriangles = [];
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
    return (
      (p1 && p2 && p3) &&
      (this.pInsideScreen(p1[0], p1[1]) || this.pInsideScreen(p2[0], p2[1]) || this.pInsideScreen(p3[0], p3[1])) &&
      (this.isBetweenfliwflow(p1) || this.isBetweenfliwflow(p2) || this.isBetweenfliwflow(p3))
    );
  }
  static projectPoints(world){
    world.points.forEach(p => {
        let j = Mathf.rotateX([...p], TouchHandler.rx);
        j = Mathf.rotateY(j, TouchHandler.ry);
        this.projectedPoints.push(returnPoints(j));
      });
  }

  static triangleGridColors(world) {
    if (view == 3) {
      world.triangles.forEach((t, i) => {
        // Normalize 0-255 to 0.0-1.0 for WebGL
        let r = (255 - Math.abs(t[0][1] * 100)) / 255;
        let g = (255 - Math.abs(t[1][1] * 100)) / 255;
        let b = (255 - Math.abs(t[2][1] * 100)) / 255;
        world.triangleCol[i] = [r, g, b, 1.0];
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

world.triangles.forEach((t, i) => {
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
    if (ny < 0.6) {
        baseColor = [0.4, 0.4, 0.42]; // Gray rock for cliffs
    } else {
        // If it's relatively flat, color it based on height
        if (avgHeight < -1.0) {
            baseColor = [0.1, 0.3, 0.8]; // Deep Water
        } else if (avgHeight < 0.0) {
            baseColor = [0.2, 0.6, 0.9]; // Shallow Water
        } else if (avgHeight < .2) {
            baseColor = [0.9, 0.8, 0.5]; // Sand
        } else if (avgHeight < 1) {
            baseColor = [0.2, 0.7, 0.3]; // Grass
        } else {
            baseColor = [0.9, 0.9, 0.95]; // Snow peaks
        }
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

    world.triangleCol[i] = [r, g, b, 1.0];
});

    }
  }

  static projectTriangles(world) {
    world.triangles.forEach((t, i) => {
      let projectedT = [];
      t.forEach(p => {
        let j = Mathf.rotateX([...p], TouchHandler.rx);
        j = Mathf.rotateY(j, TouchHandler.ry);
        projectedT.push(returnPoints(j));
      });
      projectedT.push(i); // triangle index
      
      if (this.ccw(projectedT[1], projectedT[2], projectedT[0]) < 0) return;
      if (!this.checkExistanceT(projectedT)) return;
      this.projectedTriangles.push(projectedT);
    });
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
      let color = world.triangleCol[t[3]] || [1, 1, 1, 1];
      if (view == 2) color = [0.9, 0.9, 0.7, 1];
      
      this.renderedtriangleCount++;
      
      if (wireframe || view == 2) {
        let col = color
        if(view == 2) col = [0.5, 0.5, 0.5, 1]
        if(view == 1) col = [0, 0, 0, 1]
        Draw.color(col);
        Lines.line(t[0][0], t[0][1], t[1][0], t[1][1]);
        Lines.line(t[1][0], t[1][1], t[2][0], t[2][1]);
        Lines.line(t[2][0], t[2][1], t[0][0], t[0][1]);
      }
      if(!wireframe){
        // Manual Triangle Push to Batcher
        Draw.batch.ensureCapacity(3);
        Draw.batch.setTexture(Draw.whiteTex);
        Draw.batch.push(t[0][0], t[0][1], 0, 0, ...color);
        Draw.batch.push(t[1][0], t[1][1], 0, 0, ...color);
        Draw.batch.push(t[2][0], t[2][1], 0, 0, ...color);
      }
    });
  }

  static render(world) {
    // Clear Screen
    gl.clearColor(135/255, 206/255, 235/255, 1.0); // SkyBlue
    gl.clear(gl.COLOR_BUFFER_BIT);

    Draw.begin();
    
    this.time += deltaTime;
    this.projectWorld(world);

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
    if (view == 0) this.projectPoints(world);
    
    if (view != 0) this.projectTriangles(world);
  }

  static reset() {
    this.projectedPoints = [];
    this.projectedTriangles = [];
    this.renderedtriangleCount = 0;
  }
}
