// script.js

// Matter.js aliases
const { Engine, Render, Runner, World, Bodies, Mouse, MouseConstraint } = Matter;

// 1) Generate 95 normals + 5 outliers
function generateSample() {
  function randNorm() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const data = [];
  for (let i = 0; i < 95; i++) {
    data.push((randNorm() * 2 + 10).toFixed(2)); // N(10,2)
  }
  for (let i = 0; i < 5; i++) {
    data.push((20 + Math.random() * 10).toFixed(2)); // clear outliers
  }
  return data.join(',');
}

// 2) Compute Q1, Q2, Q3, and IQR
function computeQuartiles(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const q = p => {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  };
  const q1 = q(0.25), q2 = q(0.5), q3 = q(0.75);
  return { q1, q2, q3, iqr: q3 - q1 };
}

// 3) Initialize Matter.js (once)
const engine = Engine.create();
engine.world.gravity.y = 2; // stronger gravity
const world  = engine.world;
const runner = Runner.create();
Runner.run(runner, engine);

const canvas = document.getElementById('world');
const W = canvas.width  = window.innerWidth  - 20;
const H = canvas.height = window.innerHeight * 0.7;

const render = Render.create({
  canvas,
  engine,
  options: { width: W, height: H, wireframes: false, background: '#fafafa' }
});
Render.run(render);

// mouse drag
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: { stiffness: 0.2, render: { visible: false } }
});
World.add(world, mouseConstraint);

// 4) Button handlers
document.getElementById('generateBtn').addEventListener('click', () => {
  document.getElementById('dataInput').value = generateSample();
});

document.getElementById('runBtn').addEventListener('click', () => {
  // — Clear everything except gravity settings —
  World.clear(world, false);
  Engine.clear(engine);
  // — Re-add mouse control —
  World.add(world, mouseConstraint);

  // — Parse & validate —
  const raw  = document.getElementById('dataInput').value;
  const vals = raw.split(',').map(n => parseFloat(n)).filter(n => !isNaN(n));
  if (!vals.length) {
    alert('Please generate or enter some numbers.');
    return;
  }

  // — Stats & scales —
  const { q3, iqr } = computeQuartiles(vals);
  const cutoff      = q3 + 1.5 * iqr;
  const baseScale   = 3;
  const scale       = baseScale * 0.5;           // 50% size

  // — Create balls —
  vals.forEach((v, i) => {
    const r = v * scale;
    World.add(world, Bodies.circle(
      50 + i * 15,  // x spacing
      30,           // initial y
      r, {
        restitution: 0.5,
        frictionAir: 0.02,
        render: { fillStyle: v > cutoff ? '#d62728' : '#2ca02c' }
      }
    ));
  });

  // — Funnel planes —
  const angle     = Math.PI / 8;
  const gapWidth  = cutoff * scale * 2;          // exact Q3-gap
  const yPos      = H * 0.6;
  const halfSpan  = (W - gapWidth) / 2;
  const segLength = halfSpan / Math.cos(angle);
  const thickness = 20 * 0.5;                    // 50% thinner

  // left plane (slopes toward center)
  const leftCX = (W/2 - gapWidth/2) / 2;
  const leftCY = yPos + (leftCX - W/2) * Math.tan(angle);
  const leftPlane = Bodies.rectangle(leftCX, leftCY, segLength, thickness, {
    isStatic: true, angle, render: { fillStyle: '#ffcc99' }
  });

  // right plane
  const rightCX = W/2 + gapWidth/2 + halfSpan/2;
  const rightCY = yPos + (rightCX - W/2) * Math.tan(-angle);
  const rightPlane = Bodies.rectangle(rightCX, rightCY, segLength, thickness, {
    isStatic: true, angle: -angle, render: { fillStyle: '#ffcc99' }
  });

  World.add(world, [ leftPlane, rightPlane ]);

  // — Walls & floor —
  const wallThick = 50;
  const walls = [
    Bodies.rectangle(W/2, -wallThick/2,    W,      wallThick, { isStatic: true }),
    Bodies.rectangle(W/2, H + wallThick/2, W,      wallThick, { isStatic: true }),
    Bodies.rectangle(-wallThick/2, H/2,    wallThick, H,      { isStatic: true }),
    Bodies.rectangle(W + wallThick/2, H/2, wallThick, H,      { isStatic: true })
  ];
  World.add(world, walls);
});
