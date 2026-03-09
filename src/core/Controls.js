import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Constants } from '../utils/Constants.js';

/**
 * Manages user interaction controls (orbit, pan, zoom)
 */
export class ControlManager {
    constructor(camera, domElement) {
        this.controls = null;
        this.init(camera, domElement);
    }
    
    /**
     * Initialize orbit controls
     * @param {THREE.Camera} camera - Camera to control
     * @param {HTMLElement} domElement - DOM element for event listeners
     */
    init(camera, domElement) {
        this.controls = new OrbitControls(camera, domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = Constants.DAMPING_FACTOR;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = Constants.MIN_DISTANCE;
        this.controls.maxDistance = Constants.MAX_DISTANCE;
    }
    
    /**
     * Update controls (call in animation loop)
     */
    update() {
        if (this.controls) {
            this.controls.update();
        }
    }
    
    /**
     * Dispose controls
     */
    dispose() {
        if (this.controls) {
            this.controls.dispose();
        }
    }
    
    /**
     * Get the controls instance
     * @returns {OrbitControls} The controls
     */
    getControls() {
        return this.controls;
    }
}
