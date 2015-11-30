function VectorTouchController(socket) {

    var angle;
    var dist;
    var magnitude;
    var screenWidth = parseInt($("body").width());
    var screenHeight = parseInt($("body").height());
    var centerX = parseInt(screenWidth/2);
    var centerY = parseInt(screenHeight/2);
    var shortest = Math.min(centerX, centerY);
    var mouseIsDown = false;

    //Setup canvas drawing
    var ctx = document.getElementById('canvas').getContext('2d');
    $("#canvas").attr('width', screenWidth);
    $("#canvas").attr('height', screenHeight);

    this.enable = function(){

        document.addEventListener( 'mousedown', mousedown, false );
        document.addEventListener( 'mousemove', mousemove, false );
        document.addEventListener( 'mouseup', mouseup, false );

        document.addEventListener( 'touchstart', touchEvent, false );
        document.addEventListener( 'touchend', touchEvent, false );
        document.addEventListener( 'touchcancel', touchEvent, false );
        document.addEventListener( 'touchmove', touchEvent, false );

    };

    this.disable = function(){

        document.removeEventListener( 'mousedown', mousedown, false );
        document.removeEventListener( 'mousemove', mousemove, false );
        document.removeEventListener( 'mouseup', mouseup, false );

        document.removeEventListener( 'touchstart', touchEvent, false );
        document.removeEventListener( 'touchend', touchEvent, false );
        document.removeEventListener( 'touchcancel', touchEvent, false );
        document.removeEventListener( 'touchmove', touchEvent, false );

    };

    function mousedown (event) {

        mouseIsDown = true;
        inputStart(event.pageX, event.pageY);

    }

    function mousemove (event) {

        if (mouseIsDown === true) {
            inputMove(event.pageX, event.pageY);
        }

    }

    function mouseup (event) {

        mouseIsDown = false;
        inputUp();

    }

    function touchEvent ( event ) {

        if (event.type == 'touchmove') {

            inputMove(event.touches[0].pageX, event.touches[0].pageY);

        } else if ( event.type == 'touchstart' ) {

            inputStart(event.touches[0].pageX, event.touches[0].pageY);

        } else if ( event.touches.length === 0 ) {

            inputUp();

        }

        // event.preventDefault();
        // event.stopPropagation();

    }

    function inputStart(inputX, inputY){

        centerX = inputX;
        centerY = inputY;
        clearCanvas();

    }

    function inputMove(inputX, inputY) {

        //Angle from center of screen
        angle = Math.atan2(inputY - centerY, inputX - centerX);

        //Distance from center in pixels
        var ix = inputX;
        var iy = inputY;
        dist = Math.sqrt( (ix -= centerX) * ix + (iy -= centerY) * iy );

        //Normalized magnitude (0-1) based on shortest screen side.
        magnitude = map(dist, 0, shortest, 0, 1);

        //Dispatch updated control vector
        socket.emit('control-vector', {     'angle': angle.toFixed(4),
                                            'magnitude': magnitude.toFixed(4)
                                        });
        //Draw UI
        drawUI(inputX, inputY);

    }

    function inputUp() {

        if (magnitude === 0) {

          //Touch never moved. Was tap.
          socket.emit('control-tap', {});

        } else {

          //Touch finished. Set vectors to 0;
          socket.emit('control-vector', {   'angle': 0,
                                            'magnitude': 0
                                        });
          magnitude = angle = 0;

        }

        clearCanvas();

    }

    //Canvas drawing
    function drawUI(tx,ty) {

        clearCanvas();

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(tx, ty, 3);
        ctx.strokeStyle = '#ccc';
        ctx.stroke();

        //Ring around center/origin
        ctx.beginPath();
        ctx.arc(centerX,centerY,8,0,2*Math.PI);
        ctx.stroke();

        //Ring around touch point
        ctx.beginPath();
        ctx.arc(tx,ty,8,0,2*Math.PI);
        ctx.stroke();

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(angle);
        var fingyOffset = 95;

        ctx.fillStyle = "#bbb";
        ctx.beginPath();
        ctx.moveTo(0+fingyOffset, 0);
        ctx.lineTo(-24+fingyOffset, -20);
        ctx.lineTo(-19+fingyOffset, 0);
        ctx.lineTo(-24+fingyOffset, 20);
        ctx.fill();

        ctx.restore();

    }

    function clearCanvas() {
        ctx.clearRect ( 0 , 0 , screenWidth, screenHeight );
    }

    this.simulateUserInput = function() {

        var simInputX = 0;
        var simInputY = 0;
        var simInputVX = 0;
        var simInputVY = 0;

        setInterval(function () {

            simInputX = (Math.random() * screenWidth) * 0.25 + (screenWidth * 0.375);
            simInputY = (Math.random() * screenHeight) * 0.25 + (screenHeight * 0.375);
            simInputVX = Math.random() * 10 - 5;
            simInputVY = Math.random() * 10 - 6; //slightly favor upwards

        }, 3000);

        setInterval(function () {

            simInputX += simInputVX;
            simInputY += simInputVY;

            if (Math.random() > 0.25){
                //touchmove
                inputMove(simInputX, simInputY);
            }else {

                if (Math.random()<0.5) {
                    //touchstart
                    centerX = Math.random() * screenWidth;
                    centerY = Math.random() * screenHeight + 20;
                } else {
                    //touchend
                    inputUp();
                }

            }

        }, 20);

    };

    //Touchglow effect
    $('body').touchglow({

            touchColor: "#fff",
            fadeInDuration: 25,
            fadeOutDuration: 250,

        onUpdatePosition: function(x,y){

        },
        onFadeIn: function(fadeDur){
            $('#instruct').stop().fadeTo(fadeDur, 0.2);
        },
        onFadeOut: function(fadeDur){
            $('#instruct').stop().fadeTo(fadeDur, 1);
        }

    });

    function map(value, low1, high1, low2, high2) {

      return low2 + (high2 - low2) * (value - low1) / (high1 - low1);

    }

};
