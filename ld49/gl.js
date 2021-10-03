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

function setup(canvas, vertexShader, fragmentShader,possize, data){
  let gl = canvas.getContext("webgl2")
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.enable(gl.DEPTH_TEST);
  gl.possize=possize
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
  gl.vertexAttribPointer(posLoc, possize, gl.FLOAT, false, 4*(1+possize), 0)
  let indxLoc = gl.getAttribLocation(program, 'indx')
  gl.enableVertexAttribArray(indxLoc)
  gl.vertexAttribPointer(indxLoc, 1, gl.FLOAT, false, 4*(1+possize), 4*possize)

  //pieceLoc = gl.getAttribLocation(program, 'boardPos')
  gl.numPoints = data.length/(gl.possize+1)

  gl.useProgram(program)
  let scale = 0.5
  gl.mat = [
    [scale,0,0,0],
    [0,scale,0,0],
    [0,0,scale,0],
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
  gl.numPoints=data.length/(gl.possize+1)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.buffer)
  //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
  gl.bufferSubData(gl.ARRAY_BUFFER,0, new Float32Array(data));
  gl.clearColor(1.0, 1.0, 1.0, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES,0,gl.numPoints)
}
