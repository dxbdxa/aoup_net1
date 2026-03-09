import * as THREE from 'three';
import { Constants } from '../utils/Constants.js';
import { getMinimumImageVector, getMinimumImageDistanceSq, randomNormalDistribution } from '../utils/Helpers.js';

export class UnifiedDynamics {
    constructor() {
        this._tmpA = new THREE.Vector3();
        this._tmpB = new THREE.Vector3();
        this._tmpDelta = new THREE.Vector3();
        this._tmpForce = new THREE.Vector3();
        this._tmpBoxSize = new THREE.Vector3();
        this._particleAABBs = [];
        
        // Pre-allocate temporary vectors for spring calculations
        this._tmpDisplacement = new THREE.Vector3();
    }

    update(sim) {
        const boxL = Constants.BOX_LENGTH;
        const boxW = Constants.BOX_WIDTH;
        const boxH = Constants.BOX_HEIGHT;

        // --- Phase 1: Calculate Forces (Synchronous) ---
        
        // 1.1 Beads Forces
        sim.network.getChains().forEach(chain => {
            chain.beads.forEach(bead => {
                this.calculateBeadForces(bead, boxL, boxW, boxH);
            });
        });

        // 1.2 Particles Forces
        sim.particles.forEach(p => {
            if (!p.isTrapped) {
                this.calculateParticleForces(p, boxL, boxW, boxH);
            }
        });

        // 1.3 TC Molecules Forces
        sim.tcMolecules.forEach(tc => {
            this.calculateTCForces(tc, boxL, boxW, boxH);
        });
        
        // --- Phase 2: Update Positions (Synchronous) ---
        
        // 2.1 Beads Position
        sim.network.getChains().forEach(chain => {
            chain.beads.forEach(bead => {
                this.integrateBead(bead);
            });
        });

        // 2.2 Particles Position
        sim.particles.forEach(p => {
            if (!p.isTrapped) {
                this.integrateParticle(p);
                p.applyBoundary(boxL, boxW, boxH);
            }
        });

        // 2.3 TC Molecules Position
        sim.tcMolecules.forEach(tc => {
            this.integrateTC(tc);
            tc.applyBoundary(boxL, boxW, boxH);
        });

        this.tryReleaseBonds(sim);
        this.tryFormBonds(sim);

        if (typeof sim.network.update === 'function') {
            sim.network.update();
        }
    }

    /**
     * Calculate forces on a bead
     */
    calculateBeadForces(bead, boxL, boxW, boxH) {
        // Reset force accumulator (this will store F_det + F_random)
        // Actually, let's follow the standard Langevin impulse approach:
        // v(t+dt) = v(t)*damping + (F_det * forceFactor) + (randomNormal * thermalKick)
        // So here we just calculate F_det (Deterministic Force).
        // Random force is added during integration or here?
        // Let's accumulate deterministic forces here.
        bead.userData.force.set(0, 0, 0);
        
        // Spring force from previous bead
        if (bead.userData.prevBead) {
            const springForce = this.calculateSpringForce(
                bead.position,
                bead.userData.prevBead.position
            );
            bead.userData.force.add(springForce);
            
        }
        
        // Spring force from next bead
        if (bead.userData.nextBead) {
            const springForce = this.calculateSpringForce(
                bead.position,
                bead.userData.nextBead.position
            );
            bead.userData.force.add(springForce);
        }
        
        // Reaction force from bound TC
        if (bead.userData.isOccupied && bead.userData.boundTC) {
            const tc = bead.userData.boundTC;
            // Check TC validity
            if (tc && tc.mesh && tc.mesh.position && !isNaN(tc.mesh.position.x)) {
                // Force on Bead = K * (TC - Bead)
                getMinimumImageVector(bead.position, tc.mesh.position, boxL, boxW, boxH, this._tmpDelta);
                this._tmpForce.copy(this._tmpDelta).multiplyScalar(Constants.BOND_K_B);
                bead.userData.force.add(this._tmpForce);
            }
        }
        
        // Final check on force accumulator
        if (isNaN(bead.userData.force.x) || isNaN(bead.userData.force.y) || isNaN(bead.userData.force.z)) {
             bead.userData.force.set(0,0,0);
        }
    }

    /**
     * Integrate bead position
     */
    integrateBead(bead) {
        // Apply Langevin Dynamics Update
        // v_new = v_old * damping + F_det * forceFactor + random * thermalKick
        
        // 1. Damping
        bead.userData.velocity.multiplyScalar(Constants.BEAD_DAMPING);
        
                
        
        // 2. Deterministic Force
        bead.userData.velocity.addScaledVector(bead.userData.force, Constants.BEAD_FORCE_FACTOR);
        
        // 3. Thermal Kick
        const kick = Constants.BEAD_THERMAL_KICK;
        bead.userData.velocity.x += randomNormalDistribution() * kick;
        bead.userData.velocity.y += randomNormalDistribution() * kick;
        bead.userData.velocity.z += randomNormalDistribution() * kick;

        // Safety check for NaN velocity
        if (isNaN(bead.userData.velocity.x) || isNaN(bead.userData.velocity.y) || isNaN(bead.userData.velocity.z)) {
            bead.userData.velocity.set(0,0,0);
        }
        
        // Update position (x += v * dt)
        bead.position.addScaledVector(bead.userData.velocity, Constants.DT);
        
        // Safety check for NaN position
        if (isNaN(bead.position.x) || isNaN(bead.position.y) || isNaN(bead.position.z)) {
            bead.position.set(0,0,0); // Reset to origin or handle error
        }
        
        // Apply boundary confinement
        this.applyBoundaryCondition(bead);
    }

    /**
     * Calculate spring force between two beads with non-zero rest length
     * @param {THREE.Vector3} pos1 - Position of first bead
     * @param {THREE.Vector3} pos2 - Position of second bead
     * @returns {THREE.Vector3} Spring force vector
     */
    calculateSpringForce(pos1, pos2) {
        // Safety check for inputs
        if (!pos1 || !pos2 || isNaN(pos1.x) || isNaN(pos2.x)) {
            return this._tmpDisplacement.set(0,0,0);
        }

        // Use minimum image vector for correct PBC distance
        getMinimumImageVector(
            pos1, 
            pos2, 
            Constants.BOX_LENGTH, 
            Constants.BOX_WIDTH, 
            Constants.BOX_HEIGHT, 
            this._tmpDisplacement
        );
        
        const dist = this._tmpDisplacement.length();
        
        // Safety check for NaN or very small distance
        if (isNaN(dist) || dist < 0.0001) {
            return this._tmpDisplacement.set(0,0,0);
        }
        
        // F = k * (|r| - r0) * (r / |r|)
        const forceMag = Constants.SPRING_CONSTANT * (dist - Constants.SPRING_REST_LENGTH);
        
        // Normalize displacement and scale by force magnitude
        this._tmpDisplacement.multiplyScalar(forceMag / dist);
        
        // Final NaN check for result
        if (isNaN(this._tmpDisplacement.x) || isNaN(this._tmpDisplacement.y) || isNaN(this._tmpDisplacement.z)) {
            return this._tmpDisplacement.set(0,0,0);
        }
        
        return this._tmpDisplacement;
    }

    /**
     * Apply periodic boundary conition to bead
     * @param {THREE.Mesh} bead - Bead to confine
     */
    applyBoundaryCondition(bead) {
        const boxLength = Constants.BOX_LENGTH;
        const boxWidth = Constants.BOX_WIDTH;
        const boxHeight = Constants.BOX_HEIGHT;
        
        const pos = bead.position;
        
        if (pos.x > boxLength/2 || pos.x < -boxLength/2 ||
            pos.y > boxWidth/2 || pos.y < -boxWidth/2 ||
            pos.z > boxHeight/2 || pos.z < -boxHeight/2) {
            
            pos.x = pos.x - Math.floor(pos.x / boxLength + 0.5) * boxLength;
            pos.y = pos.y - Math.floor(pos.y / boxWidth + 0.5) * boxWidth;
            pos.z = pos.z - Math.floor(pos.z / boxHeight + 0.5) * boxHeight;
        }
    }

    /**
     * Calculate forces on a particle
     */
    calculateParticleForces(particle, boxL, boxW, boxH) {
        // Deterministic forces only
        particle.force.set(0, 0, 0);
        particle.torque.set(0, 0, 0);

        // Apply reaction forces from bound TCs
        // We iterate over A-sites of this particle. If any is bound, apply reaction force.
        // F_particle = -F_TC (Newton's 3rd Law)
        // But wait, TC force was calculated as K * (Asite - TC).
        // So force on Asite should be K * (TC - Asite) = -F_TC_bond.
        // We need to access the bound TCs.
        
        particle.aSites.forEach(as => {
            if (as.userData.isOccupied && as.userData.boundTC) {
                const tc = as.userData.boundTC;
                // Calculate bond force vector: TC -> Asite
                // Vector d = TC - Asite
                as.getWorldPosition(this._tmpA); // Asite pos
                getMinimumImageVector(this._tmpA, tc.mesh.position, boxL, boxW, boxH, this._tmpDelta);
                
                // Force on Particle = K * (TC - Asite)
                // Note: calculateTCForces used K * (Asite - TC).
                // So this is indeed the opposite vector.
                this._tmpForce.copy(this._tmpDelta).multiplyScalar(Constants.BOND_K_A);
                
                // Add to particle total force
                particle.force.add(this._tmpForce);
                
                // Torque: r x F
                // r = Asite_pos - Particle_center
                this._tmpB.subVectors(this._tmpA, particle.group.position);
                this._tmpB.cross(this._tmpForce); // Torque
                particle.torque.add(this._tmpB); 
            }
        });
    }

    /**
     * Calculate forces on TC molecule
     */
    calculateTCForces(tc, boxL, boxW, boxH) {
        if (!tc.force) tc.force = new THREE.Vector3();
        tc.force.set(0, 0, 0);
        
        // Bond forces
        if (tc.boundASite) {
            tc.boundASite.getWorldPosition(this._tmpA);
            getMinimumImageVector(tc.mesh.position, this._tmpA, boxL, boxW, boxH, this._tmpDelta);
            tc.force.addScaledVector(this._tmpDelta, Constants.BOND_K_A);
        }

        if (tc.boundBSite) {
            tc.boundBSite.getWorldPosition(this._tmpB);
            getMinimumImageVector(tc.mesh.position, this._tmpB, boxL, boxW, boxH, this._tmpDelta);
            tc.force.addScaledVector(this._tmpDelta, Constants.BOND_K_B);
        }
    }

    /**
     * Integrate particle position
     */
    integrateParticle(particle) {
        // v_new = v_old * damping + F_det * forceFactor + random * thermalKick
        
        // 1. Damping
        particle.velocity.multiplyScalar(Constants.PARTICLE_DAMPING);
        particle.angularVelocity.multiplyScalar(Constants.PARTICLE_ROT_DAMPING);
        
        // 2. Deterministic Force
        particle.velocity.addScaledVector(particle.force, Constants.PARTICLE_FORCE_FACTOR);
        
        // Rotational factor approx
        const rotFactor = Constants.PARTICLE_FORCE_FACTOR * 2.5 / (Constants.RADIUS_PARTICLE * Constants.RADIUS_PARTICLE);
        particle.angularVelocity.addScaledVector(particle.torque, rotFactor);
        
        // 3. Thermal Kick
        const kick = Constants.PARTICLE_THERMAL_KICK;
        particle.velocity.x += randomNormalDistribution() * kick;
        particle.velocity.y += randomNormalDistribution() * kick;
        particle.velocity.z += randomNormalDistribution() * kick;
        
        const kickRot = Constants.PARTICLE_ROT_THERMAL_KICK;
        particle.angularVelocity.x += randomNormalDistribution() * kickRot;
        particle.angularVelocity.y += randomNormalDistribution() * kickRot;
        particle.angularVelocity.z += randomNormalDistribution() * kickRot;
        
        // Safety check
        if (isNaN(particle.velocity.x) || isNaN(particle.velocity.y) || isNaN(particle.velocity.z)) {
            particle.velocity.set(0,0,0);
        }
        if (isNaN(particle.angularVelocity.x) || isNaN(particle.angularVelocity.y) || isNaN(particle.angularVelocity.z)) {
            particle.angularVelocity.set(0,0,0);
        }
        
        // Update position
        particle.group.position.addScaledVector(particle.velocity, Constants.DT);
        
        if (isNaN(particle.group.position.x) || isNaN(particle.group.position.y) || isNaN(particle.group.position.z)) {
            particle.group.position.set(0,0,0);
        }
        
        // Update rotation
        particle.rotationAngle += particle.angularVelocity.length() * Constants.DT;
        
        // Ensure angular velocity is valid (not NaN or zero)
        const angVelLen = particle.angularVelocity.length();
        if (angVelLen > 1e-6) {
            particle.group.rotateOnWorldAxis(
                particle.rotationAxis,
                angVelLen * 0.1 * Constants.DT
            );
        }
        
        // Randomly change rotation axis
        if (Math.random() < 0.05) {
            particle.rotationAxis.set(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            ).normalize();
            
            // Safety check for normalization failure (if vector was 0,0,0)
            if (particle.rotationAxis.lengthSq() < 0.0001) {
                particle.rotationAxis.set(0, 1, 0);
            }
        }
    }

    /**
     * Integrate TC position
     */
    integrateTC(tc) {
        // v_new = v_old * damping + F_det * forceFactor + random * thermalKick
        
        // 1. Damping
        tc.velocity.multiplyScalar(Constants.TC_DAMPING);
        
        // 2. Deterministic Force
        tc.velocity.addScaledVector(tc.force, Constants.TC_FORCE_FACTOR);
        
        // 3. Thermal Kick
        const kick = Constants.TC_THERMAL_KICK;
        tc.velocity.x += randomNormalDistribution() * kick;
        tc.velocity.y += randomNormalDistribution() * kick;
        tc.velocity.z += randomNormalDistribution() * kick;
        
        if (isNaN(tc.velocity.x) || isNaN(tc.velocity.y) || isNaN(tc.velocity.z)) {
            tc.velocity.set(0,0,0);
        }
        
        // Move (x += v * dt)
        tc.move(tc.velocity.clone().multiplyScalar(Constants.DT));
    }

    tryFormBonds(sim) {
        const particles = sim.particles;
        const boxL = Constants.BOX_LENGTH;
        const boxW = Constants.BOX_WIDTH;
        const boxH = Constants.BOX_HEIGHT;

        const captureASq = Constants.CAPTURE_RADIUS_A * Constants.CAPTURE_RADIUS_A;
        const captureBSq = Constants.CAPTURE_RADIUS_B * Constants.CAPTURE_RADIUS_B;

        sim.tcMolecules.forEach(tc => {
            const tcPos = tc.mesh.position;
            
            // Try bind A
            if (!tc.boundASite) {
                let bestASite = null;
                let bestDistSq = captureASq;
                
                for (let i = 0; i < particles.length; i++) {
                    const p = particles[i];
                    // Quick check: min image dist between particle center and TC
                    const pDistSq = getMinimumImageDistanceSq(p.group.position, tcPos, boxL, boxW, boxH);
                    const maxReach = (Constants.TC_RADIUS * Constants.PARTICLE_RADIUS_RATIO) + Constants.CAPTURE_RADIUS_A + 1.0; 
                    if (pDistSq > maxReach * maxReach) continue;

                    for (const as of p.aSites) {
                        if (as.userData.isOccupied) continue;
                        as.getWorldPosition(this._tmpA);
                        const d2 = getMinimumImageDistanceSq(this._tmpA, tcPos, boxL, boxW, boxH);
                        if (d2 < bestDistSq) {
                            bestDistSq = d2;
                            bestASite = as;
                        }
                    }
                }
                if (bestASite) {
                    sim.createBridgeA(tc, bestASite);
                    // Reset velocities to prevent kick
                    tc.velocity.multiplyScalar(0.1);
                    const p = bestASite.userData.parentParticle;
                    if (p) p.velocity.multiplyScalar(0.1);
                }
            }

            // Try bind B
            if (!tc.boundBSite) {
                let bestBSite = null;
                let bestDistSq = captureBSq;
                const bSites = sim.network.getBSites();
                
                for (const b of bSites) {
                    if (b.userData.isOccupied) continue;
                    const d2 = getMinimumImageDistanceSq(b.position, tcPos, boxL, boxW, boxH);
                    if (d2 < bestDistSq) {
                        bestDistSq = d2;
                        bestBSite = b;
                    }
                }
                if (bestBSite) {
                    sim.createBridgeB(tc, bestBSite);
                    // Reset velocities to prevent kick
                    tc.velocity.multiplyScalar(0.1);
                    bestBSite.userData.velocity.multiplyScalar(0.1);
                }
            }
        });
    }

    tryReleaseBonds(sim) {
        sim.releaseParticleTC();
        sim.releaseNetworkTC();
    }
    
    /**
     * Compute system temperature from kinetic energy
     * K = 1/2 * m * v^2
     * T = (2/3) * <K> / k_B (for 3 degrees of freedom)
     * Here we assume k_B = 1.
     * T = (2/3) * (Sum(0.5 * m * v^2) / N)
     *   = Sum(m * v^2) / (3 * N)
     */
    computeTemperature(sim) {
        let totalKineticEnergy = 0;
        let particleCount = 0;

        // 1. Beads
        sim.network.getChains().forEach(chain => {
            chain.beads.forEach(bead => {
                const vSq = bead.userData.velocity.lengthSq();
                totalKineticEnergy += 0.5 * Constants.MASS_BEAD * vSq;
                particleCount++;
            });
        });

        // 2. Particles
        sim.particles.forEach(p => {
            if (!p.isTrapped) {
                const vSq = p.velocity.lengthSq();
                totalKineticEnergy += 0.5 * Constants.MASS_PARTICLE * vSq;
                particleCount++;
            }
        });

        // 3. TC Molecules
        sim.tcMolecules.forEach(tc => {
            const vSq = tc.velocity.lengthSq();
            totalKineticEnergy += 0.5 * Constants.MASS_TC * vSq;
            particleCount++;
        });

        if (particleCount === 0) return 0;

        // T = 2 * <K> / 3 (per particle, 3 DOF)
        // <K> = TotalK / N
        // T = 2 * (TotalK / N) / 3 = 2 * TotalK / (3 * N)
        return (2 * totalKineticEnergy) / (3 * particleCount);
    }
}
