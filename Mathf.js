class Mathf {
  static {
    this.PI = 3.1415927;
    this.pi = this.PI; 
    this.halfPi = this.PI/2;
    this.PI2 = this.PI * 2;
    this.radiansToDegrees = 180 / this.PI;
    this.radDeg = this.radiansToDegrees;
    this.degreesToRadians = this.PI / 180;
    this.degRad = this.degreesToRadians;
    this.sinBits = 14; // 16KB. Adjust for accuracy.
    this.sinMask = ~(-1 << this.sinBits);
    this.sinCount = this.sinMask + 1;
    this.sinTable = new Float32Array(this.sinCount);
    this.radFull = this.PI * 2;
    this.degFull = 360;
    this.radToIndex = this.sinCount / this.radFull;
    this.degToIndex = this.sinCount / this.degFull;
    
      for(let i = 0; i < this.sinCount; i++)
        this.sinTable[i] = Math.sin((i + 0.5) / this.sinCount * this.radFull);
      for(let i = 0; i < 360; i += 90)
        this.sinTable[Math.round(i * this.degToIndex) & this.sinMask] = Math.sin(i * this.degreesToRadians);

      this.sinTable[0] = 0;
      this.sinTable[Math.round(90 * this.degToIndex) & this.sinMask] = 1;
      this.sinTable[Math.round(180 * this.degToIndex) & this.sinMask] = 0;
      this.sinTable[Math.round(270 * this.degToIndex) & this.sinMask] = -1;
  }
  static sin(radians){
    return this.sinTable[Math.round(radians * this.radToIndex) & this.sinMask];
  }
  static cos(radians){
    return this.sinTable[Math.round((radians + this.PI / 2) * this.radToIndex) & this.sinMask];
  }
  static sinDeg(degrees){
    return this.sinTable[Math.round(degrees * this.degToIndex) & this.sinMask];
  }

    /** Returns the cosine in radians from a lookup table. */
  static cosDeg(degrees){
    return this.sinTable[Math.round((degrees + 90) * this.degToIndex) & this.sinMask];
  }
  static dst(x1, y1, x2, y2){
    let dx = x1 - x2
    let dy = y1 - y2
    return Math.sqrt(dx * dx + dy * dy)
  }
  static dst2(x1, y1, x2, y2){
    let dx = x1 - x2
    let dy = y1 - y2
    return dx * dx + dy * dy
  }
  static angle(x, y){
    let ang = Math.atan2(y, x) * this.radiansToDegrees
    if(ang < 0) ang += 360
    //console.log(Math.atan2(y, x))
    return ang
  }
  static angleTo(x1, y1, x2, y2){
    let dx = x2 - x1
    let dy = y2 - y1
    //console.log(x1, x2,dx, dy)
    return this.angle(dx, dy)
  }
}
