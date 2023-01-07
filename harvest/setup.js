

/*
11:plant
10:plot 5x5? 10x10?
9: farm 10x10 plots
8: region 10x10 farms
7: continent/face of cube
6: planet (cube)
5: solar system
4: galaxy
3: universe
2: multiverse
*/

var clonecount = 0;

var pLocation;
var time;
var map;
var cursor;
var seeds;
var smallaut,bigaut;
var rockList;
var saves = new Array(11);
//progress:
var minDepth;
var tutorial=0;

function init(reallyRandom){
    let globalrng = mkrng(reallyRandom?(Math.random()*1000000000|0):105)
    ; [bigaut,smallaut] = buildAutomata(globalrng)
    rockList = []
    for(i=0;i<FARMSZ*FARMSZ;i++){
        rockList.push(i)
    }
    shuffle(rockList,globalrng)
    // constant seed for now, TODO: allow people to either pick a random one or restart with this one for competitive comparisons
    pLocation = [0
        ,0
        ,0
        ,0//universe
        ,0//galaxy
        ,0//system
        ,0//planet
        ,0//face
        ,0//region
        ,0//farm
        ,0//plot
        ,12//plant
    ]
    minDepth = 10;
    map = new LAYERS[0](0,undefined, globalrng());
    cursor = map
    while(cursor.depth < pLocation.length-1){
        //console.log(cursor)
        cursor = cursor.getChildren()[pLocation[cursor.depth+1]]
    }
    time = 0;
    seeds=1n;
}

var LAYERS;
class Map{
    constructor(depth, children, seed){
        this.depth=depth;
        if (children){
            this.children = children
        }
        else this.rng=mkrng(seed);
        this.clones = {}
    }
    getChildren(){
        if(this.children===undefined)
            this.children = this.mkChildren();
        return this.children;
    }
    mkChildren(){ // this is the only function in which the rng should be used
        return {0: this.randomChild()};
    }
    randomChild(){
        //console.log(this, this.depth, "asdfasdfsadf")
        return new LAYERS[this.depth+1](this.depth+1,  false, this.rng());
    }
    wait(){
        if(this.waited===undefined){
            if(this.children===undefined) return this;
            let newch = {}
            for(let k in this.children){
                newch[k] = this.waitchild(this.children[k])
            }
            this.waited = new LAYERS[this.depth](this.depth, newch) // parent probably gets overwritten
        }
        return this.waited
    }
    waitchild(ch){
        return ch.wait()
    }
    // clone, assume parent will be changed, 'valid' indicates whether to invalidate caches
    clone(){
        let newch = {}
        for(let k in this.getChildren()){
            if (k==pLocation[this.depth+1] && this.depth<=cursor.depth){
                newch[k] = this.children[k].clone()
            }
            else{
                newch[k] = this.children[k]
            }
        }
        return new LAYERS[this.depth](this.depth, newch)
    }
    countPlants(){
        if(this.plantcount===undefined){
            this.plantcount = BigInt(0)
            for(let k in this.children){
                this.plantcount+=this.children[k].countPlants()
            }
        }
        return this.plantcount
    }
    harvest(){
        if (this.harvested===undefined){
            if(this.countPlants()==0) this.harvested=this;
            else{
                let newch = {}
                for(let k in this.getChildren()){
                    newch[k] = this.children[k].harvest()
                }
                this.harvested = new LAYERS[this.depth](this.depth, newch) 
            }
        }
        return this.harvested
    }
    draw(ctx){
        let sz = ctx.canvas.width
        ctx.save()
        ctx.scale(1/this.gridsz,1/this.gridsz)
        let ch = this.getChildren()
        for(let x=0;x<this.gridsz;x++){
            for(let y=0;y<this.gridsz;y++){
                ch[x+this.gridsz*y].draw(ctx,parent)
                ctx.translate(0,sz)
            }
            ctx.translate(sz,-this.gridsz*sz)
        }
        ctx.restore()
    }
    getLocation(x,y){
        console.log(x,y)
        let [px,py] = [x*this.gridsz|0,y*this.gridsz|0];
        return px+this.gridsz*py
    }
    drawZoomed(t, ctx){
        let sz = ctx.canvas.width
        let gridsz = this.gridsz
        let scale = Math.pow(gridsz, t)
        ctx.save()
        //figure out point within target that shouldn't move
        let n = pLocation[cursor.depth+1]
        let x = n%gridsz
        let y = (n/gridsz)|0
        let mx = x*sz/(gridsz - 1)
        let my = y*sz / (gridsz-1)
        ctx.translate(mx,my) // move top left corner of target to top left
        ctx.scale(scale,scale)
        ctx.translate(-mx,-my)

        // return
        this.draw(ctx)
        ctx.restore()
    }
}
LAYERS = new Array(12).fill(Map)
class Plant extends Map{
    constructor(depth,planted){
        //console.log("should be start",planted)
        super(depth, null, null);
        this.planted=planted;
    }
    draw(ctx,parent){
        let terrain;
        if (parent===undefined){
            terrain = cursors[10].terrain
        }
        else{
            terrain = parent.terrain;
        }
        let sz = ctx.canvas.width
        ctx.fillStyle = "brown"
        ctx.fillRect(sz/100,sz/100,sz*98/100,sz*98/100)
        //ctx.fillRect(0,0,sz,sz)
        if(this.planted){
            ctx.fillStyle = "green"
            ctx.fillRect(sz/10,sz/10,sz*8/10,sz*8/10)
        }
    }
    countPlants(){
        return BigInt(this.planted)
    }
    harvest(){
        if (this.planted) return ePlant;
        return this
    }
}
ePlant = new Plant(11,false)
pPlant = new Plant(11,true)
saves[11] = pPlant
PLOTSZ = 10
class Plot extends Map{
    gridsz = PLOTSZ
    constructor(depth, terrain,state){
        let children = new Array(PLOTSZ*PLOTSZ)
        if(state===undefined){
            children.fill(ePlant)
        }
        else{
            for (let k in state){
                children[k]=state[k]?pPlant:ePlant
            }
        }
        super(depth, children);
        this.full=false;
        this.terrain=terrain;
        if(this.children===undefined){
            //let ePlant = new Plant(this.depth+1, this,null, null, false)
            this.children = new Array(PLOTSZ*PLOTSZ).fill(ePlant)
        }
    }
    draw(ctx){
        let sz = ctx.canvas.width
        ctx.fillStyle = this.terrain=="soil"?"brown":"grey"
        //ctx.fillRect(sz/100,sz/100,sz*98/100,sz*98/100)
        super.draw(ctx)
    }
    getState(){
        let state = new Array(PLOTSZ*PLOTSZ)
        for(let k in this.children)state[k]=this.children[k].planted
        return state
    }
    wait(waterdist){
        let soiltype = this.terrain;
        if (this.results === undefined){
            this.results={}
        }
        let res = this.results[[soiltype,waterdist]]
        if (res!==undefined) return res
        let state = this.getState()
        res = astep(state,[soiltype=="soil"?bigaut:smallaut ,waterdist ],soiltype)
        res = new Plot (this.depth,this.terrain,res)
        this.results[[soiltype,waterdist]] = res
        return res
    }
    clone(){
        let state = this.getState()
        return new Plot(this.depth,this.terrain,state)
    }
    harvest(){
        return this.terrain=="soil"?sPlot:rPlot
    }
}
rPlot = new Plot(10,"rocky",undefined)
sPlot = new Plot(10,"soil",undefined)
FARMSZ = 10
class Farm extends Map{
    constructor(depth, parent, children, seed){
        super(depth, parent, children, seed);
        this.altitude = 1;
        //this.full=false;
        this.waterdistance = 1;
        this.purchased = false;
    }
    mkChildren(){
        let ch = {}
        for(let x=0;x<FARMSZ;x++){
            for(let y=0;y<FARMSZ;y++){
                ch[x+FARMSZ*y] = rockList[x+FARMSZ*y]<this.altitude?rPlot:sPlot
                // Plot(this.depth+1); // this.randomChild();
            }
        }
        return ch;
    }
    draw(ctx){
        sz = ctx.canvas.width
        ctx.fillStyle = "green"
        ctx.fillRect(sz/10,sz/10,sz*8/10,sz*8/10)
    }
    waitchild(ch){
        return ch.wait(this.waterdistance)
    }
}
LAYERS[11] = Plant
LAYERS[10] = Plot
LAYERS[9] = Farm


/*
Not worth the effort:

For efficiency, copied data should not be complete copies of Maps.
It does need to be complete
*
class SavedMap{
    constructor(depth,map){//if map is undefined, create empty data
        this.depth=depth
        this.isEmpty=false
        if(map===undefined){
            this.isEmpty=true
        }
        this.children = this.mkChildren(map)
    }
    mkChildren(map){
        if(map===undefined)return this.mkEmpty()
        newCh = {}
        for(let k in map.getChildren()){
            newCh[k]=new SDLAYERS[this.depth+1]()
        }
        return {0: new SDLAYERS[this.depth+1](depth+)};
    }
    mkEmpty(){
        return {0: new SDLAYERS[this.depth+1](depth+1)};
    }
    wait(){
        if(this.waited===undefined){
            if(this.children===undefined) return this;
            let newch = {}
            for(k in this.children){
                newch[k] = this.children[k].wait()
            }
            this.waited = new LAYERS[this.depth](this.depth, this.parent, newch) // parent probably gets overwritten
        }
        return this.waited
    }
}
SDLAYERS = new Array(12).fill(SavedMap)
class SPlot extends SavedMap{
    constructor(depth,map,state){
        this.depth=depth
        if (state===undefined){
            state = new Array(PLOTSZ*PLOTSZ)
            let ch = map.getChildren()
            for(let k in ch)state[k]=ch[k].planted
        }
        this.state=state
        this.results = {}
    }
    wait(soiltype, waterdist){
        let res = this.results[[soiltype,waterdist]]
        if (res!==undefined) return res
        res = astep(this.state,[soiltype=="soil"?smallaut:bigaut ,waterdist ],soiltype=="soil"?1:2)
        this.results[[soiltype,waterdist]] = new SPlot(this.depth, null,res)
        return res
    }
}
class SFarm extends SavedMap{
    constructor(depth,map,state){
        this.depth=depth
        if (state===undefined){
            state = new Array(FARMSZ*FARMSZ)
            let ch = map.getChildren()
            for(let k in ch)state[k]=ch[k].planted
        }
        this.state=state
        this.results = {}
    }
}
SDLAYERS[10]=SPlot
*/