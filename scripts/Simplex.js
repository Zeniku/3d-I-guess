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
    ridge(octaves, falloff, scl, x, y){
        let total = 0;
        let frequency = 1.0 / scl;
        let amplitude = 1.0;
        let maxAmplitude = 0;

        for (let i = 0; i < octaves; i++) {
            // Arc usually maps the -1 to 1 range, though you can adjust it to 0 to 1 if needed
            total += ((1 - Math.abs(this.rawNoise2D(x * frequency, y * frequency) * amplitude)) * 2) - 1;
            
            maxAmplitude += amplitude;
            amplitude *= falloff;
            frequency *= 2.0; // Lacunarity is typically fixed at 2.0 in simple implementations
        }

        return total / maxAmplitude; // Normalizes the result back to roughly [-1, 1]
    }
}
let simplex = new Simplex(6)
