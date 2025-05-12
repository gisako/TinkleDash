// script.js

// Matter.js aliases
const { Engine, Render, Runner, World, Bodies, Body, Mouse, Events, Query } = Matter;

let engine, render, runner;
let circles = [], dataX = [], dataY = [];
let axisBodies = [];
let meanLineBody = null;
let bounds, scales, layout;
let hovered = null;
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

function initMatter() {
  engine = Engine.create();
  engine.gravity.y = 0;

  const canvas = document.getElementById('scatterPlot');
  render = Render.create({
    canvas,
    engine,
    options: {
      width: canvas.width,
      height: canvas.height,
      background: '#ffffff',  // white background
      wireframes: false
    }
  });
  Render.run(render);

  runner = Runner.create();
  Runner.run(runner, engine);

  // After each render: draw axes ticks and tooltip
  Events.on(render, 'afterRender', () => {
    drawTicks();
    drawTooltip();
  });

  // Custom drag & hover logic
  canvas.addEventListener('mousemove', event => {
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    // hover circles
    hovered = Query.point(circles, { x: mx, y: my })[0] || null;
    // dragging line
    if (isDragging && meanLineBody) {
      Body.setPosition(meanLineBody, { x: mx - dragOffset.x, y: my - dragOffset.y });
      updateLineParams();
      updateCircleColors();
    }
  });
  canvas.addEventListener('mousedown', event => {
    const rect = canvas.getBoundingClientRect();
    const mx = event.clientX - rect.left;
    const my = event.clientY - rect.top;
    if (meanLineBody && isPointOnLine(mx, my)) {
      isDragging = true;
      dragOffset.x = mx - meanLineBody.position.x;
      dragOffset.y = my - meanLineBody.position.y;
    }
  });
  canvas.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      updateLineParams();
      updateCircleColors();
    }
  });
}

// Check if point is near the line (for drag)
function isPointOnLine(x, y) {
  const length = meanLineBody.bounds.max.x - meanLineBody.bounds.min.x;
  const angle = meanLineBody.angle;
  const dx = x - meanLineBody.position.x;
  const dy = y - meanLineBody.position.y;
  const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
  const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);
  return Math.abs(localX) <= length / 2 + 5 && Math.abs(localY) <= 10;
}

function clearAll() {
  circles.forEach(b => World.remove(engine.world, b));
  circles = [];
  if (meanLineBody) {
    World.remove(engine.world, meanLineBody);
    meanLineBody = null;
  }
  axisBodies.forEach(b => World.remove(engine.world, b));
  axisBodies = [];
}

function gaussian() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function shiftPositives(arr) {
  const min = Math.min(...arr);
  return min < 0 ? arr.map(v => v - min + 0.1) : arr;
}

// Data generators
function genCorr(corr, slope, intercept, n) {
  const x = [], y = [];
  const mag = Math.abs(slope);
  const sign = corr < 0 ? -1 : 1;
  const noiseF = mag * Math.sqrt((1 - corr * corr) / (corr * corr));
  for (let i = 0; i < n; i++) {
    const xi = gaussian();
    x.push(xi);
    y.push(sign * mag * xi + intercept + gaussian() * noiseF);
  }
  return { x: shiftPositives(x), y: shiftPositives(y) };
}
function genPerfect(slope, intercept, n) {
  const x = [], y = [];
  for (let i = 0; i < n; i++) {
    const xi = gaussian();
    x.push(xi);
    y.push(slope * xi + intercept);
  }
  return { x: shiftPositives(x), y: shiftPositives(y) };
}
function genRandom(n) {
  const x = [], y = [];
  for (let i = 0; i < n; i++) {
    x.push(gaussian());
    y.push(gaussian());
  }
  return { x: shiftPositives(x), y: shiftPositives(y) };
}

function plot({ x, y }) {
  clearAll();
  dataX = [...x];
  dataY = [...y];
  const { width, height } = render.options;
  const m = 50;
  const minX = Math.min(...x), maxX = Math.max(...x);
  const minY = Math.min(...y), maxY = Math.max(...y);
  const sX = (width - 2 * m) / (maxX - minX);
  const sY = (height - 2 * m) / (maxY - minY);
  bounds = { minX, maxX, minY, maxY };
  scales = { sX, sY };
  layout = { m, width, height };

  // Axes
  const axOpt = { isStatic: true, render: { fillStyle: '#000' } };
  const xA = Bodies.rectangle(width / 2, height - m, width - 2 * m, 2, axOpt);
  const yA = Bodies.rectangle(m, height / 2, 2, height - 2 * m, axOpt);
  axisBodies = [xA, yA];
  World.add(engine.world, axisBodies);

  // Circles static, initial red
  x.forEach((xi, i) => {
    const px = m + (xi - minX) * sX;
    const py = height - m - (y[i] - minY) * sY;
    const c = Bodies.circle(px, py, 10, { isStatic: true, render: { fillStyle: '#f00' } });
    c._dataIdx = i;
    circles.push(c);
  });
  World.add(engine.world, circles);

  // Mean line dynamic
  const meanY = dataY.reduce((a, b) => a + b, 0) / dataY.length;
  const lineY = height - m - (meanY - minY) * sY;
  const length = width - 2 * m;
  meanLineBody = Bodies.rectangle(width / 2, lineY, length, 6, { render: { fillStyle: '#00f' } });
  World.add(engine.world, meanLineBody);

  refreshBoxes();
  updateLineParams();
  updateCircleColors();
}

// Recalculate slope/intercept from line and update inputs
function updateLineParams() {
  const { sX, sY } = scales;
  const { m, height } = layout;
  const angle = meanLineBody.angle;
  const sx = meanLineBody.position.x;
  const sy = meanLineBody.position.y;
  const x0 = (sx - m) / sX + bounds.minX;
  const y0 = (height - m - sy) / sY + bounds.minY;
  const slope = -(sX / sY) * Math.tan(angle);
  const intercept = y0 - slope * x0;
  document.getElementById('slope').value = slope.toFixed(3);
  document.getElementById('intercept').value = intercept.toFixed(3);
}

// Color circles green only if line matches least-squares fit exactly
function updateCircleColors() {
  const n = dataX.length;
  const meanX = dataX.reduce((a, b) => a + b, 0) / n;
  const meanY = dataY.reduce((a, b) => a + b, 0) / n;
  const cov = dataX.reduce((sum, x, i) => sum + (x - meanX) * (dataY[i] - meanY), 0);
  const varX = dataX.reduce((sum, x) => sum + (x - meanX) * (x - meanX), 0);
  const bestSlope = cov / varX;
  const bestIntercept = meanY - bestSlope * meanX;
  const currSlope = parseFloat(document.getElementById('slope').value);
  const currIntercept = parseFloat(document.getElementById('intercept').value);
  const eps = 1e-3;
  const optimal = Math.abs(currSlope - bestSlope) < eps && Math.abs(currIntercept - bestIntercept) < eps;
  circles.forEach(c => {
    c.render.fillStyle = optimal ? '#0f0' : '#f00';
  });
}

function refreshBoxes() {
  document.getElementById('xValues').value = dataX.map(v => v.toFixed(3)).join(', ');
  document.getElementById('yValues').value = dataY.map(v => v.toFixed(3)).join(', ');
}

function drawTicks() {
  if (!bounds) return;
  const ctx = render.context;
  const { minX, maxX, minY, maxY } = bounds;
  const { sX, sY } = scales;
  const { m, width, height } = layout;
  ctx.fillStyle = '#000'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center';
  for (let i = 0; i <= 5; i++) {
    const fx = m + i * (width - 2 * m) / 5;
    const vx = minX + i * (maxX - minX) / 5;
    ctx.beginPath(); ctx.moveTo(fx, height - m); ctx.lineTo(fx, height - m + 6); ctx.stroke();
    ctx.fillText(vx.toFixed(2), fx, height - m + 20);
    const fy = height - m - i * (height - 2 * m) / 5;
    const vy = minY + i * (maxY - minY) / 5;
    ctx.beginPath(); ctx.moveTo(m, fy); ctx.lineTo(m - 6, fy); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(vy.toFixed(2), m - 8, fy + 4); ctx.textAlign = 'center';
  }
  ctx.fillText('X', width - m + 20, height - m + 5);
  ctx.save(); ctx.translate(m - 15, m - 20); ctx.rotate(-Math.PI / 2); ctx.fillText('Y', 0, 0); ctx.restore();
}

function drawTooltip() {
  if (!hovered) return;
  const tt = document.getElementById('tooltip');
  const i = hovered._dataIdx;
  tt.style.left = hovered.position.x + 12 + 'px';
  tt.style.top = hovered.position.y - 12 + 'px';
  tt.textContent = `(${dataX[i].toFixed(2)}, ${dataY[i].toFixed(2)})`;
  tt.style.display = 'block';
}

window.addEventListener('DOMContentLoaded', () => {
  initMatter();
  // Rotate buttons
  const controls = document.getElementById('controls');
  ['←', '→'].forEach((symbol, idx) => {
    const btn = document.createElement('button');
    btn.textContent = symbol;
    btn.style.marginLeft = '5px';
    btn.addEventListener('click', () => {
      if (meanLineBody) Body.rotate(meanLineBody, (idx ? 1 : -1) * Math.PI / 32);
      updateLineParams();
      updateCircleColors();
    });
    controls.appendChild(btn);
  });

  document.getElementById('generateCorrelated').onclick = () => plot(genCorr(
    parseFloat(document.getElementById('corr').value),
    parseFloat(document.getElementById('slope').value),
    parseFloat(document.getElementById('intercept').value),
    parseInt(document.getElementById('n').value, 10)
  ));
  document.getElementById('generatePerfect').onclick = () => plot(genPerfect(
    parseFloat(document.getElementById('slope').value),
    parseFloat(document.getElementById('intercept').value),
    parseInt(document.getElementById('n').value, 10)
  ));
  document.getElementById('generateRandom').onclick = () => plot(genRandom(
    parseInt(document.getElementById('n').value, 10)
  ));
});
