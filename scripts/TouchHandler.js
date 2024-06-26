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
    }
  
    this.x = e.touches[0].clientX
    this.y = e.touches[0].clientY
  
    this.distx = (this.lx - this.x) * 0.01
    this.disty = (this.ly - this.y) * 0.01
    this.rx += this.distx * deltaTime
    this.ry += this.disty * deltaTime
    
    this.constraint()
    this.lx = e.touches[0].clientX
    this.ly = e.touches[0].clientY
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