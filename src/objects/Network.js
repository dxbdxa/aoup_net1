import * as THREE from 'three';
import { Colors } from '../utils/Colors.js';
import { Constants } from '../utils/Constants.js';

/**
 * Represents the polymer network with B-sites and springs
 */
export class Network {
    constructor() {
        this.chains = [];
        this.bSites = [];
        this.springs = [];
        this.networkGroup = null;
        this._curveSegments = 24;
        this._tmpCurvePoint = new THREE.Vector3();
        
        this.init();
    }
    
    /**
     * Initialize polymer network with Diamond Lattice structure
     */
    init() {
        this.networkGroup = new THREE.Group();
        this.networkGroup.name = 'network';
        
        const springMaterial = new THREE.LineBasicMaterial({ color: Colors.purple, transparent: true, opacity: 0.35 });
        
        const bSiteGeometry = new THREE.SphereGeometry(Constants.B_SITE_RADIUS, 12, 12);
        const bSiteMaterial = new THREE.MeshPhongMaterial({
            color: Colors.purple,
            transparent: false,
            opacity: 1.0,
            shininess: 50
        });

        const nodeMaterial = new THREE.MeshPhongMaterial({
            color: 0x880088, // Darker purple for crosslinks
            transparent: false,
            opacity: 1.0,
            shininess: 50
        });
        
        // Diamond lattice generation
        // Unit cell size (a)
        const a = Constants.LATTICE_SPACING;
        const boxL = Constants.BOX_LENGTH;
        const boxW = Constants.BOX_WIDTH;
        const boxH = Constants.BOX_HEIGHT;
        
        // Number of cells in each dimension to cover the box
        const nx = Math.ceil(boxL / a);
        const ny = Math.ceil(boxW / a);
        const nz = Math.ceil(boxH / a);
        
        // Diamond cubic basis (8 atoms per unit cell, but we can generate bonds from 4 nearest neighbors)
        // Basis atoms in fcc unit cell (0,0,0) + (1/4, 1/4, 1/4)
        // FCC translations: (0,0,0), (0.5,0.5,0), (0.5,0,0.5), (0,0.5,0.5)
        // Total 8 atoms:
        // 0: (0,0,0)
        // 1: (0.25, 0.25, 0.25)
        // 2: (0.5, 0.5, 0)
        // 3: (0.75, 0.75, 0.25)
        // 4: (0.5, 0, 0.5)
        // 5: (0.75, 0.25, 0.75)
        // 6: (0, 0.5, 0.5)
        // 7: (0.25, 0.75, 0.75)
        
        // We will store nodes in a map to avoid duplicates and handle PBC
        const nodes = [];
        // Map key string to node index
        const nodeMap = new Map();
        
        // Helper to get periodic coordinate
        const pbc = (val, size) => {
            return val - Math.floor(val / size + 0.5) * size;
        };
        
        // Create nodes
        for (let ix = -1; ix <= nx; ix++) {
            for (let iy = -1; iy <= ny; iy++) {
                for (let iz = -1; iz <= nz; iz++) {
                    const x0 = ix * a;
                    const y0 = iy * a;
                    const z0 = iz * a;
                    
                    const basis = [
                        [0,0,0], [0.25,0.25,0.25], 
                        [0.5,0.5,0], [0.75,0.75,0.25],
                        [0.5,0,0.5], [0.75,0.25,0.75],
                        [0,0.5,0.5], [0.25,0.75,0.75]
                    ];
                    
                    for (let b = 0; b < 8; b++) {
                        let x = x0 + basis[b][0] * a;
                        let y = y0 + basis[b][1] * a;
                        let z = z0 + basis[b][2] * a;
                        
                        // Apply PBC to position to see if it falls in box
                        const px = pbc(x, boxL);
                        const py = pbc(y, boxW);
                        const pz = pbc(z, boxH);
                        
                        // We only want unique nodes within the box
                        // Use grid cell index for uniqueness?
                        // Better: snap to a small grid to merge duplicates
                        const key = `${Math.round(px*100)},${Math.round(py*100)},${Math.round(pz*100)}`;
                        
                        if (!nodeMap.has(key)) {
                            // Only add if it's somewhat within our interest volume
                            // But since we want PBC, we actually want nodes that cover the volume exactly once
                            // The standard way is to iterate 0..nx-1 etc and don't wrap yet, 
                            // but diamond lattice is tricky.
                            // Let's generate a cloud and filter.
                            
                            const node = new THREE.Mesh(bSiteGeometry, nodeMaterial.clone()); // Nodes are also B-sites? Or just crosslinks?
                            // Let's make nodes rigid crosslinks for now, or just B-sites.
                            // User asked for "polymer chain network", so nodes are crosslinks.
                            // We will add B-sites ALONG the bonds.
                            
                            node.position.set(px, py, pz);
                            // Random perturbation
                            node.position.x += (Math.random()-0.5) * Constants.LATTICE_PERTURBATION;
                            node.position.y += (Math.random()-0.5) * Constants.LATTICE_PERTURBATION;
                            node.position.z += (Math.random()-0.5) * Constants.LATTICE_PERTURBATION;
                            
                            node.userData = { 
                                isNode: true, 
                                isOccupied: false,
                                id: nodes.length 
                            };
                            
                            // this.networkGroup.add(node); // Nodes might not need to be rendered or are B-sites
                            // If nodes act as B-sites, add to bSites
                            // But usually B-sites are along the chain. 
                            // Let's treat nodes as "inert" crosslinks for now, or just special B-sites.
                            // Let's add them as B-sites for connectivity.
                            
                            // nodes.push(node);
                            nodeMap.set(key, node);
                        }
                    }
                }
            }
        }
        
        // Re-build unique nodes list
        const uniqueNodes = Array.from(nodeMap.values());
        
        // Generate bonds (chains) between nearest neighbors
        // Diamond neighbors distance is (sqrt(3)/4) * a
        const neighborDist = (Math.sqrt(3)/4) * a;
        const tolerance = neighborDist * 0.2; // 20% tolerance
        
        // We need to connect nodes that are close enough (considering PBC)
        // Since we already folded positions to PBC, we can use getMinimumImageDistance
        const connectedPairs = new Set();
        
        uniqueNodes.forEach((node1, i) => {
            uniqueNodes.forEach((node2, j) => {
                if (i >= j) return;
                
                // Calculate PBC distance
                let dx = node2.position.x - node1.position.x;
                let dy = node2.position.y - node1.position.y;
                let dz = node2.position.z - node1.position.z;
                
                dx -= Math.round(dx / boxL) * boxL;
                dy -= Math.round(dy / boxW) * boxW;
                dz -= Math.round(dz / boxH) * boxH;
                
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                if (Math.abs(dist - neighborDist) < tolerance) {
                    // Create a chain between node1 and node2
                    this.createChain(node1.position, new THREE.Vector3(node1.position.x + dx, node1.position.y + dy, node1.position.z + dz), bSiteGeometry, bSiteMaterial, springMaterial);
                }
            });
        });
        
        // Add nodes to scene (optional, maybe just beads are enough)
        // uniqueNodes.forEach(n => this.networkGroup.add(n));
    }
    
    createChain(startPos, endPos, beadGeo, beadMat, springMat) {
        // Create beads between start and end
        const beadsCount = Constants.LATTICE_BEADS_PER_SEGMENT;
        const chain = {
            beads: [],
            springs: []
        };
        
        const delta = new THREE.Vector3().subVectors(endPos, startPos).multiplyScalar(1 / (beadsCount + 1));
        
        for (let k = 1; k <= beadsCount; k++) {
            const bSite = new THREE.Mesh(beadGeo, beadMat.clone());
            const pos = startPos.clone().add(delta.clone().multiplyScalar(k));
            
            const wrappedPos = this.wrapPoint(pos.clone());
            bSite.position.copy(wrappedPos);
            
            // Perturb
            bSite.position.x += (Math.random()-0.5) * 0.5;
            bSite.position.y += (Math.random()-0.5) * 0.5;
            bSite.position.z += (Math.random()-0.5) * 0.5;
            
            bSite.userData = {
                isOccupied: false,
                boundTC: null,
                velocity: new THREE.Vector3(0,0,0),
                force: new THREE.Vector3(0,0,0),
                anchorStart: (k===1) ? startPos.clone() : null,
                anchorEnd: (k===beadsCount) ? endPos.clone() : null
            };
            
            this.networkGroup.add(bSite);
            this.bSites.push(bSite);
            chain.beads.push(bSite);
        }
        
        // Link internal beads
        for (let i = 0; i < chain.beads.length - 1; i++) {
            chain.beads[i].userData.nextBead = chain.beads[i+1];
            chain.beads[i+1].userData.prevBead = chain.beads[i];
        }
        
        // Add fixed beads at ends
        const startFixed = new THREE.Mesh(beadGeo, beadMat); // Invisible/Fixed
        startFixed.position.copy(this.wrapPoint(startPos.clone()));
        startFixed.visible = false;
        
        const endFixed = new THREE.Mesh(beadGeo, beadMat);
        endFixed.position.copy(this.wrapPoint(endPos.clone()));
        endFixed.visible = false;
        
        if (chain.beads.length > 0) {
            chain.beads[0].userData.prevBead = startFixed;
            chain.beads[chain.beads.length-1].userData.nextBead = endFixed;
        }
        
        chain.renderBeads = [startFixed, ...chain.beads, endFixed];
        
        // --- Tube Rendering Setup ---
        // Instead of a single Line/LineSegments, we use a Group to hold Tube meshes.
        // We will regenerate these meshes in update().
        const tubeGroup = new THREE.Group();
        tubeGroup.userData = { chain: chain };
        
        // Create initial dummy tube to avoid empty group issues
        // We use MeshPhongMaterial for 3D tubes
        const tubeMat = new THREE.MeshPhongMaterial({
            color: Colors.purple,
            transparent: true,
            opacity: 0.6,
            shininess: 30
        });
        chain.tubeMaterial = tubeMat;
        
        this.networkGroup.add(tubeGroup);
        chain.tubeGroup = tubeGroup; // Replaces chain.tube
        
        this.chains.push(chain);
    }

    /**
     * Initialize polymer network (Original Random) - DEPRECATED / REPLACED
     */
    initRandom() {
        // ... original code ...
    }

    /**
     * Update chain geometries
     */
    update() {
        const threshold = Math.min(Constants.BOX_LENGTH, Constants.BOX_WIDTH, Constants.BOX_HEIGHT) * 0.5;
        const radius = Constants.NETWORK_TUBE_RADIUS;
        const radialSegments = Constants.NETWORK_TUBE_RADIAL_SEGMENTS;
        const tubularSegments = Constants.NETWORK_TUBE_TUBULAR_SEGMENTS;

        this.chains.forEach(chain => {
            const beadList = chain.renderBeads || chain.beads;
            if (beadList.length < 2) return;

            // Clear old tubes
            while(chain.tubeGroup.children.length > 0){ 
                const child = chain.tubeGroup.children[0];
                if(child.geometry) child.geometry.dispose();
                chain.tubeGroup.remove(child);
            }

            // Detect jumps and split into segments
            const segments = [];
            let currentSegment = [];
            
            if (!isNaN(beadList[0].position.x)) {
                currentSegment.push(beadList[0].position.clone());
            }

            for (let i = 1; i < beadList.length; i++) {
                const prev = beadList[i-1].position;
                const curr = beadList[i].position;
                
                if (isNaN(curr.x)) break; // Safety break

                const dist = prev.distanceTo(curr);
                
                if (dist > threshold) {
                    // Jump detected (PBC crossing)
                    // Finish current segment if valid
                    if (currentSegment.length >= 2) {
                        segments.push(currentSegment);
                    }
                    // Start new segment
                    currentSegment = [curr.clone()];
                } else {
                    currentSegment.push(curr.clone());
                }
            }
            
            // Push last segment
            if (currentSegment.length >= 2) {
                segments.push(currentSegment);
            }

            // Create Tube for each segment
            segments.forEach(points => {
                // CatmullRomCurve3 needs at least 2 points
                // If 2 points, it's a straight line, CatmullRom handles it fine usually.
                const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
                
                // Adaptive tubular segments based on length? Or fixed.
                // Fixed is simpler.
                const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
                const mesh = new THREE.Mesh(geometry, chain.tubeMaterial);
                chain.tubeGroup.add(mesh);
            });
        });
    }

    wrapPoint(p) {
        const L = Constants.BOX_LENGTH;
        const W = Constants.BOX_WIDTH;
        const H = Constants.BOX_HEIGHT;
        
        // Simple wrapping to [-L/2, L/2]
        // Note: applyPeriodicBoundary in Helpers.js does exactly this but with floor/round
        // We can inline a simple version or use helper if imported.
        // Assuming p is Vector3.
        
        if (p.x > L/2) p.x -= Math.ceil((p.x - L/2)/L) * L;
        else if (p.x < -L/2) p.x += Math.ceil((-L/2 - p.x)/L) * L;
        
        if (p.y > W/2) p.y -= Math.ceil((p.y - W/2)/W) * W;
        else if (p.y < -W/2) p.y += Math.ceil((-W/2 - p.y)/W) * W;
        
        if (p.z > H/2) p.z -= Math.ceil((p.z - H/2)/H) * H;
        else if (p.z < -H/2) p.z += Math.ceil((-H/2 - p.z)/H) * H;
        
        return p;
    }
    
    /**
     * Get all B-sites
     * @returns {THREE.Mesh[]} Array of B-site meshes
     */
    getBSites() {
        return this.bSites;
    }
    
    /**
     * Get a free B-site near a position
     * @param {THREE.Vector3} position - Reference position
     * @param {number} maxDistance - Maximum distance
     * @returns {THREE.Mesh|null} Free B-site or null
     */
    getFreeBSiteNear(position, maxDistance) {
        return this.bSites.find(b => 
            !b.userData.isOccupied &&
            b.position.distanceTo(position) < maxDistance
        ) || null;
    }
    
    /**
     * Get the network group
     * @returns {THREE.Group} Network group
     */
    getGroup() {
        return this.networkGroup;
    }
    
    /**
     * Get all chains
     * @returns {Object[]} Array of chain objects
     */
    getChains() {
        return this.chains;
    }
    
    /**
     * Get all springs
     * @returns {THREE.Line[]} Array of spring lines
     */
    getSprings() {
        return this.springs;
    }
    
    
    /**
     * Reset the network (clear all B-sites and recreate)
     */
    reset() {
        // Remove all B-sites and springs from scene
        this.bSites.forEach(b => b.removeFromParent());
        this.springs.forEach(s => s.removeFromParent());
        
        // Clear arrays
        this.chains = [];
        this.bSites = [];
        this.springs = [];
        
        // Recreate
        this.init();
    }
}
