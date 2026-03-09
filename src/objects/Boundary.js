import * as THREE from 'three';
import { Colors } from '../utils/Colors.js';
import { createTextLabel } from '../utils/Helpers.js';
import { Constants } from '../utils/Constants.js';

/**
 * Creates the transistor boundary structures (Source, Drain, Gate)
 */
export class Boundary {
    constructor(scene) {
        this.scene = scene;
        this.source = null;
        this.drain = null;
        this.gate = null;
        
        this.createSourceDrain();
        this.createGate();
    }
    
    /**
     * Create source and drain electrodes
     */
    createSourceDrain() {
        // Source (left)
        const sourceGeometry = new THREE.BoxGeometry(Constants.SOURCE_LENGTH, Constants.BOX_WIDTH, Constants.BOX_HEIGHT);
        const sourceMaterial = new THREE.MeshPhongMaterial({
            color: Colors.blue,
            transparent: true,
            opacity: 0.5,
            shininess: 50
        });
        this.source = new THREE.Mesh(sourceGeometry, sourceMaterial);
        this.source.position.set(-Constants.BOX_LENGTH/2 - Constants.SOURCE_LENGTH/2, 0, 0);
        this.source.castShadow = false;
        this.scene.add(this.source);
        
        // Source edges
        const sourceEdges = new THREE.EdgesGeometry(sourceGeometry);
        const sourceLine = new THREE.LineSegments(
            sourceEdges,
            new THREE.LineBasicMaterial({ color: Colors.black, linewidth: 2 })
        );
        sourceLine.position.set(-Constants.BOX_LENGTH/2 - Constants.SOURCE_LENGTH/2, 0, 0);
        this.scene.add(sourceLine);
        
        // Source label
        const sourceLabel = createTextLabel('SOURCE', 0.7);
        sourceLabel.position.set(-Constants.BOX_LENGTH/2 - Constants.SOURCE_LENGTH/2, 0,Constants.BOX_HEIGHT/2 + 2);
        this.scene.add(sourceLabel);
        
        // Drain (right)
        const drainGeometry = new THREE.BoxGeometry(Constants.DRAIN_LENGTH, Constants.BOX_WIDTH, Constants.BOX_HEIGHT);
        const drainMaterial = new THREE.MeshPhongMaterial({
            color: Colors.red,
            transparent: true,
            opacity: 0.5,
            shininess: 50
        });
        this.drain = new THREE.Mesh(drainGeometry, drainMaterial);
        this.drain.position.set(Constants.BOX_LENGTH/2 + Constants.DRAIN_LENGTH/2, 0, 0);
        this.drain.castShadow = false;
        this.scene.add(this.drain);
        
        // Drain edges
        const drainEdges = new THREE.EdgesGeometry(drainGeometry);
        const drainLine = new THREE.LineSegments(
            drainEdges,
            new THREE.LineBasicMaterial({ color: Colors.black, linewidth: 2 })
        );
        drainLine.position.set(Constants.BOX_LENGTH/2 + Constants.DRAIN_LENGTH/2, 0, 0);
        this.scene.add(drainLine);
        
        // Drain label
        const drainLabel = createTextLabel('DRAIN', 0.7);
        drainLabel.position.set(Constants.BOX_LENGTH/2 + Constants.DRAIN_LENGTH/2, 0, Constants.BOX_HEIGHT/2 + 2);
        this.scene.add(drainLabel);
    }
    
    /**
     * Create gate electrode (TC concentration control)
     */
    createGate() {
        // Gate (bottom)
        const gateGeometry = new THREE.BoxGeometry(20, 5, 20);
        const gateMaterial = new THREE.MeshPhongMaterial({
            color: Colors.orange,
            transparent: true,
            opacity: 0.5,
            shininess: 50
        });
        this.gate = new THREE.Mesh(gateGeometry, gateMaterial);
        this.gate.position.set(Constants.GATE_POSITION, -Constants.BOX_WIDTH/2-Constants.GATE_WIDTH/2, 0);
        this.gate.castShadow = false;
        this.scene.add(this.gate);
        
        // Gate edges
        const gateEdges = new THREE.EdgesGeometry(gateGeometry);
        const gateLine = new THREE.LineSegments(
            gateEdges,
            new THREE.LineBasicMaterial({ color: Colors.black, linewidth: 2 })
        );
        gateLine.position.set(Constants.GATE_POSITION,  -Constants.BOX_WIDTH/2-Constants.GATE_WIDTH/2, 0);
        this.scene.add(gateLine);
        
        // Gate label
        const gateLabel = createTextLabel('GATE (TC)', 0.6);
        gateLabel.position.set(Constants.GATE_POSITION,  -Constants.BOX_WIDTH/2-Constants.GATE_WIDTH/2-5, 0);    
        this.scene.add(gateLabel);
        
        // Arrow pointing up
        const arrowGroup = new THREE.Group();
        const arrowShaft = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 4, 8),
            new THREE.MeshPhongMaterial({ color: Colors.black })
        );
        const arrowHead = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 2, 8),
            new THREE.MeshPhongMaterial({ color: Colors.black })
        );
        arrowShaft.position.y = 0;
        arrowHead.position.y = 3;
        arrowGroup.add(arrowShaft);
        arrowGroup.add(arrowHead);
        arrowGroup.position.set(Constants.GATE_POSITION,  -Constants.BOX_WIDTH/2, 0);
        this.scene.add(arrowGroup);
    }
    
    /**
     * Get source mesh
     * @returns {THREE.Mesh} Source mesh
     */
    getSource() {
        return this.source;
    }
    
    /**
     * Get drain mesh
     * @returns {THREE.Mesh} Drain mesh
     */
    getDrain() {
        return this.drain;
    }
    
    /**
     * Get gate mesh
     * @returns {THREE.Mesh} Gate mesh
     */
    getGate() {
        return this.gate;
    }
}
