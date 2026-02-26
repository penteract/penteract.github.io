let spmat = new DOMMatrix().translate(-ox-w/2,-oy-h/2) // convert from canvas coordinates to logical ones (500x500)

function partToMatrix(p){
  // return new DOMMatrix().translate(-ox-w/2,-oy-h/2) .translate(ox+(p.x-p.w/2)*h,oy+(p.y-p.h/2)*w).scale(p.w,p.h).rotate(p.rot).translate(ox+w/2,oy+h/2)
  //
  let m = spmat.inverse().translate((p.x-1/2)*h,(p.y-1/2)*w).rotate(p.rot).scale(p.w,p.h).multiply(spmat)
  //.translate(-ox-w/2,-oy-h/2)
  //  return new DOMMatrix().translate((p.x-p.w/2)*h,(p.y-p.h/2)*w).scale(p.w,p.h).rotate(p.rot)
  return m
}
function determinant(mat){
  return mat.a*mat.d - mat.b*mat.c
}

// how much detail should be used to track the sets
let MaxSearchDepth = 10;
//let containers

// Draw a fractal described by parts onto canvas with context ctx using n iterations and
// returning a 2d segment tree describing the set of visited points if count is true
function drawFractalAt(parts,ctx,n,count){
  console.log(n)
  if (parts.length<1) return null;
  let mats = parts.map(partToMatrix)
  let ptsz = Math.sqrt(w*h/n)
  //ptsz*ptsz*n=w*h
  let p = {x:ox+w/2,y:oy+h/2}
  let containers
  if(count){
    containers = []
    let searchDepth = Math.min(MaxSearchDepth, (8 + Math.log2(n/100000)/2)) // calculate dimension and distance more carefully when possible
    for(let i=0;i<=searchDepth;i++){
      let l=[]
      for(let x=0;x<(1<<i);x++)
        l.push(new Array(1<<i).fill(0))
      containers.push(l)
    }
  }
  let rtn = Math.sqrt(n)
  let mxs = {x:-Infinity,y:-Infinity}
  let mns = {x:Infinity,y:Infinity}
  let cumArea = 0
  let cumAreas = mats.map( m => cumArea+=Math.max(0.01, Math.abs(determinant(m))) )
  function randomMat(){
    let val = Math.random()*cumArea
    let l = 0
    let r = cumAreas.length-1
    while (l < r){
      let mid = (l+r)>>1
      if (cumAreas[mid] <= val) {l = mid+1}
      else {r = mid}
    }
    return r
  }

  for(let i=0;i<100;i++){
    p = mats[randomMat()].transformPoint(p)
  }
  for(let i=0;i<rtn;i++){
    p = mats[randomMat()].transformPoint(p)
    for(let c of "xy"){
      if(mxs[c]<p[c])mxs[c]=p[c]
      if(mns[c]>p[c])mns[c]=p[c]
    }
  }
  function tr(m,p){
    return {x:p.x*m.a+p.y*m.c+m.e, y:p.x*m.b+p.y*m.d+m.f}
  }
  for(let i=0;i<n;i++){
    //p = mats[randomMat()].transformPoint(p)
    p = tr(mats[randomMat()],p)
    ctx.fillRect(p.x-ptsz/2,p.y-ptsz/2,ptsz,ptsz)
    if(count){
      let x=p.x-ox
      let y=p.y-oy
      if(x>=0 && x<w && y>=0 && y<h){
        containers.map((c,i)=>c[((x*(1<<i))/w)|0 ][((y*(1<<i))/h)|0]+=1)
      }
    }
  }
  ctx.strokeRect(ox,oy,w,h)
  return containers
}


let ctx = bigPic.getContext("2d")
function drawFractal(n,count){
  bigPic.width|=0
  ctx.fillStyle="#FFF"
  ctx.strokeStyle="#FFF"

  let r = drawFractalAt(parts,ctx,n,count)
  return r
}
function mkSmallCanvas(pts,n,ww,hh){
  let op=parts
  parts=pts
  drawFractal(n)
  let newCanvas = document.createElement("canvas")
  newCanvas.width=ww
  newCanvas.height=hh
  let ctx=newCanvas.getContext("2d")
  ctx.drawImage(bigPic, ox, oy, w, h, 0, 0, newCanvas.width, newCanvas.height)
  parts = op
  return newCanvas
}
