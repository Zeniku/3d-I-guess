class Texture {
  constructor(gl, image) {
    this.gl = gl;
    this.handle = gl.createTexture();
    this.width = image ? image.width : 1;
    this.height = image ? image.height : 1;
    
    gl.bindTexture(gl.TEXTURE_2D, this.handle);
    // Standard Pixel Art settings (Nearest Neighbor)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    if (image) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    } else {
      // Create a 1x1 white pixel for drawing solid shapes
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }
  }
  
  bind() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.handle);
  }
}

// Simulates Arc's TextureRegion
class TextureRegion {
  constructor(texture, u = 0, v = 0, u2 = 1, v2 = 1) {
    this.texture = texture;
    this.u = u;  this.v = v;
    this.u2 = u2; this.v2 = v2;
    this.width = Math.abs(u2 - u) * texture.width;
    this.height = Math.abs(v2 - v) * texture.height;
  }
  
  // Helper to split a texture
  static split(texture, cols, rows) {
      // Implementation omitted for brevity, but this is where you'd slice spritesheets
  }
}


class TextureAtlas {
  constructor(gl) {
    this.gl = gl;
    this.regions = {};
    this.texture = null;
  }
async load(images) {
    // images = { name: "url" }
    const loaded = {};

  for (let name in images) {
    try {
      loaded[name] = await this._loadImage(images[name]);
    } catch (e) {
      console.warn(`Skipping ${name}: Image not found at ${images[name]}`);
      // Create a tiny 2x2 red/pink canvas as a placeholder
      const placeholder = document.createElement("canvas");
      placeholder.width = 8; placeholder.height = 8;
      const ctx = placeholder.getContext("2d");
      ctx.fillStyle = "magenta";
      ctx.fillRect(0,0,8,8);
      loaded[name] = placeholder;
    }
  }

    // 2. Pack (simple row packing)
    const padding = 2;
    let atlasWidth = 0;
    let atlasHeight = 0;

    let x = 0;
    let y = 0;
    let rowHeight = 0;

    const positions = {};

    for (let name in loaded) {
      const img = loaded[name];

      if (x + img.width > 2048) {
        x = 0;
        y += rowHeight + padding;
        rowHeight = 0;
      }

      positions[name] = { x, y, w: img.width, h: img.height };

      x += img.width + padding;
      rowHeight = Math.max(rowHeight, img.height);

      atlasWidth = Math.max(atlasWidth, x);
      atlasHeight = Math.max(atlasHeight, y + img.height);
    }

    // 3. Draw atlas to canvas
    const canvas = document.createElement("canvas");
    canvas.width = this._nextPow2(atlasWidth);
    canvas.height = this._nextPow2(atlasHeight);

    const ctx = canvas.getContext("2d");

    for (let name in loaded) {
      const pos = positions[name];
      ctx.drawImage(loaded[name], pos.x, pos.y);
    }

    // 4. Upload to GPU
    this.texture = new Texture(this.gl, canvas);

    // 5. Create regions
    for (let name in positions) {
      const p = positions[name];

      const u = p.x / canvas.width;
      const v = p.y / canvas.height;
      const u2 = (p.x + p.w) / canvas.width;
      const v2 = (p.y + p.h) / canvas.height;

      this.regions[name] =
        new TextureRegion(this.texture, u, v, u2, v2);
    }

    return this;
  }
  

  find(name) {
    return this.regions[name];
  }

  _loadImage(src) {
  return new Promise(res => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => {
      console.warn("Failed to load:", src);
      // Return a tiny transparent canvas so the atlas can still "pack" it
      const fallback = document.createElement("canvas");
      fallback.width = 1; fallback.height = 1;
      res(fallback); 
    };
    img.src = src;
  });
}


  _nextPow2(v) {
  if (v <= 0) return 1; // Safety first!
  return 2 ** Math.ceil(Math.log2(v));
}

  
  has(name) {
    return name in this.regions;
  }
  
  getNames() {
    return Object.keys(this.regions);
  }
}



/* ============================
   BASE BATCHER
   ============================ */
class BaseBatch {
  constructor(gl, capacity, vertexSize, program) {
    this.gl = gl;
    this.capacity = capacity;
    this.vertexSize = vertexSize; 
    this.data = new Float32Array(capacity * vertexSize);
    this.idx = 0;
    
    this.buffer = gl.createBuffer();
    this.currentTexture = null;
    this.program = program;
  }

  begin(projMatrix) {
    this.projMatrix = projMatrix;
    this.idx = 0;
    this.currentTexture = null;
  }

  end() {
    if (this.idx > 0) this.flush();
  }

  setTexture(tex) {
    if (this.currentTexture !== tex) {
      if (this.idx > 0) this.flush();
      this.currentTexture = tex;
    }
  }

  ensureCapacity(verts) {
    if (this.idx + (verts * this.vertexSize) > this.data.length) {
      this.flush();
    }
  }

  flush() {
    if (this.idx === 0 || !this.currentTexture) return;

    const gl = this.gl;
    gl.useProgram(this.program);
    this.currentTexture.bind();
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.subarray(0, this.idx), gl.STREAM_DRAW);
    
    this.bindAttributes();

    const u_proj = gl.getUniformLocation(this.program, "u_projTrans");
    gl.uniformMatrix4fv(u_proj, false, this.projMatrix);

    const vertexCount = this.idx / this.vertexSize;
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    
    this.idx = 0;
  }

  // To be implemented by subclasses
  bindAttributes() {} 
}

/* ============================
   2D SPRITE BATCH
   ============================ */
class SpriteBatch extends BaseBatch {
  constructor(gl, capacity = 10000, program) {
    super(gl, capacity, 8, program); // x, y, u, v, r, g, b, a
  }

  push(x, y, u, v, r, g, b, a) {
    if (this.idx + this.vertexSize > this.data.length) this.flush();
    const d = this.data; let i = this.idx;
    d[i++] = x; d[i++] = y;
    d[i++] = u; d[i++] = v;
    d[i++] = r; d[i++] = g; d[i++] = b; d[i++] = a;
    this.idx = i;
  }

  bindAttributes() {
    const gl = this.gl;
    const STRIDE = 8 * 4;
    const locPos = gl.getAttribLocation(this.program, "a_pos");
    const locUv = gl.getAttribLocation(this.program, "a_texCoord");
    const locCol = gl.getAttribLocation(this.program, "a_color");

    gl.enableVertexAttribArray(locPos);
    gl.enableVertexAttribArray(locUv);
    gl.enableVertexAttribArray(locCol);

    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(locUv,  2, gl.FLOAT, false, STRIDE, 8);
    gl.vertexAttribPointer(locCol, 4, gl.FLOAT, false, STRIDE, 16);
  }
}

/* ============================
   3D MESH BATCH
   ============================ */
function packNormalOct(nx, ny, nz) {
    // 1. Project onto the octahedron
    const invL1 = 1.0 / (Math.abs(nx) + Math.abs(ny) + Math.abs(nz));
    let x = nx * invL1;
    let z = nz * invL1;

    // 2. Handle the bottom hemisphere (ny < 0)
    if (ny < 0) {
        const tx = x;
        const tz = z;
        x = (1.0 - Math.abs(tz)) * (tx >= 0 ? 1.0 : -1.0);
        z = (1.0 - Math.abs(tx)) * (tz >= 0 ? 1.0 : -1.0);
    }

    // 3. Map from [-1, 1] to [0, 1] for the attribute
    return [x * 0.5 + 0.5, z * 0.5 + 0.5];
}


class MeshBatch extends BaseBatch {
  constructor(gl, capacity = 10000, program) {
    super(gl, capacity, 12, program); 
  }

push(x, y, z, nx, ny, nz, u, v, r, g, b, a) {
    let d = this.data; let i = this.idx;
    d[i++] = x; d[i++] = y; d[i++] = z;
    d[i++] = nx; d[i++] = ny; d[i++] = nz;
    d[i++] = u; d[i++] = v;
    d[i++] = r; d[i++] = g; d[i++] = b; d[i++] = a;
    this.idx = i;
  }

  bindAttributes() {
    const gl = this.gl;
    const STRIDE = 12 * 4; // 12 floats * 4 bytes = 48 bytes total

    const locPos = gl.getAttribLocation(this.program, "a_pos");
    const locNorm = gl.getAttribLocation(this.program, "a_normal"); 
    const locUv = gl.getAttribLocation(this.program, "a_texCoord");
    const locCol = gl.getAttribLocation(this.program, "a_color");

    gl.enableVertexAttribArray(locPos);
    gl.enableVertexAttribArray(locNorm);
    gl.enableVertexAttribArray(locUv);
    gl.enableVertexAttribArray(locCol);

    // Position (3 floats) @ offset 0
    gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, STRIDE, 0);
    
    // Normal (3 floats) @ offset 12 bytes (3 floats)
    gl.vertexAttribPointer(locNorm, 3, gl.FLOAT, false, STRIDE, 3 * 4);
    
    // UV (2 floats) @ offset 24 bytes (6 floats)
    gl.vertexAttribPointer(locUv,  2, gl.FLOAT, false, STRIDE, 6 * 4);
    
    // Color (4 floats) @ offset 32 bytes (8 floats)
    gl.vertexAttribPointer(locCol, 4, gl.FLOAT, false, STRIDE, 8 * 4);
  }
}


//*experimental
class TerrainBatch {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    
    // Instead of x,y,z,u,v,r,g,b,a, we ONLY need an array of heights
    this.heightData = new Float32Array(/* size of your grid */);
    this.heightBuffer = gl.createBuffer();
    
    // Upload ONCE, not every frame
    gl.bindBuffer(gl.ARRAY_BUFFER, this.heightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.heightData, gl.STATIC_DRAW);
  }

  renderChunk(projMatrix, chunkX, chunkZ, scale) {
    const gl = this.gl;
    gl.useProgram(this.program);
    
    // Bind uniforms
    const u_proj = gl.getUniformLocation(this.program, "u_projTrans");
    const u_offset = gl.getUniformLocation(this.program, "u_chunkOffset");
    const u_scale = gl.getUniformLocation(this.program, "u_scale");
    
    gl.uniformMatrix4fv(u_proj, false, projMatrix);
    gl.uniform2f(u_offset, chunkX, chunkZ);
    gl.uniform1f(u_scale, scale);

    // Bind only the height attribute
    const locHeight = gl.getAttribLocation(this.program, "a_height");
    gl.enableVertexAttribArray(locHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.heightBuffer);
    gl.vertexAttribPointer(locHeight, 1, gl.FLOAT, false, 0, 0);

    // Draw using Triangle Strips!
    const vertexCount = this.heightData.length;
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
  }
}

class MeshBatchOptimized extends BaseBatch {
  constructor(gl, capacity = 10000, program) {
    // 3(pos) + 2(packed normal) + 2(uv) + 4(color) = 11 floats per vertex
    super(gl, capacity, 11, program); 
  }

  // Helper to pack normal into Pitch/Yaw before pushing
  push(x, y, z, nx, ny, nz, u, v, r, g, b, a) {
    let d = this.data; 
    let i = this.idx;
    
    // --- OCTAHEDRAL ENCODING ---
    // 1. Project onto the L1-norm (octahedron)
    const invL1 = 1.0 / (Math.abs(nx) + Math.abs(ny) + Math.abs(nz));
    let ox = nx * invL1;
    let oz = nz * invL1;

    // 2. Handle the bottom hemisphere (if normal points downward)
    if (ny < 0) {
        const tx = ox;
        const tz = oz;
        ox = (1.0 - Math.abs(tz)) * (tx >= 0 ? 1.0 : -1.0);
        oz = (1.0 - Math.abs(tx)) * (tz >= 0 ? 1.0 : -1.0);
    }

    // 3. Map from [-1, 1] to [0, 1] for the shader attribute
    const packedX = ox * 0.5 + 0.5;
    const packedZ = oz * 0.5 + 0.5;

    // --- STORE DATA ---
    d[i++] = x; d[i++] = y; d[i++] = z;
    d[i++] = packedX; d[i++] = packedZ; // Now Octahedral [U, V]
    d[i++] = u; d[i++] = v;
    d[i++] = r; d[i++] = g; d[i++] = b; d[i++] = a;
    
    this.idx = i;
}


  bindAttributes() {
    const gl = this.gl;
    const STRIDE = 11 * 4; // 11 floats

    const locPos = gl.getAttribLocation(this.program, "a_pos");
    const locNorm = gl.getAttribLocation(this.program, "a_normalPacked");
    const locUv = gl.getAttribLocation(this.program, "a_texCoord");
    const locCol = gl.getAttribLocation(this.program, "a_color");

    gl.enableVertexAttribArray(locPos);
    gl.enableVertexAttribArray(locNorm);
    gl.enableVertexAttribArray(locUv);
    gl.enableVertexAttribArray(locCol);

    gl.vertexAttribPointer(locPos, 3, gl.FLOAT, false, STRIDE, 0);
    gl.vertexAttribPointer(locNorm, 2, gl.FLOAT, false, STRIDE, 3 * 4); // Size 2
    gl.vertexAttribPointer(locUv,  2, gl.FLOAT, false, STRIDE, 5 * 4); // Offset 5
    gl.vertexAttribPointer(locCol, 4, gl.FLOAT, false, STRIDE, 7 * 4); // Offset 7
  }
}


class PlanetBatch extends BaseBatch {
  constructor(gl, capacity = 10000, program) {
    // 2(packed normal) + 1(elevation) + 4(color) + 4(emissive) = 11 floats
    super(gl, capacity, 11, program); 
  }

  push(nx, ny, nz, elev, r, g, b, a, er, eg, eb, ea) {
    let d = this.data; 
    let i = this.idx;
    
    // --- OCTAHEDRAL ENCODING (CPU) ---
    const invL1 = 1.0 / (Math.abs(nx) + Math.abs(ny) + Math.abs(nz));
    let ox = nx * invL1;
    let oz = nz * invL1;
    if (ny < 0) {
        const tx = ox;
        const tz = oz;
        ox = (1.0 - Math.abs(tz)) * (tx >= 0 ? 1.0 : -1.0);
        oz = (1.0 - Math.abs(tx)) * (tz >= 0 ? 1.0 : -1.0);
    }

    // 11 Floats total
    d[i++] = ox * 0.5 + 0.5; // Packed Normal X
    d[i++] = oz * 0.5 + 0.5; // Packed Normal Z
    d[i++] = elev;           // Distance from center
    d[i++] = r; d[i++] = g; d[i++] = b; d[i++] = a;   // Base Color
    d[i++] = er; d[i++] = eg; d[i++] = eb; d[i++] = ea; // Emissive Color + Intensity
    
    this.idx = i;
  }

  bindAttributes() {
    const gl = this.gl;
    const S = 11 * 4; // Stride

    const locNorm = gl.getAttribLocation(this.program, "a_normalPacked");
    const locElev = gl.getAttribLocation(this.program, "a_elevation");
    const locCol  = gl.getAttribLocation(this.program, "a_color");
    const locEmis = gl.getAttribLocation(this.program, "a_emissive");

    gl.enableVertexAttribArray(locNorm);
    gl.enableVertexAttribArray(locElev);
    gl.enableVertexAttribArray(locCol);
    gl.enableVertexAttribArray(locEmis);

    gl.vertexAttribPointer(locNorm, 2, gl.FLOAT, false, S, 0);      // Offset 0
    gl.vertexAttribPointer(locElev, 1, gl.FLOAT, false, S, 2 * 4);  // Offset 2
    gl.vertexAttribPointer(locCol,  4, gl.FLOAT, false, S, 3 * 4);  // Offset 3
    gl.vertexAttribPointer(locEmis, 4, gl.FLOAT, false, S, 7 * 4);  // Offset 7
  }
}

