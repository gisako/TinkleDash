// Module aliases

/* dfd.readCSV("https://cf-courses-data.s3.us.cloud-object-storage.appdomain.cloud/IBMDeveloperSkillsNetwork-DV0101EN-SkillsNetwork/Data%20Files/Historical_Wildfires.csv")
            .then(df => {

                //do something like display descriptive statistics
                df.describe().print()
                
            }).catch(err => {
                console.log(err);
            })*/

//https://cf-courses-data.s3.us.cloud-object-storage.appdomain.cloud/IBMDeveloperSkillsNetwork-DV0101EN-SkillsNetwork/Data%20Files/Historical_Wildfires.csv
  



function sleep(ms){
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function example() {
  console.log("Before sleep");
  await sleep(1000); // Wait for 1000 milliseconds (1 second)
  console.log("After sleep");
}

function createCompoundRectangles(objj) {
    const rectWidth = 50;
    // const rectHeight = 20;
    const spacing = 5;
    x= 100
    y=100
    const parts = [];

   for (let i = 0; i < objj.values.length; i++) {
        const rect = Bodies.rectangle(
            x+52*i,
            y,
            rectWidth,
            t.values[i]*2,
            { render: { fillStyle: '#F4631E',lineWidth:1,  strokeStyle: 'black'} }
        );
        parts.push(rect);
    }

   // Combine parts into a single compound body
   /* const compoundBody = Body.create({
        parts: parts,
        isStatic: false // Make it dynamic, or set to true if you want static
    });*/

   // return compoundBody;
    return parts;
}








function addBalls() {

 // globalDf.print();
 ageSeries = globalDf["ENGINESIZE"]; // or df.column("age")

 
  vclass = globalDf["VEHICLECLASS"]; 
  t = vclass.valueCounts();
  //console.log(vclass.valueCounts())

  //let grp = df.groupby(["A"])
  //grp.col(["C"]).sum().print()

  // Iterate through values
  ageSeries.values.forEach((value, index) => {
    // sleep(100);

   if(value>3.1) {
   Composite.add(world,Bodies.circle(20, 20, value*5, { render: { fillStyle: '#F4631E',lineWidth:1,  strokeStyle: 'black'} }));
 }
  else{
     Composite.add(world,Bodies.circle(20, 20, value*5, { render: { fillStyle: '#309898',lineWidth:1,  strokeStyle: 'black'} }));
   }
    //console.log(`Row ${index}: EngineSize = ${value}`);
   });
  g=0;
   
  /*for (let i = 0; i < t.values.length; i++) {
  console.log(`Index: ${t.index[i]}, Value: ${t.values[i]}`);

   g = g+25;
       Composite.add(world,Bodies.rectangle(20, g, t.values[i],t.values[i], { render: { fillStyle: '#F4631E',lineWidth:1,  strokeStyle: 'black'} }));
   }*/


 // bodyy = createCompoundRectangles(t);

}
  
/* const stack = Composites.stack(100, 100, 5, 5, 0, 0, function (x, y) {
    // Each stack cell will add 3 rectangles
    const rectangles = createCompoundRectangles(t);

    // Add extra rectangles manually to the stack composite
    rectangles.slice(1).forEach(rect => {
        Composite.add(stack, rect);
    });

    return rectangles[0]; // Return one rectangle to fulfill stack structure
});




  Composite.add(world,stack);
  }*/


const Engine = Matter.Engine,
Render = Matter.Render,
Runner = Matter.Runner,
Bodies = Matter.Bodies,
Body = Matter.Body,
Composite = Matter.Composite;
Composites = Matter.Composites,
MouseConstraint = Matter.MouseConstraint,
Mouse = Matter.Mouse


// Create an engine
const engine = Engine.create();
const world = engine.world;

// create renderer
var render = Render.create({
  element: document.body,
  engine: engine,
  options: {
    width: 800,
    height: 600,
    showAngleIndicator: true,
    wireframes: false,
    background: "white"
  }
});

Render.run(render);

// Create runner
const runner = Runner.create();
Runner.run(runner, engine);

// Add bodies
// add bodies


Composite.add(world, [
        // walls
  Bodies.rectangle(400, 0, 800, 50, { isStatic: true, render: { fillStyle: '#ffffff',lineWidth:0 }}),
  Bodies.rectangle(400, 600, 800, 50, { isStatic: true, render: { fillStyle: '#ffffff',lineWidth:0 } }),
  Bodies.rectangle(800, 300, 50, 600, { isStatic: true, render: { fillStyle: '#ffffff',lineWidth:0 } }),
  Bodies.rectangle(0, 300, 50, 600, { isStatic: true, render: { fillStyle: '#ffffff',lineWidth:0 } }),
  
]);

// add mouse control
var mouse = Mouse.create(render.canvas),
mouseConstraint = MouseConstraint.create(engine, {
  mouse: mouse,
  constraint: {
    stiffness: 0.2,
    render: {
      visible: false
    }
  }
});

Composite.add(world, mouseConstraint);

// keep the mouse in sync with rendering
render.mouse = mouse;

// fit the render viewport to the scene
Render.lookAt(render, {
  min: { x: 0, y: 0 },
  max: { x: 800, y: 600 }
});






