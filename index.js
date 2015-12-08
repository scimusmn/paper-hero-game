var artEater = require('./ScanReader/index.js');
var game = require('./BigGame/index.js');
var jsonfile = require('jsonfile');
var path = require('path');

// Get existing character manifest
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

// Set up Art Reader
var regionsJSON = './public/forms/example.json';
var outputDirectory = './public/characters/';
var scanDirectory = __dirname + '/public/scans/';

artEater.loadRegions(regionsJSON);
artEater.setOutputDirectory(outputDirectory);
artEater.watchDirectoryForScans(scanDirectory, digestionComplete);

// Do post-processing after art-reader returns results.
function digestionComplete(results) {

  console.log('\nDigestion complete ... <{ BURP! }');

  // Simplify fill-box results.
  // Accept only first true value for each.
  results.steps = [results.step1.indexOf(true),
                    results.step2.indexOf(true),
                    results.step3.indexOf(true),
                    results.step4.indexOf(true),
                    results.step5.indexOf(true),
                    ];

  // Remove superflous keys
  delete results.step1;
  delete results.step2;
  delete results.step3;
  delete results.step4;
  delete results.step5;

  // Manipulate filepaths to work with game server
  results.monster = results.monster.replace('./public/', '/smash/');
  results.tool = results.tool.replace('./public/', '/smash/');
  results.food = results.food.replace('./public/', '/smash/');
  results.name = results.name.replace('./public/', '/smash/');

  // Add home directory for all assets
  results.assetPath = results.monster.replace('monster.png', '');

  addCharacter(results);

}

function addCharacter(characterData) {

  // Create unique ID for new character.
  var uniqueId = generateCharacterId();
  while ((uniqueId in charactersJSON)) {
    uniqueId = generateCharacterId();
  }

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

/* TEMP */

// DEBUG - Every 30 seconds load local scan for testing.
// artEater.digest(__dirname + '/work/example-scans/Image-005.png', digestionComplete);
// setInterval(function() {

//   var rInt = Math.ceil(Math.random() * 7);
//   artEater.digest(__dirname + '/work/example-scans/Image-00' + rInt + '.png', digestionComplete);

// }, 15 * 1000);
