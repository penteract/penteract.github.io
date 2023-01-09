
// rotation about the x axis (front moves down)
function rotx(theta,xyz){
    let c = Math.cos(theta)
    let s = Math.sin(theta)
    let [x,y,z] = xyz
    return [x,y*c+z*s, z*c-y*s]
}
// rotation about the y axis (front moves right) 
function roty(theta,xyz){
    let c = Math.cos(theta)
    let s = Math.sin(theta)
    let [x,y,z] = xyz
    return [x*c+z*s,y, z*c-x*s]
}
// rotation clockwise about the z axis
function rotz(theta,xyz){
    let c = Math.cos(theta)
    let s = Math.sin(theta)
    let [x,y,z] = xyz
    return [x*c-y*s,y+x*s,z]
}

const aaCubeCorners = [
    [1,1,1], // front bot right
    [-1,1,1], // front bot left
    [1,-1,1], // front top right
    [-1,-1,1], // front top left
    [1,1,-1], // back bot right
    [-1,1,-1], // back bot left
    [1,-1,-1], // back top right
    [-1,-1,-1] // back top left
]

// indices of top left, top right and bottom left corners of each face
const cornersOfFace = {
    0:[3,2,1],
    1:[7,3,5],
    2:[7,6,3],
    3:[2,6,0],
    4:[6,7,4],
    5:[5,1,4]
}


const atr2 = Math.atan(Math.SQRT1_2)
const d45 = Math.PI/4
// rotations that take the cube to the point where the right face is showing
// rot x then rot y then rot z
const fRotations = {
    0:[-atr2,-d45,0],
    1:[-atr2,d45,0],
    2:[2*d45-atr2,0,d45]
}

const cubeCorners = new Array(8)
for(let k in aaCubeCorners){
    cubeCorners[k] = rotx(atr2,roty(d45,aaCubeCorners[k]))
}

function rot3(rots,xyz){
    return rotz(rots[2],roty(rots[1],rotx(rots[0],xyz)))
}
function newCube(rots){
    return cubeCorners.map(xyz=>rot3(rots,xyz))
}

function faceMatrix(face,cb,w){
    let tl = cb[face[0]]
    let tr = cb[face[1]]
    let bl = cb[face[2]]
    if(w===undefined)w=1
    w/=2
    return [(tr[0]-tl[0])/2,(tr[1]-tl[1])/2,  (bl[0]-tl[0])/2,(bl[1]-tl[1])/2,  tl[0]*w,tl[1]*w]
}