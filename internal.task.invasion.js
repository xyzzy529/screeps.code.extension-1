const mod = {};
module.exports = mod;

mod.phases = [
    { // phase one
        condition: mod.checkPhaseOne,
        run(flag, params) {
            // not yet begun
            flag.memory.phase = 1;
            _.times(INVASION.HOPPER_COUNT - params.hoppers.length, n => newFlag('hopper'));
        },
        orElse(flag, params) {
            removeFlags(flag, 'hopper');
        }
    },
    { // phase two
        condition: mod.checkPhaseTwo,
        run(flag, params) {
            flag.memory.phase = 2;
            _.times(INVASION.TRAIN_COUNT - params.trains.length, n => newFlag(flag, 'attackTrain'));
        },
        orElse(flag, params) {
            removeFlags(flag, 'attackTrain');
        }
    },
    { // phase three
        condition: mod.checkPhaseThree,
        run(flag, params) {
            flag.memory.phase = 3;
            _.times(INVASION.ATTACK_CONTROLLER_COUNT - params.controllerAttackers.length, n => newFlag('invade.attackController'));
        },
        orElse(flag, params) {
            removeFlags(flag, 'invade.attackController');
        }
    },
];

mod.phases_other = {
    final: {
        condition: mod.checkFinished,
        run(flag, params) {
            flag.memory.phase = 4;
            _(flag.memory.flags).forEach(f => {
                Game.flags[f.name].remove();
            });
            flag.memory.flags = [];
            flag.remove();
        },
    },
    guards: {
        condition: mod.checkGuards,
        run(flag, params) {
            const guardCount = Util.fieldOrFunction(INVASION.GUARD_COUNT, flag.memory.phase);
            const existingGuardFlags = FlagDir.filter(FLAG_COLOR.defense, flag.pos, true).length;
            _.times(guardCount - existingGuardFlags, n => newFlag('defense'));
        },
        orElse(flag, params) {
            removeFlags('defense');
        },
    },
    robbers: {
        condition: mod.checkRobbers,
        run(flag, params) {
            const existingRobberFlags = FlagDir.filter(FLAG_COLOR.invade.robbing, flag.pos, true).length;
            _.times(INVASION.ROBBER_COUNT - existingRobberFlags, n => newFlag('invade.robbing'));
        },
        orElse(flag, params) {
            removeFlags('invade.robbing');
        },
    },
    nukes: {
        condition: mod.checkNukes,
        run(flag, params) {
            if (flag.memory.nukeLaunched) return; // don't launch if one has already been launched
            const targets = Array.isArray(INVASION.NUKE_TARGETS) ? INVASION.NUKE_TARGETS : [INVASION.NUKE_TARGETS];
            const roomTargets = _(params.room.find(FIND_HOSTILE_STRUCTURES))
                .filter(s => targets.includes(s.structureType))
                .sortBy(s => targets.indexOf(s.structureType))
                .value();
            
            // TODO: find target based on proximity to other structures
            
            const nukers = _(Game.rooms)
                .filter(r => r.controller && r.my && r.structures.nuker && r.structures.nuker.cooldown === 0)
                .filter(r => r.structures.nuker.energy === r.structures.nuker.energyCapacity)
                .filter(r => r.structures.nuker.ghodium === r.structures.nuker.ghodiumCapacity)
                .filter(r => Game.map.getRoomLinearDistance(params.room.name, r.name))
                .map(r => r.structures.nuker)
                .value();
            
            if (nukers && nukers.length && roomTargets) {
                nukers[0].launchNuke(roomTargets[0].pos);
                flag.memory.nukeLaunched = true;
            }
        },
    },
};

mod.register = () => {
    if (_.isUndefined(Task.selfRegister)) {
        Flag.found.on(Task.invasion.handleFlagFound);
    }
};

mod.handleFlagFound = flag => {
    flag = Game.flags[flag.name];
    if (flag.compareTo(FLAG_COLOR.invasion)) {
        Task.invasion.checkPhase(flag);
    }
};

mod.checkPhase = flag => {
    flag.memory.phase = flag.memory.phase || 0;
    const hoppers = FlagDir.filter(FLAG_COLOR.hopper, flag.pos, true);
    const trains = FlagDir.filter(FLAG_COLOR.attackTrain, flag.pos, true);
    const controllerAttackers = FlagDir.filter(FLAG_COLOR.invade.attackController, flag.pos, true);
    
    const params = {hoppers, trains, controllerAttackers};
    
    if (!flag.memory.flags) flag.memory.flags = [];
    
    if (Task.invasion.phases[0].condition(flag, params)) {
        Task.invasion.phases[0].run(flag, params);
    } else if (Task.invasion.phases[0].orElse) {
        Task.invasion.phases[0].orElse(flag, params);
    }
    
    if (!flag.room) {
        // Request room via. observers
        observerRequests = {roomName: flag.pos.roomName};
        return false; // we need vision after this point
    }
    
    const room = flag.room;
    
    _.assign(params, {
        room,
    });
    
    for (let i = 1; i < Task.invasion.phases.length; i++) {
        const phase = Task.invasion.phase[i];
        if (phase.condition(flag, params)) {
            phase.run(flag, params);
        } else if (phase.orElse) {
            phase.orElse(flag, params);
        }
    }
    
    for (const phase of Task.invasion.phases_other) {
        if (phase.condition(flag, params)) {
            phase.run(flag, params);
        } else if (phase.orElse) {
            phase.orElse(flag, params);
        }
    }
    
    return true;
    
};

mod.checkPhaseOne = (flag, params) => {
    // No hoppers, trains, or controllerAttackers
    return !(params.hoppers && params.hoppers.length && params.trains && params.trains.length && params.controllerAttackers && params.controllerAttackers.length);
};

mod.checkPhaseTwo = (flag, params) => {
    const towers = params.room.structures.towers;
    const count = towers.length;
    const energy = _.sum(towers, 'energy');
    // must be phase 1, and either no towers or average tower energy must be <= 10%
    return flag.memory.phase === 1 && ((count && energy / (count * 1000) <= 0.1) || !count);
};

mod.checkPhaseThree = (flag, params) => {
    const towers = params.room.structures.towers;
    const spawns = params.room.structures.spawns;
    // must be phase 2, and no spawns or towers
    return flag.memory.phase === 2 && (!spawns || (spawns.length && spawns.length === 0)) || (!towers && (towers.length && towers.length === 0));
};

mod.checkFinished = (flag, params) => {
    // must be phase 3, have ATTACK_CONTROLLER enabled, and the controller (if existing) must not be owned
    return flag.memory.phase === 3 && (!INVASION.ATTACK_CONTROLLER || !params.room.controller || (INVASION.ATTACK_CONTROLLER && params.room.controller && !params.room.controller.owner));
};

mod.checkGuards = (flag, params) => {
    // must be a legitimate phase
    if (!(-1 < flag.memory.phase && flag.memory.phase < Task.invasion.phases.length)) return false;
    // if hostiles in room
    if (params.room.hostiles && params.room.hostiles.length) {
        // and hostiles are of a combat variety
        const hostiles = _.filter(params.room.hostiles, c => c.hasActiveBodyparts([ATTACK, RANGED_ATTACK, HEAL]));
        if (hostiles && hostiles.length && hostiles.length > 0) {
            return true;
        }
    }
    return false;
};

mod.checkRobbers = (flag, params) => {
    let energy = params.room.energyAvailable;
    if (params.room.storage) energy += params.room.storage[RESOURCE_ENERGY];
    if (params.room.terminal) energy += params.room.terminal[RESOURCE_ENERGY];
    // must be phase 2 or 3 and total room energy > 0
    return [2, 3].includes(flag.memory.phase) && energy > 0;
};

mod.checkNukes = (flag, params) => {
    return (flag.memory.phase === 1 || flag.memory.phase === 2) && INVASION.NUKES;
};

const newFlag = (flag, type) => {
    const flagColour = _.get(FLAG_COLOR, type);
    if (!flagColour) return;
    const name = flag.pos.createFlag(null, flagColour.color, flagColour.secondaryColor);
    flag.memory.flags.push({
        name, type
    });
};
const removeFlags = (flag, type) => {
    _(flag.memory.flags).filter({type}).forEach(f => {
        Game.flags[f.name].remove();
        let i = flag.memory.flags.indexOf(f);
        flag.memory.flags.splice(i, 1);
    });
};