let mod = {
	FILL_NUKER: false,
	CONTROLLER_SIGN: true,
	CONTROLLER_SIGN_MESSAGE: `Territory of ${_ME}, an Open Collaboration Society member! (https://github.com/ScreepsOCS)`,
        AUTO_POWER_MINING: true, //set to false to disable power mining (recomended until 1-2 RCL8+ rooms)
        MAX_AUTO_POWER_MINING_FLAGS: 2,
    ACTION_SAY: {
        HARVESTPOWER: String.fromCodePoint(0x26CF),
    },
        POWER_MINE_LOG: true, //displays power mining info in console
};
module.exports = mod;
