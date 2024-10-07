
SQSZ = 16

STROKEWIDTH = 1

colMap = {
    "dirt": "Sienna", // did you know sienna is a kind of clay?
    "tunnel": "sandyBrown",
    "ant": "darkred",
    "worker": "darkred",
    "queen": "hotpink", //"#7851a9"
    "grub": "seashell",
    "food": "forestgreen",
    "water": "#00D7",
    "nursery":"#FFF8"
}

function draw() {
    ctx.fillStyle = "skyblue" // good color for the sky
    ctx.fillRect(SQSZ * minx, 0, SQSZ * (maxx - minx + 1), SQSZ * (maxy + 1))
    ctx.fillStyle = colMap["dirt"]
    ctx.fillRect(SQSZ * minx, SQSZ * miny, SQSZ * (maxx - minx + 1), -SQSZ * miny)

    for (let p in map) {
        let elt = map[p]
        p = p.split(",")
        let wet = false
        if (elt.includes("tunnel")) {
            ctx.fillStyle = colMap["tunnel"]
            ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
        }
        for (let x of elt) {
            if (["food", "queen", "grub", "dirt"].includes(x + "")) {
                ctx.fillStyle = colMap[x]
                ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
            }
            else if (x instanceof Ant) {
                ctx.fillStyle = colMap["ant"]
                ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
            }
            if (x == "water") { wet = true }
        }
        if (wet) {
            ctx.fillStyle = colMap["water"]
            ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
        }
    }
    for (let p in nmap){
        p = p.split(",")
        ctx.fillStyle = colMap["nursery"]
        ctx.fillRect(SQSZ * p[0], SQSZ * p[1], SQSZ, SQSZ)
    }
    ctx.setLineDash([(SQSZ-1)*2/7, (SQSZ-1)*2/9])
    for (let type in orders) {
        ctx.strokeStyle = colMap[type]
        for (let p in orders[type]) {
            let [x, y] = p.split(",")
            ctx.strokeRect(SQSZ * x + STROKEWIDTH / 2, SQSZ * y + STROKEWIDTH / 2, SQSZ - STROKEWIDTH, SQSZ - STROKEWIDTH)
        }
    }
    // todo: delayed orders?
    ctx.setLineDash([])
    for (let wp in targets) {
        let [thing, x, y] = wp.split(",")
        ctx.strokeStyle = colMap[thing]
        ctx.strokeRect(SQSZ * x + STROKEWIDTH / 2, SQSZ * y + STROKEWIDTH / 2, SQSZ - STROKEWIDTH, SQSZ - STROKEWIDTH)
    }

    updateHud()
}


let canvas = document.getElementById("main");
let ctx = canvas.getContext("2d");
let scale = 2 // size of a square in pixels divided by 16
// Keeping scale an integer probably helps avoid faint lines between squares
let xoff = ~~((window.innerWidth - SQSZ) / 2);
let yoff = ~~((window.innerHeight) / 2) // location of (0,0) in pixels
// keeping these integers helps avoid faint lines between squares

function redraw() {
    ctx.resetTransform()
    ctx.fillStyle = "grey"
    ctx.fillRect(0, 0, w, h)
    ctx.setTransform(scale, 0, 0, -scale, xoff, yoff) // I think setTransform is less likely to leave gaps between squares than mucking with coordinates
    draw()
}
