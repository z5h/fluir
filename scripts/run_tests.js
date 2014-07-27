var reporter = require('nodeunit').reporters['default'],
    fs_plus = require('fs-plus');

var acc = [];
function includeFile(file){
  if (file != 'run_tests.js') acc.push(file);
}
function includeDir(dir){
  fs_plus.traverseTreeSync(dir, includeFile, includeDir);
}
includeDir('test');
reporter.run(acc);