const server = "wss://tesseract.nfshost.com/connect/"
let connected = false

const N_JOIN = 1
const N_STATE = 2
const N_TAKE = 3
const N_RESET = 4

let ws
let resetVotes = 0

let numPlayers = -1 // Guess the number of players playing
let movesSinceLast = -1
let alone = true
function connect(tag){
  if(connected) ws.close()
  connected=false
  ws = new WebSocket(server+tag)
  ws.onopen = (x => {
    if(x.target===ws){
      console.log("connection started")
      inGame.style.display=""
      gameTag.innerText=tag
      connected = true
      ws.send(new Uint8Array([N_JOIN]))
      trueReset()
      numPlayers = -1
      movesSinceLast = -1
      alone=true
      probablyNotTurn()
    }
    else{
      x.target.close()
    }
  })
  ws.onmessage = (x=>{
    if(!connected || x.target!==ws){
      x.target.close()
      return;
    }
    alone = false
    console.log("received message", x.data)
    x.data.arrayBuffer().then(x=>recieveMessage(new Uint8Array(x)))
  })
  ws.onclose = (x=>{
    console.log("connection closed")
    if(x.target===ws){
      connected=false
      inGame.style.display="none"
      probablyNotTurn()
    }
  })
  ws.onerror = (x=>console.log("connection error",x))
}

function recieveMessage(arr){
  console.log(arr)
  //return;
  switch (arr[0]) {
    case N_JOIN:
      ws.send(new Uint8Array([N_STATE].concat(serialiseState())))
      break;
    case N_STATE:
      deserialise(arr.slice(1))
      break;
    case N_TAKE:
      rb(arr[1],arr[2])
      if(movesSinceLast!=-1){
        movesSinceLast+=1
        if(numPlayers!=-1 && numPlayers==movesSinceLast+1){
          probablyTurn()
        }
        else probablyNotTurn()
      }
      break;
    case N_RESET:
      reset(true)
    default:

  }
}

let rb = removeBlock

removeBlock = function(i,layer){
  if(movesSinceLast!==-1){
    numPlayers = movesSinceLast + 1
  }
  movesSinceLast = 0
  probablyNotTurn()
  if(layer===undefined) layer=currentLayer
  rb(i,layer)
  if(ws) ws.send(new Uint8Array([N_TAKE,i,layer]))
}
function probablyTurn(){
  isTurn.innerHTML="it's probably your turn"
  document.body.style.filter="saturate(150%)"
}
function probablyNotTurn(){
  isTurn.innerHTML=""
  document.body.style.filter=""
}

let trueReset = reset
reset = function (ask){
  if(connected && !alone){
    resetVotes +=1
    setTimeout(()=> resetVotes-=1, 3000)
    if(ask && resetVotes==1){
      if(confirm("Do you want to reset the game?")){
        resetVotes+=1
        setTimeout(()=> resetVotes-=1, 3000)
        ws.send(new Uint8Array([N_RESET]))
      }
    }
    if(!ask){
      ws.send(new Uint8Array([N_RESET]))
    }
    if(resetVotes==2){
      numPlayers = -1
      movesSinceLast = -1
      trueReset()
    }
  }
  else trueReset()
}

function serialiseState(){
  let height = stack.length;
  bits=[]
  for(let i=0;i<height;i++){
    for (let p of stack[i].pieces){
      if (p===undefined)bits.push(1)
      else bits.push(0)
    }
  }
  chars=[height]
  for(let i=0;i<bits.length;i++){
    let bit = (i&7)
    if(bit==0) chars.push(0)
    if(bits[i]) chars[1+(i>>3)]|=(1<<bit)
  }
  return chars
}
function deserialise(data){
  let height = data[0]
  data = data.slice(1)
  let layerSize = stack[0].pieces.length
  let nRemoved = data.map(popCount).reduce((x,y)=>x+y)
  if(nRemoved>removed){
    resetUI()
    resetStack(height)
    for (let i=0;i<height*layerSize;i++){
      if(data[i>>3]&(1<<(i&7))){
        removedList.innerHTML+="Layer "+((i/layerSize)|0)+", block "+i%layerSize+"<br />"
        stack[(i/layerSize)|0].pieces[i%layerSize] = undefined
        removed+=1
      }
    }
    setAllData()
    checkFalls()
  }
}

function popCount(n){
  n = (n&0x55) + ((n&0xaa)>>1)
  n = (n&0x33) + ((n&0xcc)>>2)
  return (n&0xf0) + (n&0x0f)
}


//connect("test")
