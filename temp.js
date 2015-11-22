
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
