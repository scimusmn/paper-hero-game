var chokidar = require('chokidar'); // Directory observer.
var client = require('scp2');

var WATCH_DIRECTORY = './public/scans/';
var TARGET_DIRECTORY = 'root@play.smm.org:/home/mine/paper-game/scans/'; // Example: 'admin:password@example.com:/home/admin/'

/**
*
* Watch directory for new files.
* Ignores hidden and pre-existing files,
* Wait for complete file before reporting.
*
*/
var watchOptions = {ignored: /[\/\\]\./, persistent: true, ignoreInitial:true, awaitWriteFinish: true};

chokidar.watch(WATCH_DIRECTORY, watchOptions).on('add', function(filePath) {

  console.log('New file ready:', filePath);

  copyFileToServer(filePath);

});

console.log('Watching directory:', WATCH_DIRECTORY);

/**
*
* Copy file to server
*
*/

function copyFileToServer(filePath) {

  console.log('Attempting copy file to server...');

  client.scp(filePath, TARGET_DIRECTORY, function(err) {

    if (err) {
      console.log('SCP Error:');
      console.log(err);
    } else {
      console.log('Successfully copied ' + filePath + ' to ' + TARGET_DIRECTORY);
    }

  });

}
