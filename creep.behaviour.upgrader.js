module.exports = {
    name: 'upgrader',
    approach: function(creep){
        let targetPos = new RoomPosition(creep.data.determinatedSpot.x, creep.data.determinatedSpot.y, creep.pos.roomName);
        let range = creep.pos.getRangeTo(targetPos);
        if( range > 0 ) 
            creep.drive( targetPos, 0, 0, range );
        return range;
    },
    run: function(creep) {
        if( !creep.data.determinatedSpot ) { 
            let args = {
                spots: [{
                    pos: creep.room.controller.pos, 
                    range: 3
                }], 
                checkWalkable: true, 
                where: null, 
                roomName: creep.pos.roomName
            }
            let addSpot = s => args.spots.push({
                pos: s.pos, 
                range: 1
            });
            if( creep.room.containerController ){
                creep.room.containerController.forEach(addSpot);
            }
            if( creep.room.linksController ){
                creep.room.linksController.forEach(addSpot);
            }
            
            let spots = Room.fieldsInRange(args);
            // TODO: remove spot of existing upgrader (with ttl > time to approach)
            if( spots.length > 0 ){
                let spot = creep.pos.findClosestByPath(spots);
                creep.data.determinatedSpot = {
                    x: spot.x, 
                    y: spot.y
                }
            } else logError('Unable to determine working location for upgrader in room ' + creep.pos.roomName);
        }
        if( creep.data.determinatedSpot ) {
            if(CHATTY) creep.say('upgrading', SAY_PUBLIC);
            let range = this.approach(creep);
            if( range == 0 ){
                let carryThreshold = (creep.data.body&&creep.data.body.work ? creep.data.body.work : (creep.carryCapacity/2));
                if( creep.carry.energy <= carryThreshold ){
                    let store = creep.room.linksController.find(l => l.energy > 0);
                    if( !store ) store = creep.room.containerController.find(l => l.store.energy > 0);
                    if( store ) creep.withdraw(store, RESOURCE_ENERGY);
                    else logError(`Upgrader ${creep.name} has no container or link in reach of the controller in room ${creep.pos.roomName}!`);
                }
                creep.upgradeController(creep.room.controller);
            }
        }
    }
}