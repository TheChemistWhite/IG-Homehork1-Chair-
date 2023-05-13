"use strict";

var canvas;
var gl;
var program;
var numPositions  = 204;

var positions = [];
var colors = [];
var normalsArray = [];


var vertexColors = [
    vec4(0.0, 0.0, 0.0, 1.0),  // black
    vec4(1.0, 0.0, 0.0, 1.0),  // red
    vec4(1.0, 1.0, 0.0, 1.0),  // yellow
    vec4(0.0, 1.0, 0.0, 1.0),  // green
    vec4(0.0, 0.0, 1.0, 1.0),  // blue
    vec4(1.0, 0.0, 1.0, 1.0),  // magenta
    vec4(0.0, 1.0, 1.0, 1.0),  // cyan
    vec4(1.0, 1.0, 1.0, 1.0)   // white
];

//rotation
var axis = 0;
var xAxis = 0;
var yAxis = 1;
var zAxis = 2;
var theta = [0.2, 0.2, 0.2];
var thetaLoc;
var flag = true;

//prospective
var near = 1.0;
var far = 4.0;
var radius = 3.0;
var phi = 0.0;
var thetaP = 2.5;

var  fovy = 80.0;  
var  aspect = 1.0;      

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var eye;
const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);
var viewerPos;


//Light
var hx=0.0;
var hy=3.0;
var hz=0.05;
var lightPosition = vec4(hx, hy, hz, 1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
var lightDiffuse = vec4(20.0, 20.0, 20.0, 1.0);
var lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
var lightDirection = vec3(0.0, -1.0, 0.0);

var angle = 5;
var attenuation = 20;

//Material
var materialAmbient = vec4(0.24725, 0.1995, 0.0745, 0.4);
var materialDiffuse = vec4(	0.75164, 0.60648, 0.22648, 0.4);
var materialSpecular = vec4(0.628281, 0.555802, 0.366065, 0.4);
var materialShininess = 20.0;
var ctm;
var ambientColor, diffuseColor, specularColor;

//per-Vertex/per-Fragment shading
var percentage = 0.5;

//quantization
var quantization = false;
var r0,r1,r2,r3,r4,r5,r6,r7;
var g0,g1,g2,g3,g4,g5,g6,g7;
var b0,b1,b2,b3,b4,b5,b6,b7;

init();

function init()
{
    canvas = document.getElementById("gl-canvas");

    gl = canvas.getContext('webgl2');
    if (!gl) alert("WebGL 2.0 isn't available");

    colorCube();

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    aspect =  canvas.width/canvas.height;

    gl.enable(gl.DEPTH_TEST);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);

    var normalLoc = gl.getAttribLocation(program, "aNormal");
    gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(normalLoc);

    thetaLoc = gl.getUniformLocation(program, "uTheta");

    viewerPos = vec3(0.0, 0.0, -20.0);

    modelViewMatrixLoc = gl.getUniformLocation(program, "uModelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "uProjectionMatrix");

    //event listeners for rotation

    document.getElementById( "xButton" ).onclick = function () {
        axis = xAxis;
    };
    document.getElementById( "yButton" ).onclick = function () {
        axis = yAxis;
    };
    document.getElementById( "zButton" ).onclick = function () {
        axis = zAxis;
    };
    document.getElementById("ButtonT").onclick = function(){
        flag = !flag;
    };

    //event listeners for prospective
    document.getElementById("zFarSlider").onchange = function(event) {
        far = event.target.value;
    };
    document.getElementById("zNearSlider").onchange = function(event) {
        near = event.target.value;
    };
    document.getElementById("radiusSlider").onchange = function(event) {
       radius = event.target.value;
    };
    document.getElementById("thetaSlider").onchange = function(event) {
        thetaP = event.target.value* Math.PI/180.0;
    };
    document.getElementById("phiSlider").onchange = function(event) {
        phi = event.target.value* Math.PI/180.0;
    };
    document.getElementById("aspectSlider").onchange = function(event) {
        aspect = event.target.value;
    };
    document.getElementById("fovSlider").onchange = function(event) {
        fovy = event.target.value;
    };

    //Light
    document.getElementById( "lightButton" ).onclick = function () {
        if(angle > 0){
            angle = 0;
        }else{
            angle = 5;
        }
    };
    document.getElementById("moveX").onchange = function(event) {
        hx = event.target.value;
        lightPosition = vec4(hx, hy, hz, 1.0);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"),flatten(lightPosition));
    };
    document.getElementById("moveY").onchange = function(event) {
        hy = event.target.value;
        lightPosition = vec4(hx, hy, hz, 1.0);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"),flatten(lightPosition));
    };
    document.getElementById("moveZ").onchange = function(event) {
        hz = event.target.value;
        lightPosition = vec4(hx, hy, hz, 1.0);
        gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"),flatten(lightPosition));
    };
    document.getElementById("angle").onchange = function(event) {
        angle = event.target.value;
    };
    document.getElementById("shaderSlider").onchange = function(event) {
        percentage = event.target.value;
    };
    //Quantization
    document.getElementById( "quantization" ).onclick = function () {
        quantization = !quantization;
        console.log(quantization);
    };
    //Black
    document.getElementById("r0Slider").onchange = function(event) {
        r0 = event.target.value;
        vertexColors[0][0] = r0;
        };
    document.getElementById("g0Slider").onchange = function(event) {
        g0 = event.target.value;
        vertexColors[0][1] = g0;
        };
    document.getElementById("b0Slider").onchange = function(event) {
        b0 = event.target.value;
        vertexColors[0][2] = b0;
    };
    //Red
    document.getElementById("r1Slider").onchange = function(event) {
        r1 = event.target.value;
        vertexColors[1][0] = r1;
        };
    document.getElementById("g1Slider").onchange = function(event) {
        g1 = event.target.value;
        vertexColors[1][1] = g1;
        };
    document.getElementById("b1Slider").onchange = function(event) {
        b1 = event.target.value;
        vertexColors[1][2] = b1;
    };
    //Yellow
    document.getElementById("r2Slider").onchange = function(event) {
        r2 = event.target.value;
        vertexColors[0][0] = r2;
        };
    document.getElementById("g2Slider").onchange = function(event) {
        g2 = event.target.value;
        vertexColors[0][1] = g2;
        };
    document.getElementById("b2Slider").onchange = function(event) {
        b2 = event.target.value;
        vertexColors[0][2] = b2;
    };
    //Green
    document.getElementById("r3Slider").onchange = function(event) {
        r3 = event.target.value;
        vertexColors[0][0] = r3;
        };
    document.getElementById("g3Slider").onchange = function(event) {
        g3 = event.target.value;
        vertexColors[0][1] = g3;
        };
    document.getElementById("b3Slider").onchange = function(event) {
        b3 = event.target.value;
        vertexColors[0][2] = b3;
    };
    //Blue
    document.getElementById("r4Slider").onchange = function(event) {
        r4 = event.target.value;
        vertexColors[0][0] = r4;
        };
    document.getElementById("g4Slider").onchange = function(event) {
        g4 = event.target.value;
        vertexColors[0][1] = g4;
        };
    document.getElementById("b4Slider").onchange = function(event) {
        b4 = event.target.value;
        vertexColors[0][2] = b4;
    };
    //Magenta
    document.getElementById("r5Slider").onchange = function(event) {
        r5 = event.target.value;
        vertexColors[0][0] = r5;
        };
    document.getElementById("g5Slider").onchange = function(event) {
        g5 = event.target.value;
        vertexColors[0][1] = g5;
        };
    document.getElementById("b5Slider").onchange = function(event) {
        b5 = event.target.value;
        vertexColors[0][2] = b5;
    };
    //Cyan
    document.getElementById("r6Slider").onchange = function(event) {
        r6 = event.target.value;
        vertexColors[0][0] = r6;
        };
    document.getElementById("g6Slider").onchange = function(event) {
        g6 = event.target.value;
        vertexColors[0][1] = g6;
        };
    document.getElementById("b6Slider").onchange = function(event) {
        b6 = event.target.value;
        vertexColors[0][2] = b6;
    };
    //White
    document.getElementById("r7Slider").onchange = function(event) {
        r7 = event.target.value;
        vertexColors[0][0] = r7;
        };
    document.getElementById("g7Slider").onchange = function(event) {
        g7 = event.target.value;
        vertexColors[0][1] = g7;
        };
    document.getElementById("b7Slider").onchange = function(event) {
        b7 = event.target.value;
        vertexColors[0][2] = b7;
    };
    

    var ambientProduct = mult(lightAmbient, materialAmbient);
    var diffuseProduct = mult(lightDiffuse, materialDiffuse);
    var specularProduct = mult(lightSpecular, materialSpecular);

    gl.uniform4fv(gl.getUniformLocation(program, "uAmbientProduct"), flatten(ambientProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "uDiffuseProduct"),flatten(diffuseProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "uSpecularProduct"),flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "uLightPosition"),flatten(lightPosition));
    gl.uniform1f(gl.getUniformLocation(program, "uShininess"), materialShininess);
    
    render();
}


function colorCube()
{
    //sitting area
    quad(1, 0, 3, 2, 0); //1
    quad(6, 7, 3, 2, 1); //2
    quad(4, 0, 3, 7, 2); //3
    quad(5, 6, 2, 1, 3); //4
    quad(4, 38, 39, 7, 4); //5
    quad(1, 0, 4, 5, 5);  //6

    //left front leg
    quad(8, 0, 10, 9, 6); //7
    quad(12, 0, 10, 11, 3);//8
    quad(12, 13, 14, 11, 0);//9
    quad(8, 13, 14, 9, 1);//10
    quad(8, 0, 12, 13, 2);//11
    quad(14, 11, 10, 9, 3);//12

    //right front leg
    quad(3, 15, 19, 18, 4);//13
    quad(19, 20, 16, 15, 5);//14
    quad(16, 17, 21, 20, 6);//15
    quad(3, 17, 21, 18, 3);//16
    quad(3, 15, 16, 17, 0);//17
    quad(21, 20, 19, 18, 1);//18

    //right back leg
    quad(28, 29, 22, 23, 2);//19
    quad(22, 25, 26, 29, 3);//20
    quad(26, 27, 24, 25, 4);//21
    quad(28, 27, 24, 23, 5);//22
    quad(28, 29, 26, 27, 6);//23
    quad(24, 25, 22, 23, 3);//24

    //left back leg
    quad(30, 31, 36, 37, 0);//25
    quad(36, 35, 32, 31, 1);//26
    quad(32, 33, 34, 35, 2);//27
    quad(30, 33, 34, 37, 3);//28
    quad(30, 31, 32, 33, 4);//29
    quad(34, 35, 36, 37, 5);//30

    //seat back
    quad(28, 31, 5, 6, 0);//31
    quad(39, 38, 32, 27, 1);//32
    quad(29, 30, 33, 26, 0);//33
    quad(39, 38, 5, 6, 1);//34
}

function quad(a, b, c, d, e)
{
    var vertices = [
        
        //sitting area
        vec4(-0.5, -0.120,  -0.5, 1.0),//0
        vec4(-0.5,  0.0,  -0.5, 1.0),//1
        vec4(0.5,  0.0,  -0.5, 1.0),//2
        vec4(0.5, -0.120,  -0.5, 1.0),//3
        vec4(-0.5, -0.120, 0.65, 1.0),//4
        vec4(-0.5,  0.0, 0.5, 1.0),//5
        vec4(0.5,  0.0, 0.5, 1.0),//6

        //left front leg
        vec4(0.5, -0.120, 0.65, 1.0),//7
        vec4(-0.35, -0.120, -0.5, 1.0),//8
        vec4(-0.35, -1.0, -0.5, 1.0),//9
        vec4(-0.5, -1.0, -0.5, 1.0),//10
        vec4(-0.5, -1.0, -0.35, 1.0),//11
        vec4(-0.5, -0.120, -0.35, 1.0),//12
        vec4(-0.35, -0.120, -0.35, 1.0),//13
        vec4(-0.35, -1.0, -0.35, 1.0),//14

        //right front leg
        vec4(0.35, -0.120, -0.5, 1.0),//15
        vec4(0.35, -0.120, -0.35, 1.0),//16
        vec4(0.5, -0.120, -0.35, 1.0),//17
        vec4(0.5, -1.0, -0.5, 1.0),//18
        vec4(0.35, -1.0, -0.5, 1.0),//19
        vec4(0.35, -1.0, -0.35, 1.0),//20
        vec4(0.5, -1.0, -0.35, 1.0),//21

        //right back leg
        vec4(0.35, -1.0, 0.5, 1.0),//22
        vec4(0.5, -1.0, 0.5, 1.0),//23
        vec4(0.5, -1.0, 0.65, 1.0),//24
        vec4(0.35, -1.0, 0.65, 1.0),//25
        vec4(0.35, 1.0, 0.65, 1.0),//26
        vec4(0.5, 1.0, 0.65, 1.0),//27
        vec4(0.5, 1.0, 0.5, 1.0),//28
        vec4(0.35, 1.0, 0.5, 1.0),//29

        //left back leg
        vec4(-0.35, 1.0, 0.5, 1.0),//30
        vec4(-0.5, 1.0, 0.5, 1.0),//31
        vec4(-0.5, 1.0, 0.65, 1.0),//32
        vec4(-0.35, 1.0, 0.65, 1.0),//33
        vec4(-0.35, -1.0, 0.65, 1.0),//34
        vec4(-0.5, -1.0, 0.65, 1.0),//35
        vec4(-0.5, -1.0, 0.5, 1.0),//36
        vec4(-0.35, -1.0, 0.5, 1.0),//37
        
        //seat back
        vec4(-0.5, 0.0, 0.65, 1.0),//38
        vec4(0.5, 0.0, 0.65, 1.0)//39
    ];

    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    normal = vec3(normal);

    //vertex color assigned by the index of the vertex

    var indices = [a, b, c, a, c, d, e];

    for ( var i = 0; i < indices.length - 1; ++i ) {

        positions.push( vertices[indices[i]] );
        colors.push(vertexColors[e]);
        normalsArray.push(normal);

    }
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if(flag) theta[axis] += 1.0;
    gl.uniform3fv(thetaLoc, theta);

    eye = vec3(radius*Math.sin(thetaP)*Math.cos(phi), radius*Math.sin(thetaP)*Math.sin(phi), radius*Math.cos(thetaP));

    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = perspective(fovy, aspect, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));
    
    gl.uniform1f(gl.getUniformLocation(program, "angle"), Math.cos(angle * (Math.PI/180)));
    gl.uniform1f(gl.getUniformLocation(program, "attenuation"), attenuation);

    gl.uniform3fv(gl.getUniformLocation(program, "uEyePosition"), flatten(eye));

    gl.uniform3fv(gl.getUniformLocation(program, "lightDirection"), flatten(lightDirection));

    gl.uniform1f(gl.getUniformLocation(program, "percentage"), percentage);

    gl.uniform1f(gl.getUniformLocation(program, "quantization"), quantization);

    gl.uniform4fv(gl.getUniformLocation(program, "colors"),flatten(vertexColors));
    
    gl.drawArrays(gl.TRIANGLES, 0, numPositions);

    requestAnimationFrame(render);
}
