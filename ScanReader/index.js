/**
*
* ScanReader.js
* tnordberg@smm.org
*
*/

var fs = require('fs');// FileSystem
var path = require('path');
var gm = require('gm').subClass({imageMagick: true}); // GraphicMagick/ImageMagick
var jsonfile = require('jsonfile');
var chokidar = require('chokidar'); // Directory observer.

var TYPE_ART = 'art';
var TYPE_STITCH = 'stitch';
var TYPE_FILL = 'fill';

var outputPath = './output/';
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
exports.setOutputDirectory = function(path) {

  outputPath = path;

};

/**
*
* Watch directory for new image files (from scanner)
*
* Ignores hidden and pre-existing files,
* and waits for complete files before reporting.
*
*/
exports.watchDirectoryForScans = function(directoryPath, digestionCallback) {

  var watchOptions = {ignored: /[\/\\]\./, persistent: true, ignoreInitial:true, awaitWriteFinish: true};
  var _this = this;

  chokidar.watch(directoryPath, watchOptions).on('add', function(path) {

    console.log('Scan ready:', path);

    _this.digest(path, digestionCallback);

  });

};


/**
*
* Load Regions
*
* Parse JSON for all expected
* regions in incoming scans
*
*/
exports.loadRegions = function(jsonPath) {

  var _this = this;

  jsonfile.readFile(jsonPath, function(err, regions) {

    if (err) {

      console.log('No regions json found at: ' + jsonPath);
      throw err;

    } else {

      for (var key in regions) {

        if (regions.hasOwnProperty(key)) {

          var e = regions[key];

          switch (e.type){

            case TYPE_ART:

              _this.expectArt(key, e);

              break;
            case TYPE_FILL:

              _this.expectFillBox(key, e);

              break;
            case TYPE_STITCH:

              _this.expectStitch(key, e);

              break;
            default:

              console.log('Warning - Unrecognized type:', e.type);

              break;

          }

        }

      }

    }

  });

};

/**
*
* Expect Art in specified region.
*
* Trim whitespace and return png.
*
*/
exports.expectArt = function(id, region) {

  if (region.trim === undefined || region.trim === null) {
    region.trim = false;
  }

  if (region.transparent === undefined || region.transparent === null) {
    region.transparent = true;
  }

  if (region.exportScale === undefined || region.exportScale === null) {
    region.exportScale = '100%';
  }

  region.id = id;
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
exports.expectStitch = function(id, region) {

  if (region.exportScale === undefined || region.exportScale === null) {
    region.exportScale = '100%';
  }

  region.id = id;
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
exports.expectFillBox = function(id, region) {

  if (region.cols === undefined || region.cols === null) {
    region.cols = 1;
  }

  if (region.rows === undefined || region.rows === null) {
    region.rows = 1;
  }

  if (region.cols === 1 && region.rows === 1) {

    region.id = id;
    expected.push(region);

  } else {

    var colWidth = region.w / region.cols;
    var rowHeight = region.h / region.rows;
    var index = 0;

    for (var r = 0; r < region.rows; r++) {
      for (var c = 0; c < region.cols; c++) {

        // Trick to clone simple JS object.
        var cellRegion = (JSON.parse(JSON.stringify(region)));

        cellRegion.id = FGRIDKEY + '_' + id + '_' + index;
        cellRegion.x = region.x + (c * colWidth);
        cellRegion.y = region.y + (r * rowHeight);
        cellRegion.w = colWidth;
        cellRegion.h = rowHeight;

        expected.push(cellRegion);

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
exports.digest = function(srcPath, completeCallback, skipDebug) {

  // Create output directory if non-existant
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  digestPath = outputPath + Date.now() + '/';

  // Make fresh directory using timestamp
  if (!fs.existsSync(digestPath)) {
    fs.mkdirSync(digestPath);
  }

  // Create filepath for image.
  var prepPath = digestPath + 'scan-prepared.png';

  // Prep scan image as a whole.
  gm(srcPath)
    .whiteThreshold('95%') // Make near-whites white
    .blackThreshold('5%') // Make near-blacks black
    .trim() // Remove black scan border
    .out('+repage') // Recalculate virtual canvas math
    .write(prepPath, function(err) {

      if (err) {

        throw err;

      } else {

        console.log('Scan prepared:', prepPath);

        // Process the goods
        processRegions(prepPath, completeCallback);

        // Export debug image
        if (!skipDebug || skipDebug === false) {
          outputDebug(prepPath, function(debugPath) {
            console.log('Debug prepared: ' + debugPath);
          });
        }

      }
    });

};

/**
*
* Process Regions
* Cut out and process art and fill-boxes.
*
*/
var processRegions = function(imgPath, completeCallback) {

  numProcesses = expected.length;
  results = {};
  resultsCallback = completeCallback;

  processNextRegion(imgPath);

};

/**
*
* Process next region
*
*/
var processNextRegion = function(imgPath) {

  var e = expected[expected.length - numProcesses];

  if (e.type === TYPE_ART) {

    var outPath = digestPath + e.id + '.png';

    getArt(imgPath, outPath, e, processComplete);

  } else if (e.type === TYPE_FILL) {

    // Scale down to a 1x1 pixel,
    // averaging all color data.
    gm(imgPath)
      .crop(e.w, e.h, e.x, e.y)
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
    e.stitchCount = e.rectArray.length;
    for (var i = 0; i < e.rectArray.length; i++) {

      var ltrPath = digestPath + e.id + '_' + i + '.png';

      var r = e.rectArray[i];

      gm(imgPath)
        .crop(r.w, r.h, r.x, r.y)
        .whiteThreshold('90%') // Make near-whites white
        .transparent('#ffffff')
        .out('-adaptive-resize')
        .out(e.exportScale)
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

/**
*
* Get art from region
*
*/
var getArt = function(srcPath, outPath, region, callback) {

  var e = region;

  var artImg = gm(srcPath);

  // Crop source image to specified region
  artImg.crop(e.w, e.h, e.x, e.y);

  // Remove empty white border
  if (e.trim === true) {

    artImg.trim();

  }

  // Make white pixels transparent
  if (e.transparent === true) {

    artImg.transparent('#ffffff');

  }

  artImg.out('-adaptive-resize');
  artImg.out(e.exportScale);

  // NOTE - We're using 'adaptive-resize' because
  // I don't like the muddiness that results
  // from using default resize.
  // artImg.resize(e.exportScale);

  artImg.write(outPath, function(err) {
    if (err) {
      throw err;
    } else {
      callback(e.id, outPath, srcPath);
    }
  });

};

/**
*
* Stitch section ready
*
*/
var stitchSectionReady = function(region, imgPath) {

  region.stitchCount--;

  if (region.stitchCount <= 0) {

    appendStitchImages(region, imgPath);

  }

};

/**
*
* Append stitch images
*
*/
var appendStitchImages = function(region, imgPath) {

  var concatPath = digestPath + region.id + '.png';

  var ltrs = [];
  for (var i = 0; i < region.rectArray.length; i++) {

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

          // Do final trim to cut off empty stitch slots.
          // TODO - this could be an optional 'trim' param passed in.
          gm(concatPath)
            .trim()
              .write(concatPath, function(err) {

                processComplete(region.id, concatPath, imgPath);

              });
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

/**
*
* Clean Results
*
* Post-processing of results
* before sending off.
*
*/
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
var outputDebug = function(srcPath, completeCallback) {

  // Filepath for generated debug image.
  var debugPath = digestPath + path.basename(srcPath, path.extname(srcPath)) + '-debug.png';

  // Loop through expected regions to create
  // draw command for imagemagick.
  var drawArgs = '';
  for (var i = 0; i < expected.length; i++) {

    var e = expected[i];
    var color = '';

    if (e.type === TYPE_ART) {

      // Art = red
      color = 'rgba(255,0,0,0.3)';

    } else if (e.type === TYPE_FILL) {

      // Fillbox = purple
      color = 'rgba(255,0,255,0.3)';

    } else if (e.type === TYPE_STITCH) {

      // Stitch = green
      color = 'rgba(0,180,0,0.5)';
      for (var s = 0; s < e.rectArray.length; s++) {

        var stitchRect = e.rectArray[s];

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
    drawArgs += ' fill ' + color + ' rectangle ' + e.x + ',' + e.y + ',' + (e.x + e.w) + ',' + (e.y + e.h);

    // Label
    drawArgs += ' fill black text ' + e.x + ',' + e.y + ' ' + e.id + '';

  }

  // Do drawing then save.
  gm(srcPath)
    .draw(drawArgs)
    .write(debugPath, function(err) {
      if (err) {
        throw err;
      } else {
        completeCallback(debugPath);
      }
    });

};

