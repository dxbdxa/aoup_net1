import * as THREE from 'three';
import { Colors } from '../utils/Colors.js';
import { Constants } from '../utils/Constants.js';

/**
 * Represents a diffusive particle with A-sites as a rigid body
 */
export class Particle {
    constructor(position) {
        this.mesh = null;
        this.group = null;
        this.aSites = [];
        this.aSiteLocalPositions = [];
        this.velocity = new THREE.Vector3();
        this.angularVelocity = new THREE.Vector3();
        this.force = new THREE.Vector3();
        this.torque = new THREE.Vector3();
        this.rotationAxis = new THREE.Vector3();
        this.rotationAngle = 0;
        this.isTrapped = false;
        this.bridgeCount = 0;
        
        this.init(position);
    }
    
    /**
     * Initialize particle and its A-sites
     * @param {THREE.Vector3} position - Initial position
     */
    init(position) {
        const particleRadius = Constants.TC_RADIUS * Constants.PARTICLE_RADIUS_RATIO;
        
        // Create particle mesh
        const particleGeometry = new THREE.SphereGeometry(particleRadius, 24, 24);
        const material = new THREE.MeshPhongMaterial({
            color: Colors.blue,
            transparent: false,
            opacity: 1.0,
            shininess: 30
        });
        this.mesh = new THREE.Mesh(particleGeometry, material);
        
        // Create group to hold particle + A-sites as rigid body
        this.group = new THREE.Group();
        this.group.position.copy(position);
        this.group.add(this.mesh);
        
        // Initialize velocities
        this.velocity.set(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
        );
        
        this.angularVelocity.set(
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02,
            (Math.random() - 0.5) * 0.02
        );
        
        this.rotationAxis = new THREE.Vector3(
            Math.random() - 0.5,
            Math.random() - 0.5,
            Math.random() - 0.5
        ).normalize();
        
        // Create A-sites on particle surface
        this.createASites(particleRadius);
        
        this.mesh.castShadow = false;
    }
    
    /**
     * Create A-sites distributed on particle surface
     * @param {number} particleRadius - Radius of the particle
     */
    createASites(particleRadius) {
        const aSiteGeometry = new THREE.SphereGeometry(Constants.A_SITE_RADIUS, 12, 12);
        const aSiteMaterial = new THREE.MeshPhongMaterial({
            color: Colors.yellow,
            transparent: false,
            opacity: 1.0,
            shininess: 50
        });
        // 使用斐波那契球面算法均匀分布 A-sites
        const fibonacciSphere = (samples, radius, index) => {
            const phi = Math.acos(1 - 2 * (index + 0.5) / samples); // 黄金角纬度
            const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 0.5); // 黄金角经度
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.sin(phi) * Math.sin(theta);
            const z = radius * Math.cos(phi);
            return new THREE.Vector3(x, y, z);
        };

        for (let j = 0; j < Constants.M_SITES; j++) {
            const aSite = new THREE.Mesh(aSiteGeometry, aSiteMaterial.clone());
            
            // 使用斐波那契球面函数生成均匀分布的位置
            const localPos = fibonacciSphere(Constants.M_SITES, particleRadius, j);
            aSite.position.copy(localPos);
            
            this.aSiteLocalPositions.push(localPos.clone());
            
            aSite.userData = {
                isOccupied: false,
                boundTC: null,
                parentParticle: this,
                parentGroup: this.group,
                localPosition: localPos
            };
            
            this.group.add(aSite);
            this.aSites.push(aSite);
        }
    }
    
    // Note: update() method has been moved to UnifiedDynamics
    
    /**
     * Apply periodic boundary conditions
     * @param {number} boxLength - Box length
     * @param {number} boxWidth - Box width
     * @param {number} boxHeight - Box height
     */
    applyBoundary(boxLength, boxWidth, boxHeight) {
        const pos = this.group.position;
        
        if (pos.x > boxLength/2 || pos.x < -boxLength/2 ||
            pos.y > boxWidth/2 || pos.y < -boxWidth/2 ||
            pos.z > boxHeight/2 || pos.z < -boxHeight/2) {
            
            pos.x = pos.x - Math.floor(pos.x / boxLength + 0.5) * boxLength;
            pos.y = pos.y - Math.floor(pos.y / boxWidth + 0.5) * boxWidth;
            pos.z = pos.z - Math.floor(pos.z / boxHeight + 0.5) * boxHeight;
            
            this.release();
        }
    }
    
    /**
     * Mark particle as trapped
     */
    trap() {
        this.isTrapped = false;
        this.mesh.material.color.setHex(Colors.red);
    }
    
    /**
     * Release particle from trap
     */
    release() {
        this.isTrapped = false;
        this.bridgeCount = 0;
        this.mesh.material.color.setHex(Colors.blue);
    }
    
    /**
     * Check if particle should be released (probabilistic)
     * @returns {boolean} True if released
     */
    tryRelease() {
        if (this.isTrapped && Math.random() < Constants.RELEASE_PROBABILITY) {
            this.release();
            return true;
        }
        return false;
    }
    
    /**
     * Get a free A-site
     * @returns {THREE.Mesh|null} Free A-site or null
     */
    getFreeASite() {
        return this.aSites.find(a => !a.userData.isOccupied) || null;
    }

    /**
     * Get a free A-site near a position
     * @param {THREE.Vector3} position - Position to check
     * @param {number} maxDistance - Maximum distance to check
     * @returns {THREE.Mesh|null} Free A-site or null
     */
    getFreeASiteNear(position, maxDistance) {
        return this.aSites.find(a => 
            !a.userData.isOccupied &&
            a.position.distanceTo(position) < maxDistance
        ) || null;
    }
    
    /**
     * Get the particle group
     * @returns {THREE.Group} Particle group
     */
    getGroup() {
        return this.group;
    }
    
    /**
     * Get the particle mesh
     * @returns {THREE.Mesh} Particle mesh
     */
    getMesh() {
        return this.mesh;
    }
}
