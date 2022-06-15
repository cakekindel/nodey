const stdin = () => new Promise((res) => {
  let data = '';
  process.stdin.on('data', line => data += line);
  process.stdin.on('end', () => res(data));
});

module.exports = {stdin};
