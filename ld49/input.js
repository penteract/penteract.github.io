let data = new Uint8Array(4)
layerCanvas.addEventListener("click",function (e){
  if(gameover) return;
  setMatrix(gl1,gl1.mat.flatMap(x=>x))
  let r = layerCanvas.getClientRects()[0]
  let x=e.x-r.x
  let y=r.height-(e.y-r.y)
  gl1.readPixels(x,y,1,1,gl1.RGBA,gl1.UNSIGNED_BYTE,data)
  let blockNum=undefined
  switch(data[0]){
    case 255:
      break;
    case 178:
      blockNum=0
      break;
    case 191:
      blockNum=1
      break;
    case 204:
      blockNum=2
      break;
    case 217:
      blockNum=3
      break;
    default:
      console.log("err")
      break;
  }
  if(blockNum!==undefined){
    removeBlock(blockNum)
  }
  //console.log(e)
})

//gl.readPixels(0,0,300,300,gl.RGBA,gl.UNSIGNED_BYTE,data)
//getAt(
//let data = new Uint8Array(4);


function keyPress(e){
  switch (e.key) {
    case "a":
      rotate(gl1,0,2,0.1)
      break;
    case "d":
      rotate(gl1,0,2,-0.1)
      break;
    case "w":
      rotate(gl1,1,2,0.1)
      break;
    case "s":
      rotate(gl1,1,2,-0.1)
      break;
    case "q":
      rotate(gl1,0,1,0.1)
      break;
    case "e":
      rotate(gl1,0,1,-0.1)
      break;
  }
}
function keyDown(e){
  if(gameover) return;
  switch(e.key){
    case "ArrowUp":
      changeLayer(currentLayer+1)
      e.preventDefault()
      return false;
    case "ArrowDown":
      changeLayer(currentLayer-1)
      e.preventDefault()
      return false;
  }
}
document.addEventListener("keypress",keyPress)
document.addEventListener("keydown",keyDown)