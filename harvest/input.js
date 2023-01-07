"use strict";
var cursors = new Array(12);
let animating = false

var hints = [
    "plant something",
    "zoom out to look at the plot",
    "see what happens when plants grow",
    "collect them",
    "zoom in again to plant more",
    "save a larger plot to speed up planting next time"
]

function redraw(depth){
    if(depth===undefined) depth=cursor.depth;
    cursor = map
    while(cursor.depth < depth){
        cursors[cursor.depth] = cursor;
        cursor = cursor.getChildren()[pLocation[cursor.depth+1] ]
    }
    cursors[cursor.depth] = cursor;
    zoomoutbut.disabled = cursor.depth<=minDepth;
    zoominbut.disabled = cursor.depth>=11;
    pastebut.disabled = saves[cursor.depth]===undefined || seeds<saves[cursor.depth].countPlants(cursor)
    harvestbut.disabled = cursor.countPlants()==0n
    gamecanvas.width |= 0;
    numseeds.innerHTML = seeds+""
    hint.innerHTML = "Hint: "+hints[tutorial]
    cursor.draw(ctx);
}

var atime = 200

function zoomOut(){
    if(animating) return;
    if (tutorial==1){
        tutorial+=1
        waitbut.style.visibility="visible"
    }
    if (tutorial==4 && cursor.countPlants()>0){
        tutorial+=1
        copybut.style.visibility="visible"
    }
    animating=true
    let start = undefined
    let step = function(timestamp){
        if (start === undefined) {
            start = timestamp;
        }
        let t = timestamp - start
        console.log(t)
        if(t<atime){
            gamecanvas.width |= 0;
            cursor.drawZoomed(1-t/atime, ctx)
            window.requestAnimationFrame(step)
        }
        else {
            animating=false
            redraw()
        }
    }
    window.requestAnimationFrame(step)
    redraw(cursor.depth-1)
}
function zoomIn(){
    if(animating) return;
    //console.log(cursor,cursor.depth)
    animating=true
    let start = undefined
    let step = function(timestamp){
        if (start === undefined) {
            start = timestamp;
        }
        let t = timestamp - start
        console.log(t)
        if(t<atime){
            gamecanvas.width |= 0;
            cursor.drawZoomed(t/atime, ctx)
            window.requestAnimationFrame(step)
        }
        else {
            animating=false
            redraw(cursor.depth+1)
        }
    }
    window.requestAnimationFrame(step)
    redraw()
}

function click(e){
    if(animating) return;
    console.log(e)
    if(zoominbut.disabled || zoominbut.style.visibility=="hidden" || e.button!=0) return;
    //https://stackoverflow.com/a/19048340/1779797
    let r = gamecanvas.getBoundingClientRect();
    let loc = cursor.getLocation((e.x - r.left) / gamecanvas.width, (e.y - r.top) / gamecanvas.width)
    console.log(loc)
    if (loc!==undefined){
        pLocation[cursor.depth+1] = loc
        zoomIn()
    }
}
function copy(){
    if(animating) return;
    saves[cursor.depth] = cursor
}
function paste(){
    if(animating) return;
    if (tutorial==0){
        tutorial+=1
        zoomoutbut.style.visibility="visible"
    }
    harvest()
    seeds -= saves[cursor.depth].countPlants(cursor)
    map = map.clone()
    let c = map
    while(c.depth+1 < cursor.depth){
        c = c.getChildren()[pLocation[c.depth+1] ]
    }
    c.getChildren()
    c.children[pLocation[c.depth+1]] = saves[c.depth+1]
    //cursor = c.getChildren()[pLocation[c.depth+1] ]
    redraw()
}
function wait(){
    if(animating) return;
    if (tutorial==2){
        tutorial+=1
        harvestbut.style.visibility="visible"
    }
    map = map.wait()
    redraw()
}
function harvest(){
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
    redraw()
}