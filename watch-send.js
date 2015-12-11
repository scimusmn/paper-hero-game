var chokidar = require('chokidar'); // Directory observer.
var scp = require('scp');

var WATCH_DIRECTORY = './public/scans/';

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

  // Copy file up to server
  scp.send({

    file: filePath,
    user: 'root',
    host: 'play.smm.org',
    path: '/home/mine/paper-game/public/scans/',

  }, function(err) {

    if (err) {
      console.log(err);
    } else {
      console.log('File successfully copied!');
    }
  });

});

console.log('Watching directory:', WATCH_DIRECTORY);

