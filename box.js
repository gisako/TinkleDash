const { Engine, Render, Runner, World, Bodies, Composite, Constraint, Body, Mouse, MouseConstraint, Events } = Matter;

let engine, world, render, runner;
let boxPlotComposite;
let parts = [];

window.onload = function () {
    initMatter();
};

function initMatter() {
    engine = Engine.create();
    world = engine.world;

    render = Render.create({
        element: document.body,
        engine: engine,
        options: {
            width: 900,
            height: 500,
            wireframes: false,
            background: '#fff'
        }
    });

    runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    const walls = [
        Bodies.rectangle(450, -25, 900, 50, { isStatic: true }),
        Bodies.rectangle(450, 525, 900, 50, { isStatic: true }),
        Bodies.rectangle(-25, 250, 50, 500, { isStatic: true }),
        Bodies.rectangle(925, 250, 50, 500, { isStatic: true })
    ];
    World.add(world, walls);

    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse,
        constraint: {
            stiffness: 0.9,
            damping: 0.3,
            render: { visible: false }
        }
    });

    World.add(world, mouseConstraint);
    render.mouse = mouse;

    // Custom Rendering for Legends and Labels
    Events.on(render, 'afterRender', drawLegendsAndLabels);
}

function switchMode(mode) {
    document.getElementById('statsInput').style.display = (mode === 'stats') ? 'flex' : 'none';
    document.getElementById('obsInput').style.display = (mode === 'observations') ? 'flex' : 'none';
    clearPlot();
}

function clearPlot() {
    if (boxPlotComposite) {
        Composite.remove(world, boxPlotComposite);
    }
    parts = [];
}

function drawFromStats() {
    const min = parseFloat(document.getElementById('minVal').value);
    const q1 = parseFloat(document.getElementById('q1Val').value);
    const median = parseFloat(document.getElementById('medianVal').value);
    const q3 = parseFloat(document.getElementById('q3Val').value);
    const max = parseFloat(document.getElementById('maxVal').value);

    if ([min, q1, median, q3, max].some(isNaN)) {
        alert("Please fill all statistical values correctly.");
        return;
    }

    boxPlotData = [min, q1, median, q3, max];
    const mean = computeMean(boxPlotData);

    drawCompositeBoxPlot(min, q1, median, q3, max, mean);
}

function drawFromObservations() {
    const raw = document.getElementById('observations').value;
    boxPlotData = raw.split(',').map(Number).filter(val => !isNaN(val));
    if (boxPlotData.length === 0) {
        alert("Please enter valid numbers.");
        return;
    }

    boxPlotData.sort((a, b) => a - b);

    const q1 = quantile(boxPlotData, 0.25);
    const median = quantile(boxPlotData, 0.5);
    const q3 = quantile(boxPlotData, 0.75);
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    const minInlier = Math.min(...boxPlotData.filter(v => v >= lowerBound));
    const maxInlier = Math.max(...boxPlotData.filter(v => v <= upperBound));

    const mean = computeMean(boxPlotData);

    drawCompositeBoxPlot(minInlier, q1, median, q3, maxInlier, mean, lowerBound, upperBound);
}

function lockBodyRotation(body) {
    Body.setInertia(body, Infinity);
    body.inverseInertia = 0;
    body.angle = 0;
    body.frictionAir = 0.2;
}

function drawCompositeBoxPlot(min, q1, median, q3, max, mean, lowerBound = null, upperBound = null) {
    clearPlot();

    const xStart = 150;
    const scale = (750 - xStart) / (max - min);
    const y = 150;
    const rectHeight = 80;
    const whiskerThickness = 8;
    const gap = 5;

    const createBody = (x, width, height, color, label) => {
        const body = Bodies.rectangle(x, y, width, height, {
            render: { fillStyle: color, strokeStyle: 'black', lineWidth: 2 }
        });
        body.labelText = label;
        Body.setMass(body, 100);
        lockBodyRotation(body);
        return body;
    };

    parts.push(createBody(xStart + (q1 - min) * scale / 2, (q1 - min) * scale, whiskerThickness, 'black', `Min: ${min}`));
    parts.push(createBody(xStart + (q1 - min) * scale + (median - q1) * scale / 2, (median - q1) * scale, rectHeight, 'orange', `Q1: ${q1}`));
    parts.push(createBody(xStart + (median - min) * scale, 4, rectHeight, 'black', `Median: ${median}`));
    parts.push(createBody(xStart + (median - min) * scale + (q3 - median) * scale / 2, (q3 - median) * scale, rectHeight, 'orange', `Q3: ${q3}`));
    parts.push(createBody(xStart + (q3 - min) * scale + (max - q3) * scale / 2, (max - q3) * scale, whiskerThickness, 'black', `Max: ${max}`));

    const meanBody = createBody(xStart + (mean - min) * scale, 4, rectHeight + 40, 'purple', `Mean: ${mean}`);
    parts.push(meanBody);

    if (lowerBound !== null && upperBound !== null) {
        boxPlotData.forEach(val => {
            if (val < lowerBound || val > upperBound) {
                const x = xStart + (val - min) * scale;
                const outlier = Bodies.circle(x, y, 6, {
                    render: { fillStyle: 'red' }
                });
                World.add(world, outlier);
            }
        });
    }

    boxPlotComposite = Composite.create();

    parts.forEach((part, idx) => {
        Composite.add(boxPlotComposite, part);
        if (idx > 0 && part !== meanBody) {
            const prev = parts[idx - 1];

            const prevWidth = prev.bounds.max.x - prev.bounds.min.x;
            const currWidth = part.bounds.max.x - part.bounds.min.x;

            Composite.add(boxPlotComposite, Constraint.create({
                bodyA: prev,
                bodyB: part,
                pointA: { x: prevWidth / 2, y: 0 },
                pointB: { x: -currWidth / 2, y: 0 },
                length: gap,
                stiffness: 1,
                damping: 0.5
            }));
        }
    });

    // Connect mean separately to nearest part (visually attached but not in main chain)
    const closestPart = parts.reduce((closest, p) => 
        (Math.abs(p.position.x - meanBody.position.x) < Math.abs(closest.position.x - meanBody.position.x)) ? p : closest
    );

    Composite.add(boxPlotComposite, Constraint.create({
        bodyA: closestPart,
        bodyB: meanBody,
        pointA: { x: 0, y: 0 },
        pointB: { x: 0, y: 0 },
        length: gap,
        stiffness: 1,
        damping: 0.5
    }));

    World.add(world, boxPlotComposite);
}

function drawLegendsAndLabels() {
    const ctx = render.context;

    // Legend
    ctx.font = "14px Arial";
    ctx.fillStyle = "black";
    ctx.fillText("Legend:", 20, 30);

    ctx.fillStyle = "black";
    ctx.fillRect(20, 40, 20, 10);
    ctx.fillText("Whisker", 50, 50);

    ctx.fillStyle = "orange";
    ctx.fillRect(20, 60, 20, 10);
    ctx.fillStyle = "black";
    ctx.fillText("Quartiles (Q1-Q3)", 50, 70);

    ctx.fillStyle = "black";
    ctx.fillRect(20, 80, 20, 10);
    ctx.fillText("Median", 50, 90);

    ctx.fillStyle = "purple";
    ctx.fillRect(20, 100, 20, 10);
    ctx.fillText("Mean", 50, 110);

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(30, 130, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText("Outlier", 50, 135);

    // Labels on Plot
    parts.forEach(part => {
        if (part.labelText) {
            ctx.fillStyle = "black";
            ctx.font = "12px Arial";
            ctx.fillText(part.labelText, part.position.x - 20, part.position.y - 50);
        }
    });
}

function quantile(arr, q) {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    return (arr[base + 1] !== undefined) 
        ? arr[base] + rest * (arr[base + 1] - arr[base]) 
        : arr[base];
}

function computeMean(arr) {
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}
