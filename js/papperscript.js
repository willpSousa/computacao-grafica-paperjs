//#region Declarações

var config = {
    pathStroke: 2,
    pointRadius: 7
}
var defaultHitOptions = {
	segments: false,
	stroke: false,
	fill: true,
	tolerance: 5
};
var segmentPointHitOptions = { segments: true, stroke: false, fill: false, tolerance: 1 };
var pointsControl = {
    points: [],
    controls: [],
};
var optionSelected = 1;
var selectedHit;

var pathsMap = {
    'bezier': null,
    'hermite': null ,
    'bspline': null,
    'bspline-cubic': null
};

//#endregion

//#region Eventos papper


function onMouseDrag(event) {
    
    var delta = { x: event.delta.x, y: event.delta.y };
    
	if (selectedHit) {
        if (selectedHit) {
            // x
            if (selectedHit.item.position.x + delta.x < 0) {
                delta.x = 0;
            } else if(selectedHit.item.position.x + delta.x > view.size.width) {
                delta.x = 0;
            }
            //Y
            if (selectedHit.item.position.y + delta.y < 0) {
                delta.y = 0;
            } else if(selectedHit.item.position.y + delta.y > view.size.height) {
                delta.y = 0;
            }
            
            selectedHit.item.position += delta;
            if (selectedHit.item.data.text) {
                selectedHit.item.data.text.position += delta;
            }
            if(selectedHit.item.data.segment) {
                selectedHit.item.data.segment.point += delta;
            }

            var label = '';
            switch (selectedHit.item.data.class) {
                case 'points':
                    label = 'Point ';
                    break;
                case 'controls':
                    label = 'Control Point ';
                    break;
            }
            selectedHit.item.data.text.content = label + '(' + selectedHit.item.position.x + ', ' + selectedHit.item.position.y + ')';
        }
        
        calculaCurva();
    }
}

function onMouseDown(event) {
    var toAdd;
    var hitResult = project.hitTest(event.point, defaultHitOptions);

    if (!hitResult) {
        selectedHit = null;
    } else if(hitResult.type == 'fill' && hitResult.item instanceof PointText) {
        return;
    }

    if (event.modifiers.shift) {
        if (hitResult && hitResult.type == 'fill') {
            var item = pointsControl[hitResult.item.data.class].find(function(i) { return i.data.id == hitResult.item.data.id; });
            pointsControl[hitResult.item.data.class].splice(pointsControl[hitResult.item.data.class].indexOf(item), 1);
            hitResult.item.remove();
            if (hitResult.item.data.text) {
                hitResult.item.data.text.remove();
            }
            
            if (hitResult.item.data.segment) {
                hitResult.item.data.segment.remove();
            }

            calculaCurva();
        };
        return;
    }

    if (hitResult) {
        if (hitResult.type == 'fill' && !(hitResult.item instanceof PointText)) {
            selectedHit = hitResult;
        }
        return;
    }

    if (pointsControl.points.length < 2) {
        pathsMap['bezier'].add(new Point(event.point.x , event.point.y));
        
        toAdd = Path.Circle({
            center: event.point,
            radius: config.pointRadius,
            fillColor: paper.Color.random(),
            data: {
                id: Math.floor(Math.random() * 10000),
                class: 'points',
                text: new PointText({
                    point: { x: event.point.x, y: event.point.y - 15 },
                    content: 'Point ('  + event.point.x + ', ' + event.point.y + ')',
                    justification: 'center'
                }),
                segment: pathsMap['bezier'].segments[pathsMap['bezier'].segments.length - 1]
            }
        });

        pointsControl.points.push(toAdd);
        calculaCurva();
        return;
    }

    if (pointsControl.points.length == 2 && pointsControl.controls.length < 2) {
        toAdd = Path.Circle({
            center: event.point,
            radius: config.pointRadius,
            fillColor: paper.Color.random(),
            data: {
                id: Math.floor(Math.random() * 10000),
                class: 'controls',
                text: new PointText({
                    point: { x: event.point.x, y: event.point.y - 15 },
                    content: 'Control Point ('  + event.point.x + ', ' + event.point.y + ')',
                    justification: 'center'
                })
            }
        });
        pointsControl.controls.push(toAdd);
        calculaCurva();
        return;
    }
}

//#endregion

//#region MyFunctions

function calculaCurva() {
    var tipoCurva = $('#tipo-curva').val();
    initializePath();
    switch (tipoCurva) {
        case 'bezier':
            calculaBezier();
            break;
        case 'hermite':
            calculaHermite();
            break;
        case 'bspline':
            calculaBSpline(2);
            break;
        case 'bspline-cubic':
            calculaBSpline(3);
            break;
        default:
            break;
    }
}

function hideDiffPaths(tipo) {
    Object.keys(pathsMap).forEach(function(key) {
        if (key !== tipo) {
            if (pathsMap[key]) {
                pathsMap[key].visible = false;
            }
        } else {
            if (pathsMap[key]) {
                pathsMap[key].visible = true;
            }
        }
    });
}

function initializePath() {
    var tipoCurva = $('#tipo-curva').val();
    hideDiffPaths(tipoCurva);
    if (tipoCurva != 'bezier' && pathsMap[tipoCurva]) {
        pathsMap[tipoCurva].remove();
    }
    if (tipoCurva == 'bezier' && !pathsMap[tipoCurva] || tipoCurva !== 'bezier') {
        pathsMap[tipoCurva] = new Path();
    }
    pathsMap[tipoCurva].strokeColor = 'orange';
    pathsMap[tipoCurva].strokeWidth = config.pathStroke;
}


function calculaBezier() {
    if (pointsControl.points.length >= 2) {
        pathsMap['bezier'].segments.forEach(function(item, index) {
            // remove os vetores que foram aplicados para resetar a curva
            item.clearHandles();
        });
        if (pointsControl.controls.length == 1) {
            // aplica bezier quadrático
            pathsMap['bezier'].segments.forEach(function(segment, index) {
                var calculatedPoint = { 
                    x: pointsControl.controls[0].position.x - segment.point.x,
                    y: pointsControl.controls[0].position.y - segment.point.y,
                };
                segment.handleOut = calculatedPoint;
            });
        } else if (pointsControl.controls.length == 2) {
            // aplica bezier cúbico
            pathsMap['bezier'].segments.forEach(function(segment, index) {
                var calculatedPoint = { 
                    x: pointsControl.controls[index].position.x - segment.point.x,
                    y: pointsControl.controls[index].position.y - segment.point.y,
                };
                // necessário somente para o ponto
                segment.handleIn = calculatedPoint;
                segment.handleOut = calculatedPoint;
            });
        }
    }
}

function calculaHermite() {
    if (pointsControl.controls.length < 1    || pointsControl.points.length < 2) {
        return;
    }
    console.log(pointsControl);
    initializePath();
    // view.size.width
    // view.size.height
    var P1 = { x: pointsControl.points[0].position.x / view.size.width, y: pointsControl.points[0].position.y / view.size.height  };
    var P2 = { x: pointsControl.points[1].position.x / view.size.width, y: pointsControl.points[1].position.y / view.size.height  };
    var T1 = { x: pointsControl.controls[0].position.x / view.size.width, y: pointsControl.controls[0].position.y / view.size.height };
    var T2;
    if (pointsControl.controls.length < 2) {
        T2 = { x: pointsControl.points[1].position.x / view.size.width, y: pointsControl.points[1].position.y / view.size.height };
    } else {
        T2 = { x: pointsControl.controls[1].position.x / view.size.width, y: pointsControl.controls[1].position.y / view.size.height };
    }
    var steps = 1;

    for (var t = 0; t < steps; t+=0.01)
    {
        var s = t / steps;
        var h1 = 2 * Math.pow(s, 3) - 3 * Math.pow(s, 2) + 1;
        var h2 = -2 * Math.pow(s, 3) + 3 * Math.pow(s, 2);
        var h3 = Math.pow(s, 3) - 2* Math.pow(s, 2) + s;
        var h4 =  Math.pow(s, 3) -  Math.pow(s, 2);
        var p = { x: 0, y: 0 };

        p.x += h1 * P1.x;
        p.y += h1 * P1.y;

        p.x += h2 * P2.x;
        p.y += h2 * P2.y;

        p.x += h3 * (T1.x - P1.x);
        p.y += h3 * (T1.y - P1.y);

        p.x += h4 * (T2.x - P2.x);
        p.y += h4 * (T2.y - P2.y);

        p = { x: p.x * view.size.width, y: p.y * view.size.height };
        pathsMap['hermite'].add(new Point(p));
    }
    
}

function calculaBSpline(degree) {
    if (pointsControl.points.length + pointsControl.controls.length < 4) {
        return;
    }
    var points = [
        [ pointsControl.points[0].position.x, pointsControl.points[0].position.y ],
        [ pointsControl.points[1].position.x, pointsControl.points[1].position.y ],
        [ pointsControl.controls[0].position.x, pointsControl.controls[0].position.y ],
        [ pointsControl.controls[1].position.x, pointsControl.controls[1].position.y ],
    ];
    for(var t=0; t<1; t+=0.01) {
        var point = getBSplinePoint(t, degree, points);
        if (degree == 2) {
            pathsMap['bspline'].add(new Point(point[0], point[1]));
        } else {
            pathsMap['bspline-cubic'].add(new Point(point[0], point[1]));
        }
    }
}


//#endregion

initializePath();



function getBSplinePoint(t, grau, pontos) {
    var i,j,s,l;
    var n = pontos.length;
    var d = pontos[0].length
  
    if(grau < 1) throw new Error('degree must be at least 1 (linear)');
    if(grau > (n-1)) throw new Error('degree must be less than or equal to point count - 1');
  
    var tamanhos;
    if(!tamanhos) {
      tamanhos = [];
      for(i=0; i<n; i++) {
        tamanhos[i] = 1;
      }
    }
  
    if(!nos) {
      // criar vetor de nós com tamanho [n + grau + 1]
      var nos = [];
      for(i=0; i<n+grau+1; i++) {
        nos[i] = i;
      }
    }
  
    var dominio = [
      grau,
      nos.length-1 - grau
    ];
  
    // remap t to the domain where the spline is defined
    var low  = nos[dominio[0]];
    var high = nos[dominio[1]];
    t = t * (high - low) + low;
  
    if(t < low || t > high) throw new Error('out of bounds');
  
    // find s (the spline segment) for the [t] value provided
    for(s=dominio[0]; s<dominio[1]; s++) {
      if(t >= nos[s] && t <= nos[s+1]) {
        break;
      }
    }
  
    // convert points to homogeneous coordinates
    var v = [];
    for(i=0; i<n; i++) {
      v[i] = [];
      for(j=0; j<d; j++) {
        v[i][j] = pontos[i][j] * tamanhos[i];
      }
      v[i][d] = tamanhos[i];
    }
  
    // l (level) goes from 1 to the curve degree + 1
    var alpha;
    for(l=1; l<=grau+1; l++) {
      // build level l of the pyramid
      for(i=s; i>s-grau-1+l; i--) {
        alpha = (t - nos[i]) / (nos[i+grau+1-l] - nos[i]);
  
        // interpolate each component
        for(j=0; j<d+1; j++) {
          v[i][j] = (1 - alpha) * v[i-1][j] + alpha * v[i][j];
        }
      }
    }
  
    // convert back to cartesian and return
    var result = result || [];
    for(i=0; i<d; i++) {
      result[i] = v[s][i] / v[s][d];
    }
  
    return result;
}