var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http, {path: '/smash/socket.io'});
var path = require('path');
var uaParser = require('ua-parser');
var Puid = require('puid');
var puid = new Puid(true);
var profanity = require('profanity-util');

var CLIENT_CONTROLLER = 'cid_controller'; // Must match client id from controller.html
var CLIENT_SHARED_SCREEN = 'cid_shared_screen'; // Must match client id from game.html
var CLIENT_PRESENTER_SCREEN = 'cid_presenter_screen'; // Must match client id from presenter.html
var DEVICE_STORAGE_KEY = 'smm_player_data'; // Must match key on controller.html

var clients = {};
var sharedScreenSID;
var presenterScreenSID;
var sharedScreenConnected = false;
var presenterScreenConnected = false;

var portNumber = 3000;
var controllerPath = '/Controller.html';
var presenterPath = '/Presenter.html';
var bigGamePath = '/Game.html';
var characterManifest = {};

app.set('port', portNumber);
app.use('/smash/', express.static(path.join(__dirname, 'public')));
app.use('/smash/', express.static(path.join(__dirname, '../public')));

// Serve controller
app.get('/smash/', function(request, response) {

  var userAgent = request.headers['user-agent'];
  var ua = uaParser.parseUA(userAgent).toString();// -> "Safari 5.0.1"
  var os = uaParser.parseOS(userAgent).toString();// -> "iOS 5.1"
  var device = uaParser.parseDevice(userAgent).toString();// -> "iPhone"

  console.log('Serving controller.html to: ', device, ' running ', ua, ' on ', os);

  response.sendFile(__dirname + controllerPath);

});

// Serve presenter screen
app.get('/smash/presenter/', function(request, response) {

  console.log('Serving Presenter.html');
  response.sendFile(__dirname + presenterPath);

});

// Serve big game screen
app.get('/smash/screen/', function(request, response) {

  console.log('Serving screen.html');
  response.sendFile(__dirname + bigGamePath);

});

// Socket.io connections
io.on('connection', function(socket) {

  // Variables unique to this client
  var userid;
  var socketid;
  var usertype;
  var nickname;
  var usercolor;
  var assetPath;

  console.log('User has connected. Connection:', socket.request.connection._peername);

  // User registered
  socket.on('register', function(data) {

    console.log('User has registered:', data.usertype, data.nickname, data.userid);

    socketid = socket.id;
    usertype = data.usertype;
    nickname = purify(data.nickname);
    usercolor = data.usercolor;

    // Check input-code for matches in character manifest
    assetPath = lookupCharacterManifest(data.nickname);

    if (usertype == CLIENT_SHARED_SCREEN) {

      sharedScreenSID = socket.id;
      sharedScreenConnected = true;

    } else if (usertype == CLIENT_PRESENTER_SCREEN) {

      presenterScreenSID = socket.id;
      presenterScreenConnected = true;

    } else if (usertype == CLIENT_CONTROLLER && sharedScreenConnected) {

      /**
       * If returning user, use
       * existing userid found on
       * device. If new user, perfom
       * initial data store to device
       * using generated unique id.
       */
      if (data.firstTime === false) {
        // Returning user
        userid = data.userid;
        /**
         * Ensure no other clients
         * have the same userid. If
         * they do, it's most likely
         * two tabs open on the same
         * browser/device, so we disconnect
         * the previous connection.
         */
        console.log('registered returning user ' + userid);
        var prevConnected = clients[userid];

        if (prevConnected && prevConnected !== socket.id) {

          console.log('Disconnecting redundant user socket: ' + clients[userid]);

          prevConnected.emit('alert-message', {message: 'Whoops you disconnected! Reload to play.'});

          clients[userid].disconnect();
          delete clients[userid];
        }

      } else {

        console.log('registered first time' + userid);

        // New user
        userid = puid.generate();
        var userData = newUserData();
        socket.emit('store-local-data', {key: DEVICE_STORAGE_KEY, dataString: userData});

      }

      // Track clients' sockets so we can ensure only one socket per device.
      clients[userid] = socket;

      console.log('Send new player:');

      // Alert shared screen of new player
      io.sockets.connected[sharedScreenSID].emit('add-player', {  nickname: nickname,
                                                                  userid: userid,
                                                                  socketid: socketid,
                                                                  usercolor: usercolor,
                                                                  assetPath: assetPath,
                                                              });

    }

  });

  // User disconnected
  socket.on('disconnect', function() {

    console.log('User has disconnected:', usertype, nickname, userid);

    if (usertype == CLIENT_CONTROLLER && sharedScreenConnected) {

      io.sockets.connected[sharedScreenSID].emit('remove-player', {   nickname:nickname,
                                                                      userid:userid,
                                                                  });

    } else if (usertype == CLIENT_SHARED_SCREEN) {

      sharedScreenConnected = false;

    } else if (usertype == CLIENT_PRESENTER_SCREEN) {

      presenterScreenConnected = false;

    }

    // Stop tracking this socket
    delete clients[userid];

  });

  // Force specific client to disconnect
  socket.on('force-disconnect', function(data) {

    if (!sharedScreenConnected) return;

    io.sockets.connected[sharedScreenSID].emit('remove-player', {   nickname:'idlePlayer',
                                                                    userid:data.userid,
                                                                });

    // Stop tracking this socket
    delete clients[data.userid];

  });

  // Controller vector update
  socket.on('control-vector', function(data) {

    if (!sharedScreenConnected) return;
    data.userid = userid;
    io.sockets.connected[sharedScreenSID].emit('control-vector', data);

  });

  // Controller tap
  socket.on('control-tap', function(data) {
    if (!sharedScreenConnected) return;
    data.userid = userid;
    io.sockets.connected[sharedScreenSID].emit('control-tap', data);

  });

  // Forward events to specific controllers
  socket.on('controller-event', function(data) {

    // TODO - This line errors sometimes so it's wrapped
    // in a conditional. Should deal with why it errors, and
    // it is likely happening when the game is trying to send
    // a 'game over' or some similar event back to user's controllers
    // but they have disconnected for some reason....
    // TypeError: Cannot call method 'emit' of undefined
    if (io.sockets.connected[data.socketid] && io.sockets.connected[data.socketid] !== undefined) {
      io.sockets.connected[data.socketid].emit('controller-event', data);
    } else {
      console.log('Warning - Controller event - Attempting to call emit on undefined socket.', data.socketid);
    }

  });

  function purify(nameStr) {

    // Check string is not empty or full of spaces
    if (/\S/.test(nameStr) && nameStr !== undefined) {
      nameStr = profanity.purify(nameStr, { replace: 'true', replacementsList: ['PottyMouth', 'GutterMind', 'Turdington', 'DullMind', 'Blue'] })[0];
    } else {
      nameStr = 'Hero_' + Math.round(Math.random() * 999);
    }

    return nameStr;
  }

  function newUserData() {

    var dataObj = { userid: userid,
                    nickname: nickname,
                    usercolor: usercolor,
                    };

    return JSON.stringify(dataObj);

  }

  function lookupCharacterManifest(characterId) {

    console.log('lookupCharacterManifest', characterId);

    var assetPath = ''; // Default asset path.

    if (characterId in characterManifest) {

      var data = characterManifest[characterId];
      assetPath = data.assetPath;
      console.log('found~', assetPath);

    } else {
      console.log('NOT found~', assetPath);

      // TODO - display warning message? ("Character not found")
    }

    return assetPath;
  }

});

// Listen for http requests on port <portNumber>
http.listen(portNumber, function() {

  console.log('BigGame - Listening to Node server on port ' + portNumber + '...');

});

/**
*
* Exported functions
*
*/
exports.updateCharacterManifest = function(manifest) {

  characterManifest = manifest;

};

exports.addPlayableCharacter = function(characterId, characterData) {

  console.log('\n**** NEW CHARACTER AVAILABLE! *****');
  console.log('**** Enter code "' + characterId + '" to use. ****');
  console.log('***********************************');

  if (!presenterScreenConnected) return;

  io.sockets.connected[presenterScreenSID].emit('present-character', {  characterId: characterId,
                                                                        characterData: characterData,
                                                                      });

};

