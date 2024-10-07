// ix n has children 2n+1 and 2n+2
// key at ix n is smaller than its children

function heappush(h,k,v){
  let l = h.length
  h.push([k,v])
  heapfix(h,l)
}

function heappop(h){
  let res = h[0]
  let k = 0
  while ((k*2+2) < h.length){
    let l = h[k*2+1]
    let r = h[k*2+2]
    if (l[0]<r[0]){
      h[k] = l
      k = k*2+1
    } else {
      h[k] = r
      k = k*2+2
    }
  }
  if((k*2+1) < h.length){
    h[k] = h[k*2+1]
    k = k*2+1
  }
  v = h.pop()
  if(h.length!=k){
    h[k]=v
    heapfix(h,k)
  }
  return res
}

function heapfix(h,l){
  let p
  while (l>0 && h[p=(l-1)>>1][0] > h[l][0] ){
    ;[h[p],h[l]] =[h[l],h[p]]
    l=p
  }
}

function linkedListToArray(ll) {
    let res = []
    while (ll) {
        res.push(ll[0])
        ll = ll[1]
    }
    return res
}

function search(starts, hCost, neighbs, visit, maxDist){
    if ( maxDist===undefined) maxDist = Infinity

    // This is a heap because that might help with efficiency if we try to reuse it
    // might give suboptimal paths, but it's better than flood filling the map for every ant.
    // We probably need a path fixer that removes loops

    let heap = []
    let seen = {}
    for (let start of starts){
        heap.push([0, [start, null]])
        seen[start]=true
    }
    let found = undefined
    while (heap.length && !found) {
        let r = heappop(heap)
        //console.log(r)
        let [d, path] = r
        if (d>maxDist) break;
        for (let q of neighbs(path[0])) {
            //console.log("v")
            if (!seen[q]) {
                let [walk,isGoal] = visit(q)
                //console.log("a")
                seen[q] = true
                if (isGoal) {
                    found = [q, path]
                }
                if(walk){
                    heappush(heap, d + hCost(q,d), [q, path])
                }
            }
        }
    }
    return found?linkedListToArray(found):found
}
