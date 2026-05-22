class Simplex {
    constructor(seed = 1) {
        this.p = new Uint8Array(256);
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);

        // Simple Seeded Random (Linear Congruential Generator)
        let random = () => {
            seed = (seed * 1664525 + 1013904223) % 4294967296;
            return seed / 4294967296;
        };

        // Initialize and shuffle permutation table
        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }
        for (let i = 255; i > 0; i--) {
            let r = Math.floor(random() * (i + 1));
            let tmp = this.p[i];
            this.p[i] = this.p[r];
            this.p[r] = tmp;
        }

        // Double the permutation table to avoid wrapping index issues
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = (this.perm[i] % 12);
        }

        // Gradients for 2D simplex noise
        this.grad3 = new Float32Array([
            1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
            1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
            0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
        ]);
    }

    // --- BASE 2D SIMPLEX NOISE ---
    // Returns a value between -1.0 and 1.0
    rawNoise2D(xin, yin) {
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        let n0, n1, n2; // Noise contributions from the three corners

        // Skew the input space to determine which simplex cell we're in
        let s = (xin + yin) * F2; 
        let i = Math.floor(xin + s);
        let j = Math.floor(yin + s);
        let t = (i + j) * G2;
        let X0 = i - t; // Unskew the cell origin back to (x,y) space
        let Y0 = j - t;
        let x0 = xin - X0; // The x,y distances from the cell origin
        let y0 = yin - Y0;

        let i1, j1; 
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

        let x1 = x0 - i1 + G2;
        let y1 = y0 - j1 + G2;
        let x2 = x0 - 1.0 + 2.0 * G2;
        let y2 = y0 - 1.0 + 2.0 * G2;

        let ii = i & 255;
        let jj = j & 255;

        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) n0 = 0.0;
        else {
            t0 *= t0;
            let gi0 = this.permMod12[ii + this.perm[jj]] * 3;
            n0 = t0 * t0 * (this.grad3[gi0] * x0 + this.grad3[gi0 + 1] * y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) n1 = 0.0;
        else {
            t1 *= t1;
            let gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 3;
            n1 = t1 * t1 * (this.grad3[gi1] * x1 + this.grad3[gi1 + 1] * y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) n2 = 0.0;
        else {
            t2 *= t2;
            let gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 3;
            n2 = t2 * t2 * (this.grad3[gi2] * x2 + this.grad3[gi2 + 1] * y2);
        }

        // Add contributions from each corner to get the final noise value.
        return 70.0 * (n0 + n1 + n2);
    }

    // --- ARC-STYLE OCTAVE NOISE ---
    // octaves: Level of detail (e.g., 3-6)
    // falloff: How much amplitude decreases per octave (usually 0.5)
    // scl: The scale/zoom factor of the noise
    // x, y: Coordinates
    noise2d(octaves, falloff, scl, x, y) {
        let total = 0;
        let frequency = 1.0 / scl;
        let amplitude = 1.0;
        let maxAmplitude = 0;

        for (let i = 0; i < octaves; i++) {
            // Arc usually maps the -1 to 1 range, though you can adjust it to 0 to 1 if needed
            total += this.rawNoise2D(x * frequency, y * frequency) * amplitude;
            
            maxAmplitude += amplitude;
            amplitude *= falloff;
            frequency *= 2.0; // Lacunarity is typically fixed at 2.0 in simple implementations
        }

        return total / maxAmplitude; // Normalizes the result back to roughly [-1, 1]
    }
        // --- ARC-STYLE RIDGE NOISE ---
    ridge(octaves, falloff, scl, x, y) {
        let total = 0;
        let frequency = 1.0 / scl;
        let amplitude = 1.0;
        let maxAmplitude = 0;

        for (let i = 0; i < octaves; i++) {
            // 1. Get the raw noise for this specific octave (-1.0 to 1.0)
            let n = this.rawNoise2D(x * frequency, y * frequency);
            
            // 2. Apply the ridge "fold" to THIS octave
            // This creates the sharp creases by taking the absolute value and inverting it
            n = 1.0 - Math.abs(n);
            
            // 3. Add the transformed octave to the total
            total += n * amplitude;
            
            maxAmplitude += amplitude;
            amplitude *= falloff;
            frequency *= 2.0;
        }

        // Normalizes the result. 
        // Note: Arc's ridge noise typically returns a range of [0.0 to 1.0], not [-1.0 to 1.0].
        return total / maxAmplitude; 
    }
    rawNoise3D(x, y, z) {
    let n0, n1, n2, n3; // Noise contributions from the four corners

    // Skewing and unskewing factors for 3D
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    // 1. Skew the input space to determine which simplex cell we're in
    let s = (x + y + z) * F3;
    let i = Math.floor(x + s);
    let j = Math.floor(y + s);
    let k = Math.floor(z + s);

    let t = (i + j + k) * G3;
    let X0 = i - t; // Unskew the cell origin back to (x,y,z) space
    let Y0 = j - t;
    let Z0 = k - t;

    let x0 = x - X0; // The x,y,z distances from the cell origin
    let y0 = y - Y0;
    let z0 = z - Z0;

    // 2. Determine which simplex we are in
    let i1, j1, k1; // Offsets for second corner
    let i2, j2, k2; // Offsets for third corner

    if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } // X Y Z
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; } // X Z Y
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; } // Z X Y
    } else { // x0 < y0
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; } // Z Y X
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; } // Y Z X
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; } // Y X Z
    }

    // A step of (1,0,0) in (i,j,k) means a step of (1-G3, -G3, -G3) in (x,y,z)
    let x1 = x0 - i1 + G3;
    let y1 = y0 - j1 + G3;
    let z1 = z0 - k1 + G3;
    let x2 = x0 - i2 + 2.0 * G3;
    let y2 = y0 - j2 + 2.0 * G3;
    let z2 = z0 - k2 + 2.0 * G3;
    let x3 = x0 - 1.0 + 3.0 * G3;
    let y3 = y0 - 1.0 + 3.0 * G3;
    let z3 = z0 - 1.0 + 3.0 * G3;

    // Work out the hashed gradient indices of the four simplex corners
    let ii = i & 255;
    let jj = j & 255;
    let kk = k & 255;

    // Calculate the contribution from the four corners
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0.0;
    else {
        t0 *= t0;
        let gi0 = this.permMod12[ii + this.perm[jj + this.perm[kk]]] * 3;
        n0 = t0 * t0 * (this.grad3[gi0] * x0 + this.grad3[gi0 + 1] * y0 + this.grad3[gi0 + 2] * z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0.0;
    else {
        t1 *= t1;
        let gi1 = this.permMod12[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] * 3;
        n1 = t1 * t1 * (this.grad3[gi1] * x1 + this.grad3[gi1 + 1] * y1 + this.grad3[gi1 + 2] * z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0.0;
    else {
        t2 *= t2;
        let gi2 = this.permMod12[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] * 3;
        n2 = t2 * t2 * (this.grad3[gi2] * x2 + this.grad3[gi2 + 1] * y2 + this.grad3[gi2 + 2] * z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0.0;
    else {
        t3 *= t3;
        let gi3 = this.permMod12[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] * 3;
        n3 = t3 * t3 * (this.grad3[gi3] * x3 + this.grad3[gi3 + 1] * y3 + this.grad3[gi3 + 2] * z3);
    }

    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1, 1].
    return 32.0 * (n0 + n1 + n2 + n3);
}
noise3d(octaves, falloff, scl, x, y, z) {
    let total = 0;
    let frequency = 1.0 / scl;
    let amplitude = 1.0;
    let maxAmplitude = 0;

    for (let i = 0; i < octaves; i++) {
        total += this.rawNoise3D(x * frequency, y * frequency, z * frequency) * amplitude;
        maxAmplitude += amplitude;
        amplitude *= falloff;
        frequency *= 2.0;
    }
    return total / maxAmplitude;
}
    // --- ARC-STYLE RIDGE 3D ---
    // Returns a value typically between 0.0 and 1.0
    ridge3d(octaves, falloff, scl, x, y, z) {
        let total = 0;
        let frequency = 1.0 / scl;
        let amplitude = 1.0;
        let maxAmplitude = 0;

        for (let i = 0; i < octaves; i++) {
            // 1. Get raw 3D noise [-1.0 to 1.0]
            let n = this.rawNoise3D(x * frequency, y * frequency, z * frequency);
            
            // 2. The "Ridge" transformation
            // Taking the absolute value creates a sharp seam at 0.
            // 1.0 - abs(n) flips it so the seam is a peak.
            n = 1.0 - Math.abs(n);
            
            // 3. Optional: Square the result (n * n) for even sharper ridges
            // Arc sometimes does this to make peaks more needle-like
            // n *= n; 

            total += n * amplitude;
            
            maxAmplitude += amplitude;
            amplitude *= falloff;
            frequency *= 2.0;
        }

        return total / maxAmplitude; 
    }

}
let simplex = new Simplex(16)
