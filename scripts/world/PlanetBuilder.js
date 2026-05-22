function perlin3d(x, y, z,waterLevel) {
    // 1. BASE TERRAIN (The "Foundation")
    // Use a very smooth, low-frequency noise for the general "land vs sea"
    let baseHeight = simplex.noise3d(4, 0.5, 2, x, y, z) * 3; 

    // 2. MOUNTAIN FEATURES (The "Detail")
    // Use ridge noise for the sharp bits
    let ridgeValue = simplex.ridge3d(3, 0.4, 0.5, x, y, z);
    // Lague's Trick: Raise to a power to make valleys flat and peaks sharp
    let mountainHeight = Math.pow(Math.max(0, ridgeValue), 2);

    // 3. MASKING
    // Only allow mountains to appear where the base height is already high (above sea level)
    let mountainMask = Math.max(0, baseHeight); 
    
    // Final Composition
    let finalHeight = baseHeight + (mountainHeight * mountainMask);

    // 4. WATER LEVEL (The Lague Way)
    // Instead of smoothMin, we just clamp or handle it in the renderer
    // But for a single value return:
    
    return smoothMax(waterLevel, finalHeight, 0.5);
}
class PlanetBuilder {
    constructor(radius, detail, waterLevel) {
        this.radius = radius;
        this.detail = detail;
        this.waterLevel = waterLevel;
        
        this.vertices = [];
        this.faces = []; // Array of [v1_index, v2_index, v3_index]
        
        this.buildMesh()
    }

    buildMesh() {
        // 1. Base Icosahedron Constants
        const t = (1.0 + Math.sqrt(5.0)) / 2.0;
        
        // Initial 12 vertices
        let rawVerts = [
            [-1,  t,  0], [ 1,  t,  0], [-1, -t,  0], [ 1, -t,  0],
            [ 0, -1,  t], [ 0,  1,  t], [ 0, -1, -t], [ 0,  1, -t],
            [ t,  0, -1], [ t,  0,  1], [-t,  0, -1], [-t,  0,  1]
        ];

        // Normalize initial vertices to sphere radius
        this.vertices = rawVerts.map(v => this.normalizeAndScale(v, 1.0));

        // 20 Initial Triangular Faces
        this.faces = [
            [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
            [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
            [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
            [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
        ];

        // 2. Subdivide faces to add detail
        let midpointCache = new Map();
        
        const getMiddlePoint = (p1_idx, p2_idx) => {
            // Create a unique key for the edge
            const firstIsSmaller = p1_idx < p2_idx;
            const smallerIndex = firstIsSmaller ? p1_idx : p2_idx;
            const greaterIndex = firstIsSmaller ? p2_idx : p1_idx;
            const key = (smallerIndex << 16) + greaterIndex;

            if (midpointCache.has(key)) return midpointCache.get(key);

            const v1 = this.vertices[p1_idx];
            const v2 = this.vertices[p2_idx];
            
            // Average the two points
            const mid = [
                (v1[0] + v2[0]) / 2.0,
                (v1[1] + v2[1]) / 2.0,
                (v1[2] + v2[2]) / 2.0
            ];

            // Normalize back to sphere
            const normalizedMid = this.normalizeAndScale(mid, 1.0);
            
            this.vertices.push(normalizedMid);
            const mid_idx = this.vertices.length - 1;
            midpointCache.set(key, mid_idx);
            
            return mid_idx;
        };

        for (let i = 0; i < this.detail; i++) {
            const nextFaces = [];
            for (let face of this.faces) {
                const a = getMiddlePoint(face[0], face[1]);
                const b = getMiddlePoint(face[1], face[2]);
                const c = getMiddlePoint(face[2], face[0]);

                nextFaces.push([face[0], a, c]);
                nextFaces.push([face[1], b, a]);
                nextFaces.push([face[2], c, b]);
                nextFaces.push([a, b, c]);
            }
            this.faces = nextFaces;
        }

        // 3. Apply 3D Terrain Displacement
        // We displace vertices AFTER subdivision so the mesh doesn't tear
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            
            // NOTE: You must use a 3D noise fu=== 9:nction here.
            // If using standard simplex-noise.js, it's usually noise3D(x,y,z)
            // We sample noise using the normalized direction vector.
            //console.log(simplex)
            let noiseVal = perlin3d(v[0]*2, v[1]*2, v[2]*2, this.waterLevel); 
            
            // Create mountains and oceans
            let elevation = noiseVal; 
            
            // Scale vertex outward by radius + elevation
            this.vertices[i] = [
                v[0] * (this.radius + elevation),
                v[1] * (this.radius + elevation),
                v[2] * (this.radius + elevation)
            ];
            
            // Store raw elevation length for coloring later!== 
            this.vertices[i].elevation = elevation; 
        }
    }

    normalizeAndScale(v, scale) {
        const length = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
        return [
            (v[0] / length) * scale,
            (v[1] / length) * scale,
            (v[2] / length) * scale
        ];
    }

    getBiomeColor(elevation) {
        if (elevation <= this.waterLevel + 0.01) return [0.1, 0.3, 0.8, 1]; // Deep Water
        if (elevation < this.waterLevel + 0.05) return [0.2, 0.6, 0.9, 1]; // Shallow Water
        if (elevation < this.waterLevel + 0.08) return [0.9, 0.8, 0.5, 1]; // Sand
        if (elevation < 0.1) return [0.2, 0.7, 0.3, 1];                    // Grass
        if (elevation < 0.15) return [0.4, 0.4, 0.42, 1];                  // Rock
        return [0.9, 0.9, 0.95, 1];   
    }

    // Pushes the entire planet to your MeshBatchOptimized
        render() {
            
        for (let face of this.faces) {
            // Check capacity for ONE triangle (3 vertices) per iteration
            Draw.batch.ensureCapacity(1); 

            const v1 = this.vertices[face[0]];
            const v2 = this.vertices[face[1]];
            const v3 = this.vertices[face[2]];

            // Calculate Flat Face Normal using Cross Product
            const ux = v2[0] - v1[0], uy = v2[1] - v1[1], uz = v2[2] - v1[2];
            const vx = v3[0] - v1[0], vy = v3[1] - v1[1], vz = v3[2] - v1[2];
            
            let nx = uy * vz - uz * vy;
            let ny = uz * vx - ux * vz;
            let nz = ux * vy - uy * vx;

            // Normalize the normal
            const nLen = Math.sqrt(nx*nx + ny*ny + nz*nz);
            nx /= nLen; ny /= nLen; nz /= nLen;

            // Get color based on the average elevation of the face
            const avgElev = (v1.elevation + v2.elevation + v3.elevation) / 3.0;
            const col = this.getBiomeColor(avgElev);

            // Push the 3 vertices
            Draw.batch.push(
                nx, ny, nz, 
                this.radius + avgElev, 
                col[0], col[1], col[2], 1.0,  // Base Color
                0.0, 0, 0, 0)  // Slight blue emissive glow
        }
    }
}