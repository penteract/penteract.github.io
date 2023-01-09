"use strict";
var cursors = new Array(12);
let animating;
let terraforming;
let recentlyterraformed;
var hints = [
    "Plant something",
    "Zoom out to look at the plot",
    "See what happens when plants grow",
    "Collect them",
    "You can click to zoom in on other plants",
    "Spread the plants out to improve growth rate",
    "Record a whole plot to speed up planting next time",
    "Middle clicking can be easier than zooming in to plant",
    "Save up to buy another plot",
    "Plants don't grow as well in rocky soil ",
    "Being nearer to water helps plants grow",//10
    "You can now terraform to move large amounts of earth from one farm to another",
    "Recording a region includes the terraforming state, so be careful when clicking 'plant'",
    "Click outside the planet to see the hidden faces",
    ""
]

const costFactor = 1;
const expandCosts = {}// cost to reach depth n
expandCosts[10] = costFactor*PLOTSZ*PLOTSZ;
expandCosts[9] = expandCosts[10]*FARMSZ*FARMSZ;
expandCosts[8] = expandCosts[9]*REGSZ*REGSZ;
expandCosts[7] = expandCosts[8]*6;
const terraformcost = (expandCosts[8]/4)

const expandNames = {}
expandNames[10] = ["Buy Plot","Buy Plots"]
expandNames[9] = ["Buy Farm","Buy Farms"]
expandNames[8] = ["Go over the edge of<br> the world","Go over the edges<br> of the world"]
expandNames[7] = ["Build a rocket", "Build rockets"]


function fixcursor(depth){
    if(depth===undefined) depth=cursor.depth;
    cursor = map
    while(cursor.depth < depth){
        cursors[cursor.depth] = cursor;
        cursor = cursor.getChildren()[pLocation[cursor.depth+1] ]
    }
    cursors[cursor.depth] = cursor;
}

function redraw(depth){
    fixcursor(depth)
    copybut.disabled = terraforming || cursor.depth>=11;
    zoomoutbut.disabled = terraforming || cursor.depth<=minDepth;
    zoominbut.disabled = terraforming || cursor.depth>=11;
    waitbut.disabled = terraforming
    pastebut.disabled = terraforming || saves[cursor.depth]===undefined || seeds<saves[cursor.depth].countPlants(cursor)
    pastebut.innerHTML = terraforming || saves[cursor.depth]===undefined?"Plant":"Plant ("+saves[cursor.depth].countPlants(cursor)+")"
    harvestbut.disabled = terraforming || cursor.countPlants()==0n
    let numUnlock = (seeds / BigInt(expandCosts[nextUnlockDepth]))
    expandbut.disabled = terraforming || numUnlock<1
    let maxUnlock = cursors[nextUnlockDepth-1].layerSize - nextUnlockLocation;
    if (numUnlock>maxUnlock) numUnlock=BigInt(maxUnlock)
    expandbut.innerHTML = expandNames[nextUnlockDepth][numUnlock>1?1:0]
        +" ("+(numUnlock||1n)*BigInt(expandCosts[nextUnlockDepth])+")"
    
    terraformbut.disabled = animating || cursor.depth!=8 || nextUnlockDepth>8 || (!terraforming && seeds<=terraformcost)
    terraformbut.innerHTML = terraforming?"Stop Terraforming":"Start Terraforming ("+terraformcost+")" 
    
    numseeds.innerHTML = seeds+""
    hint.innerHTML = "Hint: "+hints[tutorial]
    gamecanvas.width |= 0; // TODO: put this inside the call to draw, after preparation
    return cursor.prepare().then(()=>cursor.draw(ctx));
    //return cursor.draw(ctx)
}

function setTerraformMsg(msg){
    terraformMsg.innerHTML=msg
}

function skipTutorial(){
    tutorial+=8
    waitbut.style.visibility="visible"
    copybut.style.visibility="visible"
    zoomoutbut.style.visibility="visible"
    harvestbut.style.visibility="visible"
    zoominbut.style.visibility="visible"
    expandbut.style.visibility="visible"
    terraformbut.style.visibility="visible"
    seeds+=1000n
    minDepth-=3
    nextUnlockDepth-=3
}

let atime = 500

function zoomOut(){
    if(animating) return;
    if (tutorial==1){
        tutorial+=1
        waitbut.style.visibility="visible"
    }
    if (tutorial==5 && map.countPlants()>0){
        tutorial+=1
        copybut.style.visibility="visible"
    }
    animating=true
    return new Promise(function(resolve,reject){
        let start = undefined
        let step = function(timestamp){
            if (start === undefined) {
                start = timestamp;
            }
            let t = timestamp - start
            if(t<atime){
                gamecanvas.width |= 0;
                cursor.drawZoomed(1-t/atime, ctx).then(()=>
                    window.requestAnimationFrame(step))
            }
            else {
                animating=false
                redraw().then(()=>resolve())
                //resolve()
            }
        }
        redraw(cursor.depth-1).then(()=>window.requestAnimationFrame(step))
    })
}
function zoomIn(){
    if(animating) return;
    if(cursor.getChildren()[pLocation[cursor.depth+1]]===undefined) return;
    //console.log(cursor,cursor.depth)
    animating=true;
    return new Promise(function(resolve,reject){
        let start = undefined
        let step = function(timestamp){
            if (start === undefined) {
                start = timestamp;
            }
            let t = timestamp - start
            if(t<atime){
                gamecanvas.width |= 0;
                cursor.drawZoomed(t/atime, ctx).then(()=> window.requestAnimationFrame(step))
            }
            else {
                animating=false
                redraw(cursor.depth+1).then(()=>resolve())
            }
        }
        redraw().then(()=>window.requestAnimationFrame(step))
    })
}
function tfm(){
    terraforming=!terraforming
    if(tutorial==11){
        tutorial+=1
    }
    if(terraforming){
        seeds -= BigInt(terraformcost)
        setTerraformMsg("Click on a farm to move earth from it")
    }
    else{
        setTerraformMsg("")
    }
    //harvest() // redraws
    redraw()
}

let lastDownLocs = {}
function mousedown(e){
    if (e.button>1) return;
    lastDownLocs[e.button] = undefined
    if(animating && !(terraforming&&e.button==0)) return;
    //https://stackoverflow.com/a/19048340/1779797
    let r = gamecanvas.getBoundingClientRect();
    let loc = cursor.getLocation((e.x - r.left) / r.width, (e.y - r.top) / r.width)
    lastDownLocs[e.button] = loc
}
function mouseup(e){
    if (e.button>1) return;
    let downLoc = lastDownLocs[e.button]
    if (downLoc==undefined) return;
    lastDownLocs[e.button] = undefined
    if(animating && !(terraforming&&e.button==0)) return;
    let r = gamecanvas.getBoundingClientRect();
    let loc = cursor.getLocation((e.x - r.left) / r.width, (e.y - r.top) / r.width)
    if(loc==downLoc) click(e,loc);
    
}

function click(e,loc){
    if(terraforming){
        if(e.button!=0) {
            setTerraformMsg("Can't plant while terraforming")
            return;
        }
        if(loc!==undefined){
            let farm = cursor.children[loc]
            if(!animating && farm.altitude<=0) {
                setTerraformMsg("can't make this any lower")
                return;
            }
            if(animating && farm.altitude>=maxAltitude-1) {
                setTerraformMsg("can't make the selected tile any higher, click another")
                return;
            }
            animating=!animating
            pLocation[cursor.depth+1] = loc
            
            //WARNING: dangerous mutation ahead
            cursor.children[loc] = farms[farm.altitude + (animating?-1:1)]
            map = map.clone() // clone modified map
            cursor.children[loc] = farm //undo mutation
            setTerraformMsg(animating?"Click on a farm to dump earth on it":"Click on a farm to move earth from it")
            redraw()
        }
        else{
            setTerraformMsg("invalid click location")
        }
        return;
    }

    if(animating) return;
    if(e.button>1) return;
    if(e.button==1 && loc!==undefined){
        if (tutorial<7) return;
        if (terraforming || saves[cursor.depth+1]===undefined
              || seeds<saves[cursor.depth+1].countPlants(cursor.getChildren()[loc]))
              return;
        pLocation[cursor.depth+1] = loc
        cursor=cursor.getChildren()[loc]
        paste(true)
        redraw(cursor.depth-1)
    } 
    //console.log(loc)
    if (e.button==0 && loc!==undefined){
        if (zoominbut.disabled || zoominbut.style.visibility=="hidden") return;
        if (tutorial==4 ){
            tutorial+=1
        }
        pLocation[cursor.depth+1] = loc
        zoomIn()
    }
}
function copy(){
    if(animating) return;
    saves[cursor.depth] = cursor
    if (tutorial==6 && cursor.countPlants()>1){
        tutorial+=1
    }
    redraw()
}
function paste(dontdraw){
    if(animating) return;
    if (tutorial==0){
        tutorial+=1
        zoomoutbut.style.visibility="visible"
    }
    harvest(true)
    map = map.clone()
    let c = map
    while(c.depth+1 < cursor.depth){
        c = c.getChildren()[pLocation[c.depth+1] ]
    }
    c.getChildren()
    c.children[pLocation[c.depth+1]] = saves[c.depth+1].pasteover(c.children[pLocation[c.depth+1]])
    //cursor = c.getChildren()[pLocation[c.depth+1] ]
    if(!dontdraw)redraw()
}
function wait(){
    if(animating) return;
    time+=1
    if (tutorial==2){
        tutorial+=1
        harvestbut.style.visibility="visible"
    }
    map = map.wait()
    if(tutorial==7 && seeds + map.countPlants()>100){
        tutorial+=1
        expandbut.style.visibility="visible"
    }
    redraw()
}
function harvest(dontdraw){
    if(animating) return;
    if (tutorial==3){
        tutorial+=1
        zoominbut.style.visibility="visible"
    }
    map = map.clone()
    let c = map
    while(c.depth+1 < cursor.depth){
        c = c.getChildren()[pLocation[c.depth+1] ]
    }
    c.getChildren()
    seeds += cursor.countPlants()
    c.children[pLocation[c.depth+1]] = cursor.harvest()
    if(dontdraw){
        cursor = c.children[pLocation[c.depth+1]]
    }
    else{
        redraw()
    }
}
async function expand(){
    if(animating) return;
    if(seeds<BigInt(expandCosts[nextUnlockDepth])) return;
    
    let c = map
    while(c.depth+1 < nextUnlockDepth){
        c = c.getChildren()[pLocation[c.depth+1] ]
    }
    if(nextUnlockDepth==minDepth)minDepth-=1
    while(seeds>expandCosts[nextUnlockDepth] && nextUnlockLocation<c.layerSize){
        if(!c.getChildren()[nextUnlockLocation].isWater ){
            seeds -= BigInt(expandCosts[nextUnlockDepth])
        }
        nextUnlockLocation+=1
    }
    if (nextUnlockLocation >= cursors[nextUnlockDepth-1].layerSize){
        nextUnlockLocation = 1
        nextUnlockDepth-=1
    }
    while(cursor.depth>minDepth){
        await zoomOut()
    }
    if (tutorial==8 && minDepth<10){
        tutorial+=1
    }
    if (tutorial==9 && minDepth<9){
        tutorial+=1
    }
    if (tutorial==10 && nextUnlockDepth<9){
        terraformbut.style.visibility="visible" 
        tutorial+=1
    }
    if (tutorial==12 && minDepth<8){
        tutorial+=1
    }
    redraw(minDepth)
}