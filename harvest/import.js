"use strict";

// https://stackoverflow.com/a/47593316/1779797
function mkrng(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0);
    }
}


function drawPlant(ctx, rng){
  let sz = (ctx.canvas.width|=0)
  //let sz = (ctx.canvas.width)

  let border = sz*0.01
  ctx.fillStyle="green"
  let rns = []
  for(let i=0;i<100;i++){// Save more than I will need so it doesn't mess up things later
    rns.push(rng() / 4294967296);
  }
  function recurse(depth, hr){
    ctx.filter="hue-rotate("+-hr*4+"deg)"
    ctx.fillRect(sz*12/25,sz*0.33,sz/25,sz*0.67-border)
    //ctx.fillRect(0,sz/2,sz,sz/2-border)
    if (depth<=0){
      ctx.filter="hue-rotate("+-hr*(0.5+rns[6])*10+"deg)"
      ctx.fillRect(0,sz/2,sz,sz/2-border)
    }
    else{
      ctx.save()
      ctx.translate(sz/2,sz*0.69)
      ctx.scale(0.6,0.6)
      ctx.rotate(0.5+rns[3]/2)
      ctx.translate(-sz/2,-sz)
      recurse(depth-1,hr+3)
      ctx.restore()
      ctx.save()
      ctx.translate(sz/2,sz*0.85)
      ctx.scale(0.5+rns[1]/10,0.5+rns[0]/10)
      ctx.rotate(-rns[4]-0.4)
      ctx.translate(-sz/2,-sz)
      recurse(depth-1,hr+3+rns[2]/10)
      ctx.restore()
      ctx.save()
      ctx.translate(sz/2,sz*0.7)
      ctx.scale(0.68,0.69)
      ctx.rotate(0.1*(0.5-rns[8]))
      ctx.translate(-sz/2,-sz)
      recurse(depth-0.6,hr+1)
      ctx.restore()
    }
  }
  recurse(7, 0)
}
function drawLock(ctx){
  let sz = (ctx.canvas.width|=0)
  ctx.save()
  ctx.strokeStyle="black"
  ctx.fillStyle="black"
  ctx.lineWidth = sz/10
  ctx.beginPath()
  ctx.arc(sz/2,sz*0.4,sz/4, 0,2*Math.PI)
  ctx.stroke()
  ctx.fillRect(sz/10,sz*0.4,4*sz/5,sz*0.5)
  ctx.restore()
}

async function saveImg(canvas){
  return new Promise(function(resolve,reject){
    let img = new Image()
    canvas.toBlob(x=>{
        let u = URL.createObjectURL(x)
        img.onload = function(){
            URL.revokeObjectURL(u)
            resolve(img)
        }
        img.src=u
    });
  })
}

function interpolate( a0, a1, w) {
  /* // You may want clamping by inserting:
   * if (0.0 > w) return a0;
   * if (1.0 < w) return a1;
   */
  return (a1 - a0) * w + a0;
  /* // Use this cubic interpolation [[Smoothstep]] instead, for a smooth appearance:
   * return (a1 - a0) * (3.0 - w * 2.0) * w * w + a0;
   *
   * // Use [[Smootherstep]] for an even smoother result with a second derivative equal to zero on boundaries:
   * return (a1 - a0) * ((w * (w * 6.0 - 15.0) + 10.0) * w * w * w) + a0;
   */
}

//https://en.wikipedia.org/wiki/Perlin_noise
function perlin(rng,n){ // makes an n*n perlin noise grid
  let g = []
  let offsetx = 0.5+(rng()%REGSZ)
  let offsety = 0.5+(rng()%REGSZ)
  let sqsz = REGSZ/n
  for(let i=0;i<n;i++){
    let row = []
    for(let j=0;j<n;j++){
      let r = 2*Math.PI*rng() / 4294967296
      row.push({x:Math.cos(r),y:Math.sin(r)})
    }
    g.push(row)
  }

  // Computes the dot product of the distance and gradient vectors.
  function dotGridGradient(ix, iy, x, y) {
      // Get gradient from integer coordinates
      let gradient = g[ix%n][iy%n];

      // Compute the distance vector
      let  dx = x - ix;
      let dy = y - iy;

      // Compute the dot-product
      return (dx*gradient.x + dy*gradient.y);
  }
  return function(x,y){
    x += offsetx
    y += offsety
    x/=sqsz
    y/=sqsz
    let x0 = Math.floor(x)
    let x1 = x0+1
    let y0 = Math.floor(y)
    let y1 = y0+1

    // Determine interpolation weights
    // Could also use higher order polynomial/s-curve here
    let sx = x - x0;
    let sy = y - y0;
    let n0, n1, ix0, ix1, value;

    n0 = dotGridGradient(x0, y0, x, y);
    n1 = dotGridGradient(x1, y0, x, y);
    ix0 = interpolate(n0, n1, sx);

    n0 = dotGridGradient(x0, y1, x, y);
    n1 = dotGridGradient(x1, y1, x, y);
    ix1 = interpolate(n0, n1, sx);

    return interpolate(ix0, ix1, sy);
  }
}