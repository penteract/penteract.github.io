
let challengeDict = {}
let results = localStorage.getItem("results")
if(results) {results = JSON.parse(results)}
else {results = {}}
for(let lvl of challenges){
  lvl.thresholdFactor??=1
  challengeDict[lvl.name]=lvl
  if(results[lvl.name]){
    lvl.status = results[lvl.name] // 0 means incomplete; other value indicates the number of pieces used
  }
}
function setStatus(lvl, partCount){
  lvl.status = partCount
  saveProgress()
  setStatusText(lvl)
  //lvl.box.children[lvl.box.childElementCount-1].innerHTML = partCount
  calcDeps()
  return getNextLevel()
}
function getNextLevel(){
  for(let grp in dependencies){
    let box = dependencies[grp].box
    if(!box.classList.contains("locked")){
      for(let x of challenges){
        if((x.name===grp || x.group===grp) && !x.status){
          return x
        }
      }
    }
  }
  return null
}
function saveProgress(){
  results = {}
  for(let name in challengeDict){
    results[name] = challengeDict[name].status
  }
  localStorage.setItem("results", JSON.stringify(results))
}

function mkArrow(dir){
  let arr = document.createElementNS("http://www.w3.org/2000/svg","svg")
  arr.classList.add(dir+"Arrow")
  let r=0
  let x=0
  let y=0
  let w=20
  let h=100
  for(let i=0; dir!="left" && i-1<(dir=="right") ; i++ ){
    r-=90
    ;[w,h] = [h,w]
    ;[x,y]=[y,100-(x+h)]
  }
  arr.innerHTML = '<path transform="rotate('+r+' 50 50)" fill="white" d="M0,50 L10,0 L10,25 L20,25 L20,75 L10,75 L 10,100 Z">'
  arr.setAttribute("viewBox",[x,y,w,h].join(" "))
  //<rect fill="white" x="120" width="100" height="100" rx="15"> </rect>\
  //<rect fill="black" x="0" y="0" width="100" height="100"> </rect>'
  return arr
}
function levelBox(name,position,arrow){
  let [x,y] = position;
  let div = document.createElement("div")
  div.style = 'grid-column:'+x+';grid-row:'+y+';'
  div.classList.add("lvlbox")
  div.classList.add("locked")
  div.append(name)
  if(arrow){div.append(arrow)}
  return div
}
function singleLvlBox(lvl,position,container,arrow){
  //console.log(position)

  let div = levelBox(lvl.name,position,arrow)
  div.append(document.createElement("br"))
  div.append(mkSmallCanvas(lvl.target,10000,100,100))
  div.append(document.createElement("br"))
  let sp = document.createElement("span")
  //sp.innerHTML="incomplete"
  div.append(sp)
  lvl.box=div
  setStatusText(lvl)
  div.addEventListener("click",()=>startChallenge(lvl))
  container.append(div)
  occupied[position]=true
  return div
}
function setStatusText(lvl){
  let box = lvl.box
  let tbox = box.children[box.childElementCount-1]
  if (lvl.status){
    let par = lvl.par ?? lvl.init.length
    tbox.innerHTML = lvl.status+ " parts " + "★".repeat(1 + (lvl.status<=par+1) + (lvl.status<=par) + (lvl.status<par))
    box.classList.remove("incomplete")
  } else {
    tbox.innerHTML = "incomplete"
    box.classList.add("incomplete")
  }
}
function lvlGroupBox(grp,position,container,arrow){
  //console.log(position)
  let [[x1,x2],[y1,y2]] = position
  let h = document.createElement("h2")
  h.append(grp)
  let div = levelBox(h,[x1+"/"+x2,y1+"/"+y2],arrow)
  div.classList.add("lvlgroup")
  let i=x1
  let j=y1
  for(let x of inGroup[grp]){
    //console.log(i,j)
    let lvldiv= singleLvlBox(x,[i-x1+1,j-y1+1],div)
    lvldiv.classList.remove("locked")
    if (i+1>=x2){j+=1;i=x1} else{i+=1}
  }
  for(let i=x1;i<x2;i++){
    for(let j=y1;j<y2;j++){
      occupied[[i,j]]=true
    }
  }
  container.append(div)
  return div
}
let inGroup = {}
for(let x in dependencies){
  inGroup[x] = []
}
for(let x of challenges){
  if (x.group){
    inGroup[x.group].push(x)
  }
  else if(x.name in inGroup){
    inGroup[x.name].push(x)
    if(inGroup[x.name].length!=1) throw "name conflict"
  }
  else{
    throw ("level without specified dependencies: "+x.name)
  }
}
let positions = {}
let occupied = {}
let i=0
for(let grp in dependencies){
  //console.log(grp)
  let itms = inGroup[grp]
  let deps = dependencies[grp]
  if (grp.startsWith("Controls: ")){
    i++
    deps.box=singleLvlBox(itms[0],[3,i],levelSelectgrid,deps.length && mkArrow("down"))
    positions[grp] = [[3,4],[i,i+1]]
    // s+='<div style="grid-column:'+3+';grid-row:'+i+';">'+x.name+"<canvas width=100 height=100 /> </div>"
    //console.log(levelSelect.innerHTML)
  }
  else{
    let y = Math.max(... dependencies[grp].map(d => positions[d][1][1]-1 ))
    function getXs(ps){
      return [ps[0],ps[1]-1]
    }
    let x = 2
    //let x = Math.max(dependencies[grp].flatMap(d => [positions[d][0][0],positions[d][0][1]-1]).map(x=>[Math.abs(x-3),x]))[1]
    //x += Math.sign(x-3) // Move one step in the right direction
    while(occupied[[x,y]]){
      x=(x<3?6:5)-x
    }
    if(itms.length<=1){
      deps.box=singleLvlBox(itms[0],[x,y],levelSelectgrid,mkArrow(x<3?"left":"right"))
      positions[grp] = [[x,x+1],[y,y+1]]
    }
    else{
      let w=1
      if(Math.abs(x-3)<=1){ w=2; if(x<3) x-=1 }
      positions[grp] = [[x,x+w],[y,y+(itms.length+w-1)/w|0]]
      deps.box=lvlGroupBox(grp,positions[grp],levelSelectgrid,mkArrow(x<3?"left":"right"))
    }
  }
  //let positions[grp]
  //let [[x1,x2],[y1,y2]] = positions[grp]
  //if(x.position)drawLevel(x,levelSelectgrid)
}
function calcDeps(){
  for(let grp in dependencies){
    let deps = dependencies[grp]
    if(!deps.some(x=>!challengeDict[x].status)){
      deps.box.classList.remove("locked")
    }
    else{
      deps.box.classList.add("locked")
    }
  }
}
calcDeps()
function levelSelect(){
  calcDeps()
  outerLevelSelect.classList.remove("hidden")
}
let par = '{"Controls: Move":3,"Solid square":2,"Repositioning":3,"Controls: Rotate":3,"Solid Triangle":3,"Right Isoceles triangle":2,"Twin Dragon":2,"Controls: Create":4,"Sierpiński Plus":4}'
