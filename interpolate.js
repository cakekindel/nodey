const {throwE, O} = require('./prelude.js');
const {stdin} = require('./read/stdin.js');
const {stdout} = require('./write/stdout.js');
const {getReqdArg} = require('./read/args.js');

const args = {
  pattern: getReqdArg({ short: '-p', long: '--pattern' }),
};

stdin()
  .then(JSON.parse)
  .then( list => list.map( data => args.pattern
                                       .split('@')
                                       .map( seg => seg.startsWith('{')
                                                  ? seg.replace( /\{.*?\}/
                                                               , O.lookup(seg.match(/\{(.*?)\}/)[1])(data)
                                                               )
                                                  : seg
                                           )
                                       .join('')
                         )
       )
   .then(JSON.stringify)
   .then(stdout)
