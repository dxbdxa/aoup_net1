# 架构设计文档

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  (HTML + CSS + Import Map for Three.js)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        main.js                              │
│  (Application Entry Point - Initialize & Bootstrap)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Simulation.js                           │
│  (Main Controller - Orchestrates All Components)            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - SceneManager    - CameraManager                   │   │
│  │ - RenderManager   - ControlManager                  │   │
│  │ - BrownianMotion  - RouseDynamics                   │   │
│  │ - Particles       - TCMolecules                     │   │
│  │ - Network         - Bridges                         │   │
│  │ - StatsPanel      - ControlsPanel                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 模块层次

```
Level 1: Application Layer
├── main.js              (Entry point, global exports)
└── Simulation.js        (Main controller, event loop)

Level 2: Core Managers
├── Scene.js             (Three.js scene, lighting)
├── Camera.js            (Orthographic camera)
├── Renderer.js          (WebGL renderer, export)
└── Controls.js          (Orbit controls)

Level 3: Domain Objects
├── Particle.js          (Diffusive particle + A-sites)
├── TCMolecule.js        (TC molecule)
├── Network.js           (Polymer network + B-sites)
├── Bridge.js            (A-TC-B bridge structure)
└── Boundary.js          (Source/Drain/Gate electrodes)

Level 4: Physics Engine
├── BrownianMotion.js    (Translational + rotational diffusion)
└── RouseDynamics.js     (Bead-spring model, Langevin dynamics)

Level 5: UI Components
├── StatsPanel.js        (Real-time statistics)
├── ControlsPanel.js     (Button event handlers)
├── Legend.js            (Color legend)
└── InfoPanel.js         (Information display)

Level 6: Utilities
├── Constants.js         (Physical parameters)
├── Colors.js            (Color palette)
└── Helpers.js           (Math utilities, text labels)
```

## 数据流

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Physics    │────▶│   Objects    │────▶│   Renderer   │
│   Update     │     │   State      │     │   Scene      │
└──────────────┘     └──────────────┘     └──────────────┘
       ▲                    │                    │
       │                    ▼                    │
       │            ┌──────────────┐            │
       └────────────│   UI Update  │◀───────────┘
                    │   (Stats)    │
                    └──────────────┘
```

## 核心类关系

```
Simulation
├── creates → SceneManager
├── creates → CameraManager
├── creates → RenderManager
├── creates → ControlManager
├── creates → BrownianMotion
├── creates → RouseDynamics
├── creates → Network
├── creates → Boundary
├── manages → Particle[]
├── manages → TCMolecule[]
├── manages → Bridge[]
└── manages → UI Components

Particle
├── contains → Group (THREE.Group)
├── contains → Mesh (THREE.Mesh)
├── contains → A-Site[] (THREE.Mesh[])
└── uses → BrownianMotion

Network
├── contains → Chain[]
│   ├── beads: B-Site[]
│   └── springs: Line[]
└── uses → RouseDynamics

Bridge
├── references → TCMolecule
├── references → A-Site
├── references → B-Site
└── creates → Bridge Segments (Cylinder)
```

## 动画循环

```
requestAnimationFrame(animate)
    │
    ▼
┌─────────────────┐
│  Update FPS     │ (every 1000ms)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Update Particles│ (Brownian motion + boundary)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Update Network  │ (Rouse dynamics + springs)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Update TC       │ (Free or bridging)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Update Bridges  │ (Position updates)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Update Stats    │ (UI refresh)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Render Scene    │ (WebGL draw)
└─────────────────┘
```

## 设计模式

### 1. 管理器模式 (Manager Pattern)
- `SceneManager`, `CameraManager`, `RenderManager`, `ControlManager`
- 每个管理器负责单一职责的 Three.js 功能

### 2. 实体组件模式 (Entity-Component)
- `Particle`, `TCMolecule`, `Network` 作为实体
- `BrownianMotion`, `RouseDynamics` 作为物理组件

### 3. 观察者模式 (Observer Pattern)
- `Simulation` 作为主题
- UI 组件观察模拟状态变化

### 4. 工厂模式 (Factory Pattern)
- `createBridge()`, `createTextLabel()`
- 动态创建复杂对象

## 扩展点

### 添加新粒子类型
1. 创建新类继承 `Particle` 基础结构
2. 在 `Simulation.js` 中添加创建逻辑
3. 更新 `Constants.js` 添加参数

### 添加新物理模型
1. 在 `physics/` 目录创建新模块
2. 实现 `update()` 方法
3. 在 `Simulation.update()` 中集成

### 添加新 UI 面板
1. 在 `ui/` 目录创建新组件
2. 实现 `update()` 方法
3. 在 `Simulation` 中实例化并更新

## 性能优化

1. **几何体复用**: 相同形状使用同一几何体
2. **材质池**: 预创建常用材质
3. **批量更新**: 弹簧几何体批量更新
4. **LOD**: 可根据距离调整细节级别
5. **视锥体剔除**: Three.js 自动处理

## 浏览器兼容性

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

需要支持:
- ES6 Modules
- WebGL 2.0
- requestAnimationFrame
