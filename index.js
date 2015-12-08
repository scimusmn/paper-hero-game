var reader = require('./ScanReader/index.js');
var game = require('./BigGame/index.js');
var chokidar = require('chokidar');
var jsonfile = require('jsonfile');
var path = require('path');

var charactersJSON = {};
var charactersPath = './Characters.json';
jsonfile.spaces = 2;
jsonfile.readFile(charactersPath, function(err, obj) {
  if (err) {
    console.log('No Characters manifest found. Start anew.');
  } else {
    charactersJSON = obj;
    game.updateCharacterManifest(charactersJSON);
  }
});

// Watch directory for new files from scanner.
// Ignore hidden files. Wait for files to finish saving before reporting.

var scanDir = __dirname + '/public/scans/';
var watchOptions = {ignored: /[\/\\]\./, persistent: true, ignoreInitial:true, awaitWriteFinish: true};

chokidar.watch(scanDir, watchOptions).on('add', function(path) {
  console.log('New scan found:', path);
  processScan(path);
});

// Set up form for scan reader
reader.setOutputPath('./public/characters/');
reader.loadFormData('./public/forms/example.json');

// DEBUG - Every 30 seconds load local scan for testing.
// processScan(__dirname + '/work/example-scans/Image-001.png');
// setInterval(function() {
//   var rInt = Math.ceil(Math.random() * 4);
//   processScan(__dirname + '/work/example-scans/Image-00' + rInt + '.png');
// }, 25 * 1000);

function processScan(formPath) {

  reader.digest(formPath, digestionComplete);

}

function digestionComplete(results) {

  // Simplify fill-box results by using only
  // first true value, and collapsing into single array.
  results.steps = [results.step1.indexOf(true),
                    results.step2.indexOf(true),
                    results.step3.indexOf(true),
                    results.step4.indexOf(true),
                    results.step5.indexOf(true),
                    ];

  // Remove the now uneccessary keys
  delete results.step1;
  delete results.step2;
  delete results.step3;
  delete results.step4;
  delete results.step5;

  console.log('\nDigestion complete ... <{ BURP! }');

  // Manipulate filepaths to work with game server
  results.monster = results.monster.replace('./public/', '/smash/');
  results.tool = results.tool.replace('./public/', '/smash/');
  results.food = results.food.replace('./public/', '/smash/');
  results.name = results.name.replace('./public/', '/smash/');

  // Set useful assetPath (home directory for all assets)
  results.assetPath = results.monster.replace('monster.png', '');
  console.log(results.assetPath);

  addCharacter(results);

}

function addCharacter(characterData) {

  // Create unique ID for new character.

  var uniqueId = generateCharacterId();
  while ((uniqueId in charactersJSON)) {
    uniqueId = generateCharacterId();
  }

  // TODO - Rename asset folder to match unique id.

  // Add metadata...
  characterData.datecreated = Date.now() + '';

  // Update local JSON with new character
  charactersJSON[uniqueId] = characterData;

  // Overwrite manifest json document
  jsonfile.writeFile(charactersPath, charactersJSON, {spaces: 2}, function(err) {

    if (err) {
      console.error(err);
    } else {
      game.updateCharacterManifest(charactersJSON);
      game.addPlayableCharacter(uniqueId, characterData);
    }

  });

}

function generateCharacterId() {

  // Using 26 letters and 4 slots,
  // we get 358,800 permutations.

  var id = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (var i = 0; i < 4; i++) {
    id += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return id;

}

