var gl;
var canvas;
var program;  // shader program

var images = [];
var textures = [];

var mouseDown = true;

//var lu = 1.0;
//var lv = 1.0;
var viewDiagRadius;// = 960;
var circleRadius;//   = 960;  // 0.5 * canvas.edge.length

var RTIObject = function () {
  this.size   = [1920, 1280];
  this.scales = [2.0, 2.0, 2.0, 2.0, 2.0, 2.0];
  this.biases = [114, 131, 68, 135, 130, 0];

  this.objIdx = 1;  // updated by dat.gui
  this.currObjIdx = 1;
  this.lastObjIdx = 0;

  this.lu = 0.00;
  this.lv = 0.00;

  this.zoomScale = 1.0;
  this.shift = [0.0, 0.0];

  this.useSpecular = false;

  this.headerReady = false;
  this.textureReady = false;

  this.debugInfo = "nothing...";
}

var rtiObj = new RTIObject();


//var textureURLs = ["resources/object_",

function init(){

	canvas = document.getElementById("my-canvas");
	initWebGL();

	loadRTIObject(rtiObj.objIdx, initShaders);

	setupGUI();

	// Register Mouse Events
	//canvas.onmousedown = handleMouseDown;
	//canvas.onmouseup   = handleMouseUp;
	document.onmousemove = handleMouseMove;

	disable_scroll();  // disable scroll for mobile devices

	// Touch Events ( not the same as Mouse )
	$('body').bind('touchmove', handleTouchMove);
	$('body').bind('touchstart', handleTouchStart);
	$('body').bind('touchend', handleTouchEnd);
}

function setupGUI(){
  var useSpecularBtn = document.getElementById('use_specular');
  useSpecularBtn.addEventListener('click', function() {
    rtiObj.useSpecular = useSpecularBtn.checked;
    render();
  });

  // var gui = new dat.GUI();  // var gui = new dat.GUI({autoPlace:false});

	// // Object Selection
	// var selectObjectController = gui.add(rtiObj, 'objIdx',
	//                                      {MayaTablets:  1,
	// 									                    Rambrandt:    2,
	// 									                    BudaHead:     3,
	// 									                    TombStone:    4,
	// 									                    StoneTablet:  5}).name('Collection');

	// selectObjectController.onChange(function(value) {
	//   // Fires on every change, drag, keypress, etc.
	//   rtiObj.lastObjIdx = rtiObj.currObjIdx;
	// 	rtiObj.currObjIdx = rtiObj.objIdx;

	//   // reset flags
	//   rtiObj.headerReady = false;
	// 	rtiObj.textureReady = false;

	// 	loadRTIObject(rtiObj.objIdx, render);
	// });

	// // Use Specular Control
	// var useSpecularController = gui.add(rtiObj, 'useSpecular');
	// useSpecularController.onFinishChange(function(value) {
	//   // Fires when a controller loses focus
	//   rtiObj.useSpecular = value;
	//   render();
	// });
}

function initWebGL() {
  gl = null;

	try {
	  // Try to grab the standard context. If it fails, fallback to experimental.
	  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	}
	catch(e) {}

	// If we don't have a GL context, give up now
	if (!gl) {
	  alert("Unable to initialize WebGL. Your browser may not support it.");
	  gl = null;
	}
}

function initShaders(){

	if (!rtiObj.headerReady || !rtiObj.textureReady){
	  // textures or header info not loaded yet
	  return;
	}

	// Load Shader Files from External Source
	loadFiles(
    ['./shaders/vertex.vert', './shaders/fragment.frag'],

    function (shaderText) {
	    setupShader(shaderText);  // Setup Shader Program
	  	render();  // Start Render Loop
    },

	  function (url) {
	    alert('Failed to download "' + url + '"');
	  }
  );
}

function render(){

	if (!rtiObj.headerReady || !rtiObj.textureReady){
	  // textures or header info not loaded yet
	  return;
	}

	gl.useProgram(program);

  // Create and Bind textures
  if (rtiObj.lastObjIdx == rtiObj.objIdx){
	  // Object remains the same, do nothing
  }
  else{
	  rtiObj.lastObjIdx = rtiObj.objIdx;
	  // Object changes, reload textures

		// canvas.width  = rtiObj.size[0]; // in pixels
    // canvas.height = rtiObj.size[1]; // in pixels
    var w = rtiObj.size[0];
    var h = rtiObj.size[1];
    var wOverh = w/h;
    if (w > h) {
      canvas.width = 1024;
      canvas.height = 1024/wOverh;
    } else {
      canvas.height = 1024;
      canvas.width = 1024*wOverh;
    }


		gl.viewport(0, 0, canvas.width, canvas.height);

	  createTextures();

		// lookup the sampler locations
		var u_image0Location = gl.getUniformLocation(program, "u_image0");  // rgb
		var u_image1Location = gl.getUniformLocation(program, "u_image1");  // coe123
		var u_image2Location = gl.getUniformLocation(program, "u_image2");  // coe456
		var u_image3Location = gl.getUniformLocation(program, "u_image3");  // normals

		// set which texture units to render with.
		gl.uniform1i(u_image0Location, 0);  // texture unit 0
		gl.uniform1i(u_image1Location, 1);  // texture unit 1
		gl.uniform1i(u_image2Location, 2);  // texture unit 2
		gl.uniform1i(u_image3Location, 3);  // texture unit 3

		// set each texture unit to use a particular texture
		for (var ii = 0; ii < 4; ++ii) {
			gl.activeTexture(gl.TEXTURE0 + ii);
			gl.bindTexture(gl.TEXTURE_2D, textures[ii]);
		}
	}

	//alert("width: " + rtiObj.size[0] + "  height: " + rtiObj.size[1]);

  // update Lighting Direction
  program.uLightDirection = gl.getUniformLocation(program, "uLightDirection");
  gl.uniform2f(program.uLightDirection, rtiObj.lu, rtiObj.lv);  // set the Lighting Direction

	// use Specular mode or not
  program.useSpecular = gl.getUniformLocation(program, "uUseSpecular");
	gl.uniform1i(program.useSpecular, rtiObj.useSpecular);

  // resolution of canvas
  program.uResolution = gl.getUniformLocation(program, "uResolution");  // lookup uniforms
	gl.uniform2f(program.uResolution, rtiObj.size[0], rtiObj.size[1]);

  // zoomScale of canvas
  program.uZoomScale = gl.getUniformLocation(program, "uZoomScale");  // lookup uniforms
	gl.uniform1f(program.uZoomScale, rtiObj.zoomScale);

  // shift of canvas
  program.uShift = gl.getUniformLocation(program, "uShift");  // lookup uniforms
  // console.log(rtiObj.shift);

	gl.uniform2f(program.uShift, rtiObj.shift[0], rtiObj.shift[1]);

	// Update Scale and Bias for each object
	//var scales = [2.0, 2.0, 2.0, 1.0, 1.0, 2.0];
	program.uScales = gl.getUniformLocation(program, "uScales");
	gl.uniform1fv(program.uScales, rtiObj.scales);

	//var biases = [114, 131, 68, 135, 130, 0];
	program.uBiases = gl.getUniformLocation(program, "uBiases");
	gl.uniform1fv(program.uBiases, rtiObj.biases);

  // look up where the vertex data needs to go.
  var positionLocation = gl.getAttribLocation(program, "a_position");
  var texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

  // provide texture coordinates for the rectangle.
  var texCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	  0.0,  0.0,
	  1.0,  0.0,
	  0.0,  1.0,
	  0.0,  1.0,
	  1.0,  0.0,
	  1.0,  1.0]), gl.STATIC_DRAW);

  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);


  // Create a buffer for the position of the rectangle corners.
	var buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.enableVertexAttribArray(positionLocation);
	gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

	// Set a rectangle the same size as the image.
	setRectangle(gl, 0, 0, rtiObj.size[0], rtiObj.size[1]);

	// Draw the rectangle.
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}



function createTextures(){
  // var textures = [];
	textures.length = 0;  // clear this global texture array

  for (var ii = 0; ii < 4; ++ii) {
	  var texture = gl.createTexture();
	  gl.bindTexture(gl.TEXTURE_2D, texture);

	  // Set the parameters so we can render any size image.
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

	  // Upload the image into the texture.
	  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[ii]);

	  // add the texture to the array of textures.
	  textures.push(texture);
  }
}


// Don't know exactly what it does ...
function setRectangle(gl, x, y, width, height) {
  var x1 = x;
  var x2 = x + width;
  var y1 = y;
  var y2 = y + height;
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
	  x1, y1,
	  x2, y1,
	  x1, y2,
	  x1, y2,
	  x2, y1,
	  x2, y2]), gl.STATIC_DRAW);
}

function getOffset(obj) {
	var offsetLeft = 0;
	var offsetTop  = 0;
	do
	{
		if (!isNaN(obj.offsetLeft)) {
			offsetLeft += obj.offsetLeft;
		}
		if (!isNaN(obj.offsetTop)) {
			offsetTop += obj.offsetTop;
		}
	} while(obj = obj.offsetParent );

	return {left: offsetLeft, top: offsetTop};
}


function handleMouseDown(event) {
}

function handleMouseUp(event) {
}

function handleMouseMove(event) {
	var offset = getOffset(canvas);

	// Obtain relative coordinates
	var xcoord = event.pageX - offset.left;
	var ycoord = event.pageY - offset.top;

	var lu = (xcoord - circleRadius.x) / viewDiagRadius.x;
	var lv = (circleRadius.y - ycoord) / viewDiagRadius.y;

	if (lu * lu + lv * lv > 2.0) {
	  // Falls out of the targeted circle
	  return;
	}

	//$('#status').html('x=' + xcoord + '  y= ' + ycoord + '<br>' + 'lu= ' + lu + '  lv= ' + lv);
	render();

	rtiObj.lu = lu;
	rtiObj.lv = lv;

}

var inGestureMode = false;
var gestureMode = null;
var startZoomScale;
var startShiftCenter;
var startFingers;
var currentFingers;
var lastClickFlag = false;

function handleTouchStart(jQueryEvent) {
  // jQueryEvent.preventDefault();
  var ev = window.event;
  var numOfFingers = ev.touches.length;
  if (numOfFingers === 1) {
    if (lastClickFlag === true) {
      handleDoubleClick(jQueryEvent);
      lastClickFlag = false;
    } else {
      lastClickFlag = true;
      setTimeout(function() {
        lastClickFlag = false;
      }, 200);
    }
  }
  if (numOfFingers == 2) {
    setStartFingers(ev);
  }
}

function handleDoubleClick(jQueryEvent) {
  rtiObj.shift = [0.0, 0.0];
  rtiObj.zoomScale = 1.0;
  render();
}

function setStartFingers(ev) {
  var offset = getOffset(canvas);
  var t1 = ev.touches[0], t2 = ev.touches[1];

	// Obtain relative coordinates
	var x1 = t1.pageX - offset.left;
	var y1 = t1.pageY - offset.top;
	var x2 = t2.pageX - offset.left;
	var y2 = t2.pageY - offset.top;

  inGestureMode = true;
  startZoomScale = rtiObj.zoomScale;
  startShiftCenter = {x: rtiObj.shift[0], y: rtiObj.shift[1]};
  startFingers = [
    {x: x1, y: y1},
    {x: x2, y: y2}
  ];
  // alert('start 0: ' + startFingers[0].x + ', ' + startFingers[0].y);
  // alert('start 1: ' + startFingers[1].x + ', ' + startFingers[1].y);
}

function dist(p1, p2) {
  var dx = p1.x - p2.x, dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy);
}

function vecAngle(v1, v2) {
  var v1x = v1.x, v2x = v2.x, v1y = v1.y, v2y = v2.y;
  var acos = Math.acos, sqrt = Math.sqrt;
  var ang = acos( (v1x * v2x + v1y * v2y) / (sqrt(v1x*v1x+v1y*v1y) * sqrt(v2x*v2x+v2y*v2y)) );
  return ang * 180 / Math.PI;
}

// Touch Events - Mobile Devices
function handleTouchMove(jQueryEvent){

  jQueryEvent.preventDefault();

  var ev = window.event;
  var numOfFigures = ev.touches.length;
  var scale = 1.0;


  if (numOfFigures == 2) {
    // zoom
    if (!inGestureMode) {
      setStartFingers(ev);
      return;
    }

    var offset = getOffset(canvas);
    var t1 = ev.touches[0], t2 = ev.touches[1];

	  // Obtain relative coordinates
    var sx1 = startFingers[0].x;
    var sy1 = startFingers[0].y;
    var sx2 = startFingers[1].x;
    var sy2 = startFingers[1].y;
	  var x1 = t1.pageX - offset.left;
	  var y1 = t1.pageY - offset.top;
	  var x2 = t2.pageX - offset.left;
	  var y2 = t2.pageY - offset.top;
    var currentFingers = [
      {x: x1, y: y1},
      {x: x2, y: y2}
    ];

    // If gesture mode is not determined yet,
    // determin whether user want to zoom or shift first;
    var v1 = {x: x1-sx1, y: y1-sy1};
    var v2 = {x: x2-sx2, y: y2-sy2};

    // if v1 and v2 is almost colinear, consider as shift
    // otherwise is zoom
    var ang = vecAngle(v1, v2);
    if (isNaN(ang)) return;

    if (!gestureMode) {
      if (Math.abs(ang) <= 10.0) {
        gestureMode = 'shift';
        // console.log("set gesture mode " + gestureMode);
      } else {
        gestureMode = 'zoom';
        // console.log("set gesture mode " + gestureMode);
      }
      return;
    }

    // console.log('ang', ang);
    // console.log("gesture mode " + gestureMode);

    if (gestureMode === 'shift') {
      var shiftX = (v1.x + v2.x) / 2;
      var shiftY = (v1.y + v2.y) / 2;
      rtiObj.shift = [
        startShiftCenter.x + shiftX,
        startShiftCenter.y + shiftY
      ];
      $('#status2').html('shift = ' + shiftX + shiftY);
    } else if (gestureMode === 'zoom') {
      var distPrev= dist(startFingers[0], startFingers[1]);
      var distNow = dist(currentFingers[0], currentFingers[1]);

      scale = distNow/distPrev;
      rtiObj.zoomScale = startZoomScale * scale;
      $('#status2').html('scale = ' + scale);
    }


	  render();
  } else {
    // change lighting

	  var event = window.event;
	  touch = event.touches[0];

	  var offset = getOffset(canvas);

	  // Obtain relative coordinates
	  var xcoord = touch.pageX - offset.left;
	  var ycoord = touch.pageY - offset.top;

	  var lu = (xcoord - circleRadius.x) / viewDiagRadius.x;
	  var lv = (circleRadius.y - ycoord) / viewDiagRadius.y;

	  if (lu * lu + lv * lv > 2.0) {
	    // Falls out of the targeted circle
	    return;
	  }


	  rtiObj.lu = lu;
	  rtiObj.lv = lv;

	  render();
    $('#status').html('x=' + xcoord + '  y= ' + ycoord
                      + '<br>' + 'lu= ' + lu + '  lv= ' + lv);
  }

}

function handleTouchEnd(jqEv) {
  inGestureMode = false;
  gestureMode = null;
  startZoomScale = null;
  startFingers = null;
  startShiftCenter = null;
}

function loadRTIObject(objIdx, callback) {
  // callback could be initShader or Render

	// Load RTI Object Header Info ( Canvas size, Scales & Biases )
	loadRTIHeaders(objIdx, updateRTIInfo, callback);

	// Load Image Textures
	loadTextureImages(objIdx, callback);
}

// Load RTI Object Header Info ( Scales & Biases )
function loadRTIHeaders(objIdx, callback, finalcallback) {
	var url = "resources/object_" + objIdx + "/header.txt";
	var data;  // data is useless for now...

	// Callback for parsing the text into
	// array of integers
  function parseTextCallback(text, data) {
	  // turn text into arrays of numbers
	  var lines = text.split("\n");

		var size = lines[0]; // width height
		var size = size.split(" ");
		for(var i = 0; i < 2; i++) {
		  size[i] = +size[i];
		}

    //rtiObj.debugInfo = size;

		var scales = lines[1];
		var biases = lines[2];

		var scales = scales.split(" ");
		var biases = biases.split(" ");

		var paraCount = 6;

		if(scales.length != paraCount || biases.length != paraCount) {
		  alert('Scales or Biases parameters count incorrect!');
		}

		for(var i = 0; i < paraCount; i++) {
		  scales[i] = +scales[i];
			biases[i] = +biases[i];
		}

		callback(size, scales, biases, finalcallback);
  }

	loadFile(
	  url,
		data,
		parseTextCallback,
	  function (url) {
	    alert('Failed to download "' + url + '"');
	  }
	);
}

function updateRTIInfo(size, scales, biases, callback) {
  rtiObj.size = size;
  rtiObj.scales = scales;
	rtiObj.biases = biases;

	// ... set up WebGL ...
	// Load RTI Viewer Settings
	// canvas.width  = rtiObj.size[0]; // in pixels
  // canvas.height = rtiObj.size[1]; // in pixels

  var w = rtiObj.size[0];
  var h = rtiObj.size[1];
  var wOverh = w/h;
  if (w > h) {
    canvas.width = 1024;
    canvas.height = 1024/wOverh;
  } else {
    canvas.height = 1024;
    canvas.width = 1024*wOverh;
  }

	viewDiagRadius = {x: canvas.width / 2, y: canvas.height / 2};
	circleRadius   = {x: canvas.width / 2, y: canvas.height / 2};

	rtiObj.headerReady = true;
	callback();  // could be initShader() or render()
}

function loadTextureImages(objIdx, callback) {

	var urls = [];
	var texturesCount = 4;
	var textureTypes  = ["/rgb.png",
	                     "/coe123.png",
						           "/coe456.png",
						           "/normals.png"
						          ];

	for (var ii = 0; ii < texturesCount; ++ii) {
	  var url = "resources/object_" + objIdx + textureTypes[ii];
		urls.push(url);
	}

	images.length = 0;

	loadImages(urls, callback);
}

// Disable Scrolling for Mobile Devices
// left: 37, up: 38, right: 39, down: 40,
// spacebar: 32, pageup: 33, pagedown: 34, end: 35, home: 36
var keys = [37, 38, 39, 40];

function preventDefault(e) {
  e = e || window.event;
  if (e.preventDefault)
	  e.preventDefault();
  e.returnValue = false;
}

function keydown(e) {
	for (var i = keys.length; i--;) {
		if (e.keyCode === keys[i]) {
			preventDefault(e);
			return;
		}
	}
}

function wheel(e) {
  preventDefault(e);
}

function disable_scroll() {
  if (window.addEventListener) {
	  window.addEventListener('DOMMouseScroll', wheel, false);
  }
  window.onmousewheel = document.onmousewheel = wheel;
  document.onkeydown = keydown;
}

function randomInt(range) {
  return Math.floor(Math.random() * range);
}


function goFullScreen() {
	if (canvas.mozRequestFullScreen) {
		canvas.mozRequestFullScreen();
	} else if (canvas.webkitRequestFullScreen) {
		canvas.webkitRequestFullScreen();
	}
}

function loadImage(url, callback) {
  var image = new Image();
  image.src = url;
  image.onload = callback;
  return image;
}

function loadImages(urls, callback) {
  var imagesToLoad = urls.length;

  // Called each time an image finished loading.
  var onImageLoad = function() {
	  --imagesToLoad;
	  // If all the images are loaded call the callback.
	  if (imagesToLoad == 0) {
		  rtiObj.textureReady = true;
	    callback();
	  }
  };

  for (var ii = 0; ii < imagesToLoad; ++ii) {
	  var image = loadImage(urls[ii], onImageLoad);
	  images.push(image);
  }
}
