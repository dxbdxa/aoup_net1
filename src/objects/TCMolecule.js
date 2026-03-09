import * as THREE from 'three';
import { Colors } from '../utils/Colors.js';
import { Constants } from '../utils/Constants.js';

/**
 * Represents a TC (Tunneling Connector) molecule
 */
export class TCMolecule {
    constructor(position) {
        this.mesh = null;
        this.velocity = new THREE.Vector3();
        this.isBridging = false;
        this.boundASite = null;
        this.boundBSite = null;
        
        this.init(position);
    }
    
    /**
     * Initialize TC molecule
     * @param {THREE.Vector3} position - Initial position
     */
    init(position) {
        const geometry = new THREE.SphereGeometry(Constants.TC_RADIUS, 12, 12);
        const material = new THREE.MeshPhongMaterial({
            color: Colors.green,
            transparent: false,
            opacity: 1.0,
            shininess: 30
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Random velocity
        this.velocity.set(
            Math.random() * 0.05,
            Math.random() * 0.05,
            Math.random() * 0.05
        );
        
        this.mesh.castShadow = false;
    }
    
    /**
     * Update TC molecule position
     * @param {THREE.Vector3} delta - Movement delta
     */
    move(delta) {
        this.mesh.position.add(delta);
    }
    
    /**
     * Apply periodic boundary conditions
     * @param {number} boxLength - Box length
     * @param {number} boxWidth - Box width
     * @param {number} boxHeight - Box height
     */
    applyBoundary(boxLength, boxWidth, boxHeight) {
        const pos = this.mesh.position;
        
        if (pos.x > boxLength/2 || pos.x < -boxLength/2 ||
            pos.y > boxWidth/2 || pos.y < -boxWidth/2 ||
            pos.z > boxHeight/2 || pos.z < -boxHeight/2) {
            
            pos.x = pos.x - Math.floor(pos.x / boxLength + 0.5) * boxLength;
            pos.y = pos.y - Math.floor(pos.y / boxWidth + 0.5) * boxWidth;
            pos.z = pos.z - Math.floor(pos.z / boxHeight + 0.5) * boxHeight;
        }
    }
    
    
    /**
     * Get the TC mesh
     * @returns {THREE.Mesh} TC mesh
     */
    getMesh() {
        return this.mesh;
    }
}
