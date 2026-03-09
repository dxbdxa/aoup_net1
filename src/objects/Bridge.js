import * as THREE from 'three';
import { Colors } from '../utils/Colors.js';
import { Constants } from '../utils/Constants.js';
import { getMinimumImageVector } from '../utils/Helpers.js';

/**
 * Represents a bridge connection between A-site or B-site, and TC
 */
export class BridgeA {
    constructor(tc, aSite) {
        this.group = null;
        this.bridgeA = null; // Fix: was this.bridge in constructor but this.bridgeA in usage
        this.tc = tc;
        this.aSite = aSite;
        
        // Pre-allocate vector for update
        this._tmpVec = new THREE.Vector3();
        this.init();
    }
    
    /**
     * Initialize bridge geometry
     */
    init() {
        this.group = new THREE.Group();
        
        const bridgeMaterial = new THREE.MeshPhongMaterial({
            color: Colors.bridgeA,
            transparent: false,
            opacity: 0.8,
            shininess: 30
        });
        
        // Get positions
        const aPos = new THREE.Vector3();
        this.aSite.getWorldPosition(aPos);
               
        const tcPos = this.tc.getMesh().position;
        
        // Create bridge A (A-site to TC)
        this.createBridgeSegment(aPos, tcPos, bridgeMaterial, 'bridgeA');
        
        this.group.userData = {
            tc: this.tc,
            aSite: this.aSite,
            bridgeA: this.bridgeA,
        };
    }
    
    /**
     * Set bridge color
     * @param {number} colorHex - Hex color
     */
    setColor(colorHex) {
        if (this.bridgeA && this.bridgeA.material) {
            this.bridgeA.material.color.setHex(colorHex);
        }
    }
    
    /**
     * Create a bridge segment between two points
     * @param {THREE.Vector3} start - Start position
     * @param {THREE.Vector3} end - End position
     * @param {THREE.Material} material - Material for the bridge
     * @param {string} name - Name for the bridge segment
     */
    createBridgeSegment(start, end, material, name) {
        // Use unit height cylinder for easier scaling
        const geometry = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
        const bridge = new THREE.Mesh(geometry, material.clone());
        
        // Initial update
        this.updateBridgeSegment(start, end, bridge);
        
        this.group.add(bridge);
        this[name] = bridge;
    }
    
    /**
     * Update bridge positions (call when A-site or B-site moves)
     */
    update() {
        if (!this.tc.isBridging || !this.aSite.userData.isOccupied) {
            return;
        }
        
        const aPos = new THREE.Vector3();
        this.aSite.getWorldPosition(aPos);  
        const tcPos = this.tc.getMesh().position;
        
        this.updateBridgeSegment(aPos, tcPos, this.bridgeA);
    }
    
    /**
     * Update a single bridge segment with PBC support
     * @param {THREE.Vector3} start - Start position
     * @param {THREE.Vector3} end - End position
     * @param {THREE.Mesh} bridge - Bridge mesh to update
     */
    updateBridgeSegment(start, end, bridge) {
        // Calculate shortest vector across PBC
        getMinimumImageVector(
            start, 
            end, 
            Constants.BOX_LENGTH, 
            Constants.BOX_WIDTH, 
            Constants.BOX_HEIGHT, 
            this._tmpVec
        );
        
        const dist = this._tmpVec.length();
        
        // Hide if distance is excessively long (should not happen with PBC vector, 
        // but physically if they are too far apart we might want to hide)
        // With getMinimumImageVector, dist is always <= sqrt(3)/2 * L.
        // The issue is RENDERING. If we draw a line from A to B and they are on opposite sides,
        // we want to draw A->RightEdge and LeftEdge->B?
        // Or just hide it if it wraps?
        // Hiding is standard for simple visualizers.
        
        // Check if "real" Euclidean distance is different from PBC distance
        // Actually, we want to know if the shortest path crosses the boundary.
        // getMinimumImageVector gives us the vector `v` such that `start + v` is the "virtual" end position close to start.
        
        // To draw correctly, we place the cylinder at `start + v/2`.
        const mid = new THREE.Vector3().copy(start).addScaledVector(this._tmpVec, 0.5);
        
        // But if `mid` is outside the box (or `start` and `end` are on opposite sides visually),
        // drawing a single mesh might look weird if the camera is inside?
        // Actually, if we use the wrapped positions `start` and `end`, the distance is large.
        // If we use `start` and `start + v`, the distance is small `dist`.
        // The mesh will be drawn at `mid`.
        // If `mid` is within the box, great.
        // If `start` is at x=24 and `end` is at x=-24 (L=50). v = 2.
        // mid = 24 + 1 = 25. This is on the edge.
        // The cylinder will be drawn from 24 to 26.
        // 26 is outside the visual box [-25, 25].
        // This is fine, it will just stick out.
        // But we won't see the part entering from the other side (-24).
        // To do it perfectly, we need TWO cylinders for wrapped bonds.
        // For simplicity, let's just draw the single cylinder at the virtual position
        // and wrap its position if it goes too far? 
        // No, simplest fix: if bond wraps, hide it.
        
        const realDistSq = start.distanceToSquared(end);
        const pbcDistSq = dist * dist;
        
        // If real distance in 3D space is significantly larger than PBC distance,
        // it means the shortest path wraps around.
        if (Math.abs(realDistSq - pbcDistSq) > 1.0) {
            bridge.visible = false;
        } else {
            bridge.visible = true;
            
            bridge.position.copy(mid);
            
            // Scale height to match distance
            // Base height is 1.0
            bridge.scale.set(1, dist, 1);
            
            // Orient
            // We want to align Y axis with `this._tmpVec`
            // lookAt aligns Z axis.
            // We can use setFromUnitVectors quaternion
            const direction = this._tmpVec.clone().normalize();
            const up = new THREE.Vector3(0, 1, 0);
            
            // Avoid singularity if direction is parallel to up
            if (Math.abs(direction.dot(up)) > 0.99) {
                bridge.lookAt(new THREE.Vector3().copy(mid).add(direction));
                bridge.rotateX(Math.PI / 2);
            } else {
                bridge.quaternion.setFromUnitVectors(up, direction);
            }
        }
    }

    /**
     * Get the bridge group
     * @returns {THREE.Group} Bridge group
     */
    getGroup() {
        return this.group;
    }
    
    /**
     * Dispose bridge resources
     */
    dispose() {
        if (this.bridgeA) {
            this.bridgeA.geometry.dispose();
            this.bridgeA.material.dispose();
        }
    }
}

export class BridgeB {
    constructor(tc, bSite) {
        this.group = null;
        this.bridge = null;
        this.tc = tc;
        this.bSite = bSite;
        
        this._tmpVec = new THREE.Vector3();
        this.init();
    }
    
    /**
     * Initialize bridge geometry
     */
    init() {
        this.group = new THREE.Group();
        
        const bridgeMaterial = new THREE.MeshPhongMaterial({
            color: Colors.bridgeB,
            transparent: false,
            opacity: 0.8,
            shininess: 30
        });
        
        // Get positions
        const bPos = new THREE.Vector3();
        this.bSite.getWorldPosition(bPos);
               
        const tcPos = this.tc.getMesh().position;
        
        // Create bridge B (B-site to TC)
        this.createBridgeSegment(bPos, tcPos, bridgeMaterial, 'bridge');
        
        this.group.userData = {
            tc: this.tc,
            bSite: this.bSite,
            bridge: this.bridge,
        };
    }
    
    /**
     * Set bridge color
     * @param {number} colorHex - Hex color
     */
    setColor(colorHex) {
        if (this.bridge && this.bridge.material) {
            this.bridge.material.color.setHex(colorHex);
        }
    }
    
    /**
     * Create a bridge segment between two points
     * @param {THREE.Vector3} start - Start position
     * @param {THREE.Vector3} end - End position
     * @param {THREE.Material} material - Material for the bridge
     * @param {string} name - Name for the bridge segment
     */
    createBridgeSegment(start, end, material, name) {
        // Use unit height for easier scaling
        const geometry = new THREE.CylinderGeometry(0.08, 0.08, 1.0, 8);
        const bridge = new THREE.Mesh(geometry, material.clone());
        
        this.group.add(bridge);
        this[name] = bridge;
        
        // Initial update
        this.updateBridgeSegment(start, end, bridge);
    }
    
    /**
     * Update bridge positions (call when B-site moves)
     */
    update() {
        if (!this.tc.isBridging || !this.bSite.userData.isOccupied) {
            return;
        }
        
        const bPos = new THREE.Vector3();
        this.bSite.getWorldPosition(bPos);  
        const tcPos = this.tc.getMesh().position;
        
        // Check boundary crossing
        const realDistSq = bPos.distanceToSquared(tcPos);
        const thresholdSq = Math.min(Constants.BOX_LENGTH, Constants.BOX_WIDTH) * 0.4;
        
        if (realDistSq > thresholdSq * thresholdSq) {
            this.bridge.visible = false;
        } else {
            this.bridge.visible = true;
            this.updateBridgeSegment(bPos, tcPos, this.bridge);
        }
    }
    
    /**
     * Update a single bridge segment
     * @param {THREE.Vector3} start - Start position
     * @param {THREE.Vector3} end - End position
     * @param {THREE.Mesh} bridge - Bridge mesh to update
     */
    updateBridgeSegment(start, end, bridge) {
        this._tmpVec.subVectors(end, start);
        const dist = this._tmpVec.length();
        
        if (dist < 0.001) return;
        
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        bridge.position.copy(mid);
        
        // Scale to match length (geometry height is 1.0)
        bridge.scale.set(1, dist, 1);
        
        bridge.lookAt(end);
        bridge.rotateX(Math.PI / 2);
    }

    /**
     * Get the bridge group
     * @returns {THREE.Group} Bridge group
     */
    getGroup() {
        return this.group;
    }
    
    /**
     * Dispose bridge resources
     */
    dispose() {
        if (this.bridge) {
            this.bridge.geometry.dispose();
            this.bridge.material.dispose();
        }
    }
}
