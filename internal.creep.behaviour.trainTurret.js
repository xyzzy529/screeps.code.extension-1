let mod = {};
module.exports = mod;
mod.name = 'trainTurret';
mod.run = function(creep) {
    // Assign next Action
    if (!creep.action || creep.action.name === 'idle') this.nextAction(creep);
    // Do some work
    if( creep.action && creep.target ) {
        creep.action.step(creep);
    } else {
        logError('Creep without action/activity!\nCreep: ' + creep.name + '\ndata: ' + JSON.stringify(creep.data));
    }

    let hasRangedAttack = creep.hasActiveBodyparts(RANGED_ATTACK);

    if( hasRangedAttack ) {
        let targets = creep.pos.findInRange(creep.room.hostiles, 3);
        if(targets.length > 2) { // TODO: precalc damage dealt
            if(CHATTY) creep.say('MassAttack');
            creep.attackingRanged = creep.rangedMassAttack() == OK;
            return;
        } else if (targets.length > 0){
            creep.attackingRanged = creep.rangedAttack(targets[0]) == OK;
        }
    }
};
mod.nextAction = function(creep){
    let flag = FlagDir.find(FLAG_COLOR.attackTrain, creep.pos, false);

    Population.registerCreepFlag(creep, flag);

    let target = Game.creeps[Creep.prototype.findGroupMemberByType("trainHealer", creep.data.flagName)];

    if(!flag) {
        Creep.action.recycling.assign(creep);
    } else if(!target) {
        if(creep.pos.roomName != creep.data.homeRoom) {
            return Creep.action.travelling.assignRoom(creep, creep.data.homeRoom);
        } else {
            return Creep.action.idle.assign(creep);
        }
    } else {
        return Creep.action.travelling.assign(creep, target);
    }
};
mod.strategies = {
    defaultStrategy: {
        name: `default-${mod.name}`,
        moveOptions: function(options) {
            // allow routing in and through hostile rooms
            if (_.isUndefined(options.allowHostile)) options.allowHostile = true;
            return options;
        }
    }
};
mod.selectStrategies = function(actionName) {
    return [mod.strategies.defaultStrategy, mod.strategies[actionName]];
};