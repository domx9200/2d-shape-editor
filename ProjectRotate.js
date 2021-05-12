function rotateNormal(event){
    //will be -1, 0, or 1 in most cases
    //js sin and cos handle negative degrees without any issue
    var rotateDiff = (event.clientX - rect.left) - lastTransLoc[0];
    lastTransLoc = vec2(event.clientX - rect.left, event.clientY - rect.top);
    for(var i = 0; i < selectList.length; i++){
        var newRotation = parseFloat(selectList[i].rotation) + rotateDiff;
        selectList[i].rotation = newRotation;
    }
    redrawObjects();
}

//calculates the rotated point
function rotateCalc(origPoint, xPivot, yPivot, angle){
    var xShift = origPoint[0] - xPivot;
    var yShift = origPoint[1] - yPivot;
    var newPoint = vec2();
    newPoint[0] = xPivot + (xShift * Math.cos(angle))
                   - (yShift * Math.sin(angle));
    newPoint[1] = yPivot + (xShift * Math.sin(angle))
                   + (yShift * Math.cos(angle));
    return newPoint;
}

function calcCenter(points){
    var centerPoint = vec2(0,0);
    for(var i = 0; i < points.length; i++){
        centerPoint = add(centerPoint, points[i]);
    }
    centerPoint[0] /= points.length;
    centerPoint[1] /= points.length;
    return centerPoint;
}

function applyRotation(points, angle = 0, centerPoint = 0){
    if(angle == 0){
        return points;
    }
    if(centerPoint == 0){
        centerPoint = calcCenter(points);
    }
    //because JS likes to make it REALLY HARD to seperate the values
    var newPoints = [];
    for(var i = 0; i < points.length; i++){
        newPoints.push(rotateCalc(points[i], centerPoint[0], centerPoint[1], (angle * Math.PI) / 180));
    }
    return newPoints;
}