
function dot(p,q){
  return (p[0]*q[0]+p[1]*q[1]+p[2]*q[2])
}
function mul(v,k){
  return [v[0]*k, v[1]*k, v[2]*k]
  //return v.map(x=>(x*k));
}
function diff(p,q){
  return [p[0]-q[0],p[1]-q[1],p[2]-q[2]]
}
function addd(p,q){
  return [p[0]+q[0],p[1]+q[1],p[2]+q[2]]
}
function perp(p,q,r){// vector perpendicular to a triangle
  return cross(diff(q,p),diff(r,p))
}
function norm(v){
  let k = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])
  if (k<epsilon) console.log("division by zero",v)
  return mul(v,1/k)
}
// Returns a list of faces (where each face is a list of 3 indices into pts describing a triangle
// assumes the first 3 elements of pts are not colinear.
function quickHull(pts){
  //find initial facets
  let p = perp(pts[0],pts[1],pts[2])
  let n = 0
  let faces = {}
  let edges = {}
  function addFace(face){
    let [p,q,r] = face.sort() //vertex indices (sorted)
    let faceNum = n++
    //console.log("adding", faceNum,[p,q,r])
    faces[faceNum] = face
    for(let s of [[p,q],[q,r],[p,r]]) {
      if (!edges[s]) edges[s]=[]
      edges[s].push(faceNum)
    }
  }
  addFace([0,1,2])
  function removeFace(faceNum){
    let [p,q,r] = faces[faceNum]
    //console.log("removing",faceNum,[p,q,r])
    delete faces[faceNum]
    for(let s of [[p,q],[q,r],[p,r]]) {
      edges[s]=edges[s].filter(x=>x!=faceNum)
    }
  }
  let dotface = dot(pts[0],p)
  let middle = [0,0,0]
  for(let i=0;i<3;i++){
    middle=[middle[0]+pts[i][0], middle[1]+pts[i][1], middle[2]+pts[i][2]]
  }
  let seen = {0:true, 1:true, 2:true}
  for (let i=3; i<pts.length; i++){
    if(Math.abs(dot(pts[i],p) - dotface) > 0.01){
      addFace([0,1,i])
      addFace([0,2,i])
      addFace([1,2,i])
      seen[i]=true
      middle=[(middle[0]+pts[i][0])/4, (middle[1]+pts[i][1])/4, (middle[2]+pts[i][2])/4] // This should always be internal to the partial convex hull
      break
    }
  }
  let fn = 0
  while(fn<n){
    let face = faces[fn]
    if(face!==undefined) {
      let [p,q,r] = [pts[face[0]],pts[face[1]],pts[face[2]]]
      let prp = perp(p,q,r)
      let dotface = dot(p,prp)
      let dotcenter = dot(middle,prp)
      if(dotcenter>dotface){
        prp=mul(prp,-1)
        dotcenter*=-1
        dotface*=-1
      }
      let farP = undefined
      let maxdot = dotface
      for(let i=3;i<pts.length;i++)if(!seen[i]){
        let dotp = dot(pts[i],prp)
        if(dotp>maxdot){
          maxdot=dotp
          farP=i
        }
      }
      if (farP!==undefined){
        seen[farP]=true
        removeFace(fn)
        let horizon = [[face[0],face[1]],[face[1],face[2]],[face[0],face[2]]]
        let horCount = {}
        for(let i=0;i<horizon.length; i++){
          let e = horizon[i]
          if(!horCount[e]) horCount[e]=0
          horCount[e]+=1
          let faceV = edges[e]
          if(faceV.length==1){
            let faceVN = faceV[0]
            let idxs = faces[faceVN]
            let fvpts = [pts[idxs[0]], pts[idxs[1]], pts[idxs[2]]]
            let fvprp = perp(...fvpts)
            let fvdot = dot(fvprp,fvpts[0])
            //console.log(faceVN, fvdot, dot(fvprp,middle), dot(fvprp,farP))
            if((fvdot < dot(fvprp,middle)) == (fvdot > dot(fvprp,pts[farP]))) {// face is visible from farP
              removeFace(faceVN)
              horizon.push([idxs[0],idxs[1]], [idxs[1],idxs[2]],[idxs[0],idxs[2]])
            }
          } else if (faceV.length>1){
            console.log(e+"",faceV)
            throw "should be at most 2 faces per edge, and we removed one before adding the edge to the horizon"
          }
        }
        for(let e in horCount){
          if(horCount[e]==1){// it is part of the horizon
            let [j,k] = e.split(",").map(Number)
            addFace([farP,j,k])
          }
        }
      }
    }
    fn+=1
  }
  result=[]
  for(let faceNum in faces){
    result.push(faces[faceNum])
  }
  return result;
}