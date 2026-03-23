class TouchHandler {
  static {
    this.rx = 0; 
    this.ry = -0.45;
    this.lx = 0; 
    this.ly = 0;
    this.tx = 0; 
    this.ty = 0; 
    this.tz = 0; 
    this.lookTouchId = null; 
  }

  static touchStart(e) {
    let halfWidth = window.innerWidth / 2;
    for (let t of e.changedTouches) {
      // ONLY grab the touch if it's on the RIGHT side of the screen
      if (t.clientX >= halfWidth && this.lookTouchId === null) {
        this.lookTouchId = t.identifier;
        this.lx = t.clientX;
        this.ly = t.clientY;
      }
    }
  }
  static constraint(){
    if(this.ry > 1.5) this.ry = 1.5
    if(this.ry < -1.5) this.ry = -1.5
  }
  static touchMove(e) {
    for (let t of e.changedTouches) {
      if (t.identifier === this.lookTouchId) {
        let currentX = t.clientX;
        let currentY = t.clientY;

        // FIXED: Horizontal drag changes Y-axis rotation (Yaw / Left-Right look)
        this.rx += (this.lx - currentX) * 0.01
        
        // FIXED & INVERTED: Vertical drag changes X-axis rotation (Pitch / Up-Down look)
        // By changing (this.ly - currentY) to (currentY - this.ly), we invert the Y-axis!
        this.ry += (this.ly - currentY) * 0.01
        this.constraint()
        
        // Update last positions for the next frame
        this.lx = currentX;
        this.ly = currentY;
      }
    }
  }

  static touchEnd(e) {
    for (let t of e.changedTouches) {
      if (t.identifier === this.lookTouchId) {
        this.lookTouchId = null; // Release the look finger
    
      }
    }
  }

  static init() {
    // CRITICAL FIX: Added the 'touchstart' listener so we know when the right thumb presses down!
    canvas.addEventListener("touchstart", e => this.touchStart(e), { passive: false });
    
    // We add {passive: false} to touchmove and call preventDefault() 
    // to stop the browser from trying to scroll the webpage while you look around.
    canvas.addEventListener("touchmove", e => { e.preventDefault(); this.touchMove(e); }, { passive: false });
    
    canvas.addEventListener("touchend", e => this.touchEnd(e));
    canvas.addEventListener("touchcancel", e => this.touchEnd(e));
  }
}



class Joystick {
  constructor(zoneWidth, zoneHeight) {
    // The invisible area where the joystick can be activated
    this.zone = { w: zoneWidth, h: zoneHeight };
    
    this.radius = 60;
    this.innerRadius = 25;
    
    // Position of the joystick base (set when touched)
    this.x = 0;
    this.y = 0;
    
    // Current pull vector (0 to 1)
    this.inputX = 0;
    this.inputZ = 0; // Mapping Y-touch to Z-world
    
    this.active = false;
    this.touchId = null;
  }

  update(touches, screenHeight) {
    // 1. Look for a new touch in the zone if not active
    if (!this.active) {
      for (let i = 0; i < touches.length; i++) {
        let t = touches[i];
        // Check if touch is in the bottom-left zone
        if (t.clientX < this.zone.w && t.clientY > screenHeight - this.zone.h) {
          this.active = true;
          this.touchId = t.identifier;
          this.x = t.clientX;
          this.y = t.clientY;
          break;
        }
      }
    }

    // 2. If active, track that specific finger
    if (this.active) {
      let found = false;
      for (let i = 0; i < touches.length; i++) {
        let t = touches[i];
        if (t.identifier === this.touchId) {
          found = true;
          let dx = t.clientX - this.x;
          let dy = t.clientY - this.y;
          let dist = Math.sqrt(dx * dx + dy * dy);

          // Clamp movement to radius
          if (dist > this.radius) {
            dx = (dx / dist) * this.radius;
            dy = (dy / dist) * this.radius;
          }

          // Normalize inputs for the game engine
          this.inputX = dx / this.radius;
          this.inputZ = -dy / this.radius;
          break;
        }
      }
      
      // If the finger was lifted
      if (!found) {
        this.reset();
      }
    }
  }

  reset() {
    this.active = false;
    this.touchId = null;
    this.inputX = 0;
    this.inputZ = 0;
  }

  draw() {
    if (!this.active) return;

    // Draw Outer Base
    Draw.color(1, 1, 1, 0.2);
    Lines.setStroke(2);
    Lines.circle(this.x, this.y, this.radius);

    // Draw Inner Knob
    let kx = this.x + (this.inputX * this.radius);
    let ky = this.y - (this.inputZ * this.radius);
    
    Draw.color(1, 1, 1, 0.5);
    Draw.circle(kx, ky, this.innerRadius);
    Draw.resetColor();
  }
}
// Global instance
const moveJoy = new Joystick(250, 250); // 250px zone in bottom-left
let currentTouches = [];

// Listen for touches globally
window.addEventListener("touchstart", e => { currentTouches = e.touches; });
window.addEventListener("touchmove", e => { currentTouches = e.touches; });
window.addEventListener("touchend", e => { currentTouches = e.touches; });
// Quick fix for inverted joystick feel:
