import * as THREE from 'three';
import { Colors } from '../utils/Colors.js';
import { Constants } from '../utils/Constants.js';

/**
 * Manages the Three.js scene and lighting
 */
export class SceneManager {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(Colors.white);
        this.lights = [];
    }
    
    /**
     * Setup scene lighting
     */
    setupLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(Colors.white, 0.8);
        this.scene.add(ambientLight);
        this.lights.push(ambientLight);
        
        // Main directional light with shadows
        const mainLight = new THREE.DirectionalLight(Colors.white, 1.2);
        mainLight.position.set(100, 100, 100);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 4096;
        mainLight.shadow.mapSize.height = 4096;
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 500;
        mainLight.shadow.camera.left = -100;
        mainLight.shadow.camera.right = 100;
        mainLight.shadow.camera.top = 100;
        mainLight.shadow.camera.bottom = -100;
        this.scene.add(mainLight);
        this.lights.push(mainLight);
        
        // Fill light
        const fillLight = new THREE.DirectionalLight(Colors.white, 0.5);
        fillLight.position.set(-50, 50, -50);
        this.scene.add(fillLight);
        this.lights.push(fillLight);
        
        // Rim light
        const rimLight = new THREE.DirectionalLight(Colors.white, 0.3);
        rimLight.position.set(0, -50, -50);
        this.scene.add(rimLight);
        this.lights.push(rimLight);
    }
    
    /**
     * Create boundary box
     * @returns {THREE.LineSegments} Boundary edges
     */
    createBoundary() {
        const boxGeometry = new THREE.BoxGeometry(
            Constants.BOX_LENGTH,
            Constants.BOX_WIDTH,
            Constants.BOX_HEIGHT
        );
        const boxEdges = new THREE.EdgesGeometry(boxGeometry);
        const boxLine = new THREE.LineSegments(
            boxEdges,
            new THREE.LineBasicMaterial({ 
                color: Colors.gray,
                linewidth: 2,
                transparent: true,
                opacity: 0.4
            })
        );
        this.scene.add(boxLine);
        return boxLine;
    }
    
    /**
     * Add object to scene
     * @param {THREE.Object3D} object - Object to add
     */
    add(object) {
        this.scene.add(object);
    }
    
    /**
     * Remove object from scene
     * @param {THREE.Object3D} object - Object to remove
     */
    remove(object) {
        this.scene.remove(object);
    }
    
    /**
     * Get the scene instance
     * @returns {THREE.Scene} The scene
     */
    getScene() {
        return this.scene;
    }
}
