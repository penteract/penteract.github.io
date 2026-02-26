
//snapping values
const epsilon = 10**(-5)
function remdups(vs){ // mutating
  for(let i=0;i+1<vs.length;){
    if(vs[i]>vs[i+1]-epsilon)vs.splice(i,1)
    else i++
  }
  return vs
}
let f12 = new Array(13).fill(0).map((e,i)=>i/12)
let sqrts = new Array(6).fill(0).flatMap((e,i)=>{
  let rt = Math.sqrt(i)
  let a=[]
  for(let j=1; j/rt <1; j++){
    a.push(j/rt)
  }
  return a
})
let f24 = new Array(25).fill(0).map((e,i)=>i/24)
let snapvalues=f12.concat(sqrts).sort()
remdups(snapvalues)
let sizesnaps = snapvalues.map(x=>-x).reverse().concat(snapvalues)
let possnaps = f24 // remdups(f24.map(x=>1-x).concat(f24).sort())


// snapping functions
function bsearch(a,v){
  let l=0
  let r=a.length
  while(r>l+1){
    let m=(l+r)>>1
    if(v<a[m])r=m
    else l=m
  }
  return l
}
function snapTo(v,vs){//return the nearest element of vs to v
  let ix = bsearch(vs,v)
  if (ix==vs.length-1) return vs[ix]
  else{
    if (v < (vs[ix]+vs[ix+1])/2) return  vs[ix]
    else return vs[ix+1]
  }
}
function snapNext(o,prop,vs){
  let v = o[prop]
  let ix = bsearch(vs,v)
  if (ix==0 && v<vs[ix]) o[prop]=vs[ix]
  else if(ix+1>=vs.length) o[prop]=vs[ix]
  else o[prop]=vs[ix+1]
}
function snapPrev(o,prop,vs){
  let v = o[prop]
  let ix = bsearch(vs,v)
  if (vs[ix]==v && ix>0) o[prop]=vs[ix-1]
  else o[prop]=vs[ix]
}
