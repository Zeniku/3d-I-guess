class TestWorld {
  constructor() {
    this.chunks = new Map();
    this.lastSnappedX = null;
    this.lastSnappedZ = null;
    this.lastLodV = null;
  }

  
  updateGridPoints(camX, y, camZ, time) {
    const lodv = global.lodv || 1;
    //const waterLevel = -(parseInt(document.getElementById('water').value) || 1);
    
    // 1. Calculate the squared movement distance since the last heavy update
    const dx = camX - (this.lastUpdateX || 0);
    const dz = camZ - (this.lastUpdateZ || 0);
    const moveDistSq = dx * dx + dz * dz;

    // 2. The Gatekeeper Condition
    // Trigger update if: Moved > 8 units OR LOD setting changed OR first run
    const hasMovedEnough = moveDistSq > 64; // 8 * 8 = 64
    const lodChanged = this.lastLodV !== lodv;

    if (hasMovedEnough || lodChanged || this.lastSnappedX === null) {
        const zoomInput = global.zoomv || 1;
        const chunkSize = 32;
        const mapSize = chunkSize * (10 - Math.floor((zoomInput - 1) / 99)); 

        const snappedX = Math.floor(camX / chunkSize) * chunkSize;
        const snappedZ = Math.floor(camZ / chunkSize) * chunkSize;

        // Run the manager
        this.manageChunks(snappedX, y, snappedZ, mapSize, chunkSize, lodv, 1);

        // Update tracking variables
        this.lastUpdateX = camX;
        this.lastUpdateZ = camZ;
        this.lastSnappedX = snappedX;
        this.lastSnappedZ = snappedZ;
        this.lastLodV = lodv;
        
        console.log("World Updated: Chunks managed.");
    }
}

  manageChunks(camX, camY, camZ, mapSize, chunkSize, lodv, waterLevel) {
    const activeKeys = new Set();
    const purgeRange = mapSize + (chunkSize  *  100); // Keep 2 extra rows of chunks in memory

    // 1. SPAWN ZONE: Only loops through the visible mapSize
    for (let x = -mapSize; x <= mapSize; x += chunkSize) {
        for (let z = -mapSize; z <= mapSize; z += chunkSize) {
            let wx = x + camX;
            let wz = z + camZ;
            let key = `${wx},${wz}`;
            activeKeys.add(key);

            if (!this.chunks.has(key)) {
                this.chunks.set(key, new Chunk(wx, camY, wz, chunkSize));
            }

        // 2. Determine LOD based on distance to camera
        const dx = wx - camX;
        const dz = wz - camZ;
        const distSq = dx * dx + dz * dz;

        let lodStep = 8;
        // Optimization: Use squared distance to avoid Math.sqrt()
        if (distSq < (4096 / (lodv * lodv))) lodStep = 1;      // ~64 units
        else if (distSq < (9216 / (lodv * lodv))) lodStep = 1.5; // ~96 units
        else if (distSq < (25600 / (lodv * lodv))) lodStep = 2;// ~160 units

        lodStep = Math.min(32, Math.pow(2, Math.round(Math.log2(lodStep))));

        // 3. Build/Update LOD
        this.chunks.get(key).buildMesh(lodStep, waterLevel, seed);
      }
    }

    // 4. Garbage Collection: Remove chunks that are no longer in range
    for (let [key, chunk] of this.chunks) {
        const dx = chunk.x - camX;
        const dz = chunk.z - camZ;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Only delete if it's outside the extended purge range
        if (dist > purgeRange) {
            this.chunks.delete(key);
        }
    }
  }
}
