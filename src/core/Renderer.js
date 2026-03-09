import * as THREE from 'three';

/**
 * Manages the WebGL renderer
 */
export class RenderManager {
    constructor(containerId) {
        this.renderer = null;
        this.container = document.getElementById(containerId);
        this.init();
    }
    
    /**
     * Initialize WebGL renderer
     */
    init() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            preserveDrawingBuffer: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        if (this.container) {
            this.container.appendChild(this.renderer.domElement);
        }
    }
    
    /**
     * Render the scene
     * @param {THREE.Scene} scene - Scene to render
     * @param {THREE.Camera} camera - Camera to use
     */
    render(scene, camera) {
        this.renderer.render(scene, camera);
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Export current view as PNG
     * @returns {string} Data URL of the image
     */
    exportToPNG() {
        return this.renderer.domElement.toDataURL('image/png');
    }
    
    /**
     * Get the renderer instance
     * @returns {THREE.WebGLRenderer} The renderer
     */
    getRenderer() {
        return this.renderer;
    }
    
    /**
     * Get the DOM element
     * @returns {HTMLCanvasElement} The canvas element
     */
    getDomElement() {
        return this.renderer.domElement;
    }
}
