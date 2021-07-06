import '../style.css'
import * as THREE from 'three';
import * as dat from 'dat.gui';
import SceneManager from './sceneManager/scene';
import CANNON from 'cannon';
import gsap from 'gsap';

const gui = new dat.GUI();

/**
 * Scene Manager
 */
const canvas = document.querySelector('#canvas');
const scene = new SceneManager(canvas);
const clock = new THREE.Clock();
scene.scene.background.set('#2e282a');
// scene.addOrbitControl();

/**
 * Cannon JS
 * Physics World
 */
 const world = new CANNON.World();
 world.gravity.set(0,- 9.82,0);
//  world.allowSleep = true; 
 world.broadphase = new CANNON.SAPBroadphase(world);
 world.solver.iterations = 40;


//floor
// const groundBody = new CANNON.Body({mass:0});
// const groundShape = new CANNON.Plane();
// groundBody.addShape(groundShape);
// groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1,0,0), Math.PI * 0.5);
// world.addBody(groundBody);


/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.6);
directionalLight.position.set(0,10,-20);
scene.add(directionalLight);
const ambiantLight = new THREE.AmbientLight(0xFFFFFF,0.75);
scene.add(ambiantLight);


let stack = [];
const overHangs = [];
const boxHeight = 1;
let boxSize = 5;
let gameStarted = false;

window.addEventListener('click', () =>	{
	if(!gameStarted){
		scene.renderer.setAnimationLoop(animate);
		gameStarted = true;
	}else{
		clock.start(); 

		//Compute Overlap
		const topLayer = stack[stack.length - 1];
		const previousLayer = stack[stack.length - 2];

		const direction = topLayer.direction;

		const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction]; 

		const overHangSize = Math.abs(delta);

		const size = direction == 'x' ? topLayer.width : topLayer.depth;
		
		const overlap = size - overHangSize;

		if(overlap > 0){
			const nextDirection = direction === 'x' ? 'z' : 'x';
			cutBox(topLayer,overlap,size,delta);

			// //clone
			const overHangShift = (overlap / 2 + overHangSize / 2) * Math.sign(delta);
			const overHangX = direction === 'x' ? topLayer.threejs.position.x + overHangShift : topLayer.threejs.position.x;
			const overHangZ = direction === 'z' ? topLayer.threejs.position.z + overHangShift : topLayer.threejs.position.z;
			const overHangWidth = direction == "x" ? overHangSize : topLayer.width;
   			const overHangDepth = direction == "z" ? overHangSize : topLayer.depth
			

			addLayer(overHangX, overHangZ, overHangWidth, overHangDepth, nextDirection, true);

			
			//Next Layer
			const nextX = direction === 'x' ? topLayer.threejs.position.x : -10;
			const nextZ = direction === 'z' ? topLayer.threejs.position.z  : -10;
			

			addLayer(nextX, nextZ, topLayer.width, topLayer.depth, nextDirection);
			
		}

	}
})

function cutBox(topLayer, overlap, size, delta) {
	const direction = topLayer.direction;
	const newWidth = direction == "x" ? overlap : topLayer.width;
	const newDepth = direction == "z" ? overlap : topLayer.depth;
  
	// Update metadata
	topLayer.width = newWidth;
	topLayer.depth = newDepth;
  
	// Update ThreeJS model
	topLayer.threejs.scale[direction] = overlap / size;
	topLayer.threejs.position[direction] -= delta / 2;
  
	// Update CannonJS model
	topLayer.cannonjs.position[direction] -= delta / 2;
  
	// Replace shape to a smaller one (in CannonJS you can't simply just scale a shape)
	const shape = new CANNON.Box(
	  new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
	);
	// shape.collisionResponse = false;
	topLayer.cannonjs.shapes = [];
	topLayer.cannonjs.addShape(shape);

	// console.log(shape);
  }

/**
 * AddLayer
 */
function addLayer(x, z, width, depth , direction, overHangLayer = false){
	
	if(overHangLayer){
		const y = boxHeight * stack.length - 1;
		const layer = generateBox(x, y, z, width, depth, true);
		overHangs.push(layer);
	}else{
		const y = boxHeight * stack.length;
		const layer = generateBox(x, y, z, width, depth);
		layer.direction = direction;
		stack.push(layer);
	}

}

/**
 * Generate Box
 */
const initRandomColor = Math.random() * 360;
function generateBox(x, y, z, width, depth, mass = false){
	const boxGeometry = new THREE.BoxBufferGeometry(width, boxHeight, depth);

	const color = new THREE.Color(`hsl(${initRandomColor + (stack.length * 5)}, 100%, 50%)`)
	const boxMaterial = new THREE.MeshPhongMaterial({color,flatShading:true});
	const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
	mesh.position.set(x,y,z);
	scene.add(mesh);

	//Cannon Box
	let boxMass = mass ? 0.5 : 0;
	// boxMass *= width / boxSize; // Reduce mass proportionately by size
	// boxMass *= depth / boxSize; // Reduce mass proportionately by size
	const shape = new CANNON.Box(new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2));
	const body = new CANNON.Body({
		mass:boxMass,
		shape,
	});
	body.position.set(x,y,z);
	world.addBody(body);

	return {
		threejs:mesh,
		cannonjs:body,
		width,
		depth
	}
}
//foundation
addLayer(0, 0, boxSize, boxSize, 'x');
//first layer
addLayer(-10, 0, boxSize, boxSize, 'x');



let previousTime = 0;

const animate = () => {
	const elapsedTime = clock.getElapsedTime();
	const deltaTime = elapsedTime - previousTime;
	previousTime = elapsedTime;

	world.step(1/60, deltaTime,3);
	overHangs.map(obj => {
		obj.threejs.position.copy(obj.cannonjs.position)
		obj.threejs.quaternion.copy(obj.cannonjs.quaternion)
	});

	const speed =  0.5;

	const topLayer = stack[stack.length - 1];
	topLayer.threejs.position[topLayer.direction] = (Math.cos(elapsedTime) * -10);
	topLayer.cannonjs.position[topLayer.direction] = (Math.cos(elapsedTime) * -10);
	
	if(scene.camera.position.y < boxHeight * (stack.length) + 8){
		scene.camera.position.y += 0.15;
	}
	
	scene.onUpdate();
	scene.onUpdateStats();
	// requestAnimationFrame( animate );
};

animate();