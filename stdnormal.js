const { Engine, Render, Runner, World, Bodies, Composite } = Matter;

// Create engine and world
const engine = Engine.create();
const { world } = engine;

// Adjust gravity to make balls move more freely
engine.world.gravity.y = 0.05;  // Reduced gravity

// Renderer
const render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: 1200,
    height: 600,
    wireframes: false,
    background: '#fff'
  }
});
Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);

// Gaussian PDF
function normalPDF(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Parameters
const numBins = 11; // -5σ to +5σ
const maxBoxWidth = 120; // max box width (center)
const maxBoxHeight = 400; // tallest box at 0σ
const radius = 8;
const totalBalls = 200;
const groundY = 580;
const frictionAir = 0.05; // damping for ball containment

// Compute bin probabilities
const binCenters = [];
const binProbs = [];
let pdfMax = normalPDF(0); // peak at 0σ

for (let i = 0; i < numBins; i++) {
  let sigmaCenter = -5 + (10 * (i + 0.5)) / numBins;
  binCenters.push(sigmaCenter);

  let prob = normalPDF(sigmaCenter) / pdfMax; // normalize
  binProbs.push(prob);
}

// Sigma-based color
function sigmaColor(sigma) {
  let absSigma = Math.abs(sigma);

  if (absSigma <= 1) return '#4caf50'; // green
  else if (absSigma <= 2) return '#ffeb3b'; // yellow
  else if (absSigma <= 3) return '#ff9800'; // orange
  else return '#f44336'; // red
}

// Create bin box
function createSigmaBox(x, sigmaCenter, prob) {
  const boxComposite = Composite.create();

  let boxHeight = maxBoxHeight * prob;
  let boxWidth = maxBoxWidth * (1 - Math.abs(sigmaCenter) / 5); // width decreases as sigma moves outwards
  let wallHeight = boxHeight;
  let boxTopY = groundY - wallHeight;

  // Walls
  const leftWall = Bodies.rectangle(x - boxWidth / 2, boxTopY + wallHeight / 2, 10, wallHeight, { isStatic: true, render: { fillStyle: '#fff' } });
  const rightWall = Bodies.rectangle(x + boxWidth / 2, boxTopY + wallHeight / 2, 10, wallHeight, { isStatic: true, render: { fillStyle: '#fff' } });
  const bottom = Bodies.rectangle(x, groundY, boxWidth, 20, { isStatic: true, render: { fillStyle: '#fff' } });

  // Roof to prevent balls from bouncing out
  const roof = Bodies.rectangle(x, boxTopY - 10, boxWidth, 20, { isStatic: true, render: { fillStyle: '#fff' } });

  Composite.add(boxComposite, [leftWall, rightWall, bottom, roof]);

  // Number of balls proportional to bin probability
  let numCircles = Math.round(prob * totalBalls);

  for (let j = 0; j < numCircles; j++) {
    let randX = x + (Math.random() - 0.5) * (boxWidth - radius * 2);
    let randY = boxTopY + 20 + Math.random() * (wallHeight - 40);
    let circle = Bodies.circle(randX, randY, radius, {
     // restitution: 0, // no bounce
     frictionAir: frictionAir, // slow down the balls to prevent them from popping out
      render: {
        fillStyle: sigmaColor(sigmaCenter),
        strokeStyle: '#333',
        lineWidth: 1
      },
      // Random rotation added here
      angle: Math.random() * Math.PI, // random initial angle
      angularVelocity: (Math.random() - 0.5) * 0.1 // random angular velocity (rotation)
    });
    Composite.add(boxComposite, circle);
  }

  return boxComposite;
}

// Main composite
const normalComposite = Composite.create();

// Create bins and add them to the composite
for (let i = 0; i < numBins; i++) {
  let sigmaCenter = binCenters[i];
  let x = 600 + sigmaCenter * (maxBoxWidth + 5);
  let prob = binProbs[i];

  let sigmaBox = createSigmaBox(x, sigmaCenter, prob);

  Composite.add(normalComposite, sigmaBox);
}

// Add to world
World.add(world, normalComposite);

// Create a mean line (vertical line at 0σ)
const meanLine = Bodies.rectangle(600, groundY - 100, 2, 500, {
  isStatic: true,
  render: {
    fillStyle: 'black'
  }
});
World.add(world, meanLine);

// Ground
const ground = Bodies.rectangle(600, groundY + 20, 1200, 40, { isStatic: true });
World.add(world, ground);
