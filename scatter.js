// script.js

// Matter.js aliases
const { Engine, Render, Runner, World, Bodies, Body, Events, Query } = Matter;

let engine, render, runner;
let circles = [], dataX = [], dataY = [];
let axisBodies = [], meanLineBody = null;
let bounds, scales, layout;
let hovered = null, isDragging = false;
let dragOffset = { x: 0, y: 0 };

// Initialize engine, renderer, and event hooks
function initMatter() {
  engine = Engine.create();
  engine.gravity.y = 0;

  // After every physics tick, update inputs & recolor
  Events.on(engine, 'afterUpdate', () => {
    if (meanLineBody) {
      updateLineParams();
      updateCircleColors();
    }
  });

  const canvas = document.getElementById('scatterPlot');
  render = Render.create({
    canvas, engine,
    options: { width: canvas.width, height: canvas.height, wireframes: false, background: '#fff' }
  });
  Render.run(render);

  runner = Runner.create();
  Runner.run(runner, engine);

  Events.on(render, 'afterRender', () => {
    drawTicks();
    drawTooltip();
  });

  // Hover & drag logic for the line
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect(),
          mx = e.clientX - r.left,
          my = e.clientY - r.top;
    hovered = Query.point(circles, { x: mx, y: my })[0] || null;
    if (isDragging && meanLineBody) {
      Body.setPosition(meanLineBody, { x: mx - dragOffset.x, y: my - dragOffset.y });
      // inputs & recolor update in afterUpdate
    }
  });
  canvas.addEventListener('mousedown', e => {
    const r = canvas.getBoundingClientRect(),
          mx = e.clientX - r.left,
          my = e.clientY - r.top;
    if (meanLineBody && isPointOnLine(mx, my)) {
      isDragging = true;
      dragOffset.x = mx - meanLineBody.position.x;
      dragOffset.y = my - meanLineBody.position.y;
    }
  });
  canvas.addEventListener('mouseup', () => { isDragging = false; });
}

function isPointOnLine(x, y) {
  const len = meanLineBody.bounds.max.x - meanLineBody.bounds.min.x,
        a = meanLineBody.angle,
        dx = x - meanLineBody.position.x,
        dy = y - meanLineBody.position.y,
        lx = dx*Math.cos(-a) - dy*Math.sin(-a),
        ly = dx*Math.sin(-a) + dy*Math.cos(-a);
  return Math.abs(lx) <= len/2 + 5 && Math.abs(ly) <= 10;
}

function clearAll() {
  circles.forEach(c => World.remove(engine.world, c));
  circles = [];
  if (meanLineBody) {
    World.remove(engine.world, meanLineBody);
    meanLineBody = null;
  }
  axisBodies.forEach(a => World.remove(engine.world, a));
  axisBodies = [];
  ['slope','intercept','xValues','yValues','mse','msr','sst','r2','pvalue']
    .forEach(id => document.getElementById(id).value = '');
}

function gaussian() {
  let u=0,v=0;
  while(!u) u=Math.random();
  while(!v) v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

function shiftPositives(arr) {
  const mn = Math.min(...arr);
  return mn<0 ? arr.map(v=>v-mn+0.1) : arr;
}

// Data generators
function genCorr(corr, intercept, n) {
  corr = Number(corr);
  if (!isFinite(corr) || corr<=-1 || corr>=1) corr = 0.5;
  if (Math.abs(corr) < 1e-6) return genRandom(n);
  const x=[], y=[], noiseF = Math.sqrt((1-corr*corr)/(corr*corr));
  for (let i=0;i<n;i++){
    const xi = gaussian();
    x.push(xi);
    y.push(corr*xi + intercept + gaussian()*noiseF);
  }
  return { x: shiftPositives(x), y: shiftPositives(y) };
}

function genPerfect(slope, intercept, n) {
  const x=[], y=[];
  for (let i=0;i<n;i++){
    const xi = gaussian();
    x.push(xi);
    y.push(slope*xi + intercept);
  }
  return { x: shiftPositives(x), y: shiftPositives(y) };
}

function genRandom(n) {
  const x=[], y=[];
  for (let i=0;i<n;i++){
    x.push(gaussian());
    y.push(gaussian());
  }
  return { x: shiftPositives(x), y: shiftPositives(y) };
}

function plot({ x, y }) {
  clearAll();
  dataX = [...x];
  dataY = [...y];
  const { width, height } = render.options, m = 50;
  const minX = Math.min(...x), maxX = Math.max(...x),
        minY = Math.min(...y), maxY = Math.max(...y);
  const sX = (width-2*m)/(maxX-minX),
        sY = (height-2*m)/(maxY-minY);
  bounds = { minX, maxX, minY, maxY };
  scales = { sX, sY };
  layout = { m, width, height };

  axisBodies = [
    Bodies.rectangle(width/2, height-m, width-2*m, 2, { isStatic:true, render:{fillStyle:'#000'} }),
    Bodies.rectangle(m, height/2, 2, height-2*m, { isStatic:true, render:{fillStyle:'#000'} })
  ];
  World.add(engine.world, axisBodies);

  circles = x.map((xi,i)=>{
    const px = m + (xi-minX)*sX,
          py = height - m - (y[i]-minY)*sY;
    const c = Bodies.circle(px,py,8,{ isStatic:true, render:{fillStyle:'#E53888'} });
    c._dataIdx = i;
    return c;
  });
  World.add(engine.world, circles);

  // dynamic line with infinite inertia
  const meanY = dataY.reduce((a,b)=>a+b,0)/dataY.length;
  const lineY = height - m - (meanY-minY)*sY;
  meanLineBody = Bodies.rectangle(
    width/2, lineY,
    width-2*m, 6,
    { inertia: Infinity, frictionAir: 0.02, render:{fillStyle:'#000000'} }
  );
  World.add(engine.world, meanLineBody);

  refreshBoxes();
  updateLineParams();
  //updateCircleColors();
}

function updateLineParams() {
  const { sX, sY } = scales, { m, height } = layout,
        a = meanLineBody.angle,
        sx = meanLineBody.position.x,
        sy = meanLineBody.position.y;
  const x0 = (sx-m)/sX + bounds.minX,
        y0 = (height-m-sy)/sY + bounds.minY,
        slope = -(sX/sY)*Math.tan(a),
        intercept = y0 - slope*x0;
  document.getElementById('slope').value = slope.toFixed(3);
  document.getElementById('intercept').value = intercept.toFixed(3);
}

function updateCircleColors() {
  const n = dataX.length,
        meanX = dataX.reduce((a,b)=>a+b,0)/n,
        meanY = dataY.reduce((a,b)=>a+b,0)/n,
        cov   = dataX.reduce((s,x,i)=>s+(x-meanX)*(dataY[i]-meanY),0),
        varX  = dataX.reduce((s,x)=>s+(x-meanX)**2,0),
        bestSlope = cov/varX,
        bestInt   = meanY - bestSlope*meanX,
        currS     = parseFloat(document.getElementById('slope').value),
        currI     = parseFloat(document.getElementById('intercept').value),
        ok        = Math.abs(currS-bestSlope)<1e-1 && Math.abs(currI-bestInt)<1e-1;

      console.log(currS-bestSlope)  
      console.log(currI-bestInt) 
  circles.forEach(c=>c.render.fillStyle = ok ? '#059212' : '#FF0B55');
}

function refreshBoxes() {
  document.getElementById('xValues').value = dataX.map(v=>v.toFixed(3)).join(', ');
  document.getElementById('yValues').value = dataY.map(v=>v.toFixed(3)).join(', ');
}

function drawTicks() {
  if (!bounds) return;
  const ctx = render.context, { minX, maxX, minY, maxY } = bounds,
        { sX, sY } = scales, { m, width, height } = layout;
  ctx.fillStyle='#000'; ctx.font='12px sans-serif'; ctx.textAlign='center';
  for (let i=0;i<=5;i++){
    const fx=m+i*(width-2*m)/5, vx=minX+i*(maxX-minX)/5;
    ctx.beginPath(); ctx.moveTo(fx,height-m); ctx.lineTo(fx,height-m+6); ctx.stroke();
    ctx.fillText(vx.toFixed(2), fx, height-m+20);
    const fy=height-m-i*(height-2*m)/5, vy=minY+i*(maxY-minY)/5;
    ctx.beginPath(); ctx.moveTo(m,fy); ctx.lineTo(m-6,fy); ctx.stroke();
    ctx.textAlign='right'; ctx.fillText(vy.toFixed(2), m-8, fy+4); ctx.textAlign='center';
  }
  ctx.fillText('X', width-m+20, height-m+5);
  ctx.save(); ctx.translate(m-15,m-20); ctx.rotate(-Math.PI/2); ctx.fillText('Y',0,0); ctx.restore();
}

function drawTooltip() {
  if (!hovered) return;
  const tt = document.getElementById('tooltip'),
        i = hovered._dataIdx;
  tt.style.left = hovered.position.x + 12 + 'px';
  tt.style.top  = hovered.position.y - 12 + 'px';
  tt.textContent = `(${dataX[i].toFixed(2)}, ${dataY[i].toFixed(2)})`;
  tt.style.display = 'block';
}

function computeMetrics(slope, intercept) {
  const n = dataX.length,
        meanY = dataY.reduce((a,b)=>a+b,0)/n;
  let SSE=0, SSR=0, SST=0;
  for (let i=0;i<n;i++){
    const yt = dataY[i],
          yp = slope*dataX[i] + intercept;
    SSE += (yt-yp)**2;
    SSR += (yp-meanY)**2;
    SST += (yt-meanY)**2;
  }
  const MSE = SSE/n, MSR = SSR/n, R2 = SST? SSR/SST : 0;
  const seSlope = Math.sqrt(MSE / dataX.reduce((s,x)=>s+(x-meanY)**2,0)),
        t = slope / (seSlope||1),
        p = 2*(1 - jStat.studentt.cdf(Math.abs(t), n-2));
  document.getElementById('mse').value = MSE.toFixed(3);
  document.getElementById('msr').value = MSR.toFixed(3);
  document.getElementById('sst').value = SST.toFixed(3);
  document.getElementById('r2').value  = R2.toFixed(3);
  document.getElementById('pvalue').value = p.toExponential(2);
}

window.addEventListener('DOMContentLoaded', () => {
  initMatter();

  // … inside window.addEventListener('DOMContentLoaded', () => { …

document.getElementById('drawBestFit').onclick = () => {
  // 1) Compute OLS slope & intercept from dataX/dataY
  const n = dataX.length;
  const meanX = dataX.reduce((a, b) => a + b, 0) / n;
  const meanY = dataY.reduce((a, b) => a + b, 0) / n;
  const cov = dataX.reduce((sum, x, i) => sum + (x - meanX) * (dataY[i] - meanY), 0);
  const varX = dataX.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  const bestSlope = cov / varX;
  const bestIntercept = meanY - bestSlope * meanX;

  // 2) Update the input fields so the UI reflects the new fit
  document.getElementById('slope').value = bestSlope.toFixed(3);
  document.getElementById('intercept').value = bestIntercept.toFixed(3);

  // 3) Reposition & rotate the line body
  const { sX, sY } = scales;
  const { m, height } = layout;
  const px = m + (meanX - bounds.minX) * sX;
  const py = height - m - ((bestSlope * meanX + bestIntercept) - bounds.minY) * sY;
  Body.setPosition(meanLineBody, { x: px, y: py });
  Body.setAngle(meanLineBody, -Math.atan(bestSlope * (sY / sX)));

  // 4) Recolor circles according to whether they now match the OLS line
  updateCircleColors();

  // 5) Recompute and display metrics (if you have computeMetrics defined)
  if (typeof computeMetrics === 'function') {
    computeMetrics(bestSlope, bestIntercept);
  }
};


  document.getElementById('resetAll').onclick = clearAll;

  // Smooth rotation
  let rotL=false, rotR=false;
  const L = document.getElementById('rotateLeft'), R = document.getElementById('rotateRight');
  L.addEventListener('mousedown',()=>rotL=true);
  L.addEventListener('mouseup',  ()=>rotL=false);
  L.addEventListener('mouseleave',()=>rotL=false);
  R.addEventListener('mousedown',()=>rotR=true);
  R.addEventListener('mouseup',  ()=>rotR=false);
  R.addEventListener('mouseleave',()=>rotR=false);
  Events.on(engine,'beforeUpdate',()=>{
    if (!meanLineBody) return;
    const Δ = 0.03;
    if (rotL) Body.setAngle(meanLineBody, meanLineBody.angle - Δ);
    if (rotR) Body.setAngle(meanLineBody, meanLineBody.angle + Δ);
  });

  // Data buttons
  document.getElementById('generateCorrelated').onclick = () =>
    plot(genCorr(
      parseFloat(document.getElementById('corr').value),
      parseFloat(document.getElementById('intercept').value),
      parseInt(document.getElementById('n').value, 10)
    ));

  document.getElementById('generatePerfect').onclick = () =>
    plot(genPerfect(
      parseFloat(document.getElementById('slope').value),
      parseFloat(document.getElementById('intercept').value),
      parseInt(document.getElementById('n').value, 10)
    ));

  document.getElementById('generateRandom').onclick = () =>
    plot(genRandom(parseInt(document.getElementById('n').value, 10)));
});
