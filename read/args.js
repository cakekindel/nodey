const {A, O, throwE} = require('../prelude.js');

// type Arg = {cmd :: String, val :: String}
// type ArgCfg = {short :: String, long :: String}

const isArg = arg => arg.startsWith('-');
const isShort = arg => isArg(arg) && !arg.startsWith('--');
const expandMultiShort = arg => arg.replace('-', '').split('').map(arg => '-' + arg);

//    args :: Unit -> Array Cmd
const args = () => process.argv
                          .slice(2)
                          .reduce( (acc, cur) => [ ...acc
                                                 , ...(isShort(cur) && cur.length > 2
                                                        ? expandMultiShort(cur)
                                                        : [cur]
                                                      )
                                                 ]
                                 , []
                          )
                          .reduce( (acc, cur) => isArg(cur)
                                               ? [...acc, {arg: cur}]
                                               : [...A.init(acc), {val: cur, ...A.last(acc)}]
                                 , []
                          );

//    getArg :: ArgCfg -> Array Arg
const getArg = cfg => args().filter(a => a.arg === cfg.short || a.arg === cfg.long).map(O.lookup('val'));
const get = getArg;

//    exists :: ArgCfg -> Boolean
const exists = cfg => A.empty(getArg(cfg));

//    getReqdArg :: ArgCfg -> Arg
const getReqdArg = cfg => O.nil(getArg(cfg)[0])
                        ? throwE(`${cfg.short} | ${cfg.long} is required.`)
                        : getArg(cfg)[0];

module.exports = {args, get, exists, getArg, getReqdArg};
