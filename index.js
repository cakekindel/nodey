const axios = require('axios');
const xlsx = require('xlsx');
const parseCsv = require('csv-parse/lib/sync');
const fs = require('fs');

const idMapper = require('./idMapper.js');

// Helpers
const file = { read: fs.readFileSync, write: fs.writeFileSync, mkdir: fs.mkdirSync };

Array.prototype.last = function() {
  return this[this.length - 1];
};

Array.prototype.init = function() {
  return this.slice(0, -1);
};

Array.prototype.uniq = function() {
  return this.reduce((arr, val) => arr.includes(val) ? arr : [...arr, val], []);
};

const pipe = (val, ...fns) => fns.reduce((prev, fn) => fn(prev), val);
const pipeL = (...fns) => val => pipe(val, ...fns);

const isFalsy = v => !v;
const throwIf = test => msg => val => { if(test(val)) throw msg; else return val; };
const orDefault = def => val => val || def;
const swallow = fn => { try { fn() } catch {} };

const parseExcel = (path, sheet) => xlsx.utils.sheet_to_json(xlsx.readFile(path).Sheets[sheet]);
const fileIsExcel = file => file.endsWith('.xlsx');
const fileIsCsv = file => file.endsWith('.csv');

// Parse Args
const args = () => {
  const list = process.argv.slice(2);

  const getArg = aliases => list.find(a => aliases instanceof Array ? aliases.some(alias => a.startsWith(alias)) : a.startsWith(aliases));
  const getValue = arg => arg ? arg.split('=')[1] : arg;

  const file = pipe(
                 ['-f', '--file'],
                 getArg,
                 getValue,
                 throwIf(isFalsy)('--file or -f is required, so I know what file to read.'),
                 throwIf(f => !fileIsExcel(f) && !fileIsCsv(f))('File must be .xlsx or .csv'),
               );

  const dataColumn = pipe(
                       ['-c', '--column'],
                       getArg,
                       getValue,
                       throwIf(isFalsy)('--column or -c is required, so I know which column to pull data from.'),
                     );

  return {
    file,
    xlsxSheet: pipe(
                 ['-s', '--xlsx-sheet'],
                 getArg,
                 getValue,
                 throwIf(sheet => fileIsExcel(file) && !sheet)('--xlsx-sheet or -s is required for excel files, so I know which sheet to pull data from.')
               ),
    dataColumn,
  }
};

// Figure out where to put files
const runDir = (() => {
  const runDirName = 'run_'
                   + args().file.split('.').slice(0, -1).join('')
                   + (new Date().toISOString());

  swallow(() => file.mkdir(runDirName));

  return runDirName;
})();

// Read the file
const data = (() => {
  const contents = file.read(args().file, 'utf8');
  const read = () => fileIsCsv(args().file)
                   ? parseCsv(contents, {columns: true})
                   : parseExcel(args().file, args().xlsxSheet);
  const debug = () => console.log(read());
  return {read, debug};
})();

// Configure the good 'mappings.json' file object
const outputLogPath = './' + runDir + '/dupes.json';
const outputLog = (() => {
  let data;
  try {
    data = JSON.parse(file.read(outputLogPath, 'utf8'));
  } catch (e) {
    data = [];
  }

  const write = () => file.write(outputLogPath, JSON.stringify(data));

  const add = newDupes => {
    if (!newDupes) return;
    data.push(newDupes);
    write(data);
  };

  const contains = accountId => data.some(m => m.some(d => d.accountId === accountId));

  return {data, write, add, contains};
})();

// Configure the bad 'errors.json' file object
const errorLogPath = './' + runDir + '/errors.json';
const errorLog = (() => {
  let data;
  try {
    data = JSON.parse(file.read(errorLogPath, 'utf8'));
  } catch (e) {
    data = [];
  }

  const write = () => file.write(errorLogPath, JSON.stringify(data));

  const add = error => { data.push(error); write(data); };

  return {data, write, add};
})();

// GO!!!
(async () => {
  // read the data, dedupe, remove already processed
  const numbers = data.read()
                      .map(d => d[args().dataColumn].toLowerCase())
                      .uniq()
                      .filter(id => !outputLog.contains(id));

  if (numbers.length === 0) console.log('No work to do! Go away!')
  else                      console.log(`Got ${numbers.length} requests to make - I'll get right on it!`);

  // get ready to build URLs
  const functionKey = 'S6eTQKVtFs4Ti3m63u/harBmab3FdMv3ZtGA07BUYRs4P63Jqoabcw==';
  const baseUrl = 'https://platformuseraudit.azurewebsites.net';
  const getUrl = id => `${baseUrl}/api/CheckForDuplicateUsers?code=${functionKey}&identityId=${id}`;

  // kick off / queue a whole buncha requests
  const batchSize = 10;
  const promises = numbers.reduce(
                            (batches, id) => {
                              return batches.last().length === batchSize
                                ? [...batches, [id]]
                                : [...batches.init(), [...batches.last(), id]]
                            }
                            , [[]]
                          )
                          .map(batch => () => batch.map(id => axios.get(getUrl(id)).catch(errorLog.add)));

  const sleepAsync = ms => new Promise(res => {
    setTimeout(res, ms);
  });

  // wait for them, write response or error to file
  for(let i = 0; i < promises.length; i++) {
    const batch = promises[i]();
    console.log('')
    console.log('Starting next batch...')

    await Promise.allSettled(batch).then(results => {
                                     results.forEach(r => {
                                       if (r && r.status !== 'fulfilled' && r.value.config && r.value.config.url) {
                                         errorLog.add(r.value.data)
                                         console.log('Uh Oh! ' + r.value.status + ': ' + r.value.config.url.split('=').last())
                                       }

                                       if (r && r.status === 'fulfilled' && r.value && r.value.data) {
                                         outputLog.add(r.value.data)

                                         if (r.value.config && r.value.config.url)
                                           console.log('Ok! ' + r.value.config.url.split('=').last())
                                       }
                                     })
                                   })
                                   .catch(r => {
                                     // if (r && r.status && r.config && r.config.url)
                                     //   console.log('Uh Oh! ' + r.status + ': ' + r.config.url.split('=').last())

                                     errorLog.add(r.data)
                                   });
  }
})()

