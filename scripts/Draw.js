function line(x1, y1, x2, y2, c){ 
  draw.beginPath();
  draw.moveTo(x1, y1);
  draw.lineTo(x2, y2);
  draw.strokeStyle = `rgb(${x1},${y1},${x1/y1})`;
  draw.stroke();
};
function seg(arr){
  let h = arr.length
 //draw.beginPath()
  draw.moveTo(arr[0][0], arr[0][1]);
  for(let i = 1; i <= h - 1; i++){
    //console.log(arr[i][0], arr[i][1])
    draw.lineTo(arr[i][0], arr[i][1])
  }
  draw.lineTo(arr[0][0], arr[0][1])
  //console.log()
}
function text(t, x, y){
  draw.fillStyle = "white"
  draw.font = "10px Arial";
  draw.fillText(t, x, y);
};
function rect(x, y, w, h, c){
  draw.fillStyle = c;
  draw.fillRect(x, y, w, h)
};
let hh = true
function triangle(p1, p2, p3, col = "#FDFFD2", fill , strokeStyle = "#D9D6C7") {
  draw.beginPath();
  seg([p1, p2, p3]); hh = false
  draw.strokeStyle = strokeStyle
  draw.fillStyle = col
  if(!fill) draw.strokeStyle = `rgb(${p1[0]+p2[0]+p3[0]},${p1[1]+p2[1]+p3[1]},${p1[2]+p2[2]+p3[2]})`
  if(fill) draw.fill();
  draw.stroke()
}