import '../style.css'
import * as THREE from 'three';
import SceneManager from './sceneManager/scene';
import CANNON from 'cannon';

/**
 * Scene Manager
 */
const canvas = document.querySelector('#canvas');
const scene = new SceneManager(canvas);
const clock = new THREE.Clock();
scene.scene.background.set('#2e282a');

/**
 * Cannon JS
 * Physics World
 */
 const world = new CANNON.World();
 world.gravity.set(0,- 9.82,0);
 world.broadphase = new CANNON.SAPBroadphase(world);
 world.solver.iterations = 40;

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 0.6);
directionalLight.position.set(0,10,-20);
scene.add(directionalLight);
const ambiantLight = new THREE.AmbientLight(0xFFFFFF,0.75);
scene.add(ambiantLight);

/**
 * Sounds
 */
const woodHitSound = new Audio('./soundEffects/wood-hit.wav');
const playWoodHitSound = () => {
	woodHitSound.currentTime = 0;
	woodHitSound.play();
}
const glassBreakSound = new Audio('./soundEffects/glass-break.wav');
const playGlassBreakSound = () => {
	glassBreakSound.currentTime = 0;
	glassBreakSound.play();
}

/**
 * DOM
 */
 const scoreDom = document.querySelector('.score');
 const perfectDom = document.querySelector('.got-perfect');
 perfectDom.style.display = 'none';
 const timerDom = document.querySelector('.timer');
 const overlayIntro = document.querySelector('.overlay');
 const overlayPause = document.querySelector('.overlay-pause');
 const overlayGameOver = document.querySelector('.overlay-gameover');
 overlayGameOver.style.display = 'none';
 const totalScore = document.querySelector('.total-score'); 


let stack = [];
let overHangs = [];
const boxHeight = 1;
let boxColor = '';
let boxSize = 5;
let gotPerfect = false;
let currentScore = 0;
let gameStatus = 'intro';
/** 
 * Timer
 */
let timerValue = 10;
let timerStart;

function startTimer(){
	timerDom.innerHTML = timerValue;
	timerDom.style.color = 'white';
	timerStart = setInterval(() => {
		timerDom.innerHTML = timerValue;
		
		timerDom.style.color = timerValue < 5 ? 'red' : 'white';
		if(timerValue <= 0) {
			clearInterval(timerStart);
			gameOver();
		}
		timerValue--;
	},1000);
	
}

document.querySelector('.resetButton').onclick = () => {
	reset();
	getOverlay();
	play();
}
document.querySelector('.playButton').onclick = () => {
	play();
	getOverlay();
}
document.querySelector('.game-start').onclick = () => {
	play();
	getOverlay();
}
document.querySelector('.play-again').onclick = () => {
	reset();
	getOverlay('play');
}
const pause = document.querySelector('.pauseButton');
pause.onclick = () => {
	/**
	 * Stop the timer
	 */
	clearInterval(timerStart);
	getOverlay('pause');
	scene.renderer.setAnimationLoop(null);
}

/**
 * Update Dom
 */
function updateDom(){
	currentScore = stack.length - 2;
	scoreDom.innerHTML = currentScore;

	let materialColor = stack[stack.length - 1].threejs.material.color;
	let color = new THREE.Color(materialColor);
	scoreDom.style.color = `#${color.getHexString()}`;	
	
	if(gotPerfect){
		perfectDom.style.display = 'flex'
		setTimeout(()=>{
			perfectDom.style.display = 'none';
			gotPerfect = false;
		},1000);
	}
}

/**
 * Reset
 */
 function reset(){
	clock.start();
	timerValue = 10;
	scene.camera.position.y = 10;
	stack.map(object => {
		object.threejs.geometry.dispose();
		object.threejs.material.dispose();
		scene.scene.remove(object.threejs);
		scene.renderer.renderLists.dispose();
	});
	overHangs.map(object=> {
		object.threejs.geometry.dispose();
		object.threejs.material.dispose();
		scene.scene.remove(object.threejs);
		scene.renderer.renderLists.dispose();
	})
	stack = [];
	overHangs = [];
	addLayer(0, 0, boxSize, boxSize, 'x');
	addLayer(-10, 0, boxSize, boxSize, 'x');
	updateDom();
}


/**
 * Check overlay
 */
getOverlay('play');
function getOverlay(status){
	switch(status){
		case 'play':
			overlayIntro.style.display = 'flex';
			overlayGameOver.style.display = 'none';
			overlayPause.style.display = 'none';
			document.querySelector('.container').style.display = 'none'
			break;
		case 'pause': 
			overlayIntro.style.display = 'none';
			overlayGameOver.style.display = 'none';
			overlayPause.style.display = 'flex';
			break;
		case 'game-over':
			overlayIntro.style.display = 'none';
			overlayGameOver.style.display = 'flex';
			overlayPause.style.display = 'none';
			break;
		default :
			overlayIntro.style.display = 'none';
			overlayGameOver.style.display = 'none';
			overlayPause.style.display = 'none';
			document.querySelector('.container').style.display = 'flex'
			break;
	}
}


/**
 * GameOver
 */
function gameOver(){
	totalScore.innerHTML = currentScore;
	getOverlay('game-over');
	/** stop animation */
	scene.renderer.setAnimationLoop(null);
}


/**
 * Play
 */
function play(){
	startTimer();
	scene.renderer.setAnimationLoop(animate);
	canvas.addEventListener('click', () => {
		clock.start(); 

		/**
		 * Compute OverLap
		 */
		const topLayer = stack[stack.length - 1];
		const previousLayer = stack[stack.length - 2];

		const direction = topLayer.direction;
		const nextDirection = direction === 'x' ? 'z' : 'x';

		const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction]; 

		const overHangSize = Math.abs(delta);

		const size = direction == 'x' ? topLayer.width : topLayer.depth;
	
		const overlap = size - overHangSize;

		
		if(overHangSize.toFixed(1) == 0){
			
			topLayer.threejs.position[direction] = previousLayer.threejs.position[direction];
			topLayer.threejs.material.color.set('#111111');
		

			addNextLayer(topLayer);
			playGlassBreakSound();

			/**
			 * Dom
			 */
			gotPerfect = true;
			timerValue = 10;

		}else if(overlap > 0){
			
			cutBox(topLayer,overlap,size,delta);

			/** compute overhang */
			const overHangShift = (overlap / 2 + overHangSize / 2) * Math.sign(delta);
			const overHangX = direction === 'x' ? topLayer.threejs.position.x + overHangShift : topLayer.threejs.position.x;
			const overHangZ = direction === 'z' ? topLayer.threejs.position.z + overHangShift : topLayer.threejs.position.z;
			const overHangWidth = direction == "x" ? overHangSize : topLayer.width;
			const overHangDepth = direction == "z" ? overHangSize : topLayer.depth
			addLayer(overHangX, overHangZ, overHangWidth, overHangDepth, nextDirection, true);

			addNextLayer(topLayer);
			playWoodHitSound();


			/**
			 * Dom
			 */
			timerValue = 10;
		}

		/**
		 * Update Dom
		 */
		updateDom();		
			
	});
}

/**
 * 
 * @param {*} topLayer 
 */
function addNextLayer(topLayer){
	const direction = topLayer.direction;
	const nextDirection = direction === 'x' ? 'z' : 'x';

	const nextX = direction === 'x' ? topLayer.threejs.position.x : -10;
	const nextZ = direction === 'z' ? topLayer.threejs.position.z : -10;
	addLayer(nextX, nextZ, topLayer.width, topLayer.depth, nextDirection);
}

/**
 * Cutting Box
 * @param {*} topLayer 
 * @param {*} overlap 
 * @param {*} size 
 * @param {*} delta 
 */
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
	const shape = new CANNON.Box(
	  new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
	);
	// shape.collisionResponse = false;
	topLayer.cannonjs.shapes = [];
	topLayer.cannonjs.addShape(shape);

  }

/**
 * 
 * @param {*} x 
 * @param {*} z 
 * @param {*} width 
 * @param {*} depth 
 * @param {*} direction 
 * @param {*} overHangLayer 
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
 * 
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @param {*} width 
 * @param {*} depth 
 * @param {*} mass 
 * @returns 
 */
const initRandomColor = Math.random() * 360;
function generateBox(x, y, z, width, depth, mass = false){
	const boxGeometry = new THREE.BoxBufferGeometry(width, boxHeight, depth);

	const color = new THREE.Color(`hsl(${initRandomColor + (stack.length * 5)}, 100%, 50%)`);
	const boxMaterial = new THREE.MeshPhongMaterial({color,flatShading:true});
	const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
	mesh.position.set(x,y,z);
	scene.add(mesh);

	//Cannon Box
	let boxMass = mass ? 0.5 : 0;
	boxMass *= width / boxSize; // Reduce mass proportionately by size
	boxMass *= depth / boxSize; // Reduce mass proportionately by size
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

/**
 * Init Foundation Box
 */
addLayer(0, 0, boxSize, boxSize, 'x');
addLayer(-10, 0, boxSize, boxSize, 'x');


let previousTime = 0;

function animate(){
	const elapsedTime = clock.getElapsedTime();
	const deltaTime = elapsedTime - previousTime;
	previousTime = elapsedTime;

	world.step(1/60, deltaTime,3);
	overHangs.map(obj => {
		obj.threejs.position.copy(obj.cannonjs.position)
		obj.threejs.quaternion.copy(obj.cannonjs.quaternion)
	});

	const speed = (stack.length + 8) * 0.05;

	const topLayer = stack[stack.length - 1];
	topLayer.threejs.position[topLayer.direction] = (Math.cos(elapsedTime * speed) * -10);
	topLayer.cannonjs.position[topLayer.direction] = (Math.cos(elapsedTime * speed) * -10);
	
	if(scene.camera.position.y < boxHeight * (stack.length) + 8){
		scene.camera.position.y += 0.15;
	}
	
	scene.onUpdate();
	// scene.onUpdateStats();
	// requestAnimationFrame( animate );
};

animate();