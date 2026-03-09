/**
 * Manages the controls panel UI
 */
export class ControlsPanel {
    constructor(simulation) {
        this.simulation = simulation;
        this.buttons = {};
        this.init();
    }
    
    /**
     * Initialize button event listeners
     */
    init() {
        this.buttons = {
            addParticles: document.querySelector('button[onclick="addParticles(50)"]'),
            reset: document.querySelector('button[onclick="resetSimulation()"]'),
            pausePlay: document.querySelector('button[onclick="toggleAnimation()"]'),
            exportImage: document.querySelector('button[onclick="exportImage()"]'),
            exportVideo: document.querySelector('button[onclick="exportVideo()"]')
        };
        
        // Bind events if simulation is provided
        if (this.simulation) {
            this.bindEvents();
        }
    }
    
    /**
     * Bind button events to simulation methods
     */
    bindEvents() {
        if (this.buttons.addParticles) {
            this.buttons.addParticles.onclick = () => this.simulation.addParticles(50);
        }
        if (this.buttons.reset) {
            this.buttons.reset.onclick = () => this.simulation.reset();
        }
        if (this.buttons.pausePlay) {
            this.buttons.pausePlay.onclick = () => this.simulation.toggleAnimation();
        }
        if (this.buttons.exportImage) {
            this.buttons.exportImage.onclick = () => this.simulation.exportImage();
        }
        if (this.buttons.exportVideo) {
            this.buttons.exportVideo.onclick = () => this.simulation.exportVideo();
        }
    }
    
    /**
     * Update pause/play button text
     * @param {boolean} isPlaying - Whether simulation is playing
     */
    updatePausePlayButton(isPlaying) {
        if (this.buttons.pausePlay) {
            this.buttons.pausePlay.textContent = isPlaying ? '⏯️ Pause/Play' : '▶️ Pause/Play';
        }
    }
}
