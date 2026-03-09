import { ColorLegend } from '../utils/Colors.js';

/**
 * Manages the legend UI
 */
export class Legend {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        this.init();
    }
    
    /**
     * Initialize legend items
     */
    init() {
        if (!this.element) return;
        
        // Clear existing items (except title)
        const existingItems = this.element.querySelectorAll('.legend-item');
        existingItems.forEach(item => item.remove());
        
        // Create legend items from ColorLegend
        ColorLegend.forEach(item => {
            const legendItem = document.createElement('div');
            legendItem.className = 'legend-item';
            
            const colorBox = document.createElement('div');
            colorBox.className = 'legend-color';
            colorBox.style.background = '#' + item.color.toString(16).padStart(6, '0');
            
            const label = document.createElement('span');
            label.textContent = item.label;
            
            legendItem.appendChild(colorBox);
            legendItem.appendChild(label);
            this.element.appendChild(legendItem);
        });
    }
    
    /**
     * Show the legend
     */
    show() {
        if (this.element) {
            this.element.style.display = 'block';
        }
    }
    
    /**
     * Hide the legend
     */
    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
    }
}
