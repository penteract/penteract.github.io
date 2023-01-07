
function popcount(n){
    n = (n&0x55) + ((n&0xaa)>>1);
    n = (n&0x33) + ((n&0xcc)>>2);
    return (n&0x0f) + ((n&0xf0)>>4);
}

function buildAutomata(rng){
    borders = [[],[],[],[],[],[],[],[],[]] 
    for (let i=0;i<256; i++){
        borders[popcount(i)].push(i)
    }
    for(let i=1;i<9; i++){
        shuffle(borders[i],rng)
    }
    let a1 = new Array(255)
    let a2 = new Array(15)
    let n1=0
    let n2=0
    for(let i=1;i<9; i++){
        for(let x of borders[i]){
            if(x<15){
                a2[x] = n2
                n2+=1
            }
            a1[x] = n1
            n1+=1
        }
    }
    return [a1,a2]
}
function shuffle(l,rng){
    for(let i=0;i<l.length;i++){
        let r = i+ (rng() % (l.length - i))
        let tmp = l[i]
        l[i] = l[r]
        l[r] = tmp
    }
}

// degree should be 1 or 2
function astep(state,automaton,type){
    let [ls,cap] = automaton;
    res = new Array(PLOTSZ*PLOTSZ)
    for(let x=0;x<PLOTSZ;x++){
        for(let y=0;y<PLOTSZ;y++){
            if(state[x+y*PLOTSZ]){
                res[x+y*PLOTSZ]=true;
                continue;
            }
            nbs = []
            if(type=="soil"){
                for(let dx=-1;dx<2;dx++){
                    for(let dy=-1;dy<2;dy++)if (dx||dy){
                        let xx=x+dx
                        let yy= y+dy
                        if (Math.min(xx,yy)<0 || Math.max(xx,yy)>=PLOTSZ) nbs.push(false)
                        else nbs.push(state[xx+yy*PLOTSZ]?1:0)
                    }
                }
            }
            else {
                for(let dx=-1;dx<2;dx++){
                    for(let dy=-1;dy<2;dy++)if (Math.abs(dx+dy)==1){
                        let xx=x+dx
                        let yy= y+dy
                        if (Math.min(xx,yy)<0 || Math.max(xx,yy)>=PLOTSZ) nbs.push(false)
                        else nbs.push(state[xx+yy*PLOTSZ]?1:0)
                    }
                }
            }
            res[x+y*PLOTSZ] = ls[nbs.reduce((acc,e,k) =>acc*2+e)] > cap
        }
    }
    return res
}
