const CELLSIZE = 100
const pieces={
  "─":"━",
  "━":"━",
  "│":"┃",
  "┃":"┃",
  "┏":"┏",
  "┓":"┓",
  "┗":"┗",
  "┛":"┛",
  "┫":"┃┓┛",
  "╋":"┏┗┓┛",
  "┳":"━┏┓",
  "┰":"┏┓",
  "┭":"━┓",
  "┮":"━┏",
  "┫":"┃┓┛",
  "┥":"┓┛",
  "┧":"┃┓",
  "┻":"━┗┛",
  "┸":"┗┛",
  "┵":"━┛",
  "┶":"━┗",
  "┣":"┃┏┗",
  "┝":"┏┗",
  "┞":"┃┗",
}
/*
*/

// junctions in a graphics tile
//  1
// 0 2
//  3
// At the start of a tick, a train is on a junction having just entered it from an edge of the graphics tile

const parts = {
  "━":[0,2],
  "┃":[1,3],
  "┏":[2,3],
  "┗":[1,2],
  "┓":[3,0],
  "┛":[0,1],
}

const stations = {
  "╺":2,
  "╸":0,
  "╹":1,
  "╻":3
}
tutorial = `

╺┮━━┭╸
 ┃  ┃
 ┗━━┛
`
/*lvl1 = `

╺┮━┮━┭━┭╸
 ┃ ┃ ┃ ┃
 ┃ ┃ ┃ ┃
╺┶━┵━┶━┵╸
`*/
lvl1 = `

╺┮┮┭┭╸
 ┃┃┃┃
╺┶┵┶┵╸
`

//https://marklodato.github.io/js-boxdrawing/
lvl2 = `
     ╻
╺┮━┳━┧
 ┃┏┸┓┃
 ┣┥ ┝┫
 ┃┗┰┛┃
 ┞━┻━┵╸
 ╹`
lvl2a = `
   ╻
╺┳┳┫
 ┣╋┫
 ┣┻┻╸
 ╹`
function initState(str){
  let tiles = {}
  let stns=[]
  let y=-1//first row expected to be empty
  let mxx=0
  for(let row of str.split("\n")){
    let x=0
    for(let c of row){
      if(c in pieces){
        let gtile=[[],[],[],[]]
        gtile.pieces=pieces[c]
        for(let track of pieces[c]){
          [s,e] =parts[track]
          gtile[s].push(e)
          gtile[e].push(s)
        }
        tiles[[x,y]]=gtile
      }
      else if(c in stations){
        let gtile = [[],[],[],[]]
        gtile.pieces=[]
        gtile[stations[c]]=[(stations[c]+2)%4] // draw half a track
        tiles[[x,y]]=gtile
        stns.push([x,y,undefined,undefined]) // tilex,tiley,nextTrainTime,nextTrainCol
      }else if(c!=" "){
        throw new Error("unexpected map character:"+c)
      }
      x+=1
      mxx=Math.max(x,mxx)
    }
    y+=1
  }
  let trains = []//[[tile,startjn,endjn,col]]
  return {
    "tiles":tiles,
    "trains":trains,
    "stations":stns,
    "size":[mxx,y],
    "crashes":[],
    "score":0
  }
}

let state// = initState(lvl2)
//state.trains.push([[2,2],0,2]) // tile, start junction, dest junction

const idmat = new DOMMatrixReadOnly([1,0,0,1,0,0])
const rot = new DOMMatrixReadOnly([0,1,-1,0,100,0])
const rots = [idmat,rot,rot.multiply(rot),rot.multiply(rot).multiply(rot)]

function drawState(st,ctx,ftick){
  ctx.canvas.width|=0
  let {tiles,trains,stations,size,crashes}=st
  for (let k in tiles){
    let gtile = tiles[k]
    let [x,y] = k.split(",")
    x*=1
    y*=1
    ctx.resetTransform()
    ctx.translate(x*CELLSIZE,y*CELLSIZE)
    let t = ctx.getTransform()
    for(let piece of gtile.pieces){
      graphic = "━┃".indexOf(piece)==-1?corner:horiz
      let rot = rots[parts[piece][0]]
      ctx.setTransform(t.multiply(rot))
      ctx.drawImage(graphic,0,0)
      //ctx.transform(rot.inverse())
    }
    for(let jn=0;jn<4;jn++)if(gtile[jn].length){
      let rot = rots[jn]
      ctx.setTransform(t.multiply(rot))
      dsts = gtile[jn]
      function dr(im,x,y,dx){
        dy=(50-y)*2
        ctx.drawImage(im,x,y,dx,dy,x,y,dx,dy)
      }
      for(let dst of dsts){ // Draw things on top of each other correctly without interfering with graphics of other junctions on the same tile
        //(alternative strategy would be a toplogical sort, then use pregenerated images for the cyclic cases
        switch((dst-jn+4)%4){
          case 1:
            dr(corner,0,25,23)
            if( dsts.indexOf((jn+2)%4)!=-1){
              dr(corner,23,36,25)
              dr(corner,23,33,19)
            }
            else{
              dr(corner,23,45,13)
            }
            break;
          case 2:
            ctx.drawImage(horiz,0,25,50,50,0,25,50,50)
            break;
          case 3:
            dr(corner2,0,25,23)
            if( dsts.indexOf((jn+2)%4)!=-1){
              dr(corner2,23,36,25)
              dr(corner2,23,33,19)
            }
            else{
              dr(corner2,23,45,13)
            }
            break;
          default:
            throw new Error("unexpected junction delta: "+(dst-jn+4)%4)
        }
      }
    }
  }
  for(let [[x,y],start,end,col] of trains){
    //console.log(x,y,start,end)
    ctx.resetTransform()
    ctx.translate(x*CELLSIZE,y*CELLSIZE)
    let rot = rots[start]
    let t = ctx.getTransform()
    ctx.setTransform(t.multiply(rot))
    //ctx.translate(50,50)
    switch((end-start+4)%4){
      case 1:
        ctx.rotate(-Math.PI/2*ftick)
        break;
      case 2:
        ctx.translate(ftick*CELLSIZE,0)
        break;
      case 3:
        ctx.translate(0,CELLSIZE)
        ctx.rotate(Math.PI/2*ftick)
        ctx.translate(0,-CELLSIZE)
        break;

      default:
        throw new Error("unexpected train path junction delta: "+(end-start+4)%4)
    }
    //ctx.rotate(-0.01)
    //ctx.translate(-50,-50)
    ctx.fillStyle=tcols[col]
    ctx.fillRect(-30,32,60,36)
    ctx.fillStyle="#000"
    ctx.beginPath()
    ctx.arc(16,50,8,0,Math.PI*2)
    ctx.fill()
  }
  for(let i=0;i<stations.length;i++){
    let [x,y,tt,tc]=stations[i]
    ctx.resetTransform()
    ctx.translate(x*CELLSIZE,y*CELLSIZE)
    ctx.fillStyle="#000"
    ctx.strokeStyle=scols[i]
    ctx.lineWidth=10
    const stnsize = 80
    ctx.fillRect((CELLSIZE-stnsize)/2,(CELLSIZE-stnsize)/2,stnsize,stnsize)
    ctx.strokeRect((CELLSIZE-stnsize)/2,(CELLSIZE-stnsize)/2,stnsize,stnsize)
    if(tt!==undefined){
      ctx.fillStyle=tcols[tc]
      ctx.font = "bold 48px serif";
      ctx.fillText(tt,(CELLSIZE-32)/2,(CELLSIZE+48/1.5)/2,(32+stnsize)/2); // Text will look off center on other machines, but I'd need to put it in an html element to fix that
    }
  }
  for(let [x,y] of crashes){
    ctx.resetTransform()
    ctx.translate(x*CELLSIZE,y*CELLSIZE)
    ctx.drawImage(crash,0,0)
  }
  if(target===Infinity) scorespan.innerText=state.score
  else scorespan.innerText=target-state.score
}
// {black (#000000), orange (#E69F00), sky blue (#56B4E9), bluish green (#009E73), yellow (#F0E442), blue (#0072B2), vermillion (#D55E00), and reddish purple (#CC79A7)
const tcols = ["#56B4E9","#E69F00","#009E73","#F0E442","#D55E00","#0072B2","#CC79A7"]
const scols = ["#56B4E9","#E69F00","#009E73","#F0E442","#D55E00","#0072B2","#CC79A7"]
//scols = ["#46a4d9","#d68F00","#008E63","#e0d432","#c54E00","#0062a2","#CC79A7"]
//scols = ["#3684a9","#a66800","#006E49","#b0a432","#005282","#a13E00","#9C5977"]

//scols = ["#00c","#080","#800","#606","#660","#066"]
//tcols = ["#00e","#0a0","#a00","#808","#880","#088"]
//cols.shift()
//cols.shift()
function getjn(fx,fy,state){
  let x = Math.floor(fx)
  let y = Math.floor(fy)
  let dx = fx-x
  let dy = fy-y
  let jn = (dx+dy>1)*3^(dx>dy)
  let tile = state.tiles[[x,y]]
  if (tile){
    let points = tile[jn]
    if(points.length>1) return [x,y,jn,points]
    else{
      let opts = tile.filter(pts=>pts.length>1)
      if (opts.length==1) return [x,y,tile.findIndex(pts=>pts.length>1),opts[0]]
    }
  }
}
function clk(fx,fy,state){
  let jndat
  if(jndat=getjn(fx,fy,state)){
    let [x,y,jn,points] = jndat
    if (points.length>1) {
      new Promise(()=>playClacks())
      points.push(points.shift())
    }
  }
  //console.log(x,y,jn)
}
// delta in tile coordinates when exiting a cell through junction n
const nexts = {
  0 : [-1,0],
  1 : [0,-1],
  2 : [1,0],
  3 : [0,1]
}

Array.prototype.add = function(v){
  return this.map((x,i)=>x+v[i])
}
Array.prototype.mul = function(v){
  return this.map(x=>x*v)
}
function halftick(state){
  let {tiles,trains,stations,size,crashes}=state
  for(let i=0;i<stations.length;i++){
    let stn = stations[i]
    let [x,y,tt,tc] = stn
    if(tt==0){
      let pos = [x,y]
      let tile = tiles[pos]
      let other,jn
      for (jn=0;jn<4;jn++){
        if(tile[jn].length){
          ;[other]=tile[jn]
          break
        }
      }
      trains.push([pos,other,jn,tc])
      stn[2]=undefined
    }
  }

  let trainPositions = {}
  for(let i=0;i<trains.length;i++){
    let t=trains[i]
    if (!state.tiles[t[0]][t[2]].length){
      //going to a junction which doesn't exist
      trains.splice(i,1)
      if(stations[t[3]].slice(0,2)==""+t[0]){
        state.score+=1
        //score points when trains go to the right place
        if(target===Infinity){// Make things slightly harder in eternal mode
          tickrate-=2
          maxtrains+=0.1
          newtrainrate+=0.01
        }
      }
      scorespan.innerText=target-state.score
      if(state.score>=target){
        continuediv.style.display="inline-block";
        gameover.style.display="none"; // in case a crash happened elsewhere simultaneously
        crashes.push([-2,-2])//offscreen
        stopMusic(true)
        break;
      }
      i--;
      continue
    }
    let p2 = nexts[t[2]].mul(0.5).add(t[0])
    if(trainPositions[p2]) {crashes.push(p2)}
    else trainPositions[p2] = true
  }
}
function tick(state){
  let {tiles,trains,stations,size,crashes}=state
  //let trains = state.trains
  for(let i=0;i<trains.length;i++){
    let t=trains[i]
    if (!state.tiles[t[0]][t[2]].length){
      //going to a junction which doesn't exist
      trains.splice(i,1)
      i--
    }
  }
  let trainPositions = {}
  for(let t of trains){
    let [[x,y],s,e,col] = t
    let [dx,dy] = nexts[e]
    t[0]=[x+dx,y+dy]
    t[1]=(e+2)%4
    let points = state.tiles[t[0]][t[1]]
    if(points[points.length-1]==undefined){
      throw new Error("bad points")
    }
    t[2]=points[points.length-1]
    if(trainPositions[t[0]]) {crashes.push(t[0])}
    else trainPositions[t[0]] = true
  }
  function newTrain(i){
    let stn = stations[i]
    let n = Math.floor(Math.random()*(stations.length-1))
    if(n>=i) n+=1
    stn[3] = n
    stn[2] = 5
  }
  let numtrains = trains.length + stations.filter(s=>s[2]!==undefined).length
  if(numtrains==0){
    newTrain(Math.floor(Math.random()*stations.length))
  }
  else for(let i=0;i<stations.length;i++){
    let stn = stations[i]
    let [x,y,tt,tc] = stn
    if(tt===undefined){
      console.log(newtrainrate/stations.length*((maxtrains-numtrains)/maxtrains))
      if(Math.random()<newtrainrate/stations.length*((maxtrains-numtrains)/maxtrains)){
        newTrain(i)
        numtrains+=1
      }
    }
    else if(tt>0){
      stn[2]=tt-1
    }
  }
}

//chance for empty station to generate a new trains each tick
let newtrainrate = 0.1
let maxtrains = 4
let tickrate=1000 // 1 second per tick

let loopID
let lastTick
let paused=false
let target

let lvlnum = -1
function nextLevel(ctx){
  startLevel(...lvls[++lvlnum],ctx)
}

// mapstring, tickrate, newtrainrate, maxtrains, target,
tutorial = [tutorial,1000,0.0,1,1,"Click on a junction to change the direction it will send trains"]
lvl1 = [lvl1,1000,0.25,2,10,"Trains need to go to the matching color depot to count towards the target"]
eternal = [lvl2,1000,0.15,3,Infinity,"What's the highest score you can reach?"]
lvl2 = [lvl2,1000,0.1,3,20,""]
lvls = [tutorial,lvl1,lvl2,eternal]
function startLevel(str,tr,ntr,mxt,tgt,msg,ctx){
  curlevel = [str,tr,ntr,mxt,tgt,msg]
  gameover.style.display="none"
  continuediv.style.display="none"
  if(soundPaused) startMusic()
  state = initState(str)
  target = tgt
  tickrate=tr
  newtrainrate=ntr
  maxtrains=mxt
  if(tgt===Infinity) score.childNodes[0].textContent="Score: "
  else score.childNodes[0].textContent="Target: "
  if(msg.length){
    hintdiv.style.display="inline-block"
    hintdiv.innerText=msg
  }
  else{
    hintdiv.style.display="none"
  }

  startLoop(state,ctx)
}

function restart(){
  startLevel(...curlevel,gctx)
}
let lastframe
function startLoop(state, ctx){
  if(lastTick!==undefined){
    window.cancelAnimationFrame(loopID)
    lastTick=undefined
  }
  lastframe=undefined
  function loop(timestamp){
    //pausing
    if(lastframe===undefined) lastframe=timestamp
    if(paused && lastTick!==undefined) lastTick+=timestamp-lastframe
    else{
      // ticking
      if(lastTick===undefined)lastTick=timestamp;
      if(lastframe<lastTick+tickrate/2 && timestamp>=lastTick+tickrate/2){
        halftick(state)
      }
      if (timestamp>lastTick+tickrate){
        tick(state)
        lastTick=Math.max(lastTick+tickrate,timestamp-tickrate/3) // If there's a very long frame, be a bit generous (and never draw a frame with tick fraction above 1))
      }
      //rendering
      drawState(state,ctx,(timestamp-lastTick)/tickrate)
      if(state.crashes.length && state.score<target){
        gameover.style.display="inline-block"
        stopMusic(true)
      }
    }
    lastframe=timestamp
    if(!state.crashes.length){
      loopID = window.requestAnimationFrame(loop)
    }
  }
  loop()
}


