
function resizeCanvas() {
    canvas.width = w = window.innerWidth;
    canvas.height = h = window.innerHeight;
    redraw();
}

function scl(x, y, factor) {
    if (factor > 2) factor = 2;
    if (factor < 0.5) factor = 0.5;
    let oldscale = scale
    scale *= factor
    scale = Math.round(scale * SQSZ) / SQSZ
    if (scale == oldscale && factor < 0) scale -= 1 / SQSZ
    else if (scale == oldscale && factor > 0) scale += 1 / SQSZ
    if (scale < 1 / 8) scale = 1 / 8;
    if (scale > 100) scale = 100;
    let sr = scale / oldscale
    // This took far too long
    xoff = Math.round((x - (x - xoff) * sr))
    yoff = Math.round((y - (y - yoff) * sr))
    redraw()
}
function whl(e) {
    //console.log(e.deltaY)
    if(!tutorial.contains(document.elementFromPoint(e.clientX,e.clientY)) ){
      if (e.deltaY != 0) scl(e.clientX, e.clientY, Math.pow(0.95, e.deltaY))
    }
}
function roundAway(x) {
    return x > 0 ? Math.ceil(x) : Math.floor(x)
}
function scroll(dx, dy) {
    xoff += roundAway(dx)
    yoff += roundAway(dy)
    redraw()
}
if (defined == !defined) throw new ReferenceError("defined is not defined")
//window.addEventListener("click",clk)
window.addEventListener("wheel", whl)
mousepos = [0, 0]
window.addEventListener("mousedown", function (e) {
    if (e.button === 1) mousepos = [-e.clientX, -e.clientY]
})
window.addEventListener("mousemove", function (e) {
    if (e.buttons & 4) {
        scroll(mousepos[0] + e.clientX, mousepos[1] + e.clientY)
        mousepos = [-e.clientX, -e.clientY]
    }
})
document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case "a":
        case "h":
        case "ArrowLeft":
            scroll(100, 0)
            break
        case "d":
        case "l":
        case "ArrowRight":
            scroll(-100, 0)
            break
        case "w":
        case "k":
        case "ArrowUp":
            scroll(0, 100)
            break
        case "s":
        case "j":
        case "ArrowDown":
            scroll(0, -100)
            break
    }
});

window.addEventListener('resize', resizeCanvas, false);
resizeCanvas();

function clk(x, y, button) {
    sel([Math.floor((x - xoff) / scale / SQSZ)
        , Math.floor(- (y - yoff) / scale / SQSZ)], button)
}

// Input
canvas.addEventListener("mousedown", function (e) {
    if (e.button === 0 || e.button === 2) { clk(e.clientX, e.clientY, e.button) }
})

canvas.addEventListener("mousemove", function (e) {
    // console.log(e)
    if (e.buttons === 1 || e.buttons === 2) { clk(e.clientX, e.clientY, (e.buttons - 1) * 2) }
})
