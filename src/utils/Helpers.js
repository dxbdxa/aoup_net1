/**
 * Helper utilities for the simulation
 */
import * as THREE from 'three';

/**
 * Generate a random number from normal distribution using Box-Muller transform
 * @returns {number} Random number from standard normal distribution
 */
export function randomNormalDistribution() {
    let u1 = 0, u2 = 0;
    // Math.random() can return 0, which would break log(u1). Loop until non-zero.
    while(u1 === 0) u1 = Math.random(); 
    u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Create a text label sprite for 3D scene
 * @param {string} text - Label text
 * @param {number} size - Label size multiplier
 * @returns {THREE.Sprite} Text label sprite
 */
export function createTextLabel(text, size = 1) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;
    
    context.fillStyle = 'rgba(255, 255, 255, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.font = 'Bold 72px Arial';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.fillText(text, 256, 90);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(18 * size, 4.5 * size, 1);
    
    return sprite;
}

/**
 * Apply periodic boundary conditions to a position
 * @param {THREE.Vector3} position - Position to wrap
 * @param {number} boxLength - Box length
 * @param {number} boxWidth - Box width
 * @param {number} boxHeight - Box height
 * @returns {THREE.Vector3} Wrapped position
 */
export function applyPeriodicBoundary(position, boxLength, boxWidth, boxHeight) {
    const newPos = position.clone();
    newPos.x = newPos.x - Math.floor(newPos.x / boxLength + 0.5) * boxLength;
    newPos.y = newPos.y - Math.floor(newPos.y / boxWidth + 0.5) * boxWidth;
    newPos.z = newPos.z - Math.floor(newPos.z / boxHeight + 0.5) * boxHeight;
    return newPos;
}

/**
 * Calculate the shortest vector between two points under periodic boundary conditions
 * @param {THREE.Vector3} pos1 - Start position
 * @param {THREE.Vector3} pos2 - End position
 * @param {number} boxLength - Box length
 * @param {number} boxWidth - Box width
 * @param {number} boxHeight - Box height
 * @param {THREE.Vector3} result - Optional result vector to avoid allocation
 * @returns {THREE.Vector3} The shortest vector from pos1 to pos2
 */
export function getMinimumImageVector(pos1, pos2, boxLength, boxWidth, boxHeight, result = new THREE.Vector3()) {
    result.subVectors(pos2, pos1);
    
    result.x -= Math.round(result.x / boxLength) * boxLength;
    result.y -= Math.round(result.y / boxWidth) * boxWidth;
    result.z -= Math.round(result.z / boxHeight) * boxHeight;
    
    return result;
}

/**
 * Calculate the squared distance between two points under periodic boundary conditions
 * @param {THREE.Vector3} pos1 - Start position
 * @param {THREE.Vector3} pos2 - End position
 * @param {number} boxLength - Box length
 * @param {number} boxWidth - Box width
 * @param {number} boxHeight - Box height
 * @returns {number} Squared distance
 */
export function getMinimumImageDistanceSq(pos1, pos2, boxLength, boxWidth, boxHeight) {
    let dx = pos2.x - pos1.x;
    let dy = pos2.y - pos1.y;
    let dz = pos2.z - pos1.z;
    
    dx -= Math.round(dx / boxLength) * boxLength;
    dy -= Math.round(dy / boxWidth) * boxWidth;
    dz -= Math.round(dz / boxHeight) * boxHeight;
    
    return dx*dx + dy*dy + dz*dz;
}
