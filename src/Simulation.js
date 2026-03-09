import * as THREE from 'three';
import { SceneManager } from './core/Scene.js';
import { CameraManager } from './core/Camera.js';
import { RenderManager } from './core/Renderer.js';
import { ControlManager } from './core/Controls.js';
import { Particle } from './objects/Particle.js';
import { TCMolecule } from './objects/TCMolecule.js';
import { Network } from './objects/Network.js';
import { BridgeA,BridgeB } from './objects/Bridge.js';
import { Boundary } from './objects/Boundary.js';
import { UnifiedDynamics } from './physics/UnifiedDynamics.js';
import { StatsPanel } from './ui/StatsPanel.js';
import { ControlsPanel } from './ui/ControlsPanel.js';
import { Legend } from './ui/Legend.js';
import { Constants } from './utils/Constants.js';
import { Colors } from './utils/Colors.js';
import { applyPeriodicBoundary, getMinimumImageDistanceSq } from './utils/Helpers.js';

/**
 * Main simulation class - orchestrates all components
 */
export class Simulation {
    constructor() {
        // Core managers
        this.sceneManager = null;
        this.cameraManager = null;
        this.renderManager = null;
        this.controlManager = null;
        
        // Physics
        this.dynamics = null;
        
        // Scene objects
        this.particles = [];
        this.tcMolecules = [];
        this.network = null;
        this.boundary = null;
        this.bridges = [];
        
        // UI
        this.statsPanel = null;
        this.controlsPanel = null;
        this.legend = null;
        
        // Animation state
        this.isAnimating = true;
        this.animationId = null;
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        
        // Loading
        this.loadingElement = document.getElementById('loading');
    }
    
    /**
     * Calculate number of objects based on volume fraction
     * @param {string} type - 'particle' or 'tc'
     * @returns {number} Count
     */
    calculateCountFromVolumeFraction(type) {
        const boxVol = Constants.BOX_LENGTH * Constants.BOX_WIDTH * Constants.BOX_HEIGHT;
        
        if (type === 'particle') {
            // Particle volume (approx sphere with effective radius)
            // Effective radius includes A-sites? Let's use PARTICLE_RADIUS_RATIO * TC_RADIUS
            const r = Constants.TC_RADIUS * Constants.PARTICLE_RADIUS_RATIO;
            const volOne = (4/3) * Math.PI * Math.pow(r, 3);
            const targetTotalVol = boxVol * Constants.VOL_FRACTION_PARTICLE;
            return Math.round(targetTotalVol / volOne);
        } else if (type === 'tc') {
            const r = Constants.TC_RADIUS;
            const volOne = (4/3) * Math.PI * Math.pow(r, 3);
            const targetTotalVol = boxVol * Constants.VOL_FRACTION_TC;
            return Math.round(targetTotalVol / volOne);
        }
        return 0;
    }

    /**
     * Initialize the simulation
     */
    init() {
        // Initialize core managers
        this.sceneManager = new SceneManager();
        this.cameraManager = new CameraManager();
        this.renderManager = new RenderManager('canvas-container');
        this.controlManager = new ControlManager(
            this.cameraManager.getCamera(),
            this.renderManager.getDomElement()
        );
        
        // Setup lighting
        this.sceneManager.setupLights();
        
        // Initialize physics
        this.dynamics = new UnifiedDynamics();
        
        // Create scene objects
        this.sceneManager.createBoundary();
        this.boundary = new Boundary(this.sceneManager.getScene());
        this.network = new Network();
        this.sceneManager.add(this.network.getGroup());
        
        // Initialize UI
        this.statsPanel = new StatsPanel();
        this.controlsPanel = new ControlsPanel(this);
        this.legend = new Legend('legend');
        
        // Add initial particles and TC molecules based on volume fraction
        const particleCount = this.calculateCountFromVolumeFraction('particle');
        const tcCount = this.calculateCountFromVolumeFraction('tc');
        
        console.log(`Initializing with ${particleCount} particles and ${tcCount} TC molecules based on volume fractions.`);
        
        this.addParticles(particleCount);
        this.addTCMolecules(tcCount);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Hide loading screen
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
        
        // Start animation loop
        this.animate();
    }
    
    /**
     * Setup window event listeners
     */
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize(), false);
    }
    
    /**
     * Handle window resize
     */
    onWindowResize() {
        this.cameraManager.onWindowResize();
        this.renderManager.onWindowResize();
    }
    
    /**
     * Add particles to the simulation
     * @param {number} count - Number of particles to add
     */
    addParticles(count) {
        for (let i = 0; i < count; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * Constants.BOX_LENGTH,
                (Math.random() - 0.5) * Constants.BOX_WIDTH,
                (Math.random() - 0.5) * Constants.BOX_HEIGHT
            );
            
            const particle = new Particle(position);
            this.sceneManager.add(particle.getGroup());
            this.particles.push(particle);
        }
        
        this.updateStats();
    }
    
    /**
     * Add TC molecules to the simulation
     * @param {number} count - Number of TC molecules to add
     */
    addTCMolecules(count) {
        for (let i = 0; i < count; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * Constants.BOX_LENGTH,
                (Math.random() - 0.5) * Constants.BOX_WIDTH,
                (Math.random() - 0.5) * Constants.BOX_HEIGHT
            );
            
            const tc = new TCMolecule(position);
            this.sceneManager.add(tc.getMesh());
            this.tcMolecules.push(tc);
        }
        
        this.updateStats();
    }
    
    /**
     * Create a bridge between particle A-site and TC
     * @param {TCMolecule} tc - TC molecule
     * @param {THREE.Mesh} aSite - A-site on particle
     */
    createBridgeA(tc, aSite) {
        if (tc.boundASite) return;
        if (!aSite || !aSite.userData) return;
        if (aSite.userData.isOccupied) return;

        const bridge = new BridgeA(tc, aSite);

        this.sceneManager.add(bridge.getGroup());
        this.bridges.push(bridge);
        
        // Update states
        tc.isBridging = true;
        tc.boundASite = aSite;
        
        aSite.userData.isOccupied = true;
        aSite.userData.boundTC = tc;

        if (aSite.material && aSite.material.color) {
            aSite.material.color.setHex(Colors.orange);
        }

        if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
            tc.mesh.material.color.setHex(Colors.orange);
        }
        
        // Update bridge colors for AB state
        if (tc.boundBSite) {
            // It was already bound to B, now it's AB
            // Update THIS bridge color
            bridge.setColor(Colors.bridgeAB);
            
            // Find and update the other bridge (B)
            const bridgeB = this.bridges.find(b => b.tc === tc && b.bSite === tc.boundBSite);
            if (bridgeB) {
                bridgeB.setColor(Colors.bridgeAB);
            }
            
            // Update TC color to AB
            if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
                tc.mesh.material.color.setHex(Colors.bridgeAB);
            }
        } else {
            // Just A
            bridge.setColor(Colors.bridgeA);
            
            // Update TC color to A
            if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
                tc.mesh.material.color.setHex(Colors.bridgeA);
            }
        }
        
        // Mark particle as trapped
        const particle = aSite.userData.parentParticle;
        particle.trap();
        particle.bridgeCount++;
    }

    /**
     * Create a bridge between network B-site and TC
     * @param {TCMolecule} tc - TC molecule
     * @param {THREE.Mesh} bSite - B-site on network
     */
    createBridgeB(tc, bSite) {
        if (tc.boundBSite) return;
        if (!bSite || !bSite.userData) return;
        if (bSite.userData.isOccupied) return;

        const bridge = new BridgeB(tc, bSite);

        this.sceneManager.add(bridge.getGroup());
        this.bridges.push(bridge);
        
        // Update states
        tc.isBridging = true;
        tc.boundBSite = bSite;
        
        bSite.userData.isOccupied = true;
        bSite.userData.boundTC = tc;

        if (bSite.material && bSite.material.color) {
            bSite.material.color.setHex(Colors.orange);
        }

        if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
            tc.mesh.material.color.setHex(Colors.orange);
        }
        
        // Update bridge colors for AB state
        if (tc.boundASite) {
            // It was already bound to A, now it's AB
            // Update THIS bridge color
            bridge.setColor(Colors.bridgeAB);
            
            // Find and update the other bridge (A)
            const bridgeA = this.bridges.find(b => b.tc === tc && b.aSite === tc.boundASite);
            if (bridgeA) {
                bridgeA.setColor(Colors.bridgeAB);
            }
            
            // Update TC color to AB
            if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
                tc.mesh.material.color.setHex(Colors.bridgeAB);
            }
        } else {
            // Just B
            bridge.setColor(Colors.bridgeB);
            
            // Update TC color to B
            if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
                tc.mesh.material.color.setHex(Colors.bridgeB);
            }
        }
    }
    
    /**
     * Release a particle from all bridges
     * @param {Particle} particle - Particle to release
     */
    releaseParticle(particle) {
        // Release all A-sites
        particle.aSites.forEach(aSite => {
            if (aSite.userData.isOccupied && aSite.userData.boundTC) {
                const tc = aSite.userData.boundTC;
                const bSite = tc.boundBSite;
                
                // Release TC
                tc.isBridging = false;
                tc.boundASite = null;
                
                // Release A-site
                aSite.userData.isOccupied = false;
                aSite.userData.boundTC = null;

                if (aSite.material && aSite.material.color) {
                    aSite.material.color.setHex(Colors.yellow);
                }
                
                // Release B-site
                if (bSite) {
                    bSite.userData.isOccupied = false;
                    bSite.userData.boundTC = null;

                    if (bSite.material && bSite.material.color) {
                        bSite.material.color.setHex(Colors.purple);
                    }
                }

                if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
                    tc.mesh.material.color.setHex(Colors.green);
                }
            }
        });
        
        // Remove all bridges for this particle
        for (let i = this.bridges.length - 1; i >= 0; i--) {
            const bridge = this.bridges[i];
            if (bridge.aSite && bridge.aSite.userData.parentParticle === particle) {
                this.sceneManager.remove(bridge.getGroup());
                bridge.dispose();
                this.bridges.splice(i, 1);
            }
        }
        
        particle.release();
    }
    
    /**
     * Update simulation state
     */
    update() {
        this.dynamics.update(this);
        // Update all bridges (position, rotation, scale, visibility)
        this.bridges.forEach(b => b.update());
    }
    /**
     * Find a free TC site near a position
     * @param {Array} tcMolecules - Array of TC molecules
     * @param {THREE.Vector3} position - Position to check
     * @param {number} radius - Search radius
     * @returns {THREE.Object3D} Free TC site or null
     */
    getFreeTCSiteNear(tcMolecules, position, radius) {
        let freeSite = null;
        const radiusSq = radius * radius;
        const boxL = Constants.BOX_LENGTH;
        const boxW = Constants.BOX_WIDTH;
        const boxH = Constants.BOX_HEIGHT;

        for (const tc of tcMolecules) {
            if (!tc.isBridging) {
                // 确保 tc.mesh 和 tc.mesh.position 存在
                if (tc.mesh && tc.mesh.position) {
                    const distSq = getMinimumImageDistanceSq(tc.mesh.position, position, boxL, boxW, boxH);
                    const dist = Math.sqrt(distSq);
                    
                    if ( dist > radius * Constants.PARTICLE_RADIUS_RATIO*0.5 && dist < radius * Constants.PARTICLE_RADIUS_RATIO*0.8) {
                        freeSite = tc;
                        break;
                    }
                }
            }
        }
        
        return freeSite;
    }
    /**
     * Try to bind a particle with TC molecules
     * @description 尝试将粒子与 TC 分子绑定
     * @param {Array} particles - 粒子数组
     * @param {TCMolecule} tc - TC 分子
     * @returns {void}
     */
    tryBindParticle(particles, tc) {
        // 若 TC 已处于桥接状态，则不再参与新的绑定（体现饱和性）
        if (tc.boundASite) return;

        // 遍历所有粒子，寻找距离当前 TC 最近且拥有空闲 A-site 的粒子
        let nearestParticle = null;
        let minParticleDistSq = Infinity;
        const boxL = Constants.BOX_LENGTH;
        const boxW = Constants.BOX_WIDTH;
        const boxH = Constants.BOX_HEIGHT;

        for (const p of particles) {
            if (p.isTrapped) continue;          // 已束缚粒子跳过
            const distSq = getMinimumImageDistanceSq(tc.mesh.position, p.group.position, boxL, boxW, boxH);
            if (distSq < minParticleDistSq) {
                // 只要该粒子至少有一个空闲 A-site 就暂记为候选
                const hasFreeASite = p.aSites.some(as => !as.userData.isOccupied);
                if (hasFreeASite) {
                    minParticleDistSq = distSq;
                    nearestParticle = p;
                }
            }
        }

        if (!nearestParticle) return;   // 没有合适粒子

        // 在该粒子的所有空闲 A-site 中，再挑一个距离 TC 最近且通过概率检测的
        let bestASite = null;
        let bestDistSq = 0.5 * 0.5;
        for (const as of nearestParticle.aSites) {
            if (as.userData.isOccupied) continue;
            if (Math.random() > Constants.BINDING_PROBABILITY_A) continue;

            const aPos = new THREE.Vector3();
            as.getWorldPosition(aPos);
            const dSq = getMinimumImageDistanceSq(aPos, tc.mesh.position, boxL, boxW, boxH);
            if (dSq < bestDistSq) {
                bestDistSq = dSq;
                bestASite = as;
            }
        }

        if (bestASite) {
            this.createBridgeA(tc, bestASite);
        }
    }
    
    /**
     * Try to bind a network B-site with TC molecules
     * @description 尝试将网络 B 位点与 TC 分子绑定
     * @param {Network} network - 聚合物网络
     * @param {TCMolecule} tc - TC 分子
     * @returns {void}
     */
    tryBindNetwork(network, tc) {
        // 若 TC 已与 B 位点绑定，则不再绑定
        if (tc.boundBSite) return;

        let bestBSite = null;
        let bestDistSq = 0.2 * 0.2; // Threshold distance
        const boxL = Constants.BOX_LENGTH;
        const boxW = Constants.BOX_WIDTH;
        const boxH = Constants.BOX_HEIGHT;
        
        const bSites = network.getBSites();

        for (const bSite of bSites) {
            if (bSite.userData.isOccupied) continue;
            
            // Probability check
            if (Math.random() > Constants.BINDING_PROBABILITY_B) continue;
            
            const distSq = getMinimumImageDistanceSq(tc.mesh.position, bSite.position, boxL, boxW, boxH);
            
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestBSite = bSite;
            }
        }

        if (bestBSite) {
            this.createBridgeB(tc, bestBSite);
        }
    }

    /**
     * Release connections between TC and Particle A-sites based on probability
     */
    releaseParticleTC() {
        // 遍历所有 TC，找到绑定了 A-site 的
        this.tcMolecules.forEach(tc => {
            if (tc.boundASite) {
                if (Math.random() < Constants.RELEASE_PROBABILITY_A) {
                    this.removeBridgeA(tc, tc.boundASite);
                }
            }
        });
    }

    /**
     * Release connections between TC and Network B-sites based on probability
     */
    releaseNetworkTC() {
        // 遍历所有 TC，找到绑定了 B-site 的
        this.tcMolecules.forEach(tc => {
            if (tc.boundBSite) {
                if (Math.random() < Constants.RELEASE_PROBABILITY_B) {
                    this.removeBridgeB(tc, tc.boundBSite);
                }
            }
        });
    }

    removeBridgeA(tc, aSite) {
        // Find and remove the bridge
        const bridgeIndex = this.bridges.findIndex(b => b.tc === tc && b.aSite === aSite);
        if (bridgeIndex !== -1) {
            const bridge = this.bridges[bridgeIndex];
            this.sceneManager.remove(bridge.getGroup());
            bridge.dispose();
            this.bridges.splice(bridgeIndex, 1);
        }

        // Update states
        aSite.userData.isOccupied = false;
        aSite.userData.boundTC = null;
        tc.boundASite = null;

        // If it was AB, now it's just B. Update B color.
        if (tc.boundBSite) {
            const bridgeB = this.bridges.find(b => b.tc === tc && b.bSite === tc.boundBSite);
            if (bridgeB) {
                bridgeB.setColor(Colors.bridgeB);
            }
            // Update TC color to B
            if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
                tc.mesh.material.color.setHex(Colors.bridgeB);
            }
        }

        if (aSite.material && aSite.material.color) {
            aSite.material.color.setHex(Colors.yellow);
        }

        if (!tc.boundBSite && tc.mesh && tc.mesh.material && tc.mesh.material.color) {
            tc.mesh.material.color.setHex(Colors.green);
        }
        
        // Update bridging status
        if (!tc.boundBSite) {
            tc.isBridging = false;
        }

        // Update particle state
        const particle = aSite.userData.parentParticle;
        if (particle) {
            particle.bridgeCount--;
            if (particle.bridgeCount <= 0) {
                particle.release(); // sets isTrapped = false
                particle.bridgeCount = 0;
            }
        }
    }

    removeBridgeB(tc, bSite) {
        // Find and remove the bridge
        const bridgeIndex = this.bridges.findIndex(b => b.tc === tc && b.bSite === bSite);
        if (bridgeIndex !== -1) {
            const bridge = this.bridges[bridgeIndex];
            this.sceneManager.remove(bridge.getGroup());
            bridge.dispose();
            this.bridges.splice(bridgeIndex, 1);
        }

        // Update states
        bSite.userData.isOccupied = false;
        bSite.userData.boundTC = null;
        tc.boundBSite = null;

        // If it was AB, now it's just A. Update A color.
        if (tc.boundASite) {
            const bridgeA = this.bridges.find(b => b.tc === tc && b.aSite === tc.boundASite);
            if (bridgeA) {
                bridgeA.setColor(Colors.bridgeA);
            }
            // Update TC color to A
            if (tc.mesh && tc.mesh.material && tc.mesh.material.color) {
                tc.mesh.material.color.setHex(Colors.bridgeA);
            }
        }

        if (bSite.material && bSite.material.color) {
            bSite.material.color.setHex(Colors.purple);
        }

        if (!tc.boundASite && tc.mesh && tc.mesh.material && tc.mesh.material.color) {
            tc.mesh.material.color.setHex(Colors.green);
        }

        // Update bridging status
        if (!tc.boundASite) {
            tc.isBridging = false;
        }
    }

    updateStats() {
        // Calculate temperature
        const temperature = this.dynamics.computeTemperature(this);
        
        const stats = {
            particleCount: this.particles.length,
            aSiteCount: this.particles.length * Constants.M_SITES,
            bSiteCount: this.network.getBSites().length,
            chainCount: this.network.getChains().length,
            fps: this.fps,
            bridgeCount: this.bridges.length,
            diffusionRatio: this.statsPanel.calculateDiffusionRatio(this.particles),
            temperature: temperature
        };
        
        this.statsPanel.update(stats);
    }
    
    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        if (!this.isAnimating) return;
        
        // Update FPS counter
        this.frameCount++;

        const currentTime = performance.now();
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
        }

        // Update simulation
        this.update();
        
        // Update stats
        this.updateStats();
        
        // Update controls
        this.controlManager.update();
        
        // Render
        this.renderManager.render(
            this.sceneManager.getScene(),
            this.cameraManager.getCamera()
        );
    }
    
    /**
     * Toggle animation pause/play
     */
    toggleAnimation() {
        this.isAnimating = !this.isAnimating;
        this.controlsPanel.updatePausePlayButton(this.isAnimating);
    }
    
    /**
     * Reset the simulation
     */
    reset() {
        // Remove all particles
        this.particles.forEach(p => {
            this.sceneManager.remove(p.getGroup());
        });
        this.particles = [];
        
        // Remove all bridges
        this.bridges.forEach(b => {
            this.sceneManager.remove(b.getGroup());
            b.dispose();
        });
        this.bridges = [];
        
        // Remove all TC molecules
        this.tcMolecules.forEach(tc => {
            this.sceneManager.remove(tc.getMesh());
        });
        this.tcMolecules = [];
        
        // Reset network
        this.sceneManager.remove(this.network.getGroup());
        this.network.reset();
        this.sceneManager.add(this.network.getGroup());
        
        // Add new particles and TC
        this.addParticles(150);
        this.addTCMolecules(80);
    }
    
    /**
     * Export current view as PNG image
     */
    exportImage() {
        this.renderManager.render(
            this.sceneManager.getScene(),
            this.cameraManager.getCamera()
        );
        
        const dataURL = this.renderManager.exportToPNG();
        const link = document.createElement('a');
        link.download = 'diffusive_transistor_AB_' + new Date().toISOString().slice(0, 10) + '.png';
        link.href = dataURL;
        link.click();
    }
    
    /**
     * Export video (placeholder - requires additional libraries)
     */
    exportVideo() {
        alert('Video recording requires additional libraries (e.g., CCapture.js). For now, use screen recording software.');
    }
}
