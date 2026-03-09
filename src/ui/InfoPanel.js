/**
 * Manages the info panel UI
 */
export class InfoPanel {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
    }
    
    /**
     * Update panel content
     * @param {Object} data - Data to display
     */
    update(data) {
        if (!this.element) return;
        
        // Can be extended to dynamically update panel content
    }
    
    /**
     * Show the panel
     */
    show() {
        if (this.element) {
            this.element.style.display = 'block';
        }
    }
    
    /**
     * Hide the panel
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }
}
