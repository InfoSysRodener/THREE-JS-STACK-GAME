import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'stats.js';

export default class SceneManager {

    constructor(canvas){
         this.canvas = canvas;
         this._init();
    }

    _init(){
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xFF4444);

        /**
         * Renderer
         */
        const renderer = new THREE.WebGLRenderer({ canvas:this.canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));

        window.addEventListener('resize', () => this.onWindowsResize(), false);
        
        this.aspectRatio = window.innerWidth / window.innerHeight;
        this.cameraSize = 20;
        const camera = new THREE.OrthographicCamera(
            (this.cameraSize * this.aspectRatio) / - 2, 
            (this.cameraSize * this.aspectRatio) / 2,
            this.cameraSize / 2,
            this.cameraSize / - 2,
            0.01,
            1000
        );
        camera.position.set(10,10,10);
        camera.lookAt(0,0,0);
        camera.zoom = 5;
        scene.add(camera);
        // const helper = new THREE.CameraHelper( camera );
        // scene.add( helper );
       
        /**
         * Intialize Stats
         */
        // let stats = new Stats();
        // stats.setMode(0);
        // stats.domElement.style.position = 'absolute';
        // stats.domElement.style.left = '0';
        // stats.domElement.style.top = '0';
        // document.body.appendChild(stats.domElement);

        this.scene = scene;
        this.renderer = renderer;
        this.camera = camera;
        // this.stats = stats;

        
    }

    add(obj){
        this.scene.add(obj);
    }

    addFog(near = 1,far = 2,color = '#FFFFFF'){
        this.scene.fog = new THREE.Fog(color, near, far);
    }

    onUpdate(){
        this.renderer.render(this.scene,this.camera);
    }

    onWindowsResize(){
        // this.camera.aspect = window.innerWidth / window.innerHeight;
        const aspect = window.innerWidth / window.innerHeight;
        
        this.camera.left = (this.cameraSize *  aspect) / -2;
        this.camera.right = (this.cameraSize *  aspect) / 2;
        this.camera.zoom = 1;
    

        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight, false); 
    }

    addOrbitControl(){
        const controls = new OrbitControls(this.camera, this.canvas);
        controls.target.set(0, 0, 0);
        controls.enableDamping = true;
        controls.update();
        return controls;
    }

    onUpdateStats() {
        return this.stats.update();
    }

}