var reader = require('./src/ScanReader.js');
var chokidar = require('chokidar');
var jsonfile = require('jsonfile');

var charactersJSON = {};
var charactersPath = './Characters.json';
jsonfile.spaces = 2;
jsonfile.readFile(charactersPath, function(err, obj) {
  if (err) {
    console.log('No Characters manifest found. Start anew.');
  } else {
    charactersJSON = obj;
  }
});

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

// Monster art...
reader.expectArt('monster', 173, 370, 496, 658);
reader.expectArt('projectile', 830, 408, 227, 227);
reader.expectArt('food', 830, 798, 227, 227);

// Instruction loop boxes...
reader.expectFillBox('step1', 130, 1327, 170, 170, 3, 3);
reader.expectFillBox('step2', 346, 1327, 170, 170, 3, 3);
reader.expectFillBox('step3', 562, 1327, 170, 170, 3, 3);
reader.expectFillBox('step4', 778, 1327, 170, 170, 3, 3);
reader.expectFillBox('step5', 995, 1327, 170, 170, 3, 3);

// Use local file for testing
processScan(__dirname + '/public/example-scans/Image-003.png');

function processScan(formPath) {

  reader.outputDebug(formPath, function(path) {});

  reader.digest(formPath, digestionComplete);

}

function digestionComplete(results) {

  // Set fill-box arrays to index of first filled box.
  results.step1 = results.step1.indexOf(true);
  results.step2 = results.step2.indexOf(true);
  results.step3 = results.step3.indexOf(true);
  results.step4 = results.step4.indexOf(true);
  results.step5 = results.step5.indexOf(true);

  console.log('\nDigestion complete ... <{ BURP! }');

  newCharacter(results);

}

function newCharacter(characterData) {

  // TODO - create 'Mobile Code' for this character
  var timestamp = Date.now() + '';
  var uniqueId = 'Character_' + timestamp;
  characterData.datecreated = timestamp;

  charactersJSON[uniqueId] = characterData;

  // Write to manifest
  jsonfile.writeFile(charactersPath, charactersJSON, {spaces: 2}, function(err) {

    if (err) {
      console.error(err);
    } else {
      // TODO - Tell game there's a new character
      // game.addCharacter(newCharId, characterData);
    }

  });

}

