/**
 * Constants for the Diffusive Transistor Simulation
 */
export const Constants = {
    // Volume fraction parameters (Target)
    VOL_FRACTION_PARTICLE: 0.001, // Target volume fraction for Particles (A-sites included in envelope)
    VOL_FRACTION_TC: 0.001,       // Target volume fraction for TC molecules
    VOL_FRACTION_NETWORK: 0.05,  // Target volume fraction for Polymer Network
    
    // Size parameters
    TC_RADIUS: 0.4,
    PARTICLE_RADIUS_RATIO: 3.0,  // R = 3.0 × TC
    A_SITE_RADIUS: 0.15,
    B_SITE_RADIUS: 0.2,
    M_SITES: 12,  // A sites per particle
    
    SPRING_CONSTANT: 1.0,  // Reduced from 10.0 to make chains softer
    SPRING_REST_LENGTH: 0.0, // Non-zero rest length to allow slack
    ROUSE_DAMPING: 0.95,  // Damping factor
    
    BOX_LENGTH: 40,
    BOX_WIDTH: 20,
    BOX_HEIGHT: 40,
    SOURCE_LENGTH: 10,
    DRAIN_LENGTH: 10,
    GATE_POSITION:0,
    GATE_LENGTH: 10,
    GATE_WIDTH: 5,
    
    // Diamond lattice parameters
    LATTICE_SPACING: 20.0,       // Base lattice constant
    LATTICE_BEADS_PER_SEGMENT: 6, // Increased from 2 to allow curvature
    LATTICE_PERTURBATION: 1.0,   // Random perturbation to initial positions
    
    // Rendering parameters
    NETWORK_TUBE_RADIUS: 0.2,    // Radius of polymer tubes
    NETWORK_TUBE_RADIAL_SEGMENTS: 6, // Low poly for performance
    NETWORK_TUBE_TUBULAR_SEGMENTS: 32, // Smoothness along tube
    
    // Physics parameters
    BOUNDARY_LIMIT: 25,
    GATE_REGION_Y: -15,
    RELEASE_PROBABILITY_A: 0.01,
    RELEASE_PROBABILITY_B: 0.001,

    BINDING_PROBABILITY_A: 1,
    BINDING_PROBABILITY_B: 1,
    BOND_K_A: 20.0,
    BOND_K_B: 20.0,
    CAPTURE_RADIUS_A: 0.5,
    CAPTURE_RADIUS_B: 0.3,
    
    // --- Unified Physics Parameters (Brownian Dynamics) ---
    // Physical Constants
    TEMPERATURE: 1.0,  // k_B * T
    VISCOSITY: 0.1,    // Fluid viscosity (eta)
    DT: 0.1,           // Time step (Reduced for stability)
    
    // Radii (Characteristic lengths)
    RADIUS_TC: 0.4,
    RADIUS_PARTICLE: 1.2, // 3.0 * 0.4
    RADIUS_BEAD: 0.4,
    
    // Mass (Assuming uniform density, scaled by volume)
    // Base mass: TC = 1.0
    MASS_TC: 1.0,
    MASS_PARTICLE: 27.0, 
    MASS_BEAD: 1.0,    // Reduced mass for bead to increase mobility
    
    // Derived Parameters (Calculated below)
    // We will overwrite the old DAMPING/DIFFUSION values with physically consistent ones
    // Friction coefficient gamma = 6 * pi * eta * R
    // Damping factor (velocity decay) = exp(-gamma * dt / m) approx 1 - (gamma * dt / m)
    // Thermal force std dev (Velocity kick) = sqrt(2 * k_B * T * gamma * dt) / m
    // Mobility (Force to Velocity factor) = dt / m
    
    // --- Auto-calculated Constants ---
    // Will be populated by helper function below
    
    // Camera parameters
    FRUSTUM_SIZE: 40,
    MIN_DISTANCE: 20,
    MAX_DISTANCE: 200,
    DAMPING_FACTOR: 0.1,
};

// Calculate derived physics constants
(function calculatePhysicsConstants() {
    const C = Constants;
    const PI = Math.PI;
    
    // Helper to calculate Langevin parameters
    // gamma = 6 * pi * eta * R
    // damping = 1 - (gamma * dt / m)  (or exp(-gamma*dt/m))
    // sigma_v (thermal kick) = sqrt(2 * kB * T * gamma * dt) / m
    // mobility (force factor) = dt / m
    
    function calc(radius, mass) {
        const gamma = 6 * PI * C.VISCOSITY * radius;
        // Use exact solution for overdamped Langevin dynamics velocity decay
        // damping = exp(-gamma * dt / m)
        // This is always < 1 and stable for any dt > 0
        const damping = Math.exp(-gamma * C.DT / mass); 
        
        // Thermal impulse P_th = sqrt(k_B * T * m * (1 - damping^2))
        // This is the fluctuation-dissipation theorem for discrete time step
        // Variance of velocity is k_B * T / m
        // We want <v^2> = k_B * T / m in equilibrium
        // v_{n+1} = v_n * damping + noise
        // <v^2> = <v^2> * damping^2 + <noise^2>
        // <noise^2> = <v^2> * (1 - damping^2)
        // <noise^2> = (k_B * T / m) * (1 - damping^2)
        // So noise std dev (thermalKick) = sqrt( (k_B * T / m) * (1 - damping^2) )
        const thermalKick = Math.sqrt((C.TEMPERATURE / mass) * (1 - damping * damping));
        
        // Force factor (Mobility * dt equivalent for deterministic force)
        // In the limit of high damping (overdamped), v = F / gamma.
        // But here we integrate v.
        // v_{n+1} += F * dt / m
        // But if we use the integrated form:
        // v(t+dt) = v(t)*e + (F/m)*(1-e)/(gamma/m) = v*e + F/gamma * (1-e)
        // So effective force factor is (1 - damping) / gamma
        // Or if we just add impulse: F * dt / m.
        // For simple Euler-Maruyama on velocity:
        // v_{n+1} = v_n * (1 - gamma*dt/m) + F*dt/m + noise
        // This corresponds to damping approx 1 - gamma*dt/m
        // If we use exponential damping, the force term should also be integrated.
        // Let's stick to simple symplectic Euler for force: forceFactor = dt / m.
        // But for consistency with exponential damping, we might need adjustments.
        // Let's use simple Euler force integration but exponential damping for stability.
        const forceFactor = C.DT / mass;
        
        // Rotational (for Particle)
        const I = (2.0/5.0) * mass * radius * radius;
        const gammaRot = 8 * PI * C.VISCOSITY * Math.pow(radius, 3);
        const dampingRot = Math.exp(-gammaRot * C.DT / I);
        const thermalKickRot = Math.sqrt((C.TEMPERATURE / I) * (1 - dampingRot * dampingRot));
        
        return { damping, thermalKick, forceFactor, dampingRot, thermalKickRot };
    }

    // 1. TC Molecules
    const tcParams = calc(C.RADIUS_TC, C.MASS_TC);
    C.TC_DAMPING = tcParams.damping;
    C.TC_THERMAL_KICK = tcParams.thermalKick;
    C.TC_FORCE_FACTOR = tcParams.forceFactor;
    
    // 2. Particles
    const pParams = calc(C.RADIUS_PARTICLE, C.MASS_PARTICLE);
    C.PARTICLE_DAMPING = pParams.damping;
    C.PARTICLE_THERMAL_KICK = pParams.thermalKick;
    C.PARTICLE_FORCE_FACTOR = pParams.forceFactor;
    C.PARTICLE_ROT_DAMPING = pParams.dampingRot;
    C.PARTICLE_ROT_THERMAL_KICK = pParams.thermalKickRot;

    // 3. Network Beads
    const bParams = calc(C.RADIUS_BEAD, C.MASS_BEAD);
    C.BEAD_DAMPING = bParams.damping;
    // Increase thermal kick for beads to make them move more visibly
    // Theoretical value might be too small for visual effect if mass is large or dt small
    // Let's multiply by a factor for visual enhancement if needed.
    // But first, let's trust physics.
    C.BEAD_THERMAL_KICK = bParams.thermalKick;
    C.BEAD_FORCE_FACTOR = bParams.forceFactor;
    
    // Debug output
    console.log("Physics Constants:", {
        BeadKick: C.BEAD_THERMAL_KICK,
        BeadDamping: C.BEAD_DAMPING,
        BeadForceFactor: C.BEAD_FORCE_FACTOR
    });
})();
