/**
 * Module exports for Diffusive Transistor Simulation
 * Use this file for clean imports in other projects
 */

// Core
export { SceneManager } from './core/Scene.js';
export { CameraManager } from './core/Camera.js';
export { RenderManager } from './core/Renderer.js';
export { ControlManager } from './core/Controls.js';

// Objects
export { Particle } from './objects/Particle.js';
export { TCMolecule } from './objects/TCMolecule.js';
export { Network } from './objects/Network.js';
export { Bridge } from './objects/Bridge.js';
export { Boundary } from './objects/Boundary.js';

// UI
export { StatsPanel } from './ui/StatsPanel.js';
export { ControlsPanel } from './ui/ControlsPanel.js';
export { Legend } from './ui/Legend.js';
export { InfoPanel } from './ui/InfoPanel.js';

// Utils
export { Constants } from './utils/Constants.js';
export { Colors, ColorLegend } from './utils/Colors.js';
export { randomNormalDistribution, createTextLabel, applyPeriodicBoundary } from './utils/Helpers.js';

// Main
export { Simulation } from './Simulation.js';
