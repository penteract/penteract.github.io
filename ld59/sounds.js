"use strict";


function makeDistortionCurve(amount) {
  const k = typeof amount === "number" ? amount : 50;
  const numSamples = 44100;
  const curve = new Float32Array(numSamples);
  const deg = Math.PI / 180;

  for (let i = 0; i < numSamples; i++) {
    const x = (i * 2) / numSamples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

let i=0
let sineshape = new BiquadFilterNode(audio,{"type":"lowpass","Q":0.1,"frequency":2000})
sineshape.connect(audio.destination)

let sinevol= new GainNode(audio,{gain:0.4})
sinevol.connect(sineshape)
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
  sine.frequency.setValueAtTime(200+40*ruler,audio.currentTime,0.05)
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
