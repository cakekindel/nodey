const {stdin} = require('../read/stdin.js');
const {stdout} = require('../write/stdout.js');
const parseCsv_ = require('csv-parse/lib/sync');
const parseCsv = csv => parseCsv_(csv, {columns: true});

stdin()
  .then(parseCsv)
  .then(JSON.stringify)
  .then(stdout)
