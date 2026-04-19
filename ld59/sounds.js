"use strict";

let i=0
let sinevol= new GainNode(audio,{gain:0.4})
sinevol.connect(audio.destination)
let sine = new OscillatorNode(audio,{frequency:400+40*i})
sine.connect(sinevol)
sine.start()
function f(x){
  let i=0
  for(;(x&1)==0;x>>=1)i+=1;
  return i
}
let soundLoopID
function soundLoop(){
  i+=1
  let ruler = f(i)
  sine.frequency.setTargetAtTime(200+40*ruler,audio.currentTime,0.05)
  sinevol.gain.setValueAtTime(0.4+Math.sqrt(ruler)*0.1,audio.currentTime) // this causes clicks, but that's reminiscent of train sounds
  sinevol.gain.setTargetAtTime(0,audio.currentTime,0.05)
  soundLoopID = setTimeout(soundLoop,tickrate/8)
}
soundLoop()
function stopMusic(pause){
  if(soundLoopID) soundPaused=pause
  clearTimeout(soundLoopID)
  soundLoopID=undefined
}
function startMusic(){
  if(paused || continuediv.style.display!="none" || gameover.style.display!="none") soundPaused=true
  else{
    if(soundLoopID!==undefined)clearTimeout(soundLoopID)
    if(audio.state=="suspended") new Promise(()=>audio.resume())
    i=0
    soundLoop()
  }
}
function togglemusic(){
  if(soundLoopID===undefined || audio.state=="suspended"){
    startMusic()
  }
  else{
    stopMusic(false)
  }
}
