// Find approximate distance between 2 sets described by 2d segment trees

function setDist(r,s){
  //TODO: match lengths
  return asymmSetDist(r,s)/r[0][0][0]+asymmSetDist(s,r)/s[0][0][0] // Max would also work here
}
function asymmSetDist(r,s){
  //find the mean square distance to s over points in r
  //for each point, test samebox; then repeatedly (test 8 surrounding boxes; go up a level)
  if(s[0][0][0]<1) return Infinity
  let cache = {}
  function distFrom(d,x,y){//log distance from point (depth,x,y) to s
    let r = cache[[d,x,y]]
    if(r===undefined){ // work it out
      //if(s[d][x][y]) r=1
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        if (s[d][x+dx]?.[y+dy]){
          r=1
          break
        }
      }
      if(!r){
        r=1+distFrom(d-1,x>>1,y>>1)
      }
      cache[[d,x,y]]=r
    }
    return r
  }
  function costFrom(d,x,y){
    let n = r[d][x][y]
    if(n==0) return 0
    if(d==r.length-1){
      return (n*((1<<(2*distFrom(d,x,y)-2))-1) )
    }
    let tot = 0
    for(let dx=0;dx<=1;dx++)for(let dy=0;dy<=1;dy++){
      tot += costFrom(d+1,2*x+dx,2*y+dy)
      if(!(dx||dy)){
        let v = cache[[d,x,y]]
        if(v && v>1) return n*((1<<(2*(v+r.length-1-d-1))-1) )
      }
    }
    return tot
  }
  return costFrom(0,0,0)
}
// Dimension calculation
function calcDim(conts){
  conts = conts.slice(1,conts.length-1) // Discard the most detailed value because we don't draw enough points for it to be reliable
  let n1 = 1
  let i1 = 0
  let allRes = conts.map((c,i)=>{
    let ni = c.reduce(((a,r)=>a+r.reduce(((a,b)=>a+(b!=0)),0)),0)
    let res = Math.log2(ni/n1)/(i-i1)
    if (ni>4 && n1<4){
      i1 = i
      n1 = ni
    }
    return res
  })
  return allRes
  //console.log(allRes)

  //return(allRes[allRes.length-1])
}
