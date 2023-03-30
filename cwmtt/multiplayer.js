<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <script type="module" id="mod">
// https://github.com/bjorn3/browser_wasi_shim
// MIT license
import WASI from "./dist/wasi.js"
const wasi = new WASI([], [], []);
console.log(wasi)
const wasiImportObj = { wasi_snapshot_preview1: wasi.wasiImport };
WebAssembly.instantiateStreaming(fetch("cwmttwasm.wasm"), wasiImportObj).then(
    results => {
        wasi.inst = results.instance
        wasi.mem=results.memory
        results.instance.exports.hs_init()
        window.e = wasi.inst.exports
        window.ptr = window.e.initMem()
        console.log(results,ptr)
        setup()
    }
)
        </script>
        <style type="text/css">
body{
    background-color: gray;
}
#main{
    /*border: 10px solid blueviolet;*/
    font-size: 1.5em;
    /*background-color: gray;*/
    border-spacing: 5px;
    padding-right:16em;
    padding-top:16em;
    padding-bottom:16em;
}
/*https://stackoverflow.com/a/3209434*/
#main>tr>td{
    border: 5px solid;
    padding: 0px;
}
#main>tr>td:nth-child(odd){
    border-color: white;
}
#main table{
    border: 0px;
    border-spacing: 0px;
    height: 8em;
    width: 8em;
}
/*
#main > tr:nth-child(even)>td:nth-child(even){
    background-color: blue;
}*/
#main table :where(tr:nth-child(even)>td:nth-child(even), tr:nth-child(odd)>td:nth-child(odd)){
    background-color:  hsl(40, 56%, 86%);
}
#main table :where(tr:nth-child(even)>td:nth-child(odd), tr:nth-child(odd)>td:nth-child(even)){
    background-color: hsl(60, 56%, 91%);
}
/*https://stackoverflow.com/a/19461564*/
#main table td{
    padding: 0px;
}
#main table tr>td.source{
    background-color: lightgreen;
}
#main table tr>td.highlight{
    background-color: green;
}
#main table tr>td.check{
    background-color: red;
}
#main table td div{
    height: 1em;
    width: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
}
#buttons{
    font-size: 1em;
    position: fixed;
    left: 50%;
    transform: translate(-50%,150%) scale(4);
}
#buttons button{
    font-size: 1em;
}
#multiplayer{
    font-size: 1em;
    position: fixed;
    left: 50%; 
    transform: translate(-50%,-50%) scale(2);
    bottom:0px;
}
#gameTag{
    font-family:monospace;
}
        </style>
    </head>
    <body>
        <div id="buttons">
            <button onclick="undo()" id="undobtn">undo</button>
            <button onclick="submit()" id="submitbtn">submit</button>
        </div>
        <table id="main">
        </table>
        <div id="multiplayer" style="display: none;">
            <span id="inGame" style="display:none">
                Joined game <span id="gameTag"></span>
                <br>
                <span id="isTurn"></span>
            </span>
            <span id="noConn" style="">
                Not Connected
            </span>
        </div>
    </body>
    <script>
let pieceDict = {
P:"♙",
R:"♖", 
N:"♘", 
B:"♗", 
Q:"♕", 
K:"♔",
p:"♟︎",
r:"♜", 
n:"♞", 
b:"♝", 
q:"♛", 
k:"♚"
}
pieceDict[" "] = " "
maxT = 128
maxL = 64
minL = -maxL
numTimelines = (maxL - minL) + 1

moveSize = 8
numCells = numTimelines*maxT*64*2
boardShapeDataSize =  2+ numTimelines*2 

checkDataSize = moveSize
maxMoves = numTimelines*(maxT-1)
maxOutMoves = 7*4*(1+8) + numTimelines + maxT
outMovesSize = 4

initMemSize = (maxMoves*moveSize + maxOutMoves*outMovesSize + checkDataSize + boardShapeDataSize + numCells)
inputMovesDataStart = 0
outputMovesDataStart = inputMovesDataStart + maxMoves*moveSize
checkDataStart = outputMovesDataStart + maxOutMoves*outMovesSize
boardShapeStart = checkDataStart + checkDataSize
boardDataStart = boardShapeStart + boardShapeDataSize
function setup(){
    //e.bar(ptr)
    makeBuffers(e.memory.buffer)
    selected=undefined
    setTurn()
    e.reset(ptr)
    mktable()
    e.baz(ptr)
    e.reset(ptr)
    //addMove(0,1,1,0,0,1,2,2)
    //submit()
}
function reset(){
    setTurn()
    e.reset(ptr)
    mktable()
}
function makeBuffers(mem){
    movesInputData = new Uint8Array (mem, ptr+inputMovesDataStart, maxMoves*moveSize)
    movesOutputData = new Int8Array (mem, ptr+outputMovesDataStart, maxOutMoves*outMovesSize)
    checkData = new Int8Array (mem, ptr+checkDataStart, checkDataSize)
    minLmaxL = new Int8Array (mem, ptr+boardShapeStart, 2)
    timelineBounds = new Uint8Array (mem, ptr+boardShapeStart+2, boardShapeDataSize-2)
    boardData = new Uint8Array(e.memory.buffer, ptr+boardDataStart, numCells)
}
function addMove(l1,t1,x1,y1, l2,t2,x2,y2){
    let items = [l1,t1,x1,y1, l2,t2,x2,y2]
    items.map((el,ix) => movesInputData[numMoves*moveSize+ix]=el)
    numMoves += 1
    k = e.changeMoves(ptr,numMoves)
    mktable()
    return k
}
function undo(override){
    if(numMoves>0){
        if (override||!undobtn.disabled){
            numMoves -= 1
            e.changeMoves(ptr,numMoves)
            mktable()
            return true
        }
    }
    return false
}
function submit(override){
    if(override || !submitbtn.disabled){
        e.submit(ptr,numMoves)
        setTurn(!col)
        scrollBy({left: t1.offsetLeft-t0.offsetLeft,top:0,behavior:"smooth"})
        testLegal()
    }
}
function setTurn(toBecomeBlack){
    numMoves=0
    clearHighlight()
    movesFrom = {}
    selected=undefined
    col=!!toBecomeBlack
}
function getMoves(l,t,x,y){
    if (movesFrom[[l,t,x,y]] !== undefined){
        return movesFrom[[l,t,x,y]];
    }
    let n = e.getMovesFromSquare(ptr,l,t,x,y)
    mvs = []
    for(let i=0;i<n;i++){
        mvs.push([0,1,2,3].map(j=>movesOutputData[i*4+j]))
    }
    movesFrom[[l,t,x,y]] = mvs
    return mvs
}
function makeName(isBlack,l,t,x,y){
    return (isBlack?"b":"w")+l+"T"+t+"abcdefgh"[x]+(y+1)
}
function clearHighlight(){
    //should be called immediately before any assignment to selected, col or movesFrom, unless the cells have only just been created
    if(selected){
        for(let c of getMoves(...selected)){
            getById(makeName(col,...c)).classList.remove("highlight")
        }
        getById(makeName(col,...selected)).classList.remove("source")
    }
}
getById = x => document.getElementById(x)
function addHandlers(cell,isBlack,l,t,x,y){
    cell.addEventListener("click",e=>{
        console.log(l,t,x,y)
        if(isBlack==col){
            if(cell.classList.contains("highlight")){
                addMove(...selected , l,t,x,y)
            }else{
                clearHighlight()
                selected = [l,t,x,y]
                mvs = getMoves(...selected)
                cell.classList.add("source")
                for(let c of mvs){
                    getById(makeName(col,...c)).classList.add("highlight")
                }
            }
        }
    })
}
function mktable(){
    let mnl = minLmaxL[0]
    let mxl = minLmaxL[1]
    let tls = []
    for(let l=mnl;l<=mxl;l++){
        let tl = document.createElement("tr")
        for(let t=0; t<timelineBounds[(l-minL)*2]; t++ ){
            //console.log(t)
            td = document.createElement("td")
            td.append(document.createElement("table"))
            tl.append(td)
            if(t==0) t0=td;
            if(t==1) t1=td;
        }
        for(let t=timelineBounds[(l-minL)*2]; t<=timelineBounds[(l-minL)*2+1]; t++ ){
            tBlack = t%2
            T = (t/2)|0
            board=document.createElement("table")
            for(let y=0;y<8;y++){
                row=document.createElement("tr")
                for(let x=0;x<8;x++){
                    cell = document.createElement("td")
                    txt = document.createElement("div")
                    //console.log(l,t,x,y, (l-minL)*maxT*2 + t*64 + x*8 + y)
                    txt.append(pieceDict[String.fromCharCode(boardData[(l-minL)*maxT*64*2 + t*64 + x*8 + y ] )])
                    cell.setAttribute("id",makeName(tBlack,l,T,x,y))
                    addHandlers(cell,tBlack,l,T,x,y)
                    cell.append(txt)
                    row.append(cell)
                }
                board.append(row)
            }
            td = document.createElement("td")
            td.append(board)
            tl.append(td)
            if(t==0) t0=td;
            if(t==1) t1=td;
        }
        tls.push(tl)
    }
    main.replaceChildren(...tls)
    selected = undefined
    testLegal()
    console.log("done remaking table")
}
function testLegal(){
    if(checkData.reduce(((x,y)=>x&&(y==0)),true)){
        submitbtn.disabled=false
    }else{
        submitbtn.disabled=true
        if(!checkData.reduce(((x,y)=>x&&(y==-1)),true)){
            check = []
            for(let i=0;i<2;i++){
                check.push([0,1,2,3].map(j=>checkData[i*4+j]))
            }
            for(let sq of check)
                getById(makeName(col,...sq)).classList.add("check")
        }
    }
    undobtn.disabled = numMoves<=0
}
document.addEventListener("keypress",e=>(e.key=="f")?submit():0)
document.addEventListener("keypress",e=>(e.key=="u")?undo():0)
const urlSearchParams = new URLSearchParams(window.location.search);
const params = Object.fromEntries(urlSearchParams.entries());
if(params["multiplayer"]){
    multiplayer.style.display=""
}
    </script>
    <script src="multiplayer.js" type="text/javascript"></script>
</html>
