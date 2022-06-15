const axios = require('axios');
const {throwE, F, O, A} = require('../prelude.js');
const {stdin} = require('../read/stdin.js');
const {stdout} = require('../write/stdout.js');
const {getArg, getReqdArg} = require('../read/args.js');

const args = { headers: F.pipe( { short: '-h', long: '--header' }
                              , getArg
                              , headers => headers.map(h => h.split(':'))
                                                  .reduce((obj, [k, v]) => obj[k] = v, {})
                              )
             , batchSize: F.pipe( { short: '-b', long: '--batchsize' }
                                , getReqdArg
                                , parseInt
                                )
             , stream: F.pipe( { short: '-b', long: '--batchsize' }
                             , getArg
                             , F.not(O.nil)
                             )
             };

const request = url => axios.get(url, {headers: args.headers})
                            .then(({data}) => ({status: 'OK', data}))
                            .catch(error => ({status: 'ERR', error}));

stdin()
  .then(JSON.parse)
  .then(urls => urls.map(url => () => request(url)))
  .then(allReqs => {
    const go =    reqs =>
               results => reqs.length > 0
                        ? Promise.all(reqs.slice(0, args.batchSize).map(f => f()))
                                 .then( newResults => go(reqs.slice(args.batchSize))
                                                        ([...results, ...newResults])
                                      )
                        : results;

    return go(allReqs)([]);
  })
  .then(console.log)
  .then(JSON.stringify)
  .then(stdout)
