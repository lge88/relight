
function loadFile(url, data, callback, errorCallback) {
  // Set up an asynchronous request
  var request = new XMLHttpRequest();
  request.open('GET', url, true);

  // Hook the event that gets called as the request progresses
  request.onreadystatechange = function () {
    // If the request is "DONE" (completed or failed)
    if (request.readyState == 4) {
      // If we got HTTP status 200 (OK)
      if (request.status == 200) {
        callback(request.responseText, data)
      } else { // Failed
        errorCallback(url);
      }
    }
  };

  request.send(null);
}

function loadFiles(urls, callback, errorCallback) {
  var numUrls = urls.length;
  var numComplete = 0;
  var result = [];

  // Callback for a single file
  function partialCallback(text, urlIndex) {
    result[urlIndex] = text;
    numComplete++;

    // When all files have downloaded
    if (numComplete == numUrls) {
      callback(result);
    }
  }

  for (var i = 0; i < numUrls; i++) {
    loadFile(urls[i], i, partialCallback, errorCallback);
  }
}


function loadTxtFile(url, callback, errorCallback) {
  // Set up an asynchronous request
  var request = new XMLHttpRequest();
  request.open('GET', url, true);

  // Hook the event that gets called as the request progresses
  request.onreadystatechange = function () {
    // If the request is "DONE" (completed or failed)
    if (request.readyState == 4) {
      // If we got HTTP status 200 (OK)
      if (request.status == 200) {
        callback(request.responseText)
      } else { // Failed
        errorCallback(url);
      }
    }
  };

  request.send(null);
}

function setupShader(shaderText){
  // Compile Vertex Shader
	var vs = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vs, shaderText[0]);
	gl.compileShader(vs);

	// Compile Fragment Shader
	var fs = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fs, shaderText[1]);
	gl.compileShader(fs);

	// Set up shader program
	program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);

	if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS))
		console.log(gl.getShaderInfoLog(vs));

	if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
		console.log(gl.getShaderInfoLog(fs));

	if (!gl.getProgramParameter(program, gl.LINK_STATUS))
		console.log(gl.getProgramInfoLog(program));
}
