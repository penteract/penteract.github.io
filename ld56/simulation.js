// Invariants:

// for each ant:
//   if ant.plan:
//     tasktype = ant.dragging ?? "worker"
//     targets[tasktype, ant.plan[0]] === ant
//   if ant.dragging:
//     draggers[ant.draggng,ant.plan[-1]] = ant
//     if ant.dragging == "dirt":
//       isDirt(ant.plan[-1])

// for each position p:
//   if orders[tasktype,p]:
//     not targets[tasktype,p]
//     not draggers[tasktype,p]
//   if orders["workers",p]:
//     isDirt(p)

let map = {}  // "x,y" : ["water"|"tunnel"|"dirt"|Ant|"toDig"|"toBuild"]


let thingLists = {}


thingLists["water"] = [] //[[1,-2]] // immutable?
thingLists["tunnel"] = [[0, -1]]
thingLists["ant"] = []
thingLists["grub"] = []
thingLists["nursery"] = []
queenHome = [-1, 0]
score = 0
let dirts = []

let nmap = {}
let grubTargeting = {} // Map from nursery spaces to grubs
function designateNursery(p) {
    if (emptyForOrder(p) && queenHome + "" != p + "" && !nmap[p]) {
        thingLists["nursery"].push(p)
        nmap[p] = true
        return true
    }
    else { return false }
}
function clearNursery(p) {
    if (nmap[p]) {
        delete nmap[p]
        thingLists["nursery"] = thingLists["nursery"].filter(x => x + "" != p + "")
        clearOrder(p)
    }
}
function setQueenHome(p) {
    if (emptyForOrder(p) && !nmap[p]) {
        clearOrder(queenHome)
        queenHome = p
    }
}


solidTypes = ["dirt", "food", "grub", "queen"] // if we add stone, we may want to separate solid types from pushable types

// Orders Could generalize by what the order needs:
//   digging is dirt that needs an ant,
//   building is air or tunnel that needs dirt
//
let orders = { "worker": {} } // These are really Set()s because lists are objects
let delayedOrders = { "worker": {} }
for (let t of solidTypes) {
    orders[t] = {}
    delayedOrders[t] = {}
}


let draggers = {} // tracks if anyone is dragging a particular thing {[thing,postion]:Ant}
let targets = {} // tracks if anyone is targeting a particular position {[task,postion]:Ant}



function hCost(q, d) {
    /* heuristic function for searches */
    let wcount = 0
    let dirtCount = 0
    for (let p of neighbs9(q)) {
        let isw = map[p]?.includes("water")
        wcount += isw
        if (isDirt(p)) {
            if (draggers[["dirt", p]]) { dirtCount += Math.min(1, 4 / d) }
            else if (targets[["worker", p]]) { dirtCount += Math.min(1, 40 / d) }
            else { dirtCount += 1 }
        }
        else if (targets["dirt", p] && map[p]?.includes("tunnel")) {
            dirtCount += 0.5 - 1 / d
        }
    }
    let cost = 1
    //cost+=(wcount**2)/Math.sqrt(d+1) // try not to walk through waterlogged places
    let deathChance = (wcount / 9) ** (9 - dirtCount)
    let cap = 1 / 50
    if (deathChance < cap) { deathChance = cap }
    else if (deathChance > (1 - cap)) { deathChance = 1 - cap }
    // deathChance=deathChance + 1/(100*deathChance+10) - 1/(100*(1-deathChance)+10)
    // we're adding costs together, and multiplying chances of survival, so logarithm is appropriate
    cost += (-100) * Math.log(1 - deathChance)
    /*consider considering these
    if (!canWalk(q)) return 5
    if (hasAnt(q)) return 2*/
    return cost
}

function incScore(amt = 1) {
    score += amt
    localStorage["highScore" + gameMode] = Math.max(score, localStorage["highScore" + gameMode] ?? 0)
}

workerOrdersAttempted = 0
workerOrderSucceeded = false

//const ants = []
class Ant {
    constructor(p) {
        this.plan = null
        this.dragging = null // thing (e.g. "dirt")
        this.idx = thingLists["ant"].length
        this.p = p
        put(this, p)
        thingLists["ant"].push(this)
        this.alive = true

    }
    move(dst) {
        maxx = Math.max(maxx, this.p[0] + Margin)
        minx = Math.min(minx, this.p[0] - Margin)
        maxy = Math.max(maxy, this.p[1] + Margin)
        miny = Math.min(miny, this.p[1] - Margin)
        move(this, this.p, dst)
        this.p = dst
    }

    kill() {
        console.info(this.idx, "ant died")
        this.popTask(true)
        this.alive = false
        take(this, this.p)
    }

    findTarget(type, start, lookForAir = false) {
        // console.log(this, type, start)
        let ordrs = orders[type]
        if (Object.keys(ordrs).length === 0) {
            if (type == "dirt") lookForAir = true
            else if (type === "food") {
                ordrs = {}
                for (let p of neighbs9(queen.p)) {
                    if (!isSolid(p) && !solidTypes.find(t => targets[[t, p]])) {
                        ordrs[p] = true
                    }
                }
                if (Object.keys(ordrs).length === 0) {
                    console.info("food search failed (no space near queen)")
                    delayedOrders["worker"][start] = 20
                    return
                }
            }
            else {
                if (type !== "worker") {
                    console.info("search failed (no orders)")
                    delayedOrders["worker"][start] = 20
                }
                else {
                    console.info("worker search failed (no orders)")
                }
                return
            }

        }

        function validOrder(q) {
            return ordrs[q] || (lookForAir && isAir(q) && !solidTypes.find(t => targets[[t, q]]))
        }


        // This is a heap because that might help with efficiency if we try to reuse it
        // might give suboptimal paths, but it's better than flood filling the map for every ant.
        // We probably need a path fixer that removes loops
        if (start === undefined) {
            assert(type === "worker")
            start = this.p
        }
        else { assert([...neighbs(start)].find(x => x == this.p + "")) }
        function visit(p) {
            return [
                willWalk(p, type)
                , validOrder(p)]
        }
        let found = search([start], hCost, neighbs, visit)
        //console.log(Object.keys(seen).length, found)
        if (type == "worker") { workerOrdersAttempted += 1 }
        if (found) {
            let plan = found
            console.log(plan)
            if (type === "worker") { plan.pop(); workerOrderSucceeded = true }
            this.giveTask([type, plan])
        }
        else if (type == "dirt" && !lookForAir) {
            this.findTarget(type, start, true)
        } else if (type !== "worker") {
            console.warn("search failed")
            //throw new Error("search failed")
            delayedOrders["worker"][start] = 5
        }
    }
    cancelTask() {
        return this.popTask(undefined, true)
    }

    popTask(orderDragged, cancel) {
        //return type [type,plan], ["finished",locaton], "finished"
        if (!this.plan) return null
        let plan = this.plan
        let target = this.plan[0]
        let type = this.dragging ?? "worker"
        let task0 = [type, target]
        if (this.dragging) {
            var dragPos = this.plan[this.plan.length - 1]
            assert(draggers[[type, dragPos]] === this)
            delete draggers[[type, dragPos]]
            this.dragging = null
        }
        assert(targets[task0] === this)
        delete targets[task0]
        assert(!orders[type][target]) // assume we cannot place an order on an existing order (including if the existing order has started to be executed)
        this.plan = null
        if (plan.length === 0) {
            return "finished"
        }
        if (plan.length === 1) {
            if (type === "worker") { return ["finished", plan[0]] }
            else { return "finished" }
        }
        if (orderDragged && type !== "worker") {
            if (orders["worker"][dragPos]) { console.warn("didn't expect an order to already be there") }
            orders["worker"][dragPos] = true
        }
        if (!cancel) { orders[type][target] = true }
        return [type, plan]
    }

    giveTask(task) {
        assert(!this.plan)
        if (task === null || task === "finished" || task[0] === "finished") return
        // TODO: Remove assertion for efficiency before release
        // DO NOT REMOVE beforehand. it is a very useful test
        for (let i = 0; i < task[1].length; i++) {
            assert([...neighbs(task[1][i])].find(x => x == (i + 1 < task[1].length ? task[1][i + 1] : this.p) + ""))
        }
        let [type, plan] = task
        let target = plan[0]
        let task0 = [type, target]
        delete orders[type][target]
        targets[task0] = this
        this.plan = plan
        if (type !== "worker") {
            this.dragging = type
            let draggedPos = plan[plan.length - 1]
            assert(draggers[[type, draggedPos]] === undefined)
            draggers[[type, draggedPos]] = this
            // orders["worker"][draggedPos] may not have been true. That's not a problem
            delete orders["worker"][draggedPos]
        }
    }

    doDrag() {
        let src = this.plan.pop()
        let dest = this.plan[this.plan.length - 1]
        //console.log(draggers)
        assert(draggers[[this.dragging, src]] === this)
        delete draggers[[this.dragging, src]]
        assert(!draggers[[this.dragging, dest]])
        draggers[[this.dragging, dest]] = this

        let thing = move(this.dragging, src, dest)
        this.move(src)
        if (thing == "tunnel") {
            // we just placed dirt as a tunnel in air; cancel plan (consider complete)
            this.popTask()
        }
    }

    followPlan() {
        console.info("following plan", this.plan, this.dragging)
        let other
        let l = this.plan.length
        if (l === 0) { // Plan is probably complete
            assert(this.popTask() === "finished")
            return
        }
        if (l === 1) {
            let result = this.popTask()
            if (result === "finished") { return }
            else if (result[0] === "finished") {
                let type = getSolidTypeObj(result[1])
                this.findTarget(type, result[1])
            }
            else assert(false)
            return // could be a recursive call so we don't spend a turn making no movement
        }
        if (this.dragging) {
            let cur = this.plan[l - 1]
            let next = this.plan[l - 2]
            if (canWalk(next)) {
                this.doDrag()
                return
            }
            else {
                // reasons we can't move:
                // - ant in the way
                // -- if it's us, just swap
                // -- otherwise, probably switch tasks? depends on its task
                // - dirt in the way
                // -- if being dragged, maybe switch tasks. else, swap and pick up that
                // - it's air, that we wouldn't be able to walk on but can push dirt on
                // - ???
                if (other = hasAnt(next)) {
                    if (other === this) {
                        this.doDrag()
                        return
                    }
                    else {
                        // other ant in the way of our dragging
                        // - if it has no task or is a worker, switch?
                        // - if its dragging... probably we wait. maybe a chance to hand off our plan and abandon theirs. 
                        if (!other.dragging) {
                            console.info(this.idx, new Date(), "ant in way of dragging - swapping tasks")
                            let myTask = this.popTask()
                            let otherTask = other.popTask()

                            // my next intended step (for the pushed dirt) is their current position
                            // they want to carry the same path (and their first step would be to swap)
                            // the path of the block hasn't changed, so we don't modify the task
                            other.giveTask(myTask)

                            if (!otherTask || otherTask === "finished") return
                            if (otherTask[0] === "finished") otherTask = ["worker", [otherTask[1]]]

                            let [otherType, otherPlan] = otherTask
                            assert(otherType === "worker")

                            otherPlan = concatPaths(otherPlan, [other.p, cur, this.p])
                            otherPlan.pop()

                            this.giveTask([otherType, otherPlan])

                        }
                        else {
                            console.info(this.idx, new Date(), "want to push block into other ant which is also pushing something")
                            if (other.plan[other.plan.length - 2] + "" == this.p + "") {
                                console.info(this.idx, new Date(), "swapping plans that push into each other")
                                let myTask = this.popTask() // did not finish
                                let otherTask = other.popTask()// did not finish
                                // for multiple different pushable types, the same object still goes with the same plan
                                other.giveTask(myTask)
                                this.giveTask(otherTask)
                            } else {// probably fine to wait, but there are possible deadlocks involving several ants.
                                if (rand() < 0.03) {
                                    console.info(this.idx, new Date(), "randomly deciding to hand task to busy friend")
                                    let myTask = this.popTask() // did not finish
                                    let otherTask = other.popTask()// might have finished
                                    other.giveTask(myTask)
                                    console.info(otherTask + "")
                                    if (otherTask !== "finished" && otherTask[0] != "finished") {
                                        orders["worker"][otherTask[1][otherTask[1].length - 1]] = true
                                    }
                                }
                            }
                        }
                    }
                }
                else if (isAir(next)) {
                    this.doDrag()
                }
                else if (isSolid(next)) {
                    let nextType = getSolidTypeObj(next)
                    let curType = this.dragging
                    if (other = draggers[[nextType, next]]) {
                        console.info(this.idx, new Date(), "Trying to push dirt into dirt someone else is trying to push")
                        if (other.plan[other.plan.length - 2] + "" == next + "") {
                            console.info(this.idx, new Date(), "swapping tasks, shortening both :)")
                            let myTask = this.popTask() // did not finish
                            let otherTask = other.popTask()// did not finish
                            //shorten both tasks, draggers handled by poptask
                            myTask[1].pop()
                            otherTask[1].pop()
                            // for two dirts, we'd be done; each dirt is in the intended next step of the other plan

                            // for other pushables, we should swap them 
                            let res = swap(curType, cur, nextType, next)
                            // could have pushed dirt into air like this - handle potential leftover orders
                            if (res[0] === "tunnel") { // swap returns the result of the first type first - so this is the case of dirt (curType) becoming tunnel at position next
                                // might not be an order here, but if there is (next step was the last step), remove it
                                // the order will only be for dirt, not any other type
                                delete orders["dirt"][next]
                            }
                            else other.giveTask(myTask) // we dont give this task if it just finished by being pushed to air (myTask had next as its next step)
                            if (res[1] == "tunnel") {
                                delete orders["dirt"][cur]
                            }
                            else this.giveTask(otherTask)
                        }
                        else {//Probably fine to wait, but there are possible deadlocks
                            if (rand() < 0.05) {
                                console.info(this.idx, new Date(), "swapping tasks and associated blocks")
                                let myTask = this.popTask() // did not finish
                                let otherTask = other.popTask()// might have finished
                                // draggers handled by poptask
                                if (otherTask == "finished") { otherTask = ["finished", []] }
                                otherTask[1].push(myTask[1].pop())

                                // for other pushables, we should swap them 
                                let res = swap(curType, cur, nextType, next)
                                // could have pushed dirt into air like this - handle potential leftover orders
                                if (res[0] === "tunnel") { // swap returns the result of the first type first - so this is the case of dirt (curType) becoming tunnel at position next
                                    // might not be an order here, but if there is (next step was the last step), remove it
                                    // the order will only be for dirt, not any other type
                                    delete orders["dirt"][next]
                                }
                                else other.giveTask(myTask) // we dont give this task if it just finished by being pushed to air (myTask had next as its next step)
                                if (res[1] == "tunnel") {
                                    delete orders["dirt"][cur]
                                }
                                else this.giveTask(otherTask)
                            }
                        }

                    }
                    else {
                        if (((other = targets[["worker", next]]) || orders["worker"][next]) && nextType == curType) { // only try pushing along another thing of the same type
                            console.info(this.idx, new Date(), "encountered dirt, switching to drag it")
                            let origPlan = this.plan
                            let origType = this.dragging
                            let origPos = this.p
                            origPlan.push(origPos)
                            origPlan.push(origPlan[origPlan.length - 2])
                            this.doDrag() // if this puts dirt into air, it unsets our plan
                            let oldTask = this.popTask() // this may be undefined, but not finished
                            origPlan.length -= 2 // pushed +2, popped -1, moved +1. after this, we are where our original dirt was, and the front of the path (its last element) is the other dirt
                            if (other) {//take their dirt and give them ours
                                let [type, otherPlan] = other.popTask()
                                if (type === "finished") { otherPlan = [otherPlan] }
                                else { assert(type === "worker") }
                                if (oldTask) {
                                    other.giveTask([
                                        "worker",
                                        concatPaths([origPos, this.p], otherPlan)
                                    ])
                                }
                            } else if (oldTask) { // order the dirt we dropped to be collected
                                // to keep invariants:
                                // - this must be dirt 
                                // -- the doDrag ensures that)
                                // -- if the doDrag pushed it onto air, oldTask is falsy as it ended up being finished in the doDrag step
                                // - and not targeted 
                                // -- it shouldn't be due to not being dirt previously

                                // additionally in this case there must have been an order on the previous dirt om position next; so it makes sense to create a new order.
                                // the following call to giveTask removes the original order on next
                                orders["worker"][origPos] = true
                            }
                            this.giveTask([origType, origPlan])
                        }
                        else {
                            // wait for next turn and recalculate path around obstacle then
                            console.info(this.idx, new Date(), "encountered dirt, rerouting")
                            let t = this.popTask()
                            if (t != "finished" && t[0] != "finished") {
                                this.giveTask(["worker", [t[1][t[1].length - 1]]])
                            }
                        }
                    }
                }
                else {
                    // this shouldn't happen (not air, not dirt, not ant => tunnel)
                    // unless we decide to add restrictions involving water
                    assert(false)
                }
            }
        }
        else { // worker task
            let next = this.plan[l - 1]
            //console.log("next")
            if (canWalk(next)) {
                //console.log("canwalk")
                this.move(next)
                this.plan.pop()
                return
            }
            else {
                if (isSolid(next)) {
                    let nextType = getSolidTypeObj(next)
                    // ordered: done - find new plan
                    // targeted: switch plans with targeter
                    // dragged: switch path or wait 
                    // built: swap
                    if (orders["worker"][next]) {
                        console.info(this.idx, new Date(), "found other order")
                        let result = this.popTask()
                        let type
                        if (type = getSolidTypeObj(next)) {
                            this.findTarget(type, next)
                        }

                    }
                    else if (other = targets[["worker", next]]) {
                        if (other === this) {
                            console.warn("some sort of loop")
                            assert(this.plan[0] + "" === next + "")
                            this.popTask() // This won't say "finished", so we rely on giveTask to remove the order. If findTarget fails, this will leave the order there
                            let type
                            if (type = getSolidTypeObj(next)) {
                                this.findTarget(type, next)
                            }
                            return
                        }
                        // append remainder of plan to its plan, switch ant with dirt, find new plan

                        console.info(this.idx, new Date(), "found another targeted block - handing off plan")

                        let [otherType, otherPlan] = other.popTask()
                        assert(otherType === "finished" && otherPlan + "" === next + ""
                            || otherType === "worker" && otherPlan[0] + "" === next + "")

                        let [myType, myPlan] = this.popTask() // this cannot be finished because next is someone else's target
                        assert(myType === "worker")
                        if (otherType === "finished") {
                            otherPlan = [otherPlan]
                        }
                        myPlan.pop() // last element is same as first element from otherplan
                        otherPlan = concatPaths(myPlan, otherPlan)
                        other.giveTask([myType, otherPlan])

                        // give task to properly clear the order
                        this.giveTask(["worker", [next]])
                        assert(this.popTask()[0] == "finished")

                        let newType = getSolidTypeObj(next)
                        this.findTarget(newType, next)
                    }
                    else if (other = draggers[[nextType, next]]) {
                        // dragged dirt is in the way. relevant cases are if i'm in their way or not.
                        let otherNext = other.plan[other.plan.length - 2]
                        if (otherNext + "" === this.p + "") {
                            console.info(this.idx, new Date(), "in the way of dragged path while not dragging - switching and performing a step")
                            let myTask = this.popTask()
                            let otherTask = other.popTask()
                            this.giveTask(otherTask) // don't need to modify this path (now), block path hasn;t changed 
                            this.doDrag()

                            if (myTask[1][myTask[1].length - 2] + "" === other.p + "") {
                                //console.log("simplifying path")
                                myTask[1].length -= 2
                            }
                            other.giveTask(myTask)
                        }
                        else {
                            // dragged block in our way, we are not in its way. seems sensible to wait (switching puts them in our situation again)
                            // may consider probibalistic switching 
                            console.info(this.idx, new Date(), "dragged block in our way, we are not in its way - idling")
                        }
                    }
                    else {
                        /*I think that without ordering the moved dirt to be mined
                         * (which should come with a corresponding build order next to it,
                         * and would cause other problems)
                         * this puts more dirt in the way of other ants, and its own path back,
                         * causing lots of ants to end up stuck in the middle of dirt from which its hard to get them out
                        console.info(this.idx,new Date(),"placed block in way - swapping")
                        move("dirt", next, this.p)
                        this.move(next)
                        this.plan.pop()
                        return*/
                        console.info(this.idx, new Date(), "blocked, plan abandoned ")
                        this.popTask()
                    }
                }
                else if (other = hasAnt(next)) {
                    if (!other.dragging) {
                        console.info(this.idx, new Date(), "ant in way - swapping tasks")
                        let myTask = this.popTask()
                        let otherTask = other.popTask()

                        let [myType, myPlan] = myTask
                        myPlan.pop() // my plan's next intended step is their current step

                        other.giveTask([myType, myPlan])

                        if (!otherTask || otherTask === "finished") return
                        if (otherTask[0] === "finished") {
                            otherTask = ["worker", [otherTask[1]]] // we'll need to finish it properly
                        }

                        let [otherType, otherPlan] = otherTask
                        assert(otherType === "worker")
                        otherPlan = concatPaths(otherPlan, [other.p, this.p])
                        otherPlan.pop()

                        this.giveTask([otherType, otherPlan])

                    }
                    else {
                        // im not dragging, they are
                        // im not in their way due to parity
                        // doing nothing seems like the sensible option here 
                        console.info(this.idx, new Date(), "dragger in the way - idling")
                        return
                    }
                }
                else {
                    // we can't walk to where we want, but it's not because of dirt or ant. probably bc we pathed assuming dirt will be placed that has not yet arrived.
                    // sensible to abandon plan here; or wait.
                    if (!willWalk(next) || rand() < 0.1) {
                        console.info(this.idx, new Date(), "can't advance, abandoning")
                        this.popTask()
                    }
                    else {
                        console.info(this.idx, new Date(), "can't advance right now, waiting")
                    } // wait
                }
            }
        }
    }

    tick() {
        let debug = true
        if (debug) {
            var s = this.plan + ""
            var d = this.dragging
            var toMine = {}
            for (let k in orders["worker"]) {
                toMine[k] = "orders"
            }
            for (let m in targets) {
                let [a, b, c] = m.split(",")
                if (a == "worker") toMine[[b, c]] = "targets";
            }
            for (let m in draggers) {
                let [a, b, c] = m.split(",")
                if (a == "dirt" && !targets[["dirt", b, c]]) toMine[[b, c]] = "draggers";
            }
        }

        if (!canBreathe(this.p)) {
            this.kill()
            return
        }

        if (isAir(this.p) && !canStay(this.p)) {
            let below = add(this.p, [0, -1])
            assert(!isSolid(below))
            if (!hasAnt(below)) {
                this.popTask(true)
                this.move(below)
            }
        }

        if (!this.plan) {
            //console.log("finding target")
            this.findTarget("worker")
        }
        if (this.plan) { // Execute plan
            this.followPlan()
        }

        if (debug) {
            for (let p in toMine) {
                if (isDirt(p)) {
                    if (orders["worker"][p]) continue
                    if (targets[["worker", p]]) continue
                    if (draggers[["dirt", p]]) continue
                    if (delayedOrders["worker"][p]) continue
                    console.error(s, d, this, toMine[p])
                    throw Error
                }
                //throw new Error(p+" was added by this ant")
            }
        }
    }
}

function concatPaths(p1, p2) {
    let res = []
    let idx
    for (let p of p1) {
        res.push(p)
        if ((idx = p2.findIndex(x => x + "" === p + "")) > -1) {
            res.push(...p2.slice(idx + 1))
            return res
        }
    }
    res.push(...p2)
    return res
}


function emptyForOrder(p) {
    return (!isSolid(p) && !(solidTypes.find(t => targets[[t, p]] || orders[t][p])))
}

function setOrder(p, type) {
    // sets an order of the specified type if able, upholding invariants. returns true if successful
    if (type == "worker") {
        if (!targets[["worker", p]] && !orders["worker"][p] && isSolid(p) && !(solidTypes.find(t => draggers[[t, p]]))) {
            orders["worker"][p] = true
            return true
        }
    }
    else {//TODO: should this remove delayed orders?
        if (emptyForOrder(p) && (type == "grub" || !(nmap[p])) && (type == "queen" || queenHome + "" !== p + "")) {
            orders[type][p] = true
            return true
        }
    }
    return false
}

function clearOrderType(p, type) {
    // assumes dontcancel
    let res = false
    res ||= orders[type][p]
    delete orders[type][p]
    delete delayedOrders[type][p]// maybe this helps

    let w1 = targets[[type, p]]
    if (w1) { w1.popTask() }
    return res
}

function clearOrder(p, dontCancel) {
    // consider also canceling targeted tasks and/or delayed orders
    let res = false
    let w1 = undefined
    let w2 = undefined
    for (let t in orders) {
        res ||= orders[t][p]
        delete orders[t][p]
        delete delayedOrders[t][p]// maybe this helps

        w1 ??= targets[[t, p]]
        w2 ??= draggers[[t, p]]
    }
    w1 ??= targets[["worker", p]]
    if (w1) { dontCancel ? w1.popTask() : w1.cancelTask() }
    if (w2) { w2.cancelTask() }
    return res
}

//put("water", [10, 2])
//water.push([10, 2])

function add(p, q) {
    return [p[0] + q[0], p[1] + q[1]]
}

function isDirt(p) {
    return (p[1] < 0 && !map[p]?.includes("tunnel")
        || map[p]?.includes("dirt"))
}


function isSolid(p) {
    if (isDirt(p)) return true
    for (let t of solidTypes) {
        if (map[p]?.find(x => x + "" === t)) return true
    }
    return false
}

function isAir(p) {
    return (p[1] >= 0 && !map[p]?.includes("tunnel") && !isSolid(p)
        || map[p]?.includes("air"))
}

function getSolidTypeObj(p) {
    // assert(isDirt(p)) <- would like to do this, but it fails sometimes and it probably not too bad if it happens

    if (isDirt(p)) return "dirt"
    for (let t of solidTypes) {
        let r
        if (r = map[p]?.find(x => x + "" === t)) return r
    }

    assert(false, "expected solid type")
}

function getSolidTypeStr(p) {
    return getSolidTypeObj(p) + ""
}

function hasAnt(p) {
    return map[p]?.find(item => item instanceof Ant)
}

function canWalk(p) {
    return !isSolid(p) && !hasAnt(p) && inBounds(p) &&
        (map[p]?.includes("tunnel") || isSolid([p[0], p[1] - 1]) || isSolid([p[0] - 1, p[1] - 1]) || isSolid([p[0] + 1, p[1] - 1]))
}

function canStay(p) {
    return !isSolid(p) &&
        (map[p]?.includes("tunnel") || isSolid([p[0], p[1] - 1]) || isSolid([p[0] - 1, p[1] - 1]) || isSolid([p[0] + 1, p[1] - 1]))
}

function canBreathe(p) {
    for (let q of neighbs9(p)) {
        if (!isDirt(q) && !map[q]?.includes("water")) {
            return true
        }
    }
    return false
}

function willBeDirt(p) {
    return (p[1] < 0 && !map[p]?.includes("tunnel")
        || map[p]?.includes("dirt")
        || (targets[["dirt", p]] && map[p]?.includes("tunnel")))
}

function willBeSolid(p) {
    if (isDirt(p)) return true
    for (let t of solidTypes) {
        if ((map[p]?.find(x => x + "" === t)) || targets[[t, p]] && t !== "dirt") return true
    }
    return false
}

function willWalk(p, type) {
    return ((!isSolid(p) && inBounds(p) &&
        (map[p]?.includes("tunnel") || willBeSolid([p[0], p[1] - 1]) || willBeSolid([p[0] - 1, p[1] - 1]) || willBeSolid([p[0] + 1, p[1] - 1]))
        || ((targets[["worker", p]] || orders["worker"][p]) && (type == "worker" || getSolidTypeObj(p) === type)) || solidTypes.find(t => draggers[[t, p]]))
    )
}



function take(thing, src, shouldScore = true) {
    let l = map[src]
    if (thing == "dirt" && isDirt(src)) {
        put("tunnel", src)
        if (!l?.includes(thing)) {
            if (shouldScore) incScore() // this is new dirt
            return
        }
    }
    assert(l.includes(thing), l, thing, src)
    if (l.length === 1) delete map[src]
    else l.splice(l.indexOf(thing), 1)
}

function put(thing, dst) {
    if (thing == "dirt") {
        if (isAir(dst)) {
            thing = "tunnel"
            incScore()
            console.log("placed tunnel")
        }
        else if (map[dst]?.includes("tunnel")) {
            take("tunnel", dst)
        }
    }
    if (map[dst]) map[dst].push(thing)
    else map[dst] = [thing]
    if (typeof thing !== "string") { thing.p = dst }
    return thing
}

function move(thing, src, dst) {
    take(thing, src)
    return put(thing, dst)
}

function swap(thing1, p1, thing2, p2) {
    take(thing1, p1)
    take(thing2, p2)
    r1 = put(thing1, p2)
    r2 = put(thing2, p1)
    return [r1, r2]
}

const rand = Math.random
let MudProb = 0.1 // saturated mud accepts rain much more slowly. With MudProb=0.1, the maximum flow through dirt appears to be around 0.03
let SidewaysProb = 0.3
let RainProb = 0.03

function* neighbs(p) {
    yield add(p, [1, 0])
    yield add(p, [-1, 0])
    yield add(p, [0, 1])
    yield add(p, [0, -1])
}

function* neighbs9(p) {
    for (let dx = -1; dx <= 1; dx++)for (let dy = -1; dy <= 1; dy++) {
        yield add(p, [dx, dy])
    }
}

function tryMoveW(src, dst, r, l) {
    if (map[dst]?.includes("water") || isDirt(dst) && r > MudProb) { return false }
    if (inBounds(dst)) {
        move("water", src, dst)
        l.push(dst)
    }
    else {
        take("water", src)
    }
    return true
}

tickCount = 0

function tick() {
    tickCount += 1
    let t = performance.now()
    console.log(t, "start")
    for (let t in delayedOrders) {
        for (let p in delayedOrders[t]) {
            if (!delayedOrders[t][p]) {
                setOrder(p, t)
                delete delayedOrders[t][p]
            }
            else {
                delayedOrders[t][p] -= 1
            }
        }
    }
    if (tickCount === 4500 && gameMode !== "sandbox") { // 15 minutes on the default speed of 200 ms/t
        win()
    }
    console.log(- t + (t = performance.now()), "delays")
    k = Math.log(tickCount) - 6
    diffScaler = k ** 2 * Math.sign(k) / 300
    if (gameMode !== "hard" && diffScaler >= 0) { diffScaler = 0 }
    RainProb = (1 + Math.sin(tickCount / 100)) ** 2 * 0.01 + diffScaler
    if (gameMode === "sandbox") { RainProb = 0 }
    // Should this vary by x coordinate? That would mean you'd have to deal with floods coming from the sides, as well as just rain from above
    let newWater = []
    for (let x = minx; x <= maxx; x++) {
        // Add rain
        // doing this before water movement means new water is at the start of the list, so bubbles don't move up instantly
        let p = [x, maxy];
        if (!map[p]?.includes("water") && rand() < RainProb) {
            put("water", p)
            newWater.push(p)
        }
    }
    for (let p of thingLists["water"]) {
        let r = rand() // This means that moving dirt to dirt isn't slower than air to dirt
        // but also that water never moves sideways through dirt, which we might want to change
        if (isDirt(p) && r > MudProb) {
            newWater.push(p);
            continue
        }
        if (tryMoveW(p, add(p, [0, -1]), r, newWater)) { continue }
        let sr = rand()
        if (sr < SidewaysProb) {
            if (tryMoveW(p, add(p, [1, 0]), r, newWater)) { continue }
        }
        else if (sr < SidewaysProb * 2) {
            if (tryMoveW(p, add(p, [-1, 0]), r, newWater)) { continue }
        }
        newWater.push(p)
    }
    thingLists["water"] = newWater
    console.log(- t + (t = performance.now()), "water")

    // Search for tasks available
    // tracking ants that have been encountered during the search might be able to speed things up
    // (particularly to avoid searching a large empty region multiple times)

    workerOrdersAttempted = 0
    workerOrderSucceeded = false
    tickThings("ant")
    if (workerOrdersAttempted >= 5 && !workerOrderSucceeded) {
        console.warn("too many unreachable worker orders - delaying")
        for (let p in orders["worker"]) {
            delete orders["worker"][p]
            delayedOrders["worker"][p] = workerOrdersAttempted * 2
        }
    }

    console.log(- t + (t = performance.now()), "ants")
    nurserySpaces = Object.keys(nmap).length - Object.keys(grubTargeting).length
    tickThings("grub")
    console.log(- t + (t = performance.now()), "grubs")
    queen.tick()
    console.log(- t + (t = performance.now()), "queen")
    expandMap()
    console.log(-t + (t = performance.now()), "mapgen")
    draw()
    console.log(- t + (t = performance.now()), "draw (end)")
}

function tickThings(thing) {
    for (let th of thingLists[thing]) {
        th.tick()
    }
    thingLists[thing] = thingLists[thing].filter(x => x.alive)
}

let tickInterval = null
tickrate = 200
let paused = false
function setTickrate(rate) {
    tickrate = rate
    clearInterval(tickInterval)
    if (!paused) tickInterval = setInterval(tick, rate)
}
function pause() {
    clearInterval(tickInterval)
    paused = true
}
function resume() {
    clearInterval(tickInterval)
    tickInterval = setInterval(tick, tickrate)
    paused = false
}

setTickrate(200)

function assert(c, ...args) {
    if (!c) {
        if (args.length) {
            console.error(...args)
        }
        throw "assertion"
    }
}


const Margin = 20 // Changing Margin has an effect on water throughput

let maxx = Margin
let minx = -Margin
let maxy = Margin
let miny = -Margin

let maxxgen = 0
let minxgen = 0
// let maxygen = 0
let minygen = 0

function inBounds(p) {
    ; let [x, y] = p
    return (x <= maxx && x >= minx && y <= maxy && y >= miny)
}

function expandMap() {
    let x, y
    for (x = minx; x < minxgen; x++) for (y = -1; y >= miny; y--) {
        mapGen(x, y)
    }
    minxgen = minx
    for (x = maxx; x > maxxgen; x--) for (y = -1; y >= miny; y--) {
        mapGen(x, y)
    }
    maxxgen = maxx
    for (y = miny; y < minygen; y++) for (x = minx; x <= maxx; x++) {
        mapGen(x, y)
    }
    minygen = miny
}


function lerp(a, b, t) {
    return a * (1 - t) + b * t
}

function mapGen(x, y) {
    let abs = Math.abs
    let closeness = abs(abs(x) - abs(y)) % 20
    let density = lerp(0.05, 0.01, closeness / 20)
    if (rand() < density && isDirt([x, y])) {
        take("dirt", [x, y], false)
        put("food", [x, y])
    }
}

let defined = undefined

class Queen {
    constructor(p) {
        put(this, p)
        this.p = p
        this.hunger = 5
        this.alive = true
    }
    toString() {
        return "queen"
    }
    // if we want to move Queen or Grub for any reason outside fo pushing (e.g. gravity), we should be careful about orders/targets/draggers

    tick() {
        if (!canBreathe(this.p)) {
            this.kill("drowned")
            return
        }
        let space = false
        for (let n of neighbs9(this.p)) {
            if (map[n]?.includes("food") && !targets[["worker", n]] && !orders["worker"][n] && !draggers[["food", n]]) {
                take("food", n)
                this.hunger += 3
            }
        }
        for (let n of neighbs(this.p)) {
            if (!isSolid(n) && !hasAnt(n) && map[n]?.includes("tunnel")) {
                space = true
                if (!map[n]?.includes("water") && this.hunger > 0 && rand() < 0.01) {
                    new Grub(n)
                    this.hunger -= 1
                }
            }
        }
        if (!space && thingLists["grub"].length === 0 && thingLists["ant"].length === 0) {
            gameOver("No ants, and no space to spawn grubs")
        }
        if (thingLists["grub"].length === 0 && thingLists["ant"].length === 0 && this.hunger <= 0) {
            this.kill("starved")
        }
        if (queenHome + "" !== this.p + "" && !draggers[["queen", this.p]] && canWalk(queenHome)) {
            setOrder(queenHome, "queen") && setOrder(this.p, "worker")
        }
    }

    kill(reason) {
        this.alive = false
        if (!reason) { reason = "died" }
        take(this, this.p)
        gameOver(`Your Queen ${reason}`)
    }
}

class Grub {
    constructor(p) {
        put(this, p)
        this.p = p
        clearOrder(this.p, true)
        thingLists["grub"].push(this)
        this.ticksToGrow = Math.floor(75 + rand() * 50)
        this.alive = true
    }
    toString() {
        return "grub"
    }

    kill() {
        this.alive = false
        let ant
        if ((ant = draggers[["grub", this.p]]) || (ant = targets[["worker", this.p]])) {
            ant.popTask()
        }
        clearOrderType(this.p, "worker")
        take(this, this.p)
        if (this.plan && grubTargeting[this.plan[0]] === this) {
            nurserySpaces += 1
            delete grubTargeting[this.plan[0]]
            clearOrderType(this.plan[0], "grub")
        }
    }

    tick() {
        assert(map[this.p].includes(this))
        if (this.plan && grubTargeting[this.plan[0]] !== this) { this.plan = undefined }
        if (map[this.p]?.includes("water")) {
            this.kill()
            return
        }
        this.ticksToGrow -= 1
        if (this.ticksToGrow <= 0) {
            this.kill()
            new Ant(this.p)
            return
        }
        if (nurserySpaces > 0 && !nmap[this.p] && !this.plan && !draggers[["grub", this.p]]) {
            function visit(p) {
                let walkable = willWalk(p)
                return [walkable, walkable && nmap[p] && !grubTargeting[p]]
            }
            let found = search([this.p], hCost, neighbs, visit)
            if (found) {
                if (setOrder(this.p, "worker")) {
                    if (setOrder(found[0], "grub")) {
                        // TODO: if a grub gets dropped temporarily, the order doesn't get unset
                        grubTargeting[found[0]] = this
                        this.plan = found
                        nurserySpaces -= 1
                    }
                }
            }
        }
    }

}
// Starting configuration 

take("dirt", [0, -1], false)

for (let x = 0; x < 3; x++) {
    //queen = new Ant([0, 0])
    new Ant([x, 0])

    // take("dirt", [2 * x, -3])
    // put("food", [2 * x, -3])
}

queen = new Queen([-1, 0])

expandMap()



