// tower cross section is 2x2x2 cube (centered at 0,0,0) to make units easy
// pieces are 1x1x2 cuboids
// layers have the shape:
// 00  23
// 11  23
//  (containing pieces numbered 0, 1, 2 and 3)
// uniform density of 2(units mass per cubic unit)

const initial = [
  [[1,1,1],[-1,1,1]],
  [[1,-1,1],[-1,-1,1]],
  [[1,1,-1],[1,-1,-1]],
  [[-1,1,-1],[-1,-1,-1]],
]
function mkLayer(dir, opt){ // dir(0,1 or 2) is the direction in which the piece at 1,1,1 goes
  //opt says whether the permutation of dimensions is order 2 or not
  let pieces=[]
  let va=dir
  let vb=(opt?dir+1:dir+2)%3
  let vc=3-va-vb
  for (let piece of initial){
    pieces.push(piece.map(c=> [c[va],c[vb],c[vc]]) )
  }
  return pieces
}

function cornersofcube(pt){
  let res=[]
  for(i=0;i<8;i++){
    res.push(pt.map((x,v)=>(i&(1<<v))?0:x))
  }
  return res
}
function cuboidToEdges(c){
  let corners = []
  for(i=0;i<8;i++){
    corners.push(c[0].map((x,v)=>(i&(1<<v))?(c[1][v]==x?0:-x):x))
  }
  let res=[]
  for(i=0;i<8;i++){
    for(j=0;j<3;j++){
      if ((~i)&(1<<j)){
        res.push([corners[i],corners[i|(1<<j)]])
      }
    }
  }
  return res
}
const cubeTris=[
  0,1,3,
  1,3,5,
  3,5,7,
  5,7,6,
  7,6,3,
  6,3,2,
  3,2,0,
  2,0,6,
  0,6,4,
  6,4,5,
  4,5,0,
  5,0,1
]
function cuboidToTriangles(c){
  let corners = []
  for(i=0;i<8;i++){
    corners.push(c[0].map((x,v)=>(i&(1<<v))?(c[1][v]==x?0:-x):x))
  }
  let res=[]
  for (let i of cubeTris){
    res.push(corners[i])
  }
  return res
}

stack = []
const stacksize = 20
for(let i=0;i<stacksize;i++){
  let l=i%6
  let layer = {
    pieces:mkLayer(l%3, l>>1),
    mass:16,
    com:[0,0,0],//multiplied py mass
    massAbove :16*(stacksize-i-1),
    comAbove:[0,0,0,0]
  }
  stack.push(layer)
}

function computeCoMs(){
  for(let l = stacksize-1; l>=0; l--){
    let layer = stack[l]
    layer.com=[0,0,0]
    layer.mass=0
    layer.occupied={}//set of occupied cubes in this layer
    for(let piece of layer.pieces)if(piece){
      layer.mass+=4
      for(let pt of piece){
        for(let d=0;d<3;d++)layer.com[d]+=pt[d]
        layer.occupied[pt]=true
      }
    }
    if(l>0){
      lowerLayer = stack[l-1]
      lowerLayer.massAbove = layer.massAbove+layer.mass
      lowerLayer.comAbove = []
      for(let d=0;d<3;d++)lowerLayer.comAbove.push(layer.comAbove[d]+layer.com[d])
      lowerLayer.comAbove.push(layer.comAbove[3]+(layer.mass)*(l+0.5))
    }
  }
}
function cross(p,q){
  // cross product of 2 points in 3d space
  return [
    p[1]*q[2]-p[2]*q[1],
    p[2]*q[0]-p[0]*q[2],
    p[0]*q[1]-p[1]*q[0]
  ]
}
function getouter(cubes){// returns a set of points, the convex hull of which is that of the cubes
  s={}
  for (let cube of cubes){
    for (let pt of cornersofcube(cube)){
      if(s[pt]){s[pt]+=1}else{s[pt]=1}
    }
  }
  result=[]
  for(let pt in s){
    if(s[pt]==1) result.push(pt.split(",").map(Number))
  }
  return result
}

const epsilon = 0.0001
function findfalls(){
  /*TODO: compute individual pieces that drop
  for(let i=1;i<stacksize;i++){
    layer = stack[i]
    prevLayer = stack[i-1]
    for (let piece of prevLayer.pieces){
    }
  }*/
  computeCoMs()
  for(let l=0; l<stacksize-1; l++){
    layer = stack[l]
    layerAbove = stack[l+1]
    surface = []// The suface on which layer l+1 rests on layer l
    for (let p in layer.occupied){
      if(layerAbove.occupied[p]){
        surface.push(p.split(",").map(Number))
      }
    }
    let com = [0,0,0]
    let mass=0
    for(let pt of surface){
      mass += 2
      com = [com[0]+pt[0],com[1]+pt[1],com[2]+pt[2]]
    }
    if(mass==0){
      return ["empty", l, undefined]
    }
    let pts = getouter(surface)
    //determine if comAbove is inside the convex hull of pts (check each face (we try every triple)), and see if it's in a different direction to the com )
    com = mul(com,1/mass)//[com[0]/mass,com[1]/mass,com[2]/mass]
    let comAbove = mul(layer.comAbove,1/layer.massAbove)
    let faces = quickHull(pts)
    for(let face of faces){
      let [p,q,r] = face.map(i=>pts[i])
      let prp = norm(perp(p,q,r))
      let dotface = dot(p,prp)
      let dotA = dot(comAbove,prp)
      if((dot(com,prp)<dotface) !=  (dotA<dotface)){// if comAbove is outside the convex hull of the boundary
        return ["outside", l,[p,q,r]]
      }
      let comw = layer.comAbove[3]/layer.massAbove
      let tipneeded = Math.abs(dotA-dotface)
      //console.log(l,tipneeded,comw-(l+1))
      const sintip=0.05 // sin of maximum tilt ( ~= maximum tilt in radians)
      if(Math.abs(dotA-dotface)<=(comw-(l+1))*sintip){
        if (dot(com,prp)>dotface){
          prp=mul(prp,-1)
        }
        return ["near", l, [p,q,r],prp, [Math.abs(dotA-dotface),(comw-(l+1))*sintip]+"" ]
      }
    }
  }
}