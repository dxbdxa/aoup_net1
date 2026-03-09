import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';

/**
 * Manages the orthographic camera for Nature-style schematic view
 */
export class CameraManager {
    constructor() {
        this.camera = null;
        this.aspect = window.innerWidth / window.innerHeight;
        this.init();
    }
    
    /**
     * Initialize orthographic camera
     */
    init() {
        const frustumSize = Constants.FRUSTUM_SIZE;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * this.aspect / -2,
            frustumSize * this.aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.2,
            1000
        );
        this.camera.position.set(0, 0, 40);
        this.camera.lookAt(0, 0, 0);
    }
    
    /**
     * Update camera on window resize
     */
    onWindowResize() {
        this.aspect = window.innerWidth / window.innerHeight;
        const frustumSize = Constants.FRUSTUM_SIZE;
        
        this.camera.left = -frustumSize * this.aspect / 2;
        this.camera.right = frustumSize * this.aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        
        this.camera.updateProjectionMatrix();
    }
    
    /**
     * Get the camera instance
     * @returns {THREE.OrthographicCamera} The camera
     */
    getCamera() {
        return this.camera;
    }
}
