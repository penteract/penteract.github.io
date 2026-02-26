// DOM manip helper functions
function mksvgel(tag){
  return document.createElementNS("http://www.w3.org/2000/svg",tag)
}


//Handles for mouse control
function drawBox(part){
  let box = mksvgel("g")
  for (let dx of [-1,0,1])for (let dy of [-1,0,1]) {
    let c = mksvgel("circle")
    part[[dx,dy]]=c
    if(dx*dy==1) c.style.cursor="nwse-resize"
    else if(dx*dy==-1){
      c.style.cursor="nesw-resize"
    }
    else if (!(dx||dy)) {
      c.style.cursor="grab"
      c.classList.add("rot")
    }
    else if (dx==0) c.style.cursor="ns-resize"
    else if (dy==0) c.style.cursor="ew-resize"
    c.addEventListener("pointerdown",()=>moveAction=chooseResize(dx,dy,part))
    box.append(c)
  }
  return box
}

function transformChanged(part,noRedrawFractal){
  let mat = partToMatrix(part)
  for (let dx of [-1,0,1])for (let dy of [-1,0,1]) {
    let c=part[[dx,dy]]
    if(c){
      if (!(dx||dy)) dy-=1.4
      let {x,y} = mat.transformPoint({x:ox+w*(1+dx)/2,y:oy+h*(1+dy)/2})
      c.setAttribute("cx",x)
      c.setAttribute("cy",y)
      c.setAttribute("r",5)
    }
  }
  part.div.style.transform = mat.translate(ox,oy)
  if(!noRedrawFractal) drawFractal(10000)
}


// UI
let selected
let hist = []
function initHist(){
  hist.push([JSON.stringify(copyparts(parts)), parts.indexOf(selected)])
}
let histIx = 0

let moveAction=()=>{}
/*
function drawBoxes(){
  parts.map(part=>boxui.append(drawBox(part)))
}*/
function selectAndMovePart(p,e){
  selectPart(p)
  let initex=e.pageX
  let initey=e.pageY
  let original = {x:p.x,y:p.y}
  return (e)=>{
    p.x = original.x+(e.pageX-initex)/w
    p.y = original.y+(e.pageY-initey)/h
    if(snappositions.checked){
      p.x = snapTo(p.x,possnaps)
      p.y = snapTo(p.y,possnaps)
    }
    transformChanged(p)
  }
}
function selectPart(p){
  if(p && selected!==p){
    selected=p
    boxui.replaceChildren(drawBox(p))
    transformChanged(p,true)
  }
}
function deselect(){
  selected=undefined
  boxui.replaceChildren()
}
let ot = bigPic.offsetTop // for adjusting the mouse
let ol = bigPic.offsetLeft
const idmat = new DOMMatrix()
function chooseResize(dx,dy,part){
  // set the moveAction while the mouse is held over handles dx,dy
  if(!(dx||dy)){
    let cx = part.x*w+ox+ol
    let cy = part.y*h+oy+ot
    return (e) => {
      part.rot = Math.atan2((e.pageY-cy)*Math.sign(part.h),(e.pageX-cx)*Math.sign(part.h) )*180/Math.PI + 360+90
      if(snaprotations.checked){//(cliprot){
        part.rot-=((part.rot+7.5)%15 -7.5)
        part.rot|=0
      }
      transformChanged(part)
    }
  }
  let o = {w:part.w,h:part.h}
  //transform original into rotated coordinates
  let cmat = idmat.translate(1/2,1/2).rotate(-part.rot).translate(-1/2,-1/2)
  let cmati = cmat.inverse()
  let ro = cmat.transformPoint({x:part.x,y:part.y})

  // Transform m into unit-square (rotated) coordinates
  let unrot = idmat.scale(1/w,1/h).translate(w/2,h/2).rotate(-part.rot).translate(-w/2-ox,-h/2-oy).translate(-ol,-ot);
  return (e) => {
    let m = unrot.transformPoint({x:e.pageX,y:e.pageY})

    if(center.checked){
      //if center preserving:
      // ro.x+dx*n.w/2 = m.x
      if(dx){
        part.w = (m.x-ro.x)*2/dx
      }
      if(dy){
        part.h = (m.y-ro.y)*2/dy
      }
    }
    else{
      // if not center preserving
      // ro.x-dx*o.w/2 = n.x-dx*n.w/2
      // n.x+dx*n.w/2 = m.x (not always true when match.checked)
      if(dx){
        part.w=(m.x-ro.x+dx*o.w/2)/dx
      }
      if(dy){
        part.h=(m.y-ro.y+dy*o.h/2)/dy
      }
    }
    if(match.checked){
      if(!dx) part.w=Math.abs(part.h)*Math.sign(o.w)
      else if(!dy) part.h=Math.abs(part.w)*Math.sign(o.h)
      else {
        let delta = (part.h*Math.sign(o.h) - part.w*Math.sign(o.w)) / 2 // preserve agreement of sign
        part.h-=delta*Math.sign(o.h)
        part.w+=delta*Math.sign(o.w)
      }
    }
    if(snapsizes.checked){
      if(dx || match.checked) part.w = snapTo(part.w,sizesnaps)
      if(dy || match.checked) part.h = snapTo(part.h,sizesnaps)
    }
    if(!center.checked){
      let nx = dx?ro.x+dx*(part.w-o.w)/2:ro.x
      let ny = dy?ro.y+dy*(part.h-o.h)/2:ro.y
      /*
      // let nx=dx?(m.x+ro.x-dx*o.w/2)/2:ro.x
      // let ny=dy?(m.y+ro.y-dy*o.h/2)/2:ro.y
      nx=dx?m.x-dx*part.w/2:ro.x
      ny=dy?m.y-dy*part.h/2:ro.y
      if(delta){
        // I'm ashamed to admit that I did this bit by trial and error
        // rather than the honest way of deriving it, then bugfixing by trial and error
        nx+=dx*delta
        ny-=dy*delta
      }*/
      let {x,y}=cmati.transformPoint({x:nx,y:ny})
      part.x=x
      part.y=y // need to change both regardless of dy/dx in case of rotation
    }
    //spmat.inverse().translate((part.x-1/2)*h,(p.y-1/2)*w).rotate(part.rot).multiply(spmat);
    transformChanged(part);
  }
}

document.addEventListener("pointermove",(e)=> {moveAction(e)})
let conts
function pointerEnd(e){
  if(e.target.parentElement!=sidediv) drawCarefully()
  moveAction = ()=>{}
}
let carefulDrawCount = 100000
function drawCarefully(){
  let jparts = JSON.stringify(copyparts(parts))
  if(jparts!=hist[histIx][0]) hist.splice(++histIx, 0, [jparts,parts.indexOf(selected)])
  clearTimeout(keyboardTimeout)
  conts = drawFractal(getDrawCount(),true)
  checkAnswer(conts)
  //console.log(calcDim(conts))
}
document.addEventListener("pointerup",pointerEnd)
document.addEventListener("pointercancel",pointerEnd)

document.addEventListener("pointerdown",(e)=>
  console.log(e,e.x,e.y)
)
let keyboardTimeout
document.addEventListener("keydown",(e)=>{
  let unhandled=undefined;
  if (!outerLevelSelect.classList.contains("hidden")){
    if (e.key=="Escape"){
      outerLevelSelect.classList.add("hidden")
    }
    else return;
  }
  switch(e.key){
    case "z":
      if (e.ctrlKey && histIx>0){
        let oldlen = parts.length
        let oldIx = hist[histIx][1]
        parts = JSON.parse(hist[--histIx][0])
        let newIx = parts.length==oldlen && oldIx!=-1  ? oldIx : hist[histIx][1]
        resetParts()
        if(newIx!=-1) selectPart(parts[newIx])
        unhandled=false;
      }
      break;
    case "Z":
    case "y": // Ctrl+y or Ctrl+Shift+z to redo
      if(e.ctrlKey && histIx+1<hist.length){
          parts = JSON.parse(hist[++histIx][0])
          resetParts()
          if(hist[histIx][1]!=-1) selectPart(parts[hist[histIx][1]])
          unhandled=false;
      }
  }

  if(selected){
    console.log(e)
    switch(e.key){
      case "d":
      case "ArrowRight":
        if (snappositions.checked) snapNext(selected,"x",possnaps)
        else selected.x+=1/60
        transformChanged(selected)
        break;
      case "a":
      case "ArrowLeft":
        if (snappositions.checked) snapPrev(selected,"x",possnaps)
        else selected.x-=1/60
        transformChanged(selected)
        break;
      case "s":
      case "ArrowDown":
        if (snappositions.checked) snapNext(selected,"y",possnaps)
        else selected.y+=1/60
        transformChanged(selected)
        break;
      case "w":
      case "ArrowUp":
        if(snappositions.checked) snapPrev(selected,"y",possnaps)
        else selected.y-=1/60
        transformChanged(selected)
        break;
      case "q":
        selected.rot-=15
        transformChanged(selected)
        break;
      case "e":
        selected.rot+=15
        transformChanged(selected)
        break;
      case "Delete":
        deletepart(selected)
        break;
      case " ":
        drawCarefully()
        break;
      case "Tab":
      case "n":
        for(let i=0;i<parts.length;i++){
          if(selected==parts[i]) {
            selectPart(parts[(i+1)%parts.length])/*
            if(i+1<parts.length) selectPart(parts[i+1])
            else deselect()*/
            break;
          }
          if(i+1==parts.length)selectPart(parts[0])
        }
        break;
      default:
        if(unhandled!==false) unhandled=true
    }
    if(!unhandled && selected){
      e.preventDefault()
      if(e.key!=" "){
        clearTimeout(keyboardTimeout)
        keyboardTimeout = setTimeout(drawCarefully
          ,500)
      }
      // stops scrolling (arrow keys and space) and might do something about tab
    }
  }
})
