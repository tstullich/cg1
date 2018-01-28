/**
 * RaytracingRenderer interpretation of http://github.com/zz85
 */

var RaytracingRenderer = function (scene, camera)
{
	this.scene = scene;
	this.camera = camera;

	this.rendering = false;
	this.superSamplingRate = 0;
	this.maxRecursionDepth = 2;

	this.calcDiffuse = true;
	this.calcPhong = true;
	this.allLights = true;

	this.canvas = document.createElement( 'canvas' );
	this.context = this.canvas.getContext( '2d', {
		alpha: false
	} );

	this.canvasWidth = 0;
	this.canvasHeight = 0;

	this.setSize( this.canvas.width, this.canvas.height );

	this.clearColor = new THREE.Color( 0x000000 );

	this.domElement = this.canvas;

	this.autoClear = true;

	this.lights = [this.scene.children[0],
                   this.scene.children[1],
                   this.scene.children[2]];
}

RaytracingRenderer.prototype.setClearColor = function ( color, alpha )
{
	clearColor.set( color );
};

RaytracingRenderer.prototype.setSize = function ( width, height )
{
	this.canvas.width = width;
	this.canvas.height = height;

	this.canvasWidth = this.canvas.width;
	this.canvasHeight = this.canvas.height;

	this.context.fillStyle = 'white';
};

RaytracingRenderer.prototype.clear = function () {	};

RaytracingRenderer.prototype.render = function ()
{
	if(this.rendering == true)
		return;

	this.rendering = true;

	var clock = new THREE.Clock();
	clock.start();

	// update scene graph
	if ( this.scene.autoUpdate === true )
		this.scene.updateMatrixWorld();

	// update camera matrices
	if ( this.camera.parent === null )
		this.camera.updateMatrixWorld();

	this.context.clearRect( 0, 0, this.canvasWidth, this.canvasHeight );

	// http://www.javascripture.com/ImageData
	// imageData holds RGBA data for image. imagedata[0] red; imagedata[1] green, imagedata[2] blue, imagedata[3] alpha
	// iterating over imageData requires first loop over y, second loop over x
	var imageData = this.context.createImageData(this.canvasWidth, this.canvasHeight);

	//calculate camera cameraPosition, camera normal matrix and perspective
	//in my implementation, perspective is a single float value that depends on the camera FOV and the canvasHeight
    var cameraPosition = new THREE.Vector3();
    cameraPosition.setFromMatrixPosition(this.camera.matrixWorld);

    var cameraNormalMatrix = this.camera.normalMatrix;

    var perspective = 0.5 / Math.tan(THREE.Math.degToRad(this.camera.fov * 0.5)) * this.canvasHeight;

	//iterate over all pixels and render
	//this will set individial pixels. uncomment once you start working
	var indexRunner = 0;
	for(var y = 0; y < this.canvasHeight; y++)
	{
		for(var x = 0; x < this.canvasWidth; x++)
		{
			var pixelColor = new THREE.Color(0,0,0);

			if(this.superSamplingRate < 1)
			{
				pixelColor = this.renderPixel(x, y, cameraPosition, cameraNormalMatrix, perspective);
			} else
			{
				//TODO for ex5#
                for (var i = 0; i < samplingRate; i++) {
                    pixelColor += this.renderPixel(x, y, cameraPosition, cameraNormalMatrix, perspective);
                }
			}
            imageData.data[indexRunner] = pixelColor.r * 255.0;
            imageData.data[indexRunner + 1] = pixelColor.g * 255.0;
            imageData.data[indexRunner + 2] = pixelColor.b * 255.0;
            imageData.data[indexRunner + 3] = 255.0;
			indexRunner += 4;
		}
	}
	this.context.putImageData( imageData, 0, 0 );

	clock.stop();

	console.log("Finished rendering in " + clock.elapsedTime + " seconds. Image " + this.canvasWidth + " w / " + this.canvasHeight + " h");
	alert("Finished rendering in " + clock.elapsedTime + " seconds. Image " + this.canvasWidth + " w / " + this.canvasHeight + " h");

	this.rendering = false;
}

RaytracingRenderer.prototype.renderPixel = function(x, y, cameraPosition, cameraNormalMatrix, perspective)
{
	var pixelColor = new THREE.Color(0, 0, 0);

	//calculate ray origin & direction
    var rayOrigin = cameraPosition;
	var direction = new THREE.Vector3();
    direction.set(x - this.canvasWidth / 2.0, -(y - this.canvasHeight / 2.0), -perspective);
    direction.applyMatrix3(cameraNormalMatrix).normalize();

	this.spawnRay(rayOrigin, direction, pixelColor, 0);

	return pixelColor;
}

//this method has most of the stuff of this exercise.
//good coding style will ease this exercise significantly.
RaytracingRenderer.prototype.spawnRay = function(origin, direction, pixelColor, recursionDepth)
{
    //create raycaster and intersect with children of scene
    var raycaster = new THREE.Raycaster();
    raycaster.set(origin, direction);

    var intersects = raycaster.intersectObjects(this.scene.children, true);
    //if intersections, compute color (this is the main part of the exercise)
    if (intersects.length > 0) {
        // calculate phong model for each intersection point
        var normal = this.computeNormal(intersects[0].point, intersects[0].face, intersects[0].object.geometry.vertices, intersects[0]);
        var phong = this.phong(normal, intersects[0].point, intersects[0].object);
        pixelColor.add(phong);
    }

    //if material is mirror and with maxRecursionDepthrecursion, spawnRay again
}

RaytracingRenderer.prototype.phong = function(normal, point, intersectedObject) {
    var N = normal.normalize();
    var lightPos = new THREE.Vector3();
    lightPos.copy(this.lights[0].position);
    var L = lightPos.sub(point).normalize();
    var R = L.multiplyScalar(-1.0).reflect(N);
    var E = this.camera.position.multiplyScalar(-1.0).normalize();

    var ambientColor = new THREE.Color(0, 0, 0);
    ambientColor.copy(intersectedObject.material.color);

    var diffuseFactor = Math.max(N.dot(L), 0.0);
    var diffuseColor = ambientColor.multiplyScalar(diffuseFactor);
    //diffuseColor.clamp(0.0, 1.0); // clamp does not seem to work here since diffuse is a Color Object

    var specularColor = new THREE.Color(0, 0, 0);
    specularColor.copy(intersectedObject.material.specular);
    specularColor = specularColor.multiplyScalar(Math.pow(Math.max(R.dot(E), 0.0), intersectedObject.material.shininess));
    //specularColor.clamp(0.0, 1.0); // Same reason as above

    var finalColor = new THREE.Color(0, 0, 0);
    finalColor.add(ambientColor);
    finalColor.add(diffuseColor);
    finalColor.add(specularColor);
    return finalColor;
}

RaytracingRenderer.prototype.computeNormal = function(point, face, vertices, object)
{
	var computedNormal = new THREE.Vector3();
	//you will need this for Phong
	return face.normal;
};
