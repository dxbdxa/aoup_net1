/**
 * Manages the statistics panel UI
 */
export class StatsPanel {
    constructor() {
        this.elements = {
            particleCount: document.getElementById('particleCount'),
            aSiteCount: document.getElementById('aSiteCount'),
            bSiteCount: document.getElementById('bSiteCount'),
            chainCount: document.getElementById('chainCount'),
            fps: document.getElementById('fps'),
            bridgeCount: document.getElementById('bridgeCount'),
            diffusionRatio: document.getElementById('diffusionRatio'),
            temperature: document.getElementById('temperature') // Assuming you will add this ID to HTML
        };
    }
    
    /**
     * Update statistics display
     * @param {Object} stats - Statistics data
     */
    update(stats) {
        if (this.elements.particleCount) {
            this.elements.particleCount.textContent = stats.particleCount || 0;
        }
        if (this.elements.aSiteCount) {
            this.elements.aSiteCount.textContent = stats.aSiteCount || 0;
        }
        if (this.elements.bSiteCount) {
            this.elements.bSiteCount.textContent = stats.bSiteCount || 0;
        }
        if (this.elements.chainCount) {
            this.elements.chainCount.textContent = stats.chainCount || 0;
        }
        if (this.elements.fps) {
            this.elements.fps.textContent = stats.fps || 0;
        }
        if (this.elements.bridgeCount) {
            this.elements.bridgeCount.textContent = stats.bridgeCount || 0;
        }
        if (this.elements.diffusionRatio) {
            this.elements.diffusionRatio.textContent = (stats.diffusionRatio || 1.0).toFixed(2);
        }
        if (this.elements.temperature) {
            this.elements.temperature.textContent = (stats.temperature || 0.0).toFixed(2);
        }
    }
    
    /**
     * Calculate diffusion ratio
     * @param {Particle[]} particles - Array of particles
     * @returns {number} Ratio of free particles
     */
    calculateDiffusionRatio(particles) {
        if (!particles || particles.length === 0) return 1.0;
        const freeParticles = particles.filter(p => !p.isTrapped).length;
        return freeParticles / particles.length;
    }
}
