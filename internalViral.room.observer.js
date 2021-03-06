const mod = {
    
    extend() {
        this.baseOf.internalViral.extend.call(this);
    
        Room.prototype.checkPowerBank = function() {
            if (!this.powerBank) return; // no power bank in room
            if (this.powerBank.cloak) return;
            const currentFlags = FlagDir.count(FLAG_COLOR.powerMining, this.powerBank.pos, false);
            const flagged = FlagDir.find(FLAG_COLOR.powerMining, this.powerBank.pos, false);
            if (!flagged && currentFlags < MAX_AUTO_POWER_MINING_FLAGS) {
                if (this.powerBank.power > 2500 && this.powerBank.ticksToDecay > 4500) {
                    this.powerBank.pos.newFlag(FLAG_COLOR.powerMining, this.name + '-PM');
                }
            }
        };
    },
    
    analyzeRoom(room, needMemoryResync) {
        this.baseOf.internalViral.analyzeRoom.call(this, ...arguments);
    
        if (AUTO_POWER_MINING) room.checkPowerBank();
    }
    
};
module.exports = mod;