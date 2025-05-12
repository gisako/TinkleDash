function generateNormalDistribution(mean = 0, stdDev = 1, skew = 0, kurtosis = 3) {

  // Setup
  engine = Matter.Engine.create();
  world = engine.world;
  world.gravity.y = 0.005;  // lower gravity
  render = Matter.Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: 1200,
      height: 600,
      wireframes: false,
      background: 'white'
    }
  });
  Matter.Render.run(render);
  runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  // Mouse control
  const mouse = Matter.Mouse.create(render.canvas);
  mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
  });
  Matter.World.add(world, mouseConstraint);
  render.mouse = mouse;

  // Parameters
  const numBins = 11;
  const maxBoxWidth = 100;
  const maxBoxHeight = 300;
  const radius = 8;
  const totalBalls = 300;
  const groundY = 580;
  const frictionAir = 0.05;

  // Skew-Normal PDF
  function skewNormalPDF(x, mean, stdDev, skew) {
    let z = (x - mean) / stdDev;
    let pdf = Math.exp(-0.5 * z * z) / (stdDev * Math.sqrt(2 * Math.PI));
    let cdf = 0.5 * (1 + erf(skew * z / Math.sqrt(2)));
    return 2 * pdf * cdf;
  }

  // Error function approximation
  function erf(x) {
    let sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    let a1 = 0.254829592;
    let a2 = -0.284496736;
    let a3 = 1.421413741;
    let a4 = -1.453152027;
    let a5 = 1.061405429;
    let p = 0.3275911;
    let t = 1 / (1 + p * x);
    let y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  }

  // Adjusted PDF with kurtosis
  function adjustedPDF(x) {
    let base = skewNormalPDF(x, mean, stdDev, skew);
    let z = (x - mean) / stdDev;
    let kurtPart = Math.exp(-0.5 * Math.pow(z, kurtosis / 3));
    return base * kurtPart;
  }

  // Normalize max
  let pdfMax = adjustedPDF(mean);

  const binCenters = [];
  const binProbs = [];

  for (let i = 0; i < numBins; i++) {
    let sigmaCenter = -5 + (10 * (i + 0.5)) / numBins;
    binCenters.push(sigmaCenter);
    let x = mean + sigmaCenter * stdDev;
    let prob = adjustedPDF(x) / pdfMax;
    binProbs.push(Math.max(prob, 0));
  }

  // Color coding
  function sigmaColor(sigma) {
    let absSigma = Math.abs(sigma);
    if (absSigma <= 1) return '#4caf50'; // green
    else if (absSigma <= 2) return '#ffeb3b'; // yellow
    else if (absSigma <= 3) return '#ff9800'; // orange
    else return '#f44336'; // red
  }

  // Bins creation
  for (let i = 0; i < numBins; i++) {
    let sigmaCenter = binCenters[i];

    // Scaled position — less aggressive scaling
    let xPos = 600 + sigmaCenter *  stdDev * (500/(stdDev*5));

    // Width scales slightly with stdDev
    let boxWidth = maxBoxWidth * (1 - Math.abs(sigmaCenter) / 5) * (0.9 + 0.1 * stdDev);

    let prob = binProbs[i];
    let boxHeight = maxBoxHeight * prob;
    let wallHeight = boxHeight;
    let boxTopY = groundY - wallHeight;

    // Walls
    const leftWall = Matter.Bodies.rectangle(xPos - boxWidth / 2, boxTopY + wallHeight / 2, 10, wallHeight, { isStatic: true, render: { fillStyle: 'white' } });
    const rightWall = Matter.Bodies.rectangle(xPos + boxWidth / 2, boxTopY + wallHeight / 2, 10, wallHeight, { isStatic: true, render: { fillStyle: 'white' } });
    const bottom = Matter.Bodies.rectangle(xPos, groundY, boxWidth, 20, { isStatic: true, render: { fillStyle: 'white' } });
    const roof = Matter.Bodies.rectangle(xPos, boxTopY - 10, boxWidth, 20, { isStatic: true, render: { fillStyle: 'white' } });

    Matter.World.add(world, [leftWall, rightWall, bottom, roof]);

    // Balls
    let numCircles = Math.round(prob * totalBalls);

    for (let j = 0; j < numCircles; j++) {
      let randX = xPos + (Math.random() - 0.5) * (boxWidth - radius * 2);
      let randY = boxTopY + 20 + Math.random() * (wallHeight - 40);
      let ball = Matter.Bodies.circle(randX, randY, radius, {
        restitution: 0,
        frictionAir: frictionAir,
        render: {
          fillStyle: sigmaColor(sigmaCenter),
          strokeStyle: '#ccc',
          lineWidth: 1
        },
        angle: Math.random() * Math.PI,
        angularVelocity: (Math.random() - 0.5) * 0.1
      });

      Matter.World.add(world, ball);
    }
  }

  // Mean line
  const meanLine = Matter.Bodies.rectangle(600, groundY - 150, 2, 500, {
    isStatic: true,
    render: { fillStyle: 'black' }
  });
  Matter.World.add(world, meanLine);

  // Ground
  const ground = Matter.Bodies.rectangle(600, groundY + 20, 1200, 40, { isStatic: true, render: { visible: false } });
  Matter.World.add(world, ground);
}
