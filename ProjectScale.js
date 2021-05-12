function callScaleFunctions(event){
    for(var i = 0; i < selectList.length; i++){
        switch(selectList[i].type){
            case "0":
                scaleLine(event, i);
                break;
            case "1":
                scaleCircle(event, i);
                break;
            case "2":
                scaleEllipse(event, i);
                break;
            case "3":
                scaleRect(event, i);
                break;
            case "4":
                scalePoly(event, i);
                break;
            case "5":
                scaleTri(event, i);
                break;
            case "6":
                scaleCurve(event, i);
                break;
            case "7":
                scaleSquare(event, i);
                break;
            case "8":
                scalePolyline(event, i);
        }
    }
    lastTransLoc = vec2(event.clientX - rect.left, event.clientY - rect.top);
    
}

function scaleLine(event, objIndex){
    var scaleDirection = (event.clientX - rect.left) - lastTransLoc[0];
    var newScale = parseFloat(selectList[objIndex].Scale) + setupScalar(scaleDirection);
    selectList[objIndex].Scale = newScale;

    var basePoints = selectList[objIndex].points;
    var centerPoint = vec2((basePoints[0][0] + basePoints[1][0]) / 2, (basePoints[0][1] + basePoints[1][1]) / 2);
    selectList[objIndex].scaledPoints[0] = scalePoint(centerPoint, basePoints[0], vec2(newScale, newScale));
    selectList[objIndex].scaledPoints[1] = scalePoint(centerPoint, basePoints[1], vec2(newScale, newScale));
    redrawObjects();
}

function scaleCircle(event, objIndex){
    var direction = (event.clientX - rect.left) - lastTransLoc[0];
    var newScale = parseFloat(selectList[objIndex].Scale) + setupScalar(direction);
    selectList[objIndex].Scale = newScale;

    //in a circle the center point is the first point, so I don't need to find the center.
    //so I can just scale the second point and be on my way.
    selectList[objIndex].scaledPoints[1] = scalePoint(selectList[objIndex].points[0], selectList[objIndex].points[1], vec2(newScale, newScale));
    redrawObjects();
}

//I originally applied the fix to make scaling easier, but in all honesty, it just made it worse.
//so I reverted it.
function scaleEllipse(event, objIndex){
    var dirX = (event.clientX - rect.left) - lastTransLoc[0];
    var dirY = ((event.clientY - rect.top) - lastTransLoc[1]) * -1;
    var newScaleX = parseFloat(selectList[objIndex].ScaleX) + setupScalar(dirX);
    var newScaleY = parseFloat(selectList[objIndex].ScaleY) + setupScalar(dirY);
    selectList[objIndex].ScaleX = newScaleX;
    selectList[objIndex].ScaleY = newScaleY;

    //in a Ellipse the center point is the first point, so I don't need to find the center.
    //so I can just scale the second and third points and be on my way.
    selectList[objIndex].scaledPoints[1] = scalePoint(selectList[objIndex].points[0], selectList[objIndex].points[1], vec2(newScaleX, newScaleY));
    selectList[objIndex].scaledPoints[2] = scalePoint(selectList[objIndex].points[0], selectList[objIndex].points[2], vec2(newScaleX, newScaleY));
    redrawObjects();
}
 
function scaleRect(event, objIndex){
    var dirX = (event.clientX - rect.left) - lastTransLoc[0];
    var dirY = ((event.clientY - rect.top) - lastTransLoc[1]) * -1;
    
    var newScaleX = parseFloat(selectList[objIndex].ScaleX) + setupScalar(dirX);
    var newScaleY = parseFloat(selectList[objIndex].ScaleY) + setupScalar(dirY);
    selectList[objIndex].ScaleX = newScaleX;
    selectList[objIndex].ScaleY = newScaleY;

    var basePoints = selectList[objIndex].points;
    var centerPoint = calcCenter(basePoints);
    selectList[objIndex].scaledPoints[0] = scalePoint(centerPoint, basePoints[0], vec2(newScaleX, newScaleY));
    selectList[objIndex].scaledPoints[1] = scalePoint(centerPoint, basePoints[1], vec2(newScaleX, newScaleY));
    selectList[objIndex].scaledPoints[2] = scalePoint(centerPoint, basePoints[2], vec2(newScaleX, newScaleY));
    selectList[objIndex].scaledPoints[3] = scalePoint(centerPoint, basePoints[3], vec2(newScaleX, newScaleY));
    redrawObjects();
}

function scaleTri(event, objIndex){
    var dirX = (event.clientX - rect.left) - lastTransLoc[0];
    var dirY = ((event.clientY - rect.top) - lastTransLoc[1]) * -1;

    var newScaleX = parseFloat(selectList[objIndex].ScaleX) + setupScalar(dirX);
    var newScaleY = parseFloat(selectList[objIndex].ScaleY) + setupScalar(dirY);
    selectList[objIndex].ScaleX = newScaleX;
    selectList[objIndex].ScaleY = newScaleY;

    //since there are three points, I need to change the averaging to account for all three.
    var basePoints = selectList[objIndex].points;
    var centerPoint = calcCenter(basePoints);
    selectList[objIndex].scaledPoints[0] = scalePoint(centerPoint, basePoints[0], vec2(newScaleX, newScaleY));
    selectList[objIndex].scaledPoints[1] = scalePoint(centerPoint, basePoints[1], vec2(newScaleX, newScaleY));
    selectList[objIndex].scaledPoints[2] = scalePoint(centerPoint, basePoints[2], vec2(newScaleX, newScaleY));
    redrawObjects();
}

function scalePoly(event, objIndex){
    var dirX = (event.clientX - rect.left) - lastTransLoc[0];
    var dirY = ((event.clientY - rect.top) - lastTransLoc[1]) * -1;

    var newScaleX = parseFloat(selectList[objIndex].ScaleX) + setupScalar(dirX);
    var newScaleY = parseFloat(selectList[objIndex].ScaleY) + setupScalar(dirY);
    selectList[objIndex].ScaleX = newScaleX;
    selectList[objIndex].ScaleY = newScaleY;

    //since polygons have an unknown amount of points, a loop is needed to find the center point.
    var centerX = 0, centerY = 0;
    for(var i = 0; i < selectList[objIndex].points.length; i++){
        centerX += selectList[objIndex].points[i][0];
        centerY += selectList[objIndex].points[i][1];
    }
    centerX /= selectList[objIndex].points.length;
    centerY /= selectList[objIndex].points.length;
    var centerPoint = vec2(centerX, centerY);

    //again since there is an unknown amount of points, a loop is needed to scale all points.
    for(var i = 0; i < selectList[objIndex].points.length; i++){
        selectList[objIndex].scaledPoints[i] = scalePoint(centerPoint, selectList[objIndex].points[i], vec2(newScaleX, newScaleY));
    }
    redrawObjects();
}

function scaleCurve(event, objIndex){
    var dirX = (event.clientX - rect.left) - lastTransLoc[0];
    var dirY = ((event.clientY - rect.top) - lastTransLoc[1]) * -1;

    var newScaleX = parseFloat(selectList[objIndex].ScaleX) + setupScalar(dirX);
    var newScaleY = parseFloat(selectList[objIndex].ScaleY) + setupScalar(dirY);
    selectList[objIndex].ScaleX = newScaleX;
    selectList[objIndex].ScaleY = newScaleY;

    var basePoints = selectList[objIndex].points;
    var centerPoint = calcCenter(basePoints);
    //points 0 and 3 are scaled by x and points 1 and 2 are scaled by y
    selectList[objIndex].scaledPoints[0] = scalePoint(centerPoint, basePoints[0], vec2(newScaleX, newScaleX));
    selectList[objIndex].scaledPoints[3] = scalePoint(centerPoint, basePoints[3], vec2(newScaleX, newScaleX));
    selectList[objIndex].scaledPoints[1] = scalePoint(centerPoint, basePoints[1], vec2(newScaleY, newScaleY));
    selectList[objIndex].scaledPoints[2] = scalePoint(centerPoint, basePoints[2], vec2(newScaleY, newScaleY));
    redrawObjects();
}

function scaleSquare(event, objIndex){
    var direction = (event.clientX - rect.left) - lastTransLoc[0];
    var newScale = parseFloat(selectList[objIndex].Scale) + setupScalar(direction);
    selectList[objIndex].Scale = newScale;
    
    var basePoints = selectList[objIndex].points;
    var centerPoint = calcCenter(basePoints);
    selectList[objIndex].scaledPoints[0] = scalePoint(centerPoint, basePoints[0], vec2(newScale, newScale));
    selectList[objIndex].scaledPoints[1] = scalePoint(centerPoint, basePoints[1], vec2(newScale, newScale));
    selectList[objIndex].scaledPoints[2] = scalePoint(centerPoint, basePoints[2], vec2(newScale, newScale));
    selectList[objIndex].scaledPoints[3] = scalePoint(centerPoint, basePoints[3], vec2(newScale, newScale));
    redrawObjects();
}

function scalePolyline(event, objIndex){
    var dirX = (event.clientX - rect.left) - lastTransLoc[0];
    var dirY = ((event.clientY - rect.top) - lastTransLoc[1]) * -1;

    var newScaleX = parseFloat(selectList[objIndex].ScaleX) + setupScalar(dirX);
    var newScaleY = parseFloat(selectList[objIndex].ScaleY) + setupScalar(dirY);
    selectList[objIndex].ScaleX = newScaleX;
    selectList[objIndex].ScaleY = newScaleY;

    var centerX = 0, centerY = 0;
    for(var i = 0; i < selectList[objIndex].points.length; i++){
        centerX += selectList[objIndex].points[i][0];
        centerY += selectList[objIndex].points[i][1];
    }
    centerX /= selectList[objIndex].points.length;
    centerY /= selectList[objIndex].points.length;
    var centerPoint = vec2(centerX, centerY);

    for(var i = 0; i < selectList[objIndex].points.length; i++){
        selectList[objIndex].scaledPoints[i] = scalePoint(centerPoint, selectList[objIndex].points[i], vec2(newScaleX, newScaleY));
    }
    redrawObjects();
}

function setupScalar(scaleDirection){
    if(scaleDirection > 0)
        return 0.02;
    else if(scaleDirection < 0)
        return -0.02;
    return 0;
}

function scalePoint(point1, point2, Scalars){
    return add(point1, mult(subtract(point2, point1), Scalars));
}

