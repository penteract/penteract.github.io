function dot(p,q){
  return (p[0]*q[0]+p[1]*q[1]+p[2]*q[2])
}
function dot4(p,q){
  return (p[0]*q[0]+p[1]*q[1]+p[2]*q[2]+p[3]*q[3])
}
function mul(v,k){
  return [v[0]*k, v[1]*k, v[2]*k]
}
function mul4(v,k){
  return [v[0]*k, v[1]*k, v[2]*k, v[3]*k]
}
function diff(p,q){
  return [p[0]-q[0],p[1]-q[1],p[2]-q[2]]
}
function dif4(p,q){
  return [p[0]-q[0],p[1]-q[1],p[2]-q[2],p[3]-q[3]]
}
function addd(p,q){
  return [p[0]+q[0],p[1]+q[1],p[2]+q[2]]
}
function add4(p,q){
  return [p[0]+q[0],p[1]+q[1],p[2]+q[2],p[3]+q[3]]
}
function cross(p,q){
  // cross product of 2 points in 3d space
  return [
    p[1]*q[2]-p[2]*q[1],
    p[2]*q[0]-p[0]*q[2],
    p[0]*q[1]-p[1]*q[0]
  ]
}
function perp(p,q,r){// vector perpendicular to a triangle
  return cross(diff(q,p),diff(r,p))
}
function norm(v){
  let k = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])
  if (k<epsilon) console.log("division by zero",v)
  return mul(v,1/k)
}
function norm4(v){
  let k = len4(v)
  if (k<epsilon) console.log("division by zero",v)
  return mul4(v,1/k)
}

function len4(v){
  return Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]+v[3]*v[3])
}
// Helper functions:
function perp4(a,b,c){
  let [ax,ay,az,aw]=a;
  let [bx,by,bz,bw]=b;
  let [cx,cy,cz,cw]=c;
  let v= [
    ay*bz*cw+az*bw*cy+aw*by*cz-ay*bw*cz-az*by*cw-aw*bz*cy,
    ax*bw*cz+aw*bz*cx+az*bx*cw-ax*bz*cw-aw*bx*cz-az*bw*cx,
    aw*bx*cy+ax*by*cw+ay*bw*cx-aw*by*cx-ax*bw*cy-ay*bx*cw,
    az*by*cx+ay*bx*cz+ax*bz*cy-az*bx*cy-ay*bz*cx-ax*by*cz,
  ];
  return v
  //let k = 1/len4(v)
  //return [v[0]*k,v[1]*k,v[2]*k,v[3]*k]
}

function rotateAboutPlane(tri, theta, pt){
  // Given the plane in R^4 defined by the three points tri, return pt rotated by angle theta about tri
  let [p,q,r]=tri
  // make everything relative to p, so that the plane intesects the origin
  let vec1 = norm4(dif4(q,p))
  let vec2 = norm4(dif4(r,p))
  let moving = dif4(pt,p)
  let c1 = mul4(vec1, dot4(vec1,moving))
  let c2 = mul4(vec2, dot4(vec2,moving))
  let mv = dif4(dif4(moving,c1),c2) // find the component of moving perpendicular to vec1 and vec2

  let n = perp4(vec1,vec2,mv)
  return add4(p,add4(c1,add4(c2,   add4(mul4(mv,Math.cos(theta)),  mul4(n,Math.sin(theta))))))
}