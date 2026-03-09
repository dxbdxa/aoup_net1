/**
 * Main entry point for the Diffusive Transistor Simulation
 * Initializes and starts the simulation when the page loads
 */
import { Simulation } from './Simulation.js';

// Global simulation instance
let simulation = null;

/**
 * Initialize the simulation when DOM is ready
 */
function init() {
    console.log('🔬 Initializing Diffusive Transistor Simulation...');
    
    try {
        simulation = new Simulation();
        simulation.init();
        console.log('✅ Simulation started successfully');
    } catch (error) {
        console.error('❌ Failed to initialize simulation:', error);
        
        // Show error to user
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.innerHTML = `
                <h2>❌ Initialization Error</h2>
                <p style="color: #d62728; margin-top: 10px;">${error.message}</p>
                <p style="margin-top: 10px; font-size: 11px; color: #666;">
                    Check browser console for details
                </p>
            `;
        }
    }
}

// Make functions globally available for HTML button onclick handlers
// (These are now handled by ControlsPanel, but keeping for compatibility)
window.addParticles = (count) => {
    if (simulation) simulation.addParticles(count);
};

window.resetSimulation = () => {
    if (simulation) simulation.reset();
};

window.toggleAnimation = () => {
    if (simulation) simulation.toggleAnimation();
};

window.exportImage = () => {
    if (simulation) simulation.exportImage();
};

window.exportVideo = () => {
    if (simulation) simulation.exportVideo();
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for module usage
export { simulation };
