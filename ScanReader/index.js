/**
*
* ScanReader.js
*
* tnordberg@smm.org
*
*/

var fs = require('fs');// FileSystem
var path = require('path');
var gm = require('gm').subClass({imageMagick: true}); // GraphicMagick/ImageMagick
var tesseract = require('node-tesseract');// Tesseract (for OCR)

var TYPE_TEXT = 'text';
var TYPE_ART = 'art';
var TYPE_STITCH = 'stitch';
var TYPE_FILL = 'fill';

var outputPath = '.';
var digestPath = '';
var expected = [];
var results = {};
var resultsCallback = {};
var numProcesses = -1;
var FGRIDKEY = 'F^G';

/**
*
* Set output path where art is saved.
*
*/
exports.setOutputPath = function(path) {

  outputPath = path;

};

/**
*
* Expect Art in specified region.
*
* Trim whitespace and return png.
*
*/
exports.expectArt = function(id, x, y, w, h, _trim, _transparent) {

  var trim = _trim || false;
  var transparent = _transparent || false;

  var region = {    id: id,
                    type: TYPE_ART,
                    rect: {x:x, y:y, w:w, h:h},
                    options: {trim:trim, tranparent:transparent},
                  };

  expected.push(region);

};

/**
*
* Expect Text in specified region.
*
*/
exports.expectText = function(id, x, y, w, h) {

  var region = {    id: id,
                    type: TYPE_TEXT,
                    rect: {x:x, y:y, w:w, h:h},
                  };

  expected.push(region);

};

/**
*
* Expect Stitch.
*
* Pass in array of rects,
* Stitch them together into
* single image.
*
*/
exports.expectStitch = function(id, rectArray) {

  var region = {    id: id,
                    type: TYPE_STITCH,
                    rect: rectArray,
                  };

  expected.push(region);

};

/**
*
* Expect Fillable Box in specified region.
*
* A single box will return a boolean.
* If you provide columns and rows,
* the box will be split into a grid
* and you will returned an array of booleans.
*
*/
exports.expectFillBox = function(id, x, y, w, h, _cols, _rows) {

  var cols = _cols || 1;
  var rows = _rows || 1;

  if (cols === 1 && rows === 1) {

    var region = {    id: id,
                      type: TYPE_FILL,
                      rect: {x:x, y:y, w:w, h:h},
                    };

    expected.push(region);

  } else {

    var colWidth = w / cols;
    var rowHeight = h / rows;
    var index = 0;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {

        var region = {    id: FGRIDKEY + '_' + id + '_' + index,
                          type: TYPE_FILL,
                          rect: {x:x + (c * colWidth), y:y + (r * rowHeight), w:colWidth, h:rowHeight},
                        };

        expected.push(region);

        index++;

      };
    };

  }

};

/**
*
* Digest
*
* Process new image for all
* expected regions.
*
*/
exports.digest = function(imgPath, completeCallback, _debug) {

  digestPath = outputPath + Date.now() + '/';

  // Make fresh directory using timestamp
  if (!fs.existsSync(digestPath)) {
    fs.mkdirSync(digestPath);
  }

  // Create filepath for image.
  var prepPath = digestPath + 'scan-prepared.png';

  // Prep scan image as a whole.
  gm(imgPath)
    .whiteThreshold('95%') // Make near-whites white
    .blackThreshold('5%') // Make near-blacks black
    .trim() // Remove black scan border
    .write(prepPath, function(err) {
      if (err) {
        throw err;
      } else {

        console.log('Scan prepared:', prepPath);

        // Export debug image
        if (_debug && _debug === true) {
          outputDebug(prepPath, function(debugPath) {
            console.log('Debug prepared: ' + debugPath);
          });
        }

        // Process the goods
        processRegions(prepPath, completeCallback);

      }
    });

};

/**
*
* Process Regions
* Cut out and process art, text, and fill-boxes.
*
*/
var processRegions = function(imgPath, completeCallback) {

  numProcesses = expected.length;
  results = {};
  resultsCallback = completeCallback;

  processNextRegion(imgPath);

};

var processNextRegion = function(imgPath) {

  var e = expected[expected.length - numProcesses];

  if (e.type === TYPE_TEXT) {

    var txtPath = digestPath + e.id + '.png';

    gm(imgPath)
      .crop(e.rect.w, e.rect.h, e.rect.x, e.rect.y)
      .write(txtPath, function(err) {
        if (err) {
          throw err;
        } else {

          console.log('Attempting OCR...');
          tesseract.process(txtPath, function(err, text) {
            if (err) {
              throw err;
            } else {
              console.log('OCR success= ' + text);
              processComplete(e.id, text, imgPath);
            }
          });

        }
      });

  } else if (e.type === TYPE_ART) {

    var artPath = digestPath + e.id + '.png';

    gm(imgPath)
      .crop(e.rect.w, e.rect.h, e.rect.x, e.rect.y)
      .trim() // Remove empty white border
      .transparent('#ffffff') // Make white pixels transparent
      .write(artPath, function(err) {
        if (err) {
          throw err;
        } else {
          processComplete(e.id, artPath, imgPath);
        }
      });

  } else if (e.type === TYPE_FILL) {

    // Scale down region to a 1x1 pixel,
    // which auto-averages color data.
    gm(imgPath)
      .crop(e.rect.w, e.rect.h, e.rect.x, e.rect.y)
      .shave(10, 10, 10)
      .scale(1, 1)
      .toBuffer('PNG', function(err, buffer) {

        if (err) {
          throw err;
        } else {

          // Separate color data into RGB
          gm(buffer)
            .identify('%[fx:int(255*r+.5)],%[fx:int(255*g+.5)],%[fx:int(255*b+.5)]', function(err, info) {
              if (err) {
                throw err;
              } else {

                // If all three colors are above 80% whiteness
                // assume the square has not been filled.
                var rgb = info.split(','); // 'rrr,ggg,bbb' -> [r, g, b]
                var isFilled;
                if (rgb[0] > 200 && rgb[1] > 200 && rgb[2] > 200) {
                  isFilled = false;
                } else {
                  isFilled = true;
                }

                processComplete(e.id, isFilled, imgPath);

              }
            });
        }

      });

  } else if (e.type === TYPE_STITCH) {

    // Create seperate images
    e.stitchCount = e.rect.length;
    for (var i = 0; i < e.rect.length; i++) {

      var ltrPath = digestPath + e.id + '_' + i + '.png';

      var r = e.rect[i];

      gm(imgPath)
        .crop(r.w, r.h, r.x, r.y)
        .write(ltrPath, function(err) {
          if (err) {
            throw err;
          } else {

            stitchSectionReady(e, imgPath);

          }

        });

    };

  }

};

var stitchSectionReady = function(region, imgPath) {

  region.stitchCount--;

  if (region.stitchCount <= 0) {

    appendStitchImages(region, imgPath);

  }

};

var appendStitchImages = function(region, imgPath) {

  var concatPath = digestPath + region.id + '-stitched.png';

  var ltrs = [];
  for (var i = 0; i < region.rect.length; i++) {

    var ltrPath = digestPath + region.id + '_' + i + '.png';
    ltrs.push(ltrPath);

  };

  // Append all stitch images horizontally
  var appendImg = gm(ltrs[0]);
  appendImg.append.apply(appendImg, ltrs.slice(1, ltrs.length))
    .append(true)
      .write(concatPath, function(err) {
        if (err) {

          return console.dir(arguments);

        }else {

          processComplete(region.id, concatPath, imgPath);

        }
      });

};

/**
*
* Process Complete
*
* Call this after each process completes.
*
*/
var processComplete = function(id, result, srcPath) {

  results[id] = result;

  numProcesses--;

  if (numProcesses <= 0) {

    results = cleanResults(results);

    resultsCallback(results);

  } else {

    processNextRegion(srcPath);

  }

};

var cleanResults = function(dirtyResults) {

  var cleanResults = {};

  for (var property in dirtyResults) {
    if (dirtyResults.hasOwnProperty(property)) {

      // Combine fill-grid results into single result array
      if (property.indexOf(FGRIDKEY) !== -1) {

        // Concat grid results
        var split = property.split('_');
        var gridGroup = split[0];
        var id = split[1];
        var index = split[2];
        var isFilled = dirtyResults[property];

        if (!(id in cleanResults)) {
          cleanResults[id] = [];
        }

        // Insert into array based off original index
        cleanResults[id][index] = isFilled;

      } else {

        // Nothing special needs to be
        // done, just copy back into results
        cleanResults[property] = dirtyResults[property];

      }

    }
  }

  return cleanResults;

};

/**
*
* Output Debug
* Export highlighted debug image.
*
*/
var outputDebug = function(imgPath, completeCallback) {

  // Create filepath for debug image.
  var debugPath = digestPath + path.basename(imgPath, path.extname(imgPath)) + '-debug.png';

  // Loop through expected regions to create
  // draw command for imagemagick.
  var drawArgs = '';
  for (var i = 0; i < expected.length; i++) {

    var e = expected[i];
    var color = '';

    if (e.type === TYPE_TEXT) {

      // Text = blue
      color = 'rgba(0,0,255,0.3)';

    } else if (e.type === TYPE_ART) {

      // Art = red
      color = 'rgba(255,0,0,0.3)';

    } else if (e.type === TYPE_FILL) {

      // Fillbox = purple
      color = 'rgba(255,0,255,0.3)';

    } else if (e.type === TYPE_STITCH) {

      // Stitch = green
      color = 'rgba(0,180,0,0.5)';
      for (var s = 0; s < e.rect.length; s++) {

        var stitchRect = e.rect[s];

        // Stitch Rectangle
        drawArgs += ' fill ' + color + ' rectangle ' + stitchRect.x + ',' + stitchRect.y + ',' + (stitchRect.x + stitchRect.w) + ',' + (stitchRect.y + stitchRect.h);

        // Stitch Label
        drawArgs += ' fill white text ' + (stitchRect.x + 5) + ',' + (stitchRect.y + 15) + ' ' + e.id + '_' + s;

      };

      // Skip normal drawing
      continue;

    }

    if (color === '') continue;

    // Rectangle
    drawArgs += ' fill ' + color + ' rectangle ' + e.rect.x + ',' + e.rect.y + ',' + (e.rect.x + e.rect.w) + ',' + (e.rect.y + e.rect.h);

    // Label
    drawArgs += ' fill white text ' + (e.rect.x + 5) + ',' + (e.rect.y + 15) + ' ' + e.id + '';

  }

  // Do drawing then save.
  gm(imgPath)
    .draw(drawArgs)
    .write(debugPath, function(err) {
      if (err) {
        throw err;
      } else {
        completeCallback(debugPath);
      }
    });

};

