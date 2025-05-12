let boxPlotData = [];

function setup() {
    let cnv = createCanvas(900, 600);
    cnv.parent(document.body);
    noLoop();
}

function switchMode(mode) {
    document.getElementById('statsInput').style.display = (mode === 'stats') ? 'flex' : 'none';
    document.getElementById('obsInput').style.display = (mode === 'observations') ? 'flex' : 'none';
    clear();
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
    drawBoxPlot(min, q1, median, q3, max, mean);
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

    drawBoxPlot(minInlier, q1, median, q3, maxInlier, mean, lowerBound, upperBound);
}

function drawBoxPlot(min, q1, median, q3, max, mean, lowerBound = null, upperBound = null) {
    clear();
    background(255);

    const xStart = 150;
    const xEnd = 750;
    const scale = (xEnd - xStart) / (max - min);
    const boxY = 200;

    // Whiskers
    stroke('black');
    strokeWeight(2);
    line(xStart, boxY, xStart + (q1 - min) * scale, boxY);
    line(xStart + (q3 - min) * scale, boxY, xStart + (max - min) * scale, boxY);

    // Box
    fill('yellow');
    noStroke();
    rect(xStart + (q1 - min) * scale, boxY - 50, (q3 - q1) * scale, 100);

    // Median Line
    stroke('black');
    strokeWeight(3);
    const medianX = xStart + (median - min) * scale;
    line(medianX, boxY - 50, medianX, boxY + 50);

    // Mean Line
    stroke('blue');
    strokeWeight(2);
    const meanX = xStart + (mean - min) * scale;
    line(meanX, boxY - 60, meanX, boxY + 60);
    noStroke();
    fill('blue');
    textAlign(CENTER);
    text('Mean', meanX, boxY - 70);

    // Outliers
    if (lowerBound !== null && upperBound !== null) {
        fill('red');
        boxPlotData.forEach(val => {
            if (val < lowerBound || val > upperBound) {
                const x = xStart + (val - min) * scale;
                ellipse(x, boxY, 10, 10);
            }
        });
    }

    // Axis Line and Labels
    stroke('black');
    strokeWeight(1);
    line(xStart, 300, xEnd, 300);

    noStroke();
    fill('black');
    textAlign(CENTER);
    textSize(12);
    text(`Min: ${min}`, xStart, 320);
    text(`Q1: ${q1}`, xStart + (q1 - min) * scale, 320);
    text(`Median: ${median}`, medianX, 320);
    text(`Q3: ${q3}`, xStart + (q3 - min) * scale, 320);
    text(`Max: ${max}`, xEnd, 320);
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
