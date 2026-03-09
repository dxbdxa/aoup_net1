/**
 * Nature-style color palette for the simulation
 */
export const Colors = {
    blue: 0x1f77b4,      // Free particles
    red: 0xff6b6b,       // Trapped particles
    green: 0x2ca02c,     // TC molecules
    orange: 0xff7f0e,    // Bridges (Generic/Legacy)
    purple: 0x9467bd,    // Network / B-sites
    yellow: 0xffd700,    // A-sites
    gray: 0x7f7f7f,      // Boundary
    black: 0x000000,     // Labels/edges
    white: 0xffffff,     // Background
    
    // Bridge Colors
    bridgeA: 0xffaa00,   // TC-A bond (Gold/Orange)
    bridgeB: 0x9932cc,   // TC-B bond (Dark Orchid)
    bridgeAB: 0xff4500   // A-TC-B complete bridge (Orange Red)
};

export const ColorLegend = [
    { color: Colors.blue, label: 'Free Particle' },
    { color: Colors.red, label: 'Trapped Particle' },
    { color: Colors.yellow, label: 'A-site (Particle)' },
    { color: Colors.purple, label: 'B-site (Network)' },
    { color: Colors.green, label: 'TC Molecule' },
    { color: Colors.bridgeA, label: 'Bridge A (TC-Particle)' },
    { color: Colors.bridgeB, label: 'Bridge B (TC-Network)' },
    { color: Colors.bridgeAB, label: 'Bridge AB (Full)' }
];
