var reader = require('./src/ScanReader.js');
var chokidar = require('chokidar'); // Helper wrapper around fs.watch()

// Watch directory for new files from scanner.
// Ignore hidden files. Wait for files to finish saving before reporting.
/*
var scanDir = __dirname + '/public/scans/';
var watchOptions = {ignored: /[\/\\]\./, persistent: true, awaitWriteFinish: true};

chokidar.watch(scanDir, watchOptions).on('add', function(path) {
  console.log('New scan found:', path);
  processScan(path);
});
*/

// Set up form for scan reader
reader.setOutputPath(__dirname + '/public/output/');
// reader.expectArt('monster', 173, 370, 496, 658);
// reader.expectArt('projectile', 830, 408, 227, 227);
reader.expectArt('food', 830, 798, 227, 227);

reader.expectFillBox('step-1', 130, 1327, 170, 170, 3, 3);
reader.expectFillBox('step-2', 346, 1327, 170, 170, 3, 3);
reader.expectFillBox('step-3', 562, 1327, 170, 170, 3, 3);
reader.expectFillBox('step-4', 778, 1327, 170, 170, 3, 3);
reader.expectFillBox('step-5', 995, 1327, 170, 170, 3, 3);

// Temp for testing
processScan(__dirname + '/public/example-scans/Image-004.png');

function processScan(formPath) {

  reader.outputDebug(formPath, function(path) {});

  reader.digest(formPath, digestionComplete);

}

function digestionComplete(results) {
  console.log('\nDigestion complete ... <{ BURP! }');
  console.log(results, '\n');
}

