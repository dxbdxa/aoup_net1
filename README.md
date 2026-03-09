# Diffusive Transistor Simulation

3D 可视化模拟扩散晶体管中 TC 分子桥接 A/B 位点的过程，采用 Nature 风格的示意图设计。

## 📋 项目概述

该项目模拟了以下物理过程：

- **粒子扩散**: 带有 A 位点的胶体粒子在溶液中进行布朗运动
- **聚合物网络**: 由 Rouse 动力学描述的 bead-spring 模型
- **TC 桥接**: TC 分子在 gate 区域桥接粒子 A 位点和网络 B 位点
- **晶体管行为**: Source-Drain 电极，Gate 控制 TC 浓度

## 🏗️ 项目结构

```
diffusive-transistor-js/
├── index.html              # 主 HTML 入口
├── package.json            # NPM 配置
├── README.md               # 项目文档
├── styles/
│   └── main.css           # 样式文件
└── src/
    ├── main.js            # 应用入口
    ├── Simulation.js      # 主模拟控制器
    ├── core/              # 核心 Three.js 管理
    │   ├── Scene.js       # 场景和灯光
    │   ├── Camera.js      # 正交相机
    │   ├── Renderer.js    # WebGL 渲染器
    │   └── Controls.js    # 轨道控制
    ├── objects/           # 场景对象
    │   ├── Particle.js    # 粒子类（带 A 位点）
    │   ├── TCMolecule.js  # TC 分子类
    │   ├── Network.js     # 聚合物网络
    │   ├── Bridge.js      # 桥接结构
    │   └── Boundary.js    # 边界（Source/Drain/Gate）
    ├── physics/           # 物理引擎
    │   ├── BrownianMotion.js  # 布朗运动
    │   └── RouseDynamics.js   # Rouse 动力学
    └── ui/                # UI 组件
        ├── InfoPanel.js   # 信息面板
        ├── StatsPanel.js  # 统计面板
        ├── ControlsPanel.js # 控制面板
        └── Legend.js      # 图例
```

## 🚀 快速开始

### 方法 1: 直接打开（最简单）✨

直接双击打开 `index-direct.html` 文件即可运行！

```bash
# Windows
start index-direct.html

# macOS
open index-direct.html

# Linux
xdg-open index-direct.html
```

### 方法 2: 使用本地服务器（ES6 模块版本）

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或使用启动脚本
./start.sh 8080
```

然后在浏览器中访问 `http://localhost:8080`

## 📁 文件说明

| 文件 | 说明 | 使用方式 |
|------|------|----------|
| `index-direct.html` | 单文件版本 | **直接双击打开** |
| `index.html` | ES6 模块版本 | 需要 HTTP 服务器 |
| `index-standalone.html` | 传统脚本版本 | 需要 HTTP 服务器 |

## 🎮 交互控制

- **鼠标左键拖动**: 旋转视角
- **鼠标滚轮**: 缩放
- **鼠标右键拖动**: 平移

### 控制面板

| 按钮 | 功能 |
|------|------|
| ➕ Add Particles | 添加 50 个新粒子 |
| 🔄 Reset | 重置模拟 |
| ⏯️ Pause/Play | 暂停/继续动画 |
| 📷 Export PNG | 导出当前视图为 PNG |
| 🎬 Record | 录制视频（需额外库） |

## 🔬 物理参数

### 尺寸参数

| 参数 | 值 | 说明 |
|------|-----|------|
| TC_RADIUS | 0.4 | TC 分子半径 |
| PARTICLE_RADIUS | 3.0 × TC | 粒子半径 |
| A_SITE_RADIUS | 0.15 | A 位点半径 |
| B_SITE_RADIUS | 0.2 | B 位点半径 |
| M_SITES | 12 | 每个粒子的 A 位点数 |
| N_CHAINS | 8 | 聚合物链数量 |
| BEADS_PER_CHAIN | 6 | 每条链的珠子数 |

### 物理参数

| 参数 | 值 | 说明 |
|------|-----|------|
| SPRING_CONSTANT | 0.5 | Rouse 模型弹簧常数 |
| ROUSE_DAMPING | 0.95 | 阻尼因子 |
| BINDING_PROBABILITY | 0.002 | 结合概率 |
| RELEASE_PROBABILITY | 0.003 | 释放概率 |

## 🎨 配色方案（Nature 风格）

| 颜色 | 十六进制 | 用途 |
|------|----------|------|
| 蓝色 | #1f77b4 | 自由粒子 |
| 红色 | #ff6b6b | 被困粒子 |
| 绿色 | #2ca02c | TC 分子 |
| 橙色 | #ff7f0e | TC 桥 |
| 紫色 | #9467bd | 网络/B 位点 |
| 黄色 | #ffd700 | A 位点 |

## 📦 依赖

- **Three.js** (r128): 3D 渲染引擎
- **OrbitControls**: 相机轨道控制

所有依赖通过 CDN 加载，无需本地安装。

## 🔧 开发

### 添加新功能

1. 在相应目录创建新模块
2. 在 `Simulation.js` 中导入并集成
3. 更新 `main.js` 入口

### 修改物理参数

编辑 `src/utils/Constants.js` 文件中的常量。

### 修改配色

编辑 `src/utils/Colors.js` 文件。

## 📝 许可证

MIT License

## 🙏 致谢

- Three.js 团队
- Nature 风格科学可视化
