var canvas = document.querySelector("canvas");
var draw = canvas.getContext("2d");
//fabricas
function pInsideScreen(x, y){
    return (
      x > 0 && x < w &&
      y > 0 && y < h
    )
  }
var line = (x1,y1,x2,y2,c) => {//linha
    
    draw.beginPath();
    draw.moveTo(x1,y1);
    draw.lineTo(x2,y2);
    draw.strokeStyle = `rgb(${x1},${y1},${x1/y1})`;
    draw.stroke();
};
var text = (t,x,y) => {
    draw.fillStyle="white"
    draw.font = "10px Arial";
    draw.fillText(t, x,y);
};
var loop = (f) => {//repetir
    window.requestAnimationFrame(f);
};
var rect = (x,y,w,h,c) => {
    draw.fillStyle = c ;
    draw.fillRect(x,y,w,h)
};
 var w = 0 ;
 var h = 0 ;
function triangle(p1,p2,p3){
    draw.beginPath();
    draw.moveTo(p1[0],p1[1]);
    draw.lineTo(p2[0],p2[1]);
    draw.lineTo(p3[0],p3[1])
    draw.lineTo(p1[0],p1[1])
    draw.strokeStyle = "#D9D6C7"
    draw.fillStyle = "#FDFFD2"
    //draw.fillStyle = `rgb(${p1[0]+p2[0]+p3[0]},${p1[1]+p2[1]+p3[1]},${p1[2]+p2[2]+p3[2]})`
    draw.fill();
    draw.stroke()
 }

 function triangleShadow(p1,p2,p3,col){
    
    draw.beginPath();
    draw.moveTo(p1[0],p1[1]);
    draw.lineTo(p2[0],p2[1]);
    draw.lineTo(p3[0],p3[1])
    draw.lineTo(p1[0],p1[1])
    
    draw.fillStyle = draw.strokeStyle = col
    draw.fill();
    draw.stroke()
    draw.closePath()
 }
 let abs = Math.abs
//3d function
var mx = 1,mnx = -1 , my = 1 , mny = -1 ;
 function perspective(p){
     var x = p[0];
     var y = p[1];
     var z = p[2];
     var perspective = parseInt(zoom.value)
     if(z + perspective < 0) return [undefined,undefined]
     return [
         x / ( z + perspective ),
         y / ( z + perspective )
     ];
 }
 function project(p){
     var perspectivePoint = perspective(p);
     var x = perspectivePoint[0];
     var y = perspectivePoint[1];
     return [
        w * ( x - (-2))/(2 -(-2)),
        h * ( 1 - ( y - (-2))/(2-(-2)))
    ];
 }
 var view = 0
 var cont = 0
 var z = 0
 function isBetweenfliwflow(p){
   return (p != undefined && p[2] <= flow && p[2] >= fliw)
 }
 let triangles = []
 function renderPoints(p,i){
   
  var projectedPoint = project(p);
  let x = projectedPoint[0], y = projectedPoint[1];
  
  let ic = i+c, i1 = i+1, ic1 = i+c+1;
  
  let p1 = renderedPoints[ic]
  let p2 = undefined, p3 = undefined;
  
  if(cont < c){
    p2 = renderedPoints[i1]
    p3 = renderedPoints[ic1]
  }
  let p4 = undefined
  
  if(view == 2 || view == 3){
    p1 = renderedPoints[i] 
    p4 = renderedPoints[ic]
  }
  
  if(p2 != undefined && p3 != undefined && p4 ){
    if (!pInsideScreen(p1[0], p1[1]) &&
      !pInsideScreen(p2[0], p2[1]) &&
      !pInsideScreen(p3[0], p3[1]) &&
      !pInsideScreen(x, y)
    ) return;
  }
  
  let isExistP1 = isBetweenfliwflow(p1),
    isExistP2 = isBetweenfliwflow(p2),
    isExistP3 = isBetweenfliwflow(p3),
    isExistP4 = isBetweenfliwflow(p4);
  
  if(view == 0) line(x,y,x,y+1)
  
  if(view == 1){
    if(isExistP1) line(x,y,p1[0],p1[1])
    if(isExistP2) line(x,y,p2[0],p2[1])
    if(isExistP3) line(x,y,p3[0],p3[1])
  }
  
  if(!(isExistP1 && isExistP2 && isExistP3 && isExistP4)) return;
  if(view == 2 || view == 3){
    let fstyle1 = "#fff",
        fstyle2 = "#fff";
    if(view == 3){
      let r = 255 - abs(point[i][1] * 100),
          g1 = 255 - abs(point[ic][1] * 100),
          g2 = 255 - abs(point[i1][1] * 100),
          b = 255 - abs(point[ic1][1] * 100);
      fstyle1 = `rgb(${r},${g2}, ${b})`
      fstyle2 = `rgb(${r},${g1}, ${b})`
    }
    triangles.push([p1, p2, p3, fstyle1])
    triangles.push([p1, p4, p3, fstyle2])
  }
  return
 }
 
function renderTriangles() {
  if(!(view == 2 || view == 3)) return;
  //takes point z avarage then sort which is closest
  triangles.sort((a, b) => {
    let c = (a[0][2] + a[1][2] + a[2][2]) / 3
    let d = (b[0][2] + b[1][2] + b[2][2]) / 3
    return d - c
  })
  
  triangles.forEach((t, i) => {
    if (view == 2) triangle(t[0], t[1], t[2])
    if (view == 3) triangleShadow(t[0], t[1], t[2], t[3])
  })
}
 function returnPoints(p,i){
     var projectedPoint = project(p);
     var x = projectedPoint[0];
     var y = projectedPoint[1];
     
    return [x,y,p[2]]
 }
 
 function cos(n){
     return Mathf.cos(n);
 }
 function sin(n){
     return Mathf.sin(n);
 }
 
 function rotateX(p,r){
    x = p[0] 
    y = p[1]
    z = p[2]
    return [
        cos(r) * x - sin(r) * z,
        y,
        sin(r) * x + cos(r) * z
    ]
}

 function rotateY(p,r){
    x = p[0]
    y = p[1]
    z = p[2]
    return [
        x,
        cos(r) * y - sin(r) * z,
        sin(r) * y + cos(r) * z
        
    ]
}

let before,now,fps;
before=Date.now();
fps=0;
requestAnimationFrame(
    function loop(){
        now=Date.now();
        fps=Math.round(1000/(now-before));
        before=now;
        requestAnimationFrame(loop);
        
    }
 );
//function
let point = [];
function Vector3(x,y,z){
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    point.push([this.x,this.y,this.z])
}


c = 0
seed = 0
function craterFunction(n,x, y, centerX, centerY, radius, minDepth) {
  // Calculate distance from center
  let cx = x - centerX, cy = y - centerY;
  const distance = Math.sqrt(cx * cx + cy * cy);
  // Normalize distance to range 0 to 1
  let px = ((cx*cx)/radius) - (radius/2);
  let py = ((cy*cy)/radius) - (radius/2);
  const normalizedDistance =  radius / distance;
  // Crater shape using sine function (adjust amplitude as needed)
  let craterShape = Math.max((px) + (py), -minDepth)
  if(normalizedDistance < 1) craterShape *= normalizedDistance * 0.01 
  // Apply crater shape based on distance
  return (craterShape);  // Adjust offset as needed
}

function ridge(x, y){
  return Math.pow((Math.abs(x) * -1) + 1, y)
}

function perlin(x, y ,se){
    let n = 0
    nn = Math.pow(x - 0.5,2)+Math.pow(y-0.5,2)
    let p1 = sin(Math.sqrt(nn))
    let p2 = sin(x + se) + cos(y + se)
    let p3 = sin(se + y)
    let p4 = sin(x+y+se) 
    let p5 = cos(x+y-se)
    n += p5
    n -= p1
    n += ridge(p2, 2)
    n -= p3 
    //n += ridge(p4, 2)
    n *= 0.2
    n += craterFunction(n ,x, y, 0, 0, 3,2)
    n -= craterFunction(n ,x, y, 0, 0, 1, 0.5)
    return n
}

function initPoint(X,Y,Z){
    point = []
    var s = 0.25
    var mp = 5
    var scl = 1

    a = 1
    seed = 1
    for(let x = -mp; x <= mp;x += s){
      c++
      for(let z = -mp; z <= mp; z += s){
        y = perlin(x*scl,z*scl,seed) / scl
        point.push([(x+X) * scl,(y+Y) * scl,(z+Z) * scl]);
      }
    }
    //c = ((2 * mp) * (1/s)) + (1)
}
var renderedPoints = [];

var rx= 0;
var ry = -0.45
var flow = 15
var fliw = -15
var opera = 0
var obg = ""

function loadObg(file){
        //file = file.replaceAll(":","()")
        file = file.replaceAll(";",");")
        file = file.replaceAll("v","Vector3(")
        eval(file)
        return file
    }
    let hh =0
function main(){
    //renderedPoints=[]
   //rx+=0.005
    opera++
     w = innerWidth ;
     h = innerHeight ;
     canvas.width = w ;
     canvas.height = h ;
     //rx += 0.01;
    
    rect(0,0,w,h,"#black");//background
    text("points "+point.length , 10, 30)
    text("FPS "+fps+"    "+Math.floor((fps*100)/70)+" % do fps completo",10,50)
    text("opera "+Math.floor(opera/10)+" seg",10,60)
    text("seed "+seed+" ",10,70)
    text("ver 0.0.2",w-60,h-20)
    text("alpha",w-60,h-30)
    
    
    cont=0
    obg = ""
    hh++
    triangles = []
    
    point.forEach(function(p,i){
        obg+=`v  ${p[0]} , ${p[1]} , ${p[2]} ;`
        if(cont > c - 1){
          cont = 0
        }
        cont++
        
        p[1] = perlin(p[0],p[2], hh/25)
        if(!(ax - nx == 0) || !(ax - ny == 0)){
          p = rotateX(p,rx)
          p = rotateY(p,ry)
        }
        renderedPoints[i] = returnPoints(p)
        if(p[2] <= flow && p[2] >= fliw && p[0] > -w/2 && p[0] < w/2 ){
          renderPoints(p,i)
        }
    })
    renderTriangles()
    if(ry > 1.50){
        ry = 1.49
    }else if(ry < -1.50){
        ry = -1.49
    }
    
    loop(main)
}

initPoint(0,0,0)
var ax = 0,ay = 0 ,nx = 0, ny = 0
main()
canvas.addEventListener("touchmove",function(e){
    nx = e.touches[0].clientX 
    ny = e.touches[0].clientY
    if(ny > ay){
      ry-=0.04
    }else{
      ry+=0.04
    }
    if(nx > ax){
        rx+=0.03
    }else{
        rx-=0.03
    }
    ax = nx 
    ay = ny
})
function set(){
   view+=1 
    if(view > 3){
        view = 0
    }
    //Vector3(event.pageX/100,0,0)
}
