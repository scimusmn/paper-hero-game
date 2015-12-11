/**
 * jQuery Touch Glow v0.1
 *
 * By Tra Nguyen
 */
;(function ($, window, undefined) {

    "use strict";

    var

    // Touch Glow options object
    tgOptions = {},

    // Positions of the touch div
    tgPositionX = 0,
    tgPositionY = 0,

    // The html div of Touch Glow
    $tgDiv,

    // Document area to detect click release
    $docArea,

    /**
     * Set required params
     * @param  Object selector The Touch Glow selector
     * @param  Object options  Custom options to apply
     */
    init = function (selector, options) {

        setOptions(options);
        $docArea = $('body');

        $(function () {
            createTouchDiv();
            setTouchStyle();
            if (typeof selector !== 'function') {
                bindAction(selector);
            }
        });

    },

    /**
     * Set the options for Touch Glow
     * @param Object options Custom options to apply
     */
    setOptions = function (options) {

        // Set default options
        tgOptions = {
            'touchName': 'jquery-touch-glow',
            'touchBlurRadius': 60,
            'touchSpread': 30,
            'touchOffsetX': 0,
            'touchOffsetY': 0,
            'touchColor': 'blueviolet',
            'innerWidth': 0,
            'fadeInDuration': 100,
            'fadeOutDuration': 300
        };

        // Merge options objects
        $.extend(true, tgOptions, options);

    },

    /**
     * Create the touch div and append it to document body
     */
    createTouchDiv = function () {
        if ( $('#' + tgOptions.touchName).length == 0 ) {
            $('body').append('<div id =' + tgOptions.touchName + '></div>');
            $tgDiv = $('#' + tgOptions.touchName);
        }

    },

    /**
     * Generate css style of the touch div
     */
    setTouchStyle = function () {
        var glowStyle = tgOptions.touchOffsetX + 'px ' + tgOptions.touchOffsetY + 'px ' + tgOptions.touchBlurRadius + 'px ' + tgOptions.touchSpread + 'px ' + tgOptions.touchColor;
        tgOptions.innerWidth = tgOptions.innerWidth + 'px';

        $tgDiv.css('position','fixed').css('display','none');
        $tgDiv.css('width',tgOptions.innerWidth).css('height',tgOptions.innerWidth).css('border-radius',tgOptions.innerWidth);
        $tgDiv.css('background-color',tgOptions.touchColor);
        $tgDiv.css('box-shadow',glowStyle);

    },

    /**
     * Add event listeners to mouse/touch actions
     */
    bindAction = function (selector) {

        if ( isMobile() ) {

            selector.bind('touchstart',function(myTouchEvent){
                var $thisElement = $(myTouchEvent.target);
                getTouchPositions(myTouchEvent,this);
                updateTouchDivPositions();
                showTouchDiv();

                $thisElement.on('touchmove',function(myTouchEvent){
                    if ($tgDiv.css('display') != 'none') {
                        getTouchPositions(myTouchEvent,this);
                        updateTouchDivPositions();
                    }

                });

                $docArea.on('touchend',function(myTouchEvent){
                    hideTouchDiv($thisElement);
                    $docArea.unbind('touchend');
                    $thisElement.unbind('touchmove');
                });

            });

        } else {

            selector.on('mousedown',function(myTouchEvent){
                myTouchEvent.preventDefault();
                var $thisElement = $(myTouchEvent.target);
                getMousePositions(myTouchEvent);
                updateTouchDivPositions();
                showTouchDiv();

                $thisElement.on('mousemove',function(myTouchEvent){
                    myTouchEvent.preventDefault();
                    if ($tgDiv.css('display') != 'none') {
                        getMousePositions(myTouchEvent);
                        updateTouchDivPositions();
                    }

                });

                $docArea.on('mouseup',function(myTouchEvent){
                    hideTouchDiv($thisElement);
                    $docArea.unbind('mouseup');
                    $thisElement.unbind('mousemove');
                });

            });



        }

    },

    /**
     * Retrieve horizontal and vertical positions of the mouse event
     */
    getMousePositions = function (event) {
        tgPositionX = event.clientX;
        tgPositionY = event.clientY;
    },

    /**
     * Retrieve horizontal and vertical positions of the touch event
     */
    getTouchPositions = function (event, targetElement) {
        event.preventDefault();
        var fingerPositionX = event.originalEvent.touches[0].clientX,
        fingerPositionY = event.originalEvent.touches[0].clientY;

        var boundingBox = targetElement.getBoundingClientRect();

        if ( (fingerPositionX > boundingBox.left) && (fingerPositionX < boundingBox.right) ) {
            tgPositionX = event.originalEvent.touches[0].clientX;
        }

        if ( (fingerPositionY > boundingBox.top) && (fingerPositionY < boundingBox.bottom) ) {
            tgPositionY = event.originalEvent.touches[0].clientY;
        }


    },

    /**
     * Set position of the touch div
     */
    updateTouchDivPositions = function () {
        $tgDiv.css('left',tgPositionX + 'px');
        $tgDiv.css('top',tgPositionY + 'px');

        //TN addisiton
        tgOptions.onUpdatePosition.call(this, tgPositionX, tgPositionY );

    },

    /**
     * Show the touch div
     * @param Fade in duration
     */
    showTouchDiv = function () {
        $tgDiv.stop(true,true).fadeIn(tgOptions.fadeInDuration);
        if (typeof tgOptions.onFadeIn === 'function') {
            tgOptions.onFadeIn.call(this, tgOptions.fadeInDuration);
        }
    },

    /**
     * Hide the touch div
     * @param Fade out duration
     */
    hideTouchDiv = function (element) {
        $tgDiv.stop(true,true).fadeOut(tgOptions.fadeOutDuration, function(){
            // Excute afterFadeOut callback if provided
            if (typeof tgOptions.afterFadeOut === 'function') {
                tgOptions.afterFadeOut.call(this, element);
            }
        });
        if (typeof tgOptions.onFadeOut === 'function') {
            tgOptions.onFadeOut.call(this, tgOptions.fadeOutDuration);
        }
    },

    /**
     * Detect mobile browser
     * @return True if mobile user agent detected
     */
    isMobile = function () {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    };

    /**
     * Add function to the jQuery namespace
     * @param  Object options (Optional) Custom options to apply
     */
    $.touchglow = $.fn.touchglow = function (options) {

        options = options || {};

        var selector = this;

        init(selector, options);

        return this;

    };

})(window.jQuery);