let engine, render, runner, world, mouseConstraint;

// Function to generate the distribution
function generateNormalDistribution(mean, stdDev) {
  // Clear previous world if already created
  if (engine) {
    Matter.Render.stop(render);
    Matter.Runner.stop(runner);
    render.canvas.remove();
    render.textures = {};
  }

  // Setup new engine
  engine = Matter.Engine.create();
  world = engine.world;
  world.gravity.y = 0.01; // very low gravity

  render = Matter.Render.create({
    element: document.body,
    engine: engine,
    options: {
      width: 1200,
      height: 600,
      wireframes: false,
      background: 'white' // white background
    }
  });

  Matter.Render.run(render);
  runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);

  // Mouse control
  const mouse = Matter.Mouse.create(render.canvas);
  mouseConstraint = Matter.MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
      stiffness: 0.2,
      render: { visible: false }
    }
  });
  Matter.World.add(world, mouseConstraint);
  render.mouse = mouse;

  // Parameters
  const numBins = 11;
  const maxBoxWidth = 120;
  const maxBoxHeight = 300;
  const radius = 8;
  const totalBalls = 300;
  const groundY = 580;
  const frictionAir = 0.05;

  // Gaussian PDF
  function normalPDF(x) {
    console.log(x)
    console.log(mean)
    console.log(stdDev)

    return Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)) / (stdDev * Math.sqrt(2 * Math.PI));
  }

  let pdfMax = normalPDF(mean); // peak at mean

  const binCenters = [];
  const binProbs = [];

  for (let i = 0; i < numBins; i++) {
    let sigmaCenter = -5 + (10 * (i + 0.5)) / numBins;
    binCenters.push(sigmaCenter);

    let x = mean + sigmaCenter * stdDev;
    let prob = normalPDF(x) / pdfMax;
    binProbs.push(prob);
  }

  // Coloring based on distance from mean
  function sigmaColor(sigma) {
    let absSigma = Math.abs(sigma);
    if (absSigma <= 1) return '#4caf50'; // green
    else if (absSigma <= 2) return '#ffeb3b'; // yellow
    else if (absSigma <= 3) return '#ff9800'; // orange
    else return '#f44336'; // red
  }

  // Create each bin
  for (let i = 0; i < numBins; i++) {
    let sigmaCenter = binCenters[i];
    let xPos = 600 + sigmaCenter * (maxBoxWidth + 5);
    let prob = binProbs[i];
    console.log(prob)
    let boxHeight = maxBoxHeight * prob;
    let boxWidth = maxBoxWidth * (1 - Math.abs(sigmaCenter) / 5);
    let wallHeight = boxHeight;
    let boxTopY = groundY - wallHeight;

    const leftWall = Matter.Bodies.rectangle(xPos - boxWidth / 2, boxTopY + wallHeight / 2, 10, wallHeight, { 
      isStatic: true, 
      render: { fillStyle: 'white' }
    });
    const rightWall = Matter.Bodies.rectangle(xPos + boxWidth / 2, boxTopY + wallHeight / 2, 10, wallHeight, { 
      isStatic: true, 
      render: { fillStyle: 'white' }
    });
    const bottom = Matter.Bodies.rectangle(xPos, groundY, boxWidth, 20, { 
      isStatic: true, 
      render: { fillStyle: 'white' }
    });
    const roof = Matter.Bodies.rectangle(xPos, boxTopY - 10, boxWidth, 20, { 
      isStatic: true, 
      render: { fillStyle: 'white' }
    });

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

  // Mean line (black vertical line at mean)
  const meanLine = Matter.Bodies.rectangle(600, groundY - 150, 2, 500, {
    isStatic: true,
    render: {
      fillStyle: 'black'
    }
  });
  Matter.World.add(world, meanLine);

  // Ground (invisible because walls already have bottoms)
  const ground = Matter.Bodies.rectangle(600, groundY + 20, 1200, 40, { isStatic: true, render: { visible: false } });
  Matter.World.add(world, ground);
}
