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
var TYPE_FILL = 'fill';

var outputPath = '.';
var expected = [];
var results = {};
var resultsCallback = {};
var numProcesses = -1;

/**
*
* Set output path where art is saved.
*
*/
exports.setOutputPath = function(path) {

  outputPath = path;

  // TODO - setup new directory for this batch
  // var baseName = path.basename(imgPath, path.extname(imgPath));
  // var dirPath = outputPath + baseName;
  // if (!fs.existsSync(dirPath)) {
  //   fs.mkdirSync(dirPath);
  // }

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
* Expect Concat Text.
*
* Pass in array of rects,
* Stitch them together into
* single image then parse for OCR.
*
*/
exports.expectConcatText = function(id, rectArray) {

  var region = {    id: id,
                    type: 'concat_text',
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
* the box will be split into an array
* of fillable boxes, and you will be
* returned an array of indices representing
* all filled boxes. Pretty cool, eh?
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

        var region = {    id: 'F^G_' + id + '_' + index,
                          type: TYPE_FILL,
                          rect: {x:x + (c * colWidth), y:y + (r * rowHeight), w:colWidth, h:rowHeight},
                        };

        expected.push(region);

        index ++;

      };
    };

  }

};

/**
*
* Digest
* Process image for expected art and text.
*
*/
exports.digest = function(imgPath, completeCallback) {

  // Create filepath for image.
  var prepPath = outputPath + path.basename(imgPath, path.extname(imgPath)) + '-prepared.png';

  // Prep scan image as a whole.
  gm(imgPath)
    .whiteThreshold('95%') // Make near whites white
    .blackThreshold('5%') // Make near blacks black
    .trim() // Remove black scan border
    .write(prepPath, function(err) {
      if (err) {
        throw err;
      } else {
        console.log('Scan prepared:', prepPath);
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

    var txtPath = outputPath + e.id + '.png';

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

    var artPath = outputPath + e.id + '.png';

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

    gm(imgPath)
      .crop(e.rect.w, e.rect.h, e.rect.x, e.rect.y)
      .shave(10, 10, 10)
      .scale(1, 1)
      .toBuffer('PNG', function(err, buffer) {

        if (err) {
          throw err;
        } else {
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

  } else if (e.type === 'concat_text') {

    // ---> Create seperate letter images
    for (var i = 0; i < e.rect.length; i++) {

      var ltrPath = outputPath + e.id + '_' + i + '.png';

      var r = e.rect[i];

      gm(imgPath)
        .crop(r.w, r.h, r.x, r.y)
        .write(ltrPath, function(err) {
          if (err) {
            throw err;
          } else {

          }
        });

    };

    // ---> Stitch into single image
    setTimeout(function() {

      var concatPath = outputPath + e.id + '-concat.png';

      var ltrs = [];
      for (var i = 0; i < e.rect.length; i++) {

        ltrs.push(outputPath + e.id + '_' + i + '.png');

      };

      gm(ltrs[0])
        .append(ltrs[1], ltrs[2], ltrs[3], ltrs[4], ltrs[5], ltrs[6], ltrs[7], ltrs[8], ltrs[9], ltrs[10], true)
        .write(concatPath, function(err) {
          if (err) return console.dir(arguments);
          console.log(this.outname + ' created  ::  ' + arguments[3]);
        });

    }, 2000);

    // ---> Read stitched image w OCR
    setTimeout(function() {

      var concatPath = outputPath + e.id + '-concat.png';
      tesseract.process(concatPath, function(err, text) {
        if (err) {
          throw err;
        } else {
          console.log('OCR success= ' + text);
          processComplete(e.id, text, imgPath);
        }
      });

    }, 4000);

  }

};

/**
*
* Process Complete
* All processes end here...
*
*/
var processComplete = function(id, result, srcPath) {

  // console.log('processComplete', id, result, srcPath);

  results[id] = result;

  numProcesses--;

  if (numProcesses <= 0) {

    results = cleanUpResults(results);

    resultsCallback(results);

  } else {

    processNextRegion(srcPath);

  }

};

var cleanUpResults = function(dirtyResults) {

  var cleanResults = {};

  for (var property in dirtyResults) {
    if (dirtyResults.hasOwnProperty(property)) {

      // Combine fill-grid results into single result array
      if (property.indexOf('F^G') !== -1) {

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

}

/**
*
* Output Debug
* Export highlighted debug image.
*
*/
exports.outputDebug = function(imgPath, completeCallback) {

  // Create filepath for debug image.
  var debugPath = outputPath + path.basename(imgPath, path.extname(imgPath)) + '-debug.png';

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

    }

    if (color === '') continue;

    // Rectangle
    drawArgs += ' fill ' + color + ' rectangle ' + e.rect.x + ',' + e.rect.y + ',' + (e.rect.x + e.rect.w) + ',' + (e.rect.y + e.rect.h);

    // Label
    drawArgs += ' fill white text ' + (e.rect.x + 5) + ',' + (e.rect.y + 15) + ' ' + e.id + '';

  }

  // Do drawing then save.
  gm(imgPath)
    .whiteThreshold('95%') // Make near whites white
    .blackThreshold('5%') // Make near blacks black
    .trim() // Remove black scan border
    .draw(drawArgs)
    .write(debugPath, function(err) {
      if (err) {
        throw err;
      } else {
        completeCallback(debugPath);
      }
    });

};

