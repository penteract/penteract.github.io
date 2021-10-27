function mkShader(gl,program,body,type){
  shdr = gl.createShader(type)
  gl.shaderSource(shdr, body)
  gl.compileShader(shdr)
  if (!gl.getShaderParameter(shdr, gl.COMPILE_STATUS)) {
    console.log('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shdr));
    gl.deleteShader(shader);
    return null;
  }
  gl.attachShader(program,shdr)
}
const init_scale = 0.5;

function setup(canvas, vertexShader, fragmentShader,possize, data, normal){
  let gl = canvas.getContext("webgl2")
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.enable(gl.DEPTH_TEST);
  gl.floatsPerPoint=normal?2*possize+1:possize+1
  //gl.enable(gl.BLEND);
  //gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let program = gl.createProgram()
  mkShader(gl,program,vertexShader,gl.VERTEX_SHADER)
  mkShader(gl,program,fragmentShader,gl.FRAGMENT_SHADER)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    var linkErrLog = gl.getProgramInfoLog(program)
    console.log(
      "Shader program did not link successfully. "
      + "Error log: " + linkErrLog)
    }
  //console.log("hi",gl.getUniformLocation(program, 'uSampler'))
  gl.buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

  let posLoc = gl.getAttribLocation(program, 'pos')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, possize, gl.FLOAT, false, 4*(gl.floatsPerPoint), 0)
  let indxLoc = gl.getAttribLocation(program, 'indx')
  gl.enableVertexAttribArray(indxLoc)
  gl.vertexAttribPointer(indxLoc, 1, gl.FLOAT, false, 4*(gl.floatsPerPoint), 4*possize)
  if(normal){
  let normLoc = gl.getAttribLocation(program, 'norml')
  gl.enableVertexAttribArray(normLoc)
  gl.vertexAttribPointer(normLoc, possize, gl.FLOAT, false, 4*(gl.floatsPerPoint), 4*(possize+1))
}

  //pieceLoc = gl.getAttribLocation(program, 'boardPos')
  gl.numPoints = data.length/gl.floatsPerPoint

  gl.useProgram(program)
  gl.mat = [
    [init_scale,0,0,0],
    [0,init_scale,0,0],
    [0,0,init_scale,0],
    [0,0,0,1],
  ]
  gl.matLoc = gl.getUniformLocation(program,"uTransform")
  setMatrix(gl,gl.mat.flatMap(x=>x))
  return gl
}
function setMatrix(gl,matrix){
  gl.clearColor(1.0, 1.0, 1.0, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.uniformMatrix4fv(gl.matLoc,false,new Float32Array(matrix))
  gl.drawArrays(gl.TRIANGLES,0,gl.numPoints)
}
function setData(gl,data){
  gl.numPoints=data.length/gl.floatsPerPoint
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.buffer)
  //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
  gl.bufferSubData(gl.ARRAY_BUFFER,0, new Float32Array(data));
  gl.clearColor(1.0, 1.0, 1.0, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES,0,gl.numPoints)
}
function resetData(gl,data){
  gl.mat = [
    [init_scale,0,0,0],
    [0,init_scale,0,0],
    [0,0,init_scale,0],
    [0,0,0,1],
  ]
  gl.uniformMatrix4fv(gl.matLoc,false,new Float32Array(gl.mat.flatMap(x=>x)))
  setData(gl,data)
}