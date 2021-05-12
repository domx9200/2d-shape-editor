//TODO: Change the layout of the JS files so that each one contains things that are related
"use strict";
var canvas;
var rect;
var hiddenCanvas;
var RGB = [0,0,0];
var pointList = [];

//the object lists, so that objects can be modified.
var LineList = [];
var circleList = [];
var rectList = [];
var triangleList = [];
var polygonList = [];
var ellipseList = [];
var curveList = [];
var squareList = [];
var polyLine = [];

var listList = [LineList, circleList, rectList, triangleList, polygonList, ellipseList, curveList, squareList, polyLine];
//this allows for drawing in the original order
//no matter what, they will be drawn in this order, even after scaling, translating, or rotating an object.
var drawOrder = [];

//set up so that each number represents how many of each exists,
//they are in the order of Line, Circle, Ellipse, Rectangle, Polygon, Triangle, Curve, Square, PolyLine
var numOfType = [0,0,0,0,0,0,0,0,0];
var currentListPos = -1;

//changed both when the user opts to change it and when the user selects an object
//assuming they aren't in creation mode.
var currentShape = "Line";
var currentMode = "Create";
var currentFill = "#000000";
var firstChange = true;
var lastTransLoc;
var copiedObjects = [];

var field;
var reader;

var selectList = [];
var undoList = [];

window.onload = async function init(){
    canvas = document.getElementById("canvas");
    hiddenCanvas = document.getElementById("hiddenCanvas");
    rect = canvas.getBoundingClientRect();
    canvas.addEventListener("mousedown", function(event){
        if(event.button == 0 && event.ctrlKey){
            let temp = hiddenCanvas.getContext("2d").getImageData(event.clientX - rect.left, event.clientY - rect.top, 1, 1);
            temp = "#" + ("000000" + rgbToHex(temp.data[0], temp.data[1], temp.data[2])).slice(-6);
            if(temp != "#000000")
                undoList.push(createJSONObject());
            redrawObjects(temp);
            translate(event);
            return;
        }

        if(event.button == 2 && event.ctrlKey){
            let temp = hiddenCanvas.getContext("2d").getImageData(event.clientX - rect.left, event.clientY - rect.top, 1, 1);
            temp = "#" + ("000000" + rgbToHex(temp.data[0], temp.data[1], temp.data[2])).slice(-6);
            console.log(temp);
            if(temp != "#000000")
                undoList.push(createJSONObject());
            for(var i = 0; i < selectList.length; i++){
                if(selectList[i].hiddenColor == temp){
                    selectList.splice(i, 1);
                    redrawObjects();
                }
            }
            return;
        }

        switch(currentMode){
            case "Create":
                defineShape(event);
                break;
            case "Translate":
                undoList.push(createJSONObject());
                translate(event);
                break;
            case "Scale":
                undoList.push(createJSONObject());
                scale(event);
                break;
            case "Rotate":
                undoList.push(createJSONObject());
                rotate(event);
                break;
        }

        
    });

    canvas.addEventListener("contextmenu", function(event){
        event.preventDefault();
    });
    
    canvas.addEventListener("dblclick", function(event){
        if(event.button == 2)
            return;
        if(currentShape == "Polygon" && pointList.length > 3 && currentMode == "Create"){
            undoList.push(createJSONObject());
            createPoly();
            var context = canvas.getContext('2d');
            context.lineWidth = 1;
            context.strokeStyle = currentFill;
            context.fillStyle = currentFill;
            context.fill();
            context.stroke();
            pointList = [];

            let hiddenContext = hiddenCanvas.getContext("2d");
            hiddenContext.lineWidth = 1;
            hiddenContext.strokeStyle = polygonList[numOfType[4] - 1].hiddenColor;
            hiddenContext.fillStyle = polygonList[numOfType[4] - 1].hiddenColor;
            redrawPoly(polygonList[numOfType[4] - 1].points, hiddenContext);
            hiddenContext.fill();
            hiddenContext.stroke();
        } else if(currentShape == "Polygon" && currentMode == "Create"){
            //so that the extra value gathered from the double click doesn't actually get recorded
            pointList.pop();
        } else if(currentShape == "Polyline" && pointList.length > 2 && currentMode == "Create"){
            undoList.push(createJSONObject());
            pointList.pop();
            numOfType[8]++;
            var context = canvas.getContext("2d");
            polyLine.push(createPolyline(pointList, context));
            drawOrder.push(vec2("Polyline", numOfType[8] - 1));
            pointList = [];
            context.lineWidth = 4;
            context.strokeStyle = currentFill;
            context.stroke();

            let hiddenContext = hiddenCanvas.getContext("2d");
            hiddenContext.lineWidth = 14;
            hiddenContext.strokeStyle = polyLine[numOfType[8] - 1].hiddenColor;
            createPolyline(polyLine[numOfType[8] - 1].points, hiddenContext, false);
            hiddenContext.stroke();
            
        } else if(currentShape == "Polyline" && currentMode == "Create"){
            pointList.pop();
        }
    });
    
    canvas.addEventListener('mouseup', function(){
        canvas.removeEventListener('mousemove', translateHelper);
        if(currentMode == "Scale"){
            canvas.removeEventListener('mousemove', callScaleFunctions);
        }
        if(currentMode == "Rotate"){
            canvas.removeEventListener('mousemove', rotateNormal);
        }
    });

    document.addEventListener("keydown", function(event){
        if(event.ctrlKey && event.key == "c")
            copySelected();
        if(event.ctrlKey && event.key == "v")
            paste();
        if(event.ctrlKey && event.key == "z")
            undo();
    });

    field = document.getElementById("fileField");
    reader = new FileReader();
    field.addEventListener("change", function() {
        var file = this.files[0];
        if(file)
            reader.readAsText(file);
    });

    reader.onload = function (event){
        var contents;
        try{
            contents = JSON.parse(decodeURIComponent( event.target.result));
        } catch(err){
            window.alert("File is not a JSON");
            return;
        }
        if(!contents.canvas){
            window.alert("File is not usable here");
            return;
        }
        undoList.push(createJSONObject());
        setupCanvas(contents, true);
        field.value = "";
    }
}

//the function to create a shape
function defineShape(location){
    var context = canvas.getContext("2d");
    var hiddenContext = hiddenCanvas.getContext("2d");
    pointList.push(vec2(location.clientX - rect.left, location.clientY - rect.top));
    switch(currentShape){
        case "Line":
            if(pointList.length > 1){
                undoList.push(createJSONObject());
                context.lineWidth = 4;
                context.strokeStyle = currentFill;
                numOfType[0]++;
                LineList.push(createLine(pointList, context));

                //store the type of object and it's locatrion within it's respective array
                drawOrder.push(vec2("Line", numOfType[0] - 1));
                pointList = [];
                context.stroke();
                context.closePath();

                //the hidden canvas acts as my selection algorithm
                hiddenContext.lineWidth = 14;
                hiddenContext.strokeStyle = LineList[numOfType[0] - 1].hiddenColor;
                createLine(LineList[numOfType[0] - 1].points, hiddenContext, false);
                hiddenContext.stroke();
            }
            break;
        case "Circle":
            if(pointList.length > 1){
                undoList.push(createJSONObject());
                numOfType[1]++;
                circleList.push(createCircle(pointList, context));
                //store the type of object and it's locatrion within it's respective array
                drawOrder.push(vec2("Circle", numOfType[1] - 1));
                pointList = [];
                context.lineWidth = 1;
                context.strokeStyle = currentFill;
                context.fillStyle = currentFill;
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.strokeStyle = circleList[numOfType[1] - 1].hiddenColor;
                hiddenContext.fillStyle = circleList[numOfType[1] - 1].hiddenColor;
                createCircle(circleList[numOfType[1] - 1].points, hiddenContext, false);
                hiddenContext.fill();
                hiddenContext.stroke();
            }
            break;
        case "Ellipse":
            if(pointList.length > 2){
                undoList.push(createJSONObject());
                numOfType[2]++;
                ellipseList.push(createEllipse(pointList, context));
                //store the type of object and it's locatrion within it's respective array
                drawOrder.push(vec2("Ellipse", numOfType[2] - 1));
                pointList = [];
                context.lineWidth = 1;
                context.strokeStyle = currentFill;
                context.fillStyle = currentFill;
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.strokeStyle = ellipseList[numOfType[2] - 1].hiddenColor;
                hiddenContext.fillStyle = ellipseList[numOfType[2] - 1].hiddenColor;
                createEllipse(ellipseList[numOfType[2] - 1].points, hiddenContext, false);
                hiddenContext.fill();
                hiddenContext.stroke();
            }
            break;
        case "Rectangle":
            if(pointList.length > 1){
                undoList.push(createJSONObject());
                numOfType[3]++;
                rectList.push(createRectangle(pointList, context));
                //store the type of object and it's locatrion within it's respective array
                drawOrder.push(vec2("Rectangle", numOfType[3] - 1));
                pointList = [];
                context.lineWidth = 1;
                context.strokeStyle = currentFill;
                context.fillStyle = currentFill;
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.strokeStyle = rectList[numOfType[3] - 1].hiddenColor;
                hiddenContext.fillStyle = rectList[numOfType[3] - 1].hiddenColor;
                createRectangle(rectList[numOfType[3] - 1].points, hiddenContext, false);
                hiddenContext.fill();
                hiddenContext.stroke();
            }
            break;
        case "Triangle":
            if(pointList.length > 2){
                undoList.push(createJSONObject());
                numOfType[5]++;
                triangleList.push(createTriangle(pointList, context));
                //store the type of object and it's locatrion within it's respective array
                drawOrder.push(vec2("Triangle", numOfType[5] - 1));
                pointList = [];
                context.lineWidth = 1;
                context.strokeStyle = currentFill;
                context.fillStyle = currentFill;
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.strokeStyle = triangleList[numOfType[5] - 1].hiddenColor;
                hiddenContext.fillStyle = triangleList[numOfType[5] - 1].hiddenColor;
                createTriangle(triangleList[numOfType[5] - 1].points, hiddenContext, false);
                hiddenContext.fill();
                hiddenContext.stroke();
            }
            break;
        case "Curve":
            if(pointList.length > 3){
                undoList.push(createJSONObject());
                numOfType[6]++;
                curveList.push(createCurve(pointList, context));
                drawOrder.push(vec2("Curve", numOfType[6] - 1));
                pointList = [];
                context.lineWidth = 4;
                context.strokeStyle = currentFill;
                context.stroke();

                hiddenContext.lineWidth = 14;
                hiddenContext.strokeStyle = curveList[numOfType[6] - 1].hiddenColor;
                createCurve(curveList[numOfType[6] - 1].points, hiddenContext, false);
                hiddenContext.stroke();
            }
            break;
        case "Square":
            if(pointList.length > 1){
                undoList.push(createJSONObject());
                numOfType[7]++;
                squareList.push(createSquare(pointList, context));
                //store the type of object and it's locatrion within it's respective array
                drawOrder.push(vec2("Square", numOfType[7] - 1));
                pointList = [];
                context.lineWidth = 1;
                context.strokeStyle = currentFill;
                context.fillStyle = currentFill;
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.strokeStyle = squareList[numOfType[7] - 1].hiddenColor;
                hiddenContext.fillStyle = squareList[numOfType[7] - 1].hiddenColor;
                createSquare(squareList[numOfType[7] - 1].points, hiddenContext, false);
                hiddenContext.fill();
                hiddenContext.stroke();
            }
            break;
    }
}

function translate(event){
    if(selectList.length > 0){
        lastTransLoc = vec2(event.clientX - rect.left, event.clientY - rect.top);
        canvas.addEventListener('mousemove', translateHelper);
    }
}

function translateHelper(event){
    //first calculate the movement
    var transXDiff = (event.clientX - rect.left) - lastTransLoc[0];
    var transYDiff = (event.clientY - rect.top) - lastTransLoc[1];
    //then set the new location so that the movement stays accounted for
    lastTransLoc = vec2(event.clientX - rect.left, event.clientY - rect.top);
    
    //run through the selected object list
    for(var i = 0; i < selectList.length; i++){
        //set the new locations according to the x and y differences.
        for(var j = 0; j < selectList[i].points.length; j++){
            selectList[i].points[j][0] += transXDiff;
            selectList[i].scaledPoints[j][0] += transXDiff;
            selectList[i].points[j][1] += transYDiff;
            selectList[i].scaledPoints[j][1] += transYDiff;
        }
    }
    redrawObjects();
}

function scale(event){
    if(selectList.length > 0){
        lastTransLoc = vec2(event.clientX - rect.left, event.clientY - rect.top);
        canvas.addEventListener('mousemove', callScaleFunctions);
    }
}

function rotate(event){
    if(selectList.length > 0){
        lastTransLoc = vec2(event.clientX - rect.left, event.clientY - rect.top);
        canvas.addEventListener('mousemove', rotateNormal);
    }
}

function shapeChanger(newShape){
    if(currentMode == "Create"){
        var shape = newShape;
        var explanation = document.getElementById("explain");
        switch(shape){
            case "Line": 
                currentShape = "Line";
                explanation.innerHTML = "To create a Line, all you need to do is click on two points on the canvas.";
                break;
            case "Circle": 
                currentShape = "Circle";
                explanation.innerHTML = "To create a Circle, all you need to do is click on two points on the canvas." + 
                                        " One for the center point, and another for the radius";
                break;
            case "Ellipse": 
                currentShape = "Ellipse";
                explanation.innerHTML = "To create an Ellipse, all you need to do is click on three points on the canvas." + 
                                        " One for the center point, and two for radiusX and radiusY. The program will attempt " +
                                        "to determine what click is supposed to represent radiusX and radiusY, but keep in mind" +
                                        " that it will only take the respective difference, so if you have the second or third point " +
                                        "be diagonal of the center point, it will either take the y difference, or the x difference, not both.";
                break;
            case "Rectangle": 
                currentShape = "Rectangle";
                explanation.innerHTML = "To create a Rectangle, all you need to do is click on two points on the canvas.";
                break;
            case "Triangle": 
                currentShape = "Triangle";
                explanation.innerHTML = "To create a Triangle, all you need to do is click on "+
                                        "three points on the canvas. each one represents a corner.";
                break;
            case "Polygon": 
                currentShape = "Polygon";
                explanation.innerHTML = "To create a Polygon, click to add as many points as you want, "+
                                        "with the last one being a double click to signify completion.";
                break;
            case "Curve":
                currentShape = "Curve";
                explanation.innerHTML = "To create a Curve, click four points on the canvas. the order of points is," +
                                        " first point, curve point, curve point 2, last point. The curve being created is a Bezier Curve.";
                break;
            case "Square":
                currentShape = "Square";
                explanation.innerHTML = "To create a Square, click two points on the canvas. The first is the center point, and the second determines the size of each wall. "+
                                        "Keep in mind that it will only use the x position of the second point to create the square."
                break;
            case "Polyline": 
                currentShape = "Polyline";
                explanation.innerHTML = "To create a Polyline, click to add as many points as you want, "+
                                        "with the last one being a double click to signify completion.";
        }
        pointList = [];
    }
}

function modeChanger(mode){ 
    var explanation = document.getElementById("explain");
    if(drawOrder.length == 0 && mode != "Create"){
        explanation.innerHTML = "You haven't drawn any objects yet. please draw some objects before attempting to change the mode";
        document.getElementById("changeMode").value = "Create";
        return;
    }
    switch(mode){
        case "Translate": 
            currentMode = "Translate";
            explanation.innerHTML = "Select an object through the drop down menu, then you can move the object by clicking on the canvas and dragging your mouse. "+ 
                                    "The object will move in the same direction as your mouse movement";
            break;
        case "Scale": 
            currentMode = "Scale";
            explanation.innerHTML = "Select an object through the drop down menu, then you can scale the object by clicking" + 
                                    " on the canvas and dragging your mouse. By moving your mouse up and to the right you can increase the scale,"+
                                    " and moving it down and to the left will reduce the scale. Keep in mind that line and circle objects will only scale " +
                                    "by moving the mouse to the left or the right. also if you drag the mouse far enough," +
                                    " you can reverse the locations of points meaning that the scalar has become negative. This is intentional. " +
                                    "Provided that you have rotated the object you have selected, the direction to change the scale would have changed with the "+
                                    "rotation of the object, reversing when you get past 180 degrees of rotation.";
            break;
        case "Rotate": 
            currentMode = "Rotate";
            explanation.innerHTML = "Select an object through the drop down menu, then you can rotate the object by clicking on the canvas and dragging your mouse. "+
                                    "the mouse will only register x movements, rotating clockwise when moving right and rotating counter clockwise when moving left.";
            break;
        case "Create": 
            currentMode = "Create";
            shapeChanger(document.getElementById("changeType").value);
            currentListPos = -1;
            canvas.removeEventListener('mousemove', translateHelper);
            canvas.removeEventListener('mousemove', callScaleFunctions);
            canvas.removeEventListener('mousemove', rotateNormal);
            redrawObjects();
    }
    pointList = [];
}

function changeFill(newColor){
    currentFill = newColor;
}

function redrawObjects(hidColor = "#000000"){
    var context = canvas.getContext("2d");
    var hiddenContext = hiddenCanvas.getContext("2d");
    context.clearRect(0,0,canvas.width, canvas.height);
    hiddenContext.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
    for(var i = 0; i < drawOrder.length; i++){
        switch(drawOrder[i][0]){
            case "Line":
                var current = LineList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 10;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.lineWidth = 10;
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    selectList.push(current);
                } else if(!found) {
                    context.lineWidth = 4;
                    context.strokeStyle = current.color;
                }

                createLine(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.stroke();

                hiddenContext.lineWidth = 14;
                hiddenContext.strokeStyle = current.hiddenColor;
                createLine(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.stroke();
                break;
            case "Circle":
                var current = circleList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 4;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    context.lineWidth = 4;
                    selectList.push(current);
                } else if(!found) {
                    context.strokeStyle = current.color;
                    context.lineWidth = 1;
                }
                context.fillStyle = current.color;
                createCircle(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.fillStyle = current.hiddenColor;
                hiddenContext.strokeStyle = current.hiddenColor;
                createCircle(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.fill();
                hiddenContext.stroke();
                break;
            case "Ellipse":
                var current = ellipseList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 4;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    context.lineWidth = 4;
                    selectList.push(current);
                } else if(!found) {
                    context.strokeStyle = current.color;
                    context.lineWidth = 1;
                }
                context.fillStyle = current.color;
                createEllipse(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.fillStyle = current.hiddenColor;
                hiddenContext.strokeStyle = current.hiddenColor;
                createEllipse(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.fill();
                hiddenContext.stroke();
                break;
            case "Rectangle":
                var current = rectList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 4;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    context.lineWidth = 4;
                    selectList.push(current);
                } else if(!found) {
                    context.strokeStyle = current.color;
                    context.lineWidth = 1;
                }
                context.fillStyle = current.color;
                createRectangle(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.fillStyle = current.hiddenColor;
                hiddenContext.strokeStyle = current.hiddenColor;
                createRectangle(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.fill();
                hiddenContext.stroke();
                break;
            case "Triangle":
                var current = triangleList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 4;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    context.lineWidth = 4;
                    selectList.push(current);
                } else if(!found) {
                    context.strokeStyle = current.color;
                    context.lineWidth = 1;
                }
                context.fillStyle = current.color;
                createTriangle(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.fillStyle = current.hiddenColor;
                hiddenContext.strokeStyle = current.hiddenColor;
                createTriangle(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.fill();
                hiddenContext.stroke();
                break;
            case "Polygon":
                var current = polygonList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 4;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    context.lineWidth = 4;
                    selectList.push(current);
                } else if(!found) {
                    context.strokeStyle = current.color;
                    context.lineWidth = 1;
                }
                context.fillStyle = current.color;
                redrawPoly(current.scaledPoints, context, parseFloat(current.rotation));
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.fillStyle = current.hiddenColor;
                hiddenContext.strokeStyle = current.hiddenColor;
                redrawPoly(current.scaledPoints, hiddenContext, parseFloat(current.rotation));
                hiddenContext.fill();
                hiddenContext.stroke();
                break;
            case "Curve":
                var current = curveList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 10;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.lineWidth = 10;
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    selectList.push(current);
                } else if(!found) {
                    context.lineWidth = 4;
                    context.strokeStyle = current.color;
                    
                }
                context.fillStyle = current.color;
                createCurve(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.stroke();

                hiddenContext.lineWidth = 14;
                hiddenContext.strokeStyle = current.hiddenColor;
                createCurve(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.stroke();
                break;
            case "Square":
                var current = squareList[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 4;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    context.lineWidth = 4;
                    selectList.push(current);
                } else if(!found) {
                    context.strokeStyle = current.color;
                    context.lineWidth = 1;
                }
                context.fillStyle = current.color;
                createSquare(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.fill();
                context.stroke();

                hiddenContext.lineWidth = 1;
                hiddenContext.fillStyle = current.hiddenColor;
                hiddenContext.strokeStyle = current.hiddenColor;
                createSquare(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.fill();
                hiddenContext.stroke();
                break;
            case "Polyline":
                var current = polyLine[drawOrder[i][1]];
                var found = false;
                for(var j = 0; j < selectList.length; j++){
                    if(selectList[j].hiddenColor == current.hiddenColor){
                        context.lineWidth = 10;
                        context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                        found = true;
                        selectList[j] = current;
                    }
                }

                if(current.hiddenColor == hidColor && !found){
                    context.lineWidth = 10;
                    context.strokeStyle = ((current.color >= "#493737") ? "black" : "red");
                    selectList.push(current);
                } else if(!found) {
                    context.lineWidth = 4;
                    context.strokeStyle = current.color;
                    
                }
                createPolyline(current.scaledPoints, context, false, parseFloat(current.rotation));
                context.stroke();

                hiddenContext.lineWidth = 14;
                hiddenContext.strokeStyle = current.hiddenColor;
                createPolyline(current.scaledPoints, hiddenContext, false, parseFloat(current.rotation));
                hiddenContext.stroke();
        }
    }
}

function reset(){
    if(window.confirm("Do you want to save the canvas?")){
        savetoJSONFile();
    }

    selectList = [];
    //reset all the lists containing the objects on the screen
    pointList = [];
    LineList = [];
    circleList = [];
    rectList = [];
    triangleList = [];
    polygonList = [];
    ellipseList = [];
    curveList = [];
    squareList = [];
    polyLine = [];
    drawOrder = [];
    //reset numOfType for all types
    for(var i = 0; i < numOfType.length; i++)
        numOfType[i] = 0;
    canvas.getContext("2d").clearRect(0,0,canvas.width, canvas.height);
    hiddenCanvas.getContext("2d").clearRect(0,0, canvas.width, canvas.height);
    document.getElementById("changeMode").value = "Create";
    modeChanger("Create");
    copiedObjects = [];
    
    document.getElementById("pasteButton").hidden = true;
}

function copySelected(){
    if(selectList.length > 0){
        copiedObjects = [];
        for(var i = 0; i < selectList.length; i++){
            copiedObjects.push(JSON.parse(JSON.stringify(selectList[i])));
        }
        document.getElementById("pasteButton").hidden = false;
    }
}

function paste(){
    if(copiedObjects.length > 0){
        undoList.push(createJSONObject());
        for(var i = 0; i < copiedObjects.length; i++){
            var copiedObject = copiedObjects[i];
            copiedObject.hiddenColor = selectRGB();
            switch(copiedObject.type){
                case "0":
                    numOfType[0]++;
                    LineList.push(copiedObject);
                    drawOrder.push(vec2("Line", numOfType[0] - 1));
                    break;
                case "1":
                    numOfType[1]++;
                    circleList.push(copiedObject);
                    drawOrder.push(vec2("Circle", numOfType[1] - 1));
                    break;
                case "2":
                    numOfType[2]++;
                    ellipseList.push(copiedObject);
                    drawOrder.push(vec2("Ellipse", numOfType[2] - 1));
                    break;
                case "3":
                    numOfType[3]++;
                    rectList.push(copiedObject);
                    drawOrder.push(vec2("Rectangle", numOfType[3] - 1));
                    break;
                case "4":
                    numOfType[4]++;
                    polygonList.push(copiedObject);
                    drawOrder.push(vec2("Polygon", numOfType[4] - 1));
                    break;
                case "5":
                    numOfType[5]++;
                    triangleList.push(copiedObject);
                    drawOrder.push(vec2("Triangle", numOfType[5] - 1));
                    break;
                case "6":
                    numOfType[6]++;
                    curveList.push(copiedObject);
                    drawOrder.push(vec2("Curve", numOfType[6] - 1));
                    break;
                case "7":
                    numOfType[7]++;
                    squareList.push(copiedObject);
                    drawOrder.push(vec2("Square", numOfType[7] - 1));
                    break;
                case "8":
                    numOfType[8]++;
                    polyLine.push(copiedObject);
                    drawOrder.push(vec2("Polyline", numOfType[8] - 1));
            }
            copiedObjects[i] = JSON.parse(JSON.stringify(copiedObject));
        }
        redrawObjects();
    }
}

function savetoJSONFile(){
    //first create the object to be stored in the json file
    var jsonToSend = JSON.stringify(createJSONObject());
    var download = document.createElement("a");
    var text = encodeURIComponent(jsonToSend);
    download.setAttribute("download", "canvas.json");
    download.setAttribute("href", "data:application/octet-stream," + text);
    download.click();
}

function createJSONObject(){
    return JSON.parse(JSON.stringify({
        lineList:LineList,
        circleList:circleList,
        rectList:rectList,
        triangleList:triangleList,
        polygonList:polygonList,
        ellipseList:ellipseList,
        curveList:curveList,
        squareList:squareList,
        polyLine:polyLine,
        drawOrder:drawOrder,
        numOfType:numOfType,
        canvas:true,
        selectList:selectList
    }));
}

function saveCanvasAsImage(){
    var temp = [];
    for(var i = 0; i < selectList.length; i++){
        temp.push(selectList[i]);
    }
    selectList = [];
    redrawObjects();
    var image = document.createElement("a");
    image.setAttribute("download", "Canvas.png");
    image.setAttribute("href", canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
    image.click();
    for(var i = 0; i < temp.length; i++){
        selectList.push(temp[i]);
    }
    redrawObjects();
}

function setupCanvas(JSONToLoad, newLoad = false){
    LineList = JSONToLoad.lineList;
    circleList = JSONToLoad.circleList;
    rectList = JSONToLoad.rectList;
    triangleList = JSONToLoad.triangleList;
    polygonList = JSONToLoad.polygonList;
    ellipseList = JSONToLoad.ellipseList;
    curveList = JSONToLoad.curveList;
    squareList = JSONToLoad.squareList;
    polyLine = JSONToLoad.polyLine;
    drawOrder = JSONToLoad.drawOrder;
    numOfType = JSONToLoad.numOfType;
    selectList = JSONToLoad.selectList;
    listList = [LineList, circleList, rectList, triangleList, polygonList, ellipseList, curveList, squareList, polyLine];
    if(newLoad){
        selectList = [];
        RGB = [0,0,0];
        for(var i = 0; i < listList.length; i++){
            for(var j = 0; j < listList[i].length; j++){
                listList[i][j].hiddenColor = selectRGB();
            }
        }
    }
    redrawObjects();
}

function undo(){
    if(undoList.length > 0){
        setupCanvas(undoList.pop());
        console.log(selectList);
    }
}

function selectRGB(){
    RGB[0]++;
    if(RGB[0] > 255){
        RGB[0] = 0;
        RGB[1]++;
        if(RGB[1] > 255){
            RGB[1] = 0;
            RGB[2]++;
            if(RGB[2] > 255){
                window.alert("You have hit the limit for the amount of objects that you can draw on this website, please save the canvas to a json file and reimport it");
                return;
            }
        }
    }
    return "#" + ("000000" + rgbToHex(RGB[0], RGB[1], RGB[2])).slice(-6);
}

function rgbToHex(r, g, b) {
    return ((r << 16) | (g << 8) | b).toString(16);
}