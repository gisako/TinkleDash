const { Engine, Render, Runner, World, Bodies, Composite, Mouse, MouseConstraint } = Matter;

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 900,
        height: 600,
        wireframes: false,
        background: '#fff'
    }
});

Render.run(render);
Runner.run(Runner.create(), engine);

const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
World.add(world, mouseConstraint);

function startGaltonBoard() {
    World.clear(world, false);
    addGroundAndWalls();

    const ballCount = parseInt(document.getElementById('ballCount').value) || 300;

    // Add pegs
    const rows = 10;
    const cols = 15;
    const pegSpacingX = 50;
    const pegSpacingY = 50;
    const offsetX = 150;
    const offsetY = 100;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const x = offsetX + col * pegSpacingX + (row % 2) * (pegSpacingX / 2);
            const y = offsetY + row * pegSpacingY;

            const peg = Bodies.circle(x, y, 5, { isStatic: true, render: { fillStyle: '#999' } });
            World.add(world, peg);
        }
    }

    // Add bins
    const binCount = cols + 1;
    const binWidth = 600 / binCount;
    const binHeight = 150;
    const binBaseY = 590;

    for (let i = 0; i <= binCount; i++) {
        const x = offsetX - (pegSpacingX / 2) + i * binWidth;
        const binWall = Bodies.rectangle(x, binBaseY - binHeight / 2, 5, binHeight, { isStatic: true });
        World.add(world, binWall);
    }

    // Add balls
    for (let i = 0; i < ballCount; i++) {
        const x = 450 + (Math.random() - 0.5) * 100;
        const circle = Bodies.circle(x, 50, 5, {
            restitution: 0.5,
            frictionAir: 0.01,
            render: { fillStyle: "#90EE90" }
        });
        World.add(world, circle);
    }
}

function addGroundAndWalls() {
    World.add(world, [
        Bodies.rectangle(450, 595, 900, 10, { isStatic: true }), // Ground
        Bodies.rectangle(0, 300, 20, 600, { isStatic: true }),   // Left Wall
        Bodies.rectangle(900, 300, 20, 600, { isStatic: true })  // Right Wall
    ]);
}
