// misc JS utils
const extend = t => name => impl => t.prototype[name] = function(...args) { impl(this, ...args); };

// deprecated
const throwE = e => { throw e; };

// Error
const E = { };
E['raw']   = Error;
E['throw'] = e => {throw e;};

// Function
const F = { };
F['pipe']     = (val, ...fns) => fns.reduce((prev, fn) => fn(prev), val);
F['pipeL']    = (...fns) => val => F.pipe(val, ...fns);
F['identity'] = a => a;
F['const_']   = a => () => a;
F['mirror2']  = f => b => a => f(a)(b);
F['curry2']   = f => a => b => f(a, b);
F['curry3']   = f => a => b => c => f(a, b, c);
F['not']      = f => (...args) => !f(...args);

// File
const fs = require('fs');

const Fs = {
  read: path => fs.readFileSync(path, 'utf8'),
  write: path => contents => fs.writeFileSync(path, contents),
  exists: fs.existsSync,
};

// Object
const O = { };
O['raw']        = Object;
O['lookup']     = path => o => path.split('.').reduce((last, p) => O.nil(last) ? undefined : last[p], o);
O['nil']        = o => o === undefined || o === null;
O['invk0']      = p => o => o[p]();
O['invk']       = p => (...args) => o => o[p](...args);
O['map']        = o => map => Object.keys(o).reduce((o2, k) => o2[k] = map(o[k]), {});
O['whenNotNil'] = f => o => O.nil(o) ? o : f(o);

// Array
const A = { };
A['raw']       = Array;
A['filter']    = f => a => a.filter(f);
A['fold']      = bab => b => a => a.reduce(bab, b);
A['enumerate'] = a => a.map((el, ix) => [ix, el]);
A['map']       = f => a => a.map(f);
A['ix']        = i => a => a[i];
A['head']      = A.ix(0);
A['tail']      = O.invk('slice')(1);
A['last']      = a => a[a.length - 1];
A['init']      = a => a.slice(0, -1) || [];
A['empty']     = a => a.length === 0;
A['map']       = f => a => a.map(f);
A['batch']     = size => arr => arr.reduce( (acc, cur, ix) => {
     return !A.last(acc) || A.last(acc).length === size
                                                    ? [...acc, [cur]]
                                                    : [A.init(acc), [...A.last(acc), cur]]}
                                      , []
                                      );

const Int = { };
Int['parseRadix'] = radix => str => parseInt(str, radix);
Int['parse']      = Int.parseRadix(10);

const S = { };
S['raw']      = String;
S['split']    = delim => s => s.split(delim);
S['join']     = delim => chars => chars.join(delim);
S['replace']  = sub => wth => str => str.replace(sub, wth);
S['includes'] = sub => s => s.includes(sub);

module.exports = {Int, S, A, F, O, Fs, throwE, Array: A, Object: O, Function: F, Error: E, String: S};
