"use strict";

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

var pLocation;
var time;
var map;
var cursor;
var seeds;
var smallaut,bigaut;
var rockList;
var saves = new Array(11);
var plantPic;
var lockPic;
//progress:
var minDepth;
var nextUnlockDepth;
var nextUnlockLocation;
var tutorial=0;

function init(reallyRandom){
    let globalrng = mkrng(reallyRandom?(Math.random()*1000000000|0):105)
    
    drawPlant(sparectx,globalrng)
    saveImg(sparecanvas).then(x=>{
        plantPic=x;
        drawLock(sparectx)
        saveImg(sparecanvas).then(
        x => lockPic = x
        )
    })

    ePlant = new Plant(11,false)
    pPlant = new Plant(11,true)
    saves[11] = pPlant
    rPlot = new Plot(10,"rocky",undefined)
    sPlot = new Plot(10,"soil",undefined)
    farms = new Array(maxAltitude+1)
    waters = new Array(maxAltitude+1)
    for(let i=0;i<=maxAltitude;i++){
        farms[i] = new Farm(9, undefined, i)
        waters[i] = new Water(9, i)
    }

    //TODO: correct https://stackoverflow.com/a/15324845/1779797
    ; [bigaut,smallaut] = buildAutomata(globalrng)
    rockList = []
    for(let i=0;i<FARMSZ*FARMSZ;i++){
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
    nextUnlockDepth = 10;
    nextUnlockLocation = 1;
    map = new LAYERS[0](0,undefined, globalrng());
    cursor = map
    while(cursor.depth < pLocation.length-1){
        //console.log(cursor)
        let d = cursor.depth
        cursor = cursor.getChildren()[pLocation[cursor.depth+1]]
        if (cursor.depth!=d+1){
            console.log("error", cursor)
        }
    }
    time = 0;
    seeds=1n;
    animating=false
    terraforming=false
    recentlyterraformed= false
}

const dummycanvas = {canvas:{},drawImage:(()=>{}), fillRect:(()=>{})}

var LAYERS;
class Map{
    layerSize=1
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
    wait(...args){
        if(this.countPlants()==0)return this
        if(this.results===undefined){
            this.results={}
        }
        if(this.results[args]===undefined){
            if(this.children===undefined) return this;
            let newch = {}
            for(let k in this.children){
                newch[k] = this.waitchild(this.children[k],...args)
            }
            this.results[args] = this.cloneFromChildren(newch) // parent probably gets overwritten
        }
        return this.results[args]
    }
    waitchild(ch,...args){
        return ch.wait(...args)
    }
    // make a clone (usually so that a part will be mutated)
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
        return this.cloneFromChildren(newch)
    }
    cloneFromChildren(newch){
        return new LAYERS[this.depth](this.depth, newch)
    }
    countPlants(other){
        if(this.plantcount===undefined){
            this.plantcount = BigInt(0)
            for(let k in this.children){
                this.plantcount+=this.children[k].countPlants()
            }
        }
        if(other===undefined) return this.plantcount;
        else return this.plantcount-other.countPlants();
    }
    harvest(){
        if (this.harvested===undefined){
            if(this.countPlants()==0) this.harvested=this;
            else{
                let newch = {}
                for(let k in this.getChildren()){
                    newch[k] = this.children[k].harvest()
                }
                this.harvested = this.cloneFromChildren(newch)
            }
        }
        return this.harvested
    }
    async prepare(){
        for(let k in this.getChildren()){
            await this.getChildren()[k].draw(dummycanvas,this,k)
        }
    }
    async draw(ctx,parent,k){
        let sz = ctx.canvas.width
        if(parent===undefined){
            await this.drawToSave(ctx,parent,k)
        }
        else{
            if(this.img===undefined){
                smallctxs[this.depth].canvas.width|=0
                await this.drawToSave(smallctxs[this.depth],parent,k)
                this.img = await saveImg(smallctxs[this.depth].canvas)
            }
            ctx.drawImage(this.img,0,0,sz,sz)
        }
        if(nextUnlockDepth == this.depth && k>=nextUnlockLocation && !this.isWater){
            ctx.drawImage(lockPic,0,0,sz,sz)
        }
    }
    async drawToSave(ctx,parent,k){
        let sz = ctx.canvas.width
        ctx.save()
        ctx.scale(1/this.gridsz,1/this.gridsz)
        let ch = this.getChildren()
        for(let x=0;x<this.gridsz;x++){
            for(let y=0;y<this.gridsz;y++){
                await ch[x+this.gridsz*y].draw(ctx,this, x+this.gridsz*y)
                ctx.translate(0,sz)
            }
            ctx.translate(sz,-this.gridsz*sz)
        }
        ctx.restore()
    }
    getLocation(x,y){
        let [px,py] = [x*this.gridsz|0,y*this.gridsz|0];
        let pos = px+this.gridsz*py
        if(nextUnlockDepth==this.depth+1 && nextUnlockLocation<=pos) return undefined;
        return pos
    }
    async drawZoomed(t, ctx){
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
        await this.draw(ctx)
        ctx.restore()
    }
    pasteover(other){
        seeds-=this.countPlants()
        return this
    }
}
LAYERS = new Array(12).fill(Map)
class Plant extends Map{
    constructor(depth,planted){
        //console.log("should be start",planted)
        super(depth, null, null);
        this.planted=planted;
    }
    async draw(ctx,parent){
        let terrain;
        if (parent===undefined){
            terrain = cursors[10].terrain
        }
        else{
            terrain = parent.terrain;
        }
        let sz = ctx.canvas.width
        ctx.fillStyle = terrain=="soil"?"brown":"grey"
        ctx.fillRect(sz/100,sz/100,sz*98/100,sz*98/100)
        //ctx.fillRect(0,0,sz,sz)
        if(this.planted){
            ctx.drawImage(plantPic,0,0,sz,sz)
            ctx.fillStyle = "green"
            //ctx.fillRect(sz/10,sz/10,sz*8/10,sz*8/10)
        }
    }
    mkChildren(){
        return {}
    }
    countPlants(){
        return BigInt(this.planted)
    }
    harvest(){
        if (this.planted) return ePlant;
        return this
    }
}
let ePlant
let pPlant
const PLOTSZ = 10
class Plot extends Map{
    layerSize=PLOTSZ*PLOTSZ
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
    /*
    draw(ctx){
        let sz = ctx.canvas.width
        ctx.fillStyle = this.terrain=="soil"?"brown":"grey"
        //ctx.fillRect(sz/100,sz/100,sz*98/100,sz*98/100)
        super.draw(ctx)
    }*/
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
    pasteover(other){
        if(this.pastes===undefined){
            this.pastes={}
            this.pastes[this.terrain] = this
        }
        if(this.pastes[other.terrain]===undefined){
            this.pastes[other.terrain] = new Plot(this.depth, other.terrain, this.getState())
            this.pastes[other.terrain].pastes = this.pastes
            this.pastes[other.terrain].results = this.results
        }
        seeds-=this.pastes[other.terrain].countPlants()
        return this.pastes[other.terrain]
    }
    harvest(){
        return this.terrain=="soil"?sPlot:rPlot
    }
}
let rPlot
let sPlot
const FARMSZ = 15
const maxAltitude = 16
const ALTITUDE_FACTOR = ((FARMSZ*FARMSZ - 2) / maxAltitude) | 0
class Farm extends Map{
    layerSize=FARMSZ*FARMSZ
    gridsz = FARMSZ
    constructor(depth, children, altitude){
        if (altitude===undefined) throw "bad creation of farm";
        super(depth, children, null);
        this.altitude = altitude;
    }
    mkChildren(){
        let ch = {}
        for(let x=0;x<FARMSZ;x++){
            for(let y=0;y<FARMSZ;y++){
                ch[x+FARMSZ*y] = rockList[x+FARMSZ*y]<=(this.altitude*ALTITUDE_FACTOR)?rPlot:sPlot
                // Plot(this.depth+1); // this.randomChild();
            }
        }
        return ch;
    }
    preparePastes(){
        if(this.pastes===undefined){
            this.pastes={}
            for(let k=0; k<this.layerSize; k++){
                let ch = this.getChildren()[k]
                if (ch.terrain=="soil" && this.pastes["soil"]===undefined){
                    this.pastes[ch.terrain] = ch
                }
                if (ch.terrain=="rocky" && this.pastes["rocky"]===undefined){
                    this.pastes[ch.terrain] = ch
                }
            }
        }
    }
    countPlants(other){
        if(other===undefined) return super.countPlants();
        this.preparePastes()
        let numRocky = other.altitude*ALTITUDE_FACTOR+1
        let numSoil = this.gridsz*this.gridsz - numRocky
        if (seeds + other.countPlants() > BigInt(numSoil)*this.pastes["soil"].countPlants()
                      + BigInt(numRocky)*this.pastes["rocky"].countPlants()
            && nextUnlockDepth<=this.depth){
            return BigInt(numSoil)*this.pastes["soil"].countPlants()
                       + BigInt(numRocky)*this.pastes["rocky"].countPlants()
                       - other.countPlants()
        }
        let ns = seeds + other.countPlants()
        for(let k=0; k<this.layerSize; k++){
            let pst = this.pastes[other.getChildren()[k].terrain]
            if(pst.countPlants()<=ns && (nextUnlockDepth<=this.depth || k<nextUnlockLocation)){
                ns -= pst.countPlants()
            }
        }
        return (seeds - ns)
    }
    pasteover(other){
        this.preparePastes()
        let numRocky = other.altitude*ALTITUDE_FACTOR+1
        let numSoil = this.gridsz*this.gridsz - numRocky
        if (seeds > BigInt(numSoil)*this.pastes["soil"].countPlants()
                      + BigInt(numRocky)*this.pastes["rocky"].countPlants()
            && nextUnlockDepth<=this.depth){
            if (this.pastes[other.altitude]===undefined){
                let newCh = {}
                for(let k in other.getChildren()){
                    newCh[k] = this.pastes[other.children[k].terrain]
                }
                this.pastes[other.altitude] = new Farm(this.depth, newCh, other.altitude)
                this.pastes[other.altitude].pastes = this.pastes
            }
            seeds-=this.pastes[other.altitude].countPlants();
            return this.pastes[other.altitude];
        }
        let newCh = {}
        for(let k=0; k<this.layerSize; k++){
            let pst = this.pastes[other.getChildren()[k].terrain]
            if(pst.countPlants()<=seeds && (nextUnlockDepth<=this.depth || k<nextUnlockLocation) ){
                seeds -= pst.countPlants()
                newCh[k] = pst
            }
            else{
                newCh[k] = other.getChildren()[k]
            }
        }
        let result = new Farm(this.depth, newCh, other.altitude)
        result.pastes = this.pastes
        return result
    }
    cloneFromChildren(newch){
        return new LAYERS[this.depth](this.depth, newch, this.altitude)
    }
    harvest(){
        return farms[this.altitude]
    }
}
const REGSZ = 20
const NOISESCALE = 4
class Water extends Map{
    constructor(depth,altitude){
        super(depth,null,null)
        this.altitude=altitude
        this.isWater=true
    }
    async drawToSave(ctx){
        let sz = ctx.canvas.width;
        ctx.fillStyle = "blue"
        ctx.fillRect(0,0,sz,sz)
    }
    mkChildren(){
        return {}
    }
    cloneFromChildren(newch){
        return waters[this.altitude]
    }
    getLocation(x,y){
        return undefined
    }
}
class Region extends Map{
    layerSize=REGSZ*REGSZ
    gridsz=REGSZ
    constructor(depth, children, seed){
        super(depth, children, seed);
        if(children){
            this.setWater(this.children)
        }
    }
    mkChildren(){
        let noise = perlin(this.rng,(REGSZ/NOISESCALE)|0)
        let ch = {}
        for(let x=0;x<this.gridsz;x++){
            for(let y=0;y<this.gridsz;y++){
                let alt = ((noise(x,y)+1)*8) |0 // 0..15 hopefully
                ch[x+this.gridsz*y] = farms[alt]
                //rockList[x+this.gridsz*y]<this.altitude?rPlot:sPlot
                // Plot(this.depth+1); // this.randomChild();
            }
        }
        this.setWater(ch, nextUnlockDepth==10)
        return ch;
    }
    setWater(ch,cheat){
        //console.log("setting")
        let ks = new Array(this.layerSize)
        for(let i=0;i<this.layerSize;i++){
            ks[i] = [ch[i].altitude, i];
        }
        ks.sort((a,b)=>(a[0]-b[0])*this.layerSize+(a[1]-b[1]) )
        if(cheat){
            let wetalt = ks[REGSZ-1][0]
            console.log(wetalt)
            for(let alt_k of ks){
                let above = (alt_k[1]+this.gridsz*(this.gridsz-1))%this.layerSize
                if(ch[above].altitude>wetalt){
                    let newch = {}
                    for(let x=0;x<this.gridsz;x++){
                        for(let y=0;y<this.gridsz;y++){
                            let k = x+this.gridsz*y
                            newch[k] = ch[(k+above)%this.layerSize]
                        }
                    }
                    console.log(ch,newch)
                    for(let k in newch){
                        ch[k] = newch[k]
                    }
                    this.setWater(ch)
                    return;
                }
            }
        }
        let seen = {}
        let wdists = new Array(this.layerSize)
        let nseen = 0
        for(let i=0;i<REGSZ;i++){
            ch[ks[i][1]] = waters[ks[i][0]]
            seen[ks[i][1]] = true
            nseen+=1
        }
        for(let i=REGSZ;i<this.layerSize;i++){
            if(ch[ks[i][1]].isWater) ch[ks[i][1]] = farms[ks[i][0]]
        }
        let wdist = 0;
        let lastgen = seen
        while(nseen<this.layerSize){
            let nextgen={}
            wdist+=1
            for (let k in lastgen){
                let [x,y] = [k%this.gridsz, (k/this.gridsz)|0]
                for (let [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){
                    let xx=x+dx
                    let yy= y+dy
                    if (Math.min(xx,yy)>=0 && Math.max(xx,yy)<this.gridsz){
                        let nx = xx+this.gridsz*yy
                        if(!seen[nx]){
                            seen[nx]=true
                            nextgen[nx]=true
                            nseen+=1
                            wdists[nx]=wdist
                        }
                    }
                }
            }
            lastgen=nextgen
        }
        //console.log(wdists)
        this.wdists=wdists

    }
    async drawToSave(ctx,...args){
        let sz = ctx.canvas.width
        ctx.fillStyle="white"
        ctx.fillRect(0,0,sz,sz)
        await super.drawToSave(ctx,...args)
    }
    /*draw(ctx){
        sz = ctx.canvas.width
        ctx.fillStyle = "green"
        ctx.fillRect(sz/10,sz/10,sz*8/10,sz*8/10)
    }*/
    wait(){
        if(this.countPlants()==0)return this
        if(this.results===undefined){
            if(this.children===undefined) return this;
            let newch = {}
            for(let k in this.children){
                newch[k] = this.waitchild(this.children[k],this.wdists[k])
            }
            this.results = this.cloneFromChildren(newch) // parent probably gets overwritten
        }
        return this.results
    }
}
LAYERS[11] = Plant
LAYERS[10] = Plot
LAYERS[9] = Farm
LAYERS[8] = Region
let farms; // empty farms at each altitude
let waters;

class Planet extends Map{
    layerSize=6
    mkChildren(){ // this is the only function in which the rng should be used
        let ch = {}
        for(let i=0;i<6;i++){
            ch[i] = this.randomChild()
        }
        return ch
    }
    async drawToSave(ctx,parent,k){
        let sz = ctx.canvas.width
        ctx.fillStyle="black"
        ctx.fillRect(0,0,sz,sz)
        ctx.save()
        ctx.translate(sz/2,sz/2)
        ctx.scale(0.5,0.5)

        ctx.save()
        ctx.transform(...faceMatrix(cornersOfFace[0],cubeCorners, sz))
        await this.getChildren()[0].draw(ctx,this,0)
        ctx.restore()

        ctx.save()
        ctx.transform(...faceMatrix(cornersOfFace[1],cubeCorners, sz))
        await this.getChildren()[1].draw(ctx,this,1)
        ctx.restore()

        ctx.save()
        ctx.transform(...faceMatrix(cornersOfFace[2],cubeCorners, sz))
        await this.getChildren()[2].draw(ctx,this,2)
        ctx.restore()
        ctx.restore()
    }
    async drawZoomed(t, ctx){
        let sz = ctx.canvas.width
        ctx.fillStyle="black"
        ctx.fillRect(0,0,sz,sz)

        let scale = Math.pow(0.5, 1-t)
        ctx.save()
        ctx.translate(sz/2,sz/2)
        ctx.scale(scale,scale)

        let nFace = pLocation[cursor.depth+1]
        let frots = fRotations[nFace].map(x=>x*t)
        let cb = newCube(frots)
        let srt = cb.map((e,k)=>[e[2],k])
        srt.sort((a,b)=>b[0]-a[0])
        let front = srt[0][1]
        for(let f =0;f<6;f++){
            let crs = cornersOfFace[f];
            if(front==crs[0] || front==crs[1] || front==crs[2] || front==crs[1]+crs[2]-crs[0]){
                ctx.save()
                ctx.transform(...faceMatrix(crs,cb, sz))
                await this.getChildren()[f].draw(ctx,this,0)
                ctx.restore()

            }
        }
        ctx.restore()
    }
    getLocation(x,y){
        x-=0.5
        y-=0.5
        let seg = (Math.atan2(x,y)*3/Math.PI + 6)|0
        let pos;
        if(Math.sqrt(x*x+y*y)>0.4) pos =  3 + ((((5+seg)%6)/2) |0); // a hexagon is roughly a circle?
        else pos = (((13-seg)%6)/2) |0 ;
        if(nextUnlockDepth==this.depth+1 && nextUnlockLocation<=pos) return undefined;
        return pos
    }
}
LAYERS[7] = Planet

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