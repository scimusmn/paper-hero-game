
// reader.expectFillBox('box_1', 180, 1383, 60, 60);
// reader.expectFillBox('box_2', 240, 1383, 60, 60);

// reader.expectText('name', 127, 124, 1030, 103);

var nameArr = [];
for (var i = 0; i < 11; i++) {
  nameArr.push({x:130 + (94.5 * i), y:124, w:82, h:98});

  // reader.expectText('nn_'+i, 130 + (94.5 * i), 124, 82, 98);
};

reader.expectConcatText('name', nameArr);

// reader.expectFillBox('step1', 130, 1330, 170, 170);










//////////CONCATN TEXT PROCEESSS

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