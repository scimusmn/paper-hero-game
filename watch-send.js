/**
*
* watch-send.js
*
* Watch a directory. When there is
* a new (complete) file, securely
* copy it to a server location.
*
*/

var chokidar = require('chokidar'); // Directory observer.
var client = require('scp2');

var WATCH_DIRECTORY = '~/Desktop/paper-art-eater/public/scans/';
var TARGET_DIRECTORY = ''; // Example: 'admin:password@example.com:/home/admin/'

/**
*
* Watch directory for new files.
* Ignores hidden and pre-existing files,
* and waits for complete files before reporting.
*
*/
var watchOptions = {ignored: /[\/\\]\./, persistent: true, ignoreInitial:true, awaitWriteFinish: true};

chokidar.watch(WATCH_DIRECTORY, watchOptions).on('add', function(filePath) {

  console.log('New file ready:', filePath);

  // TODO - Send to server

});

console.log('Watching directory:', WATCH_DIRECTORY);

/**
*
* Copy file to server
*
*/

function copyFileToServer(filePath) {

  console.log('Attempting copy file to server');

  client.scp(filePath, 'admin:password@example.com:/home/admin/', function(err) {

    if (err) {
      console.log('SCP Error:');
      console.log(err);
    } else {
      console.log('Successfully copied ' + filePath + ' to ' + TARGET_DIRECTORY);
    }

  });

}
