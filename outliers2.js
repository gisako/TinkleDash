// script.js

// Matter.js aliases
const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Mouse,
  MouseConstraint,
  Events
} = Matter;

// Generate sample data: normals, outliers, and nulls
function generateSample(total = 100, outlierPct = 0.05, nullPct = 0.05) {
  const outlierCount = Math.max(1, Math.round(total * outlierPct));
  const nullCount    = Math.max(1, Math.round(total * nullPct));
  const normalCount  = total - outlierCount - nullCount;
  function randNorm() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const data = [];
  for (let i = 0; i < normalCount; i++) {
    data.push((randNorm() * 2 + 10).toFixed(2)); // Normal distribution
  }
  for (let i = 0; i < outlierCount; i++) {
    data.push((20 + Math.random() * 10).toFixed(2)); // Outliers
  }
  for (let i = 0; i < nullCount; i++) {
    data.push('null'); // Null values
  }
  return data.join(',');
}

// Compute quartiles and IQR
function computeQuartiles(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  function q(p) {
    const idx = (sorted.length - 1) * p;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
  }
  const q1 = q(0.25);
  const median = q(0.5);
  const q3 = q(0.75);
  return { q1, median, q3, iqr: q3 - q1 };
}

// Initialize engine
const engine = Engine.create();
const world = engine.world;
engine.world.gravity.y = 3; // Moderate fall speed
const runner = Runner.create();
Runner.run(runner, engine);

// Setup renderer and canvas
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('world');
  const W = window.innerWidth - 20;
  const H = Math.floor(window.innerHeight * 0.7);
  canvas.width = W;
  canvas.height = H;
  const render = Render.create({
    canvas,
    engine,
    options: {
      width: W,
      height: H,
      wireframes: false,
      background: '#fafafa'
    }
  });
  Render.run(render);

  // Draw labels after each render
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    world.bodies.forEach(body => {
      if (body.labelText) {
        ctx.font = '14px Arial';
        ctx.fillStyle = '#000';
        const text = body.labelText;
        const tw = ctx.measureText(text).width;
        ctx.fillText(text, body.position.x - tw / 2, body.position.y - (body.circleRadius || 0) - 8);
      }
    });
  });

  // Mouse control
  const mouse = Mouse.create(render.canvas);
  const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.02,
      damping: 0.1,
      render: { visible: false }
    }
  });
  World.add(world, mouseConstraint);

  // Remove null bodies on click
  Events.on(mouseConstraint, 'mousedown', () => {
    const body = mouseConstraint.body;
    if (body && body.isNull) {
      World.remove(world, body);
      const vals = document.getElementById('dataInput').value.split(',').map(e => e.trim());
      vals.splice(body.dataIndex, 1);
      document.getElementById('dataInput').value = vals.join(',');
    }
  });

  // Button handlers
  document.getElementById('generateBtn').addEventListener('click', () => {
    document.getElementById('dataInput').value = generateSample();
  });

  document.getElementById('runBtn').addEventListener('click', () => {
    // Clear existing bodies except mouseConstraint
    World.clear(world, false);
    Engine.clear(engine);
    World.add(world, mouseConstraint);

    // Parse and shuffle entries
    let entries = document.getElementById('dataInput').value
      .split(',').map(e => e.trim()).filter(e => e);
    entries.sort(() => Math.random() - 0.5);

    // Compute stats
    const nums = entries.filter(e => e !== 'null').map(Number).filter(n => !isNaN(n));
    const { q1, median, q3, iqr } = computeQuartiles(nums);
    const mean = nums.reduce((sum, v) => sum + v, 0) / nums.length;
    const cutoff = q3 + 1.5 * iqr;
    const baseScale = 3;
    const scale = baseScale * 0.5;

    // Funnel geometry
    const gapW = cutoff * scale * 2;
    const angle = Math.PI / 8;
    const yPlane = H * 0.6;
    const halfSpan = (W - gapW) / 2;
    const segLen = halfSpan / Math.cos(angle);
    const thickness = 10;

    // Plane endpoints for distributing balls
    const leftStartX = 0;
    const leftEndX = halfSpan;
    const rightStartX = halfSpan + gapW;
    const rightEndX = W;

    // Add funnel planes
    const leftPlane = Bodies.rectangle(
      (leftStartX + leftEndX) / 2,
      yPlane + (((leftStartX + leftEndX) / 2) - W / 2) * Math.tan(angle),
      segLen, thickness,
      { isStatic: true, angle, restitution: 0, friction: 1, render: { fillStyle: '#FFB433' } }
    );
    const rightPlane = Bodies.rectangle(
      (rightStartX + rightEndX) / 2,
      yPlane + (((rightStartX + rightEndX) / 2) - W / 2) * Math.tan(-angle),
      segLen, thickness,
      { isStatic: true, angle: -angle, restitution: 0, friction: 1, render: { fillStyle: '#FFB433' } }
    );
    World.add(world, [leftPlane, rightPlane]);

    // Walls & floor
    World.add(world, [
      Bodies.rectangle(W / 2, -25, W, 50, { isStatic: true }),
      Bodies.rectangle(W / 2, H + 25, W, 50, { isStatic: true }),
      Bodies.rectangle(-25, H / 2, 50, H, { isStatic: true }),
      Bodies.rectangle(W + 25, H / 2, 50, H, { isStatic: true })
    ]);

    // Add mean & median balls
    const meanBall = Bodies.circle(W * 0.2, H * 0.2, mean * scale, {
      restitution: 0,
      frictionAir: 0.02,
      render: { fillStyle: '#FFB433' }
    });
    meanBall.isMean = true;
    meanBall.dataValue = mean;
    meanBall.labelText = `Mean: ${mean.toFixed(2)}`;
    const medBall = Bodies.circle(W * 0.8, H * 0.2, median * scale, {
      restitution: 0,
      frictionAir: 0.02,
      render: { fillStyle: '#3A59D1' }
    });
    medBall.isMedian = true;
    medBall.dataValue = median;
    medBall.labelText = `Median: ${median.toFixed(2)}`;
    World.add(world, [meanBall, medBall]);

    // Distribute balls evenly along plane surfaces
    const halfCount = Math.ceil(entries.length / 2);
    entries.forEach((e, i) => {
      const r = e === 'null' ? cutoff * scale * 1.2 : parseFloat(e) * scale;
      const isLeft = i < halfCount;
      const idxIn = isLeft ? i : i - halfCount;
      const count = isLeft ? halfCount : entries.length - halfCount;
      const frac = count > 1 ? idxIn / (count - 1) : 0.5;
      const x = isLeft
        ? leftStartX + frac * (leftEndX - leftStartX)
        : rightStartX + frac * (rightEndX - rightStartX);
      const y = yPlane + (x - W / 2) * Math.tan(isLeft ? angle : -angle) - r - 2;
      let body;
      if (e === 'null') {
        body = Bodies.circle(x, y, r, {
          restitution: 0,
          frictionAir: 0.02,
          render: { fillStyle: '#fff', strokeStyle: '#000', lineWidth: 3 }
        });
        body.isNull = true;
        body.dataIndex = i;
        body.labelText = 'Null';
      } else {
        const v = parseFloat(e);
        body = Bodies.circle(x, y, r, {
          restitution: 0,
          frictionAir: 0.02,
          render: { fillStyle: v > cutoff ? '#CF0F47' : '#9ACBD0' }
        });
        if (v > cutoff) {
          body.isOutlier = true;
          body.dataValue = v;
          body.labelText = `Outlier: ${v.toFixed(2)}`;
        }
      }
      World.add(world, body);
    });
  });
});
