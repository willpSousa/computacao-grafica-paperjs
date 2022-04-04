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
var pointHitOptions = { segments: false, stroke: false, fill: true, tolerance: 1 };
var pointsControl = [];
var optionSelected = 1;
var selectedHit;
var path;
var tipoCurva = "bezier"; // inicializando

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

            selectedHit.item.data.text.content = '(' + selectedHit.item.position.x + ', ' + selectedHit.item.position.y + ')';
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

    if (hitResult) {
        if (hitResult.type == 'fill' && !(hitResult.item instanceof PointText)) {
            selectedHit = hitResult;
        }
        return;
    }

    if ((tipoCurva == 'bezier' || tipoCurva == 'hermite') && pointsControl.length > 3) {
        return
    }

    toAdd = Path.Circle({
        center: event.point,
        radius: config.pointRadius,
        fillColor: paper.Color.random(),
        data: {
            id: Math.floor(Math.random() * 10000),
            class: 'points',
            text: new PointText({
                point: { x: event.point.x, y: event.point.y - 15 },
                content: '('  + event.point.x + ', ' + event.point.y + ')',
                justification: 'center'
            }),
        }
    });

    pointsControl.push(toAdd);
    if (pointsControl.length > 2) {
        calculaCurva();
    }
    return;
}

//#endregion

//#region MyFunctions

function calculaCurva() {
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
    }
}

function initializePath() {
    if (!path) {
        path = new Path();
    }

    if (path) {
        path.remove();
        path = new Path();
    }
    path.strokeColor = 'orange';
    path.strokeWidth = config.pathStroke;
}


function calculaBezier() {
    if (pointsControl.length > 2) {
        path.add(pointsControl[0].position.clone());
        path.add(pointsControl[pointsControl.length -1].position.clone());

        if (pointsControl.length == 3) {
            // aplica bezier quadrático
            path.segments.forEach(function(segment) {
                var calculatedPoint = { 
                    x: pointsControl[pointsControl.length -2].position.x - segment.point.x,
                    y: pointsControl[pointsControl.length -2].position.y - segment.point.y,
                };
                segment.handleOut = calculatedPoint;
            });
        } else if (pointsControl.length == 4) {
            // aplica bezier cúbico
            path.segments.forEach(function(segment, index) {
                var calculatedPoint = { 
                    x: pointsControl[index + 1].position.x - segment.point.x,
                    y: pointsControl[index + 1].position.y - segment.point.y,
                };
                // necessário somente para o ponto
                segment.handleIn = calculatedPoint;
                segment.handleOut = calculatedPoint;
            });
        }
    }
}

function calculaHermite() {
    if (pointsControl.length < 4) {
        return;
    }
    var steps = 1;
    var p1 = { x: pointsControl[0].position.x, y: pointsControl[0].position.y  };
    var p2 = { x: pointsControl[1].position.x, y: pointsControl[1].position.y };
    var t1 = { x: pointsControl[2].position.x, y: pointsControl[2].position.y };
    var t2 = { x: pointsControl[3].position.x, y: pointsControl[3].position.y };
    initializePath();
    for (var t = 0; t < steps; t+=0.01)
    {
        var s = t / steps;
        var h1 = 2 * Math.pow(s, 3) - 3 * Math.pow(s, 2) + 1;
        var h2 = -2 * Math.pow(s, 3) + 3 * Math.pow(s, 2);
        var h3 = Math.pow(s, 3) - 2* Math.pow(s, 2) + s;
        var h4 =  Math.pow(s, 3) -  Math.pow(s, 2);

        var p = {x:0,y:0};
        p.x += h1 * p1.x;
        p.y += h1 * p1.y;

        p.x += h2 * p2.x;
        p.y += h2 * p2.y;

        p.x += h3 * (t1.x - p1.x);
        p.y += h3 * (t1.y - p1.y);

        p.x += h4 * (t2.x - p2.x);
        p.y += h4 * (t2.y - p2.y);

        p = { x: p.x, y: p.y };
        path.add(new Point(p));
        
    }
    
}

function calculaBSpline(degree) {
    if (pointsControl.length < 4) {
        return;
    }
    // mapeamento para representação vetorial de um ponto (x,y)
    var points = pointsControl.map(function(point) { return [point.position.x, point.position.y] });
    for(var t=0; t<1; t+=0.01) {
        var point = getBSplinePoint(t, degree, points);
        path.add(new Point(point[0], point[1]));
    }
}

function getBSplinePoint(t, grau, pontos) {
    var i,j,s,l;
    var n = pontos.length;
    var d = pontos[0].length
  
    if(grau < 1) throw new Error('grau deve ser maior que 1');
    if(grau > (n-1)) throw new Error('grau deve ser menor ou igual a Quantidade de pontos - 1');
  
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

//#endregion

function changeType(curva) {
    var cleared = false;
    if (!((tipoCurva == 'bspline' && curva == 'bspline-cubic') || (curva == 'bspline' && tipoCurva == 'bspline-cubic'))) {
        clearDraw();
        cleared = true;
    }
    tipoCurva = curva;

    if (!cleared) {
        calculaCurva();
    }
}

function clearDraw() {
    paper.project.activeLayer.removeChildren();
    paper.view.draw();
    pointsControl = [];
}

// set function to acess on index.html
window.changeType = changeType;
window.clearDraw = clearDraw;