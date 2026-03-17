class TouchHandler {
  static {
    this.x = 0
    this.y = 0
    this.distx = 0
    this.disty = 0
    this.lx = 0 
    this.ly = 0
    this.setT = true
    this.rx = 0
    this.ry = -0.45
  }
  static constraint(){
    if(this.ry > 1.5) this.ry = 1.5
    if(this.ry < -1.5) this.ry = -1.5
  }
  static touchMove(e){
    if(this.setT){
      this.lx = e.touches[0].clientX
      this.ly = e.touches[0].clientY
      this.setT = false
      return; // Return early to establish baseline
    }
  
    // 1. Get current position
    let currentX = e.touches[0].clientX;
    let currentY = e.touches[0].clientY;

    this.x = currentX;
    this.y = currentY;
  
    // 2. Calculate Distance (Delta) from LAST frame
    // FIXED: Do not use velocity over time, use absolute pixel difference
    this.distx = (this.lx - currentX) * 0.01;
    this.disty = (this.ly - currentY) * 0.01;

    // 3. Apply Delta
    // FIXED: Removed deltaTime. Rotation is 1:1 with finger movement.
    this.rx += this.distx;
    this.ry += this.disty;
    
    this.constraint()

    // 4. Update Last Position for next frame
    this.lx = currentX;
    this.ly = currentY;
  }
  static touchEnd(e){
    this.setT = true
    this.x = 0
    this.y = 0
    this.lx = 0
    this.ly = 0
  }
  static init(){
    canvas.addEventListener("touchmove", e => this.touchMove(e))
    canvas.addEventListener("touchend", e => this.touchEnd(e))
    canvas.addEventListener("touchcancel", e => this.touchEnd(e))
  }
}