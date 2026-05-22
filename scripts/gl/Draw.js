/* ============================
   THE DRAW API
   ============================ */

class Draw {
  static init(gl) {
    this.gl = gl;
    
    // 1. Compile all programs
    this.prog2D = this._createProgram(Shaders.vs2D, Shaders.fs2D);
    this.prog3D = this._createProgram(Shaders.vs3D, Shaders.fs3D);
    this.progPlanet = this._createProgram(Shaders.vs3D, Shaders.fs3D); // New!

    // 2. Initialize Batchers
    this.batch2D = new SpriteBatch(gl, 10000, this.prog2D);
    this.batch3D = new MeshBatch(gl, 10000, this.prog3D);
    this.planetBatch = new PlanetBatch(gl, 20000, this.progPlanet); // New dedicated batcher
    
    this.batch = this.batch2D;
    this.whiteTex = new Texture(gl, null); 
    this.whiteRegion = new TextureRegion(this.whiteTex);
    
    this.updateMatrices(window.innerWidth, window.innerHeight);
    this.col = [1, 1, 1, 1];
  }

  /** Generalized switcher that flushes the old batcher before starting the new one */
  static useBatch(newBatch, projection) {
    if (this.batch === newBatch) return; // Already using it
    
    this.batch.end();     // Flush current data to GPU
    this.batch = newBatch; // Switch
    this.batch.begin(projection);
  }

  static beginPlanet() {
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    
    // Setup specific Planet Uniforms
    this.gl.useProgram(this.progPlanet);
    const locLight = this.gl.getUniformLocation(this.progPlanet, "u_lightdir");
    this.gl.uniform3f(locLight, 0.5, 1.0, 0.3);
    
    const locCam = this.gl.getUniformLocation(this.progPlanet, "u_campos");
    this.gl.uniform3f(locCam, TouchHandler.tx, TouchHandler.ty, TouchHandler.tz);

    // Swap to the planet pipeline
    this.useBatch(this.planetBatch, this.proj3D);
  }
  static setup3DUniforms() {
    const gl = this.gl;
    gl.useProgram(this.prog3D);
    
    // 1. Light Direction (Top-down slanted)
    const locLight = gl.getUniformLocation(this.prog3D, "u_lightDir");
    gl.uniform3f(locLight, 0.5, 1.0, 0.3);

    // 2. Fog Color (Matching your clearColor/Sky)
    const locFog = gl.getUniformLocation(this.prog3D, "u_fogColor");
    gl.uniform3f(locFog, 135/255, 206/255, 235/255);

    // 3. Camera Position (For Fog calculation)
    const locCam = gl.getUniformLocation(this.prog3D, "u_cameraPos");
    gl.uniform3f(locCam, TouchHandler.tx, TouchHandler.ty, TouchHandler.tz);
}

  static updateMatrices(wi, hi) {
    const fov = global.zoomv || 70;
    const aspect = wi / hi;
    
    // 1. Projection Matrix (The Lens)
    let projection = Matrix4.perspective(fov, aspect, 0.1, 1000.0);
    
    // 2. View Matrix (The Camera)
    // We do the inverse of the camera's movements:
    // Rotate Y -> Rotate X -> Translate
    // Inside Draw.updateMatrices
let view = Matrix4.identity();
view = Matrix4.rotateX(view, TouchHandler.rx); // Apply pitch
view = Matrix4.rotateY(view, TouchHandler.ry); // Apply yaw
view = Matrix4.translate(view, -TouchHandler.tx, -TouchHandler.ty, -TouchHandler.tz);

    // 3. Combine them: Proj * View
    this.proj3D = Matrix4.multiply(projection, view);
    
    this.proj2D = Matrix4.ortho(0, wi, hi, 0, -1, 1);
    
}


  // --- Pipeline Switching ---
  static begin2D() {
    this.gl.disable(this.gl.DEPTH_TEST); // 2D usually ignores depth
    this.gl.disable(gl.CULL_FACE);
    this.batch = this.batch2D;
    this.batch.begin(this.proj2D);
  }

  // Inside Draw class
static begin3D() {
    this.setup3DUniforms();
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.CULL_FACE);
    
    this.batch = this.batch3D;
    this.batch.begin(this.proj3D);
    
    // Set a default texture so the batcher doesn't skip the draw!
    this.batch.setTexture(this.whiteTex); 
}


  static flush() {
    this.batch.flush();
  }

  static end() {
    this.batch.end();
  }

  // --- State Management ---
  static color(r, g, b, a = 1) { 
    if(arguments.length === 1 && Array.isArray(r)) this.col = r;
    else this.col = [r, g, b, a]; 
  }

  // --- 2D Drawing ---
  
  static rect(region, x, y, w, h, rot = 0) {
    Draw.batch = Draw.batch2D
    if (!region) region = this.whiteRegion; // Fallback to white pixel
    
    this.batch.setTexture(region.texture);
    this.batch.ensureCapacity(6)
    
    // Arc draws centered by default for sprites
    const dx = -w/2; 
    const dy = -h/2; 
    
    // Precalculate rotation (Cos/Sin)
    // Note: Arc adds a global rotation state sometimes, but usually passes it in
    const cos = Math.cos(rot * Math.PI / 180);
    const sin = Math.sin(rot * Math.PI / 180);

    const [r,g,b,a] = this.col;

    // Corner 1 (Bottom Left relative to center)
    const x1 = x + (dx * cos - dy * sin);
    const y1 = y + (dx * sin + dy * cos);
    
    // Corner 2 (Top Left)
    const x2 = x + (dx * cos - (dy+h) * sin);
    const y2 = y + (dx * sin + (dy+h) * cos);
    
    // Corner 3 (Top Right)
    const x3 = x + ((dx+w) * cos - (dy+h) * sin);
    const y3 = y + ((dx+w) * sin + (dy+h) * cos);
    
    // Corner 4 (Bottom Right)
    const x4 = x + ((dx+w) * cos - dy * sin);
    const y4 = y + ((dx+w) * sin + dy * cos);

    // Push two triangles (Quad)
    // Tri 1
    this.batch.push(x1, y1, region.u,  region.v,  r,g,b,a);
    this.batch.push(x2, y2, region.u,  region.v2, r,g,b,a);
    this.batch.push(x3, y3, region.u2, region.v2, r,g,b,a);
    // Tri 2
    this.batch.push(x1, y1, region.u,  region.v,  r,g,b,a);
    this.batch.push(x3, y3, region.u2, region.v2, r,g,b,a);
    this.batch.push(x4, y4, region.u2, region.v,  r,g,b,a);
  }
static colorRGBA(r,g,b,a=1){ this.col=[r,g,b,a]; }
  static pushColor(){ this.colStack.push([...this.col]); }
  static popColor(){ if(this.colStack.length>1) this.col=this.colStack.pop(); }
  static resetColor(){ this.col=[1,1,1,1]; this.colStack=[[1,1,1,1]];}

  static withColor(c,a,fn){
    this.pushColor();
    if(typeof c==="string") this.colorHex(c,a);
    else if(typeof c==="number") this.colorHSL(c,1,0.5,a);
    else this.colorRGBA(...c);
    fn();
    this.popColor();
  }
  static colorHex(hex,a=1){
    hex = hex.replace("#","");
    if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const n=parseInt(hex,16);
    this.colorRGBA(
      ((n>>16)&255)/255,
      ((n>>8)&255)/255,
      (n&255)/255,
      a
    );
  }

  static colorHSL(h,s,l,a=1){
    h=((h%360)+360)%360;
    const c=(1-Math.abs(2*l-1))*s;
    const x=c*(1-Math.abs((h/60)%2-1));
    const m=l-c/2;
    let r=0,g=0,b=0;
    if(h<60){r=c;g=x;}
    else if(h<120){r=x;g=c;}
    else if(h<180){g=c;b=x;}
    else if(h<240){g=x;b=c;}
    else if(h<300){r=x;b=c;}
    else{r=c;b=x;}
    this.colorRGBA(r+m,g+m,b+m,a);
  }
  static alpha(a) { this.col[3] = a; }
  static reset() { this.col = [1,1,1,1]; this._scl = 1; this._rot = 0; }
  
  // --- 3D Drawing ---
  static tri3D(region, p1, p2, p3) {
    if (this.batch !== this.batch3D) console.warn("Called 3D tri while in 2D mode!");
    if (!region) region = this.whiteRegion;

    this.batch.setTexture(region.texture);
    this.batch.ensureCapacity(3);
    
    const [r, g, b, a] = this.col;

    // p1, p2, p3 should be arrays like [x, y, z]
    // WebGL handles the 3D-to-2D projection via the vertex shader!
    this.batch.push(p1[0], p1[1], p1[2], region.u, region.v, r, g, b, a);
    this.batch.push(p2[0], p2[1], p2[2], region.u, region.v2, r, g, b, a);
    this.batch.push(p3[0], p3[1], p3[2], region.u2, region.v2, r, g, b, a);
  }
  static _createProgram(vs, fs) {
const gl = this.gl;
    const p = gl.createProgram();
    const c = (t, s) => {
      const sh = gl.createShader(t);
      gl.shaderSource(sh, s);
      gl.compileShader(sh);
      if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
      return sh;
    };
    gl.attachShader(p, c(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, c(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }
  static circle(x, y, rad, segments = 0) {
    this.batch = this.batch2D
    if (segments <= 0) segments = Math.floor(10 + Math.sqrt(rad) * 4);
    
    const region = this.whiteRegion;
    this.batch.setTexture(region.texture);

    // CRITICAL: We are about to push 'segments * 3' vertices.
    // We must ensure there is room for ALL of them right now.
    this.batch.ensureCapacity(segments * 3);

    const [r, g, b, a] = this.col;
    const { u, v } = region;
    const step = (Math.PI * 2) / segments;

    for (let i = 0; i < segments; i++) {
        const a1 = i * step;
        const a2 = (i + 1) * step;

        const x1 = x + Math.cos(a1) * rad;
        const y1 = y + Math.sin(a1) * rad;
        const x2 = x + Math.cos(a2) * rad;
        const y2 = y + Math.sin(a2) * rad;

        // We use this.batch.push directly. 
        // Since we ensured capacity above, this loop is now safe.
        
        // Vertex 1: Center
        this.batch.push(x, y, u, v, r, g, b, a);
        // Vertex 2: First edge
        this.batch.push(x1, y1, u, v, r, g, b, a);
        // Vertex 3: Second edge
        this.batch.push(x2, y2, u, v, r, g, b, a);
    }
}
}

class Lines {
  static stroke = 1;

  static setStroke(s) {
    this.stroke = s;
  }

  /** Draws a single line. A line is 1 quad = 6 vertices */
  static line(x1, y1, x2, y2, thickness = this.stroke) {
    Draw.batch = Draw.batch2D
    Draw.batch.ensureCapacity(6); // Ensure room for 1 line
    
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const cx = x1 + dx / 2;
    const cy = y1 + dy / 2;

    Draw.rect(Draw.whiteRegion, cx, cy, len, thickness, ang);
  }

  /** Draws a rectangle. 4 lines * 6 vertices = 24 vertices */
  static rect(x, y, width, height, thickness = this.stroke) {
    Draw.batch = Draw.batch2D
    Draw.batch.ensureCapacity(24); // Ensure room for the WHOLE rectangle
    
    this.line(x, y, x + width, y, thickness);
    this.line(x, y + height, x + width, y + height, thickness);
    this.line(x, y, x, y + height, thickness);
    this.line(x + width, y, x + width, y + height, thickness);
  }

  /** Draws a circle. segments * 6 vertices per line segment */
  static circle(x, y, radius, segments = 0) {
    Draw.batch = Draw.batch2D
    if (segments <= 0) segments = Math.floor(10 + Math.sqrt(radius) * 4);

    // CRITICAL: Ensure capacity for every single line segment in the circle
    Draw.batch.ensureCapacity(segments * 6);

    const step = (Math.PI * 2) / segments;
    for (let i = 0; i < segments; i++) {
      const a1 = i * step;
      const a2 = (i + 1) * step;

      // We use the raw line logic here to avoid redundant capacity checks
      this.line(
        x + Math.cos(a1) * radius,
        y + Math.sin(a1) * radius,
        x + Math.cos(a2) * radius,
        y + Math.sin(a2) * radius,
        this.stroke
      );
    }
  }
}