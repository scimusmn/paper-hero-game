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

var WATCH_DIRECTORY = '';
var TARGET_DIRECTORY = ''; // Example: 'admin:password@example.com:/home/admin/'

/**
*
* Watch directory for new files.
* Ignores hidden and pre-existing files,
* and waits for complete files before reporting.
*
*/
var watchOptions = {ignored: /[\/\\]\./, persistent: true, ignoreInitial:true, awaitWriteFinish: true};

chokidar.watch(directoryPath, watchOptions).on('add', function(path) {

  console.log('New file ready:', path);

  // TODO - Send to server

});

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
