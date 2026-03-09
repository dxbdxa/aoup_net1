# aoup_net_vis 项目概览（可视化）

目录：`visualization/aoup_net_vis`

本项目是一个纯前端的 3D 可视化模拟（Diffusive Transistor / TC 桥接 A/B 位点），运行于浏览器（WebGL）。代码采用 ES Modules 组织，默认通过 `index.html` 的 importmap 从 CDN 加载 `three@0.128.0`。

## 目录结构（目录树）

```
aoup_net_vis/
├─ index.html
├─ index-direct.html
├─ index-standalone.html
├─ package.json
├─ start.sh
├─ README.md
├─ ARCHITECTURE.md
├─ MIGRATION.md
├─ styles/
│  └─ main.css
└─ src/
   ├─ main.js
   ├─ Simulation.js
   ├─ index.js
   ├─ core/
   │  ├─ Scene.js
   │  ├─ Camera.js
   │  ├─ Renderer.js
   │  └─ Controls.js
   ├─ objects/
   │  ├─ Particle.js
   │  ├─ TCMolecule.js
   │  ├─ Network.js
   │  ├─ Bridge.js
   │  └─ Boundary.js
   ├─ physics/
   │  └─ UnifiedDynamics.js
   ├─ ui/
   │  ├─ ControlsPanel.js
   │  ├─ InfoPanel.js
   │  ├─ Legend.js
   │  └─ StatsPanel.js
   └─ utils/
      ├─ Colors.js
      ├─ Constants.js
      └─ Helpers.js
```

## 技术栈与依赖

### 前端运行时

- 浏览器：需要支持 ES Modules、importmap、WebGL（建议 Chrome / Edge / Firefox 新版本）
- 渲染：Three.js `0.128.0`（r128）
- 控制：`OrbitControls`（Three.js examples）

### Node.js（仅用于本地静态服务器，可选）

来自 `package.json`：

- `dependencies`
  - `three`: `^0.128.0`
- `devDependencies`
  - `http-server`: `^14.1.1`
  - `serve`: `^14.2.0`

说明：

- 默认入口 `index.html` 通过 importmap 指向 CDN 的 `three.module.js` 与 `OrbitControls.js`，因此即使不 `npm install`，只要能启动一个静态服务器也能跑。
- `npm install` 的意义主要是安装本地工具（`http-server`/`serve`）并为未来可能的本地依赖切换做准备。

## 核心入口与执行链路（关键代码入口）

### 推荐入口（模块化版本）

- HTML 入口：`index.html`
  - `<script type="module" src="src/main.js"></script>`
- JS 入口：`src/main.js`
  - `new Simulation()` → `simulation.init()`
- 主控制器：`src/Simulation.js`
  - `init()`：创建场景/相机/渲染器/控制器、网络对象、UI，并初始化粒子与 TC 数量
  - `animate()`：`requestAnimationFrame` 主循环
  - `update()`：调用物理引擎并更新桥接几何
- 物理引擎：`src/physics/UnifiedDynamics.js`
  - `update(sim)`：
    - 计算 Bead/Particle/TC 的力
    - 积分更新位置与速度
    - 尝试成键/解键（A/TC、B/TC）

### 其他入口（用于演示/兼容）

- `index-direct.html`：所有逻辑写在一个 HTML 中，可直接双击运行（`file://`）
- `index-standalone.html`：传统 `<script src>` 串联版本（当前与模块化代码存在不一致，见“注意事项”）

## 参数与“配置”位置

本项目未使用环境变量（未发现 `.env`/`process.env`/`import.meta.env` 等）。可调参数主要集中在以下文件：

- `src/utils/Constants.js`：物理与渲染的关键常量（盒子尺寸、体积分数、结合/释放参数、Langevin 参数等）
- `src/utils/Colors.js`：配色与图例

## 数据文件与静态资源

- 数据文件：无（模拟初始状态由代码随机生成；网络结构由 `Network` 生成）
- 图片/模型/字体等资源：无
- 样式：`styles/main.css`

## 本地启动手册（可一键复现）

以下命令均在 `visualization/aoup_net_vis` 目录下执行。

### 方式 A（推荐）：npm + http-server（固定端口 8080）

```bash
npm install
npm run dev
```

浏览器打开：`http://localhost:8080/`

端口配置：

- `npm run dev` / `npm run start` 固定使用 `8080`（见 `package.json` scripts）

### 方式 B（无需安装依赖）：任意静态服务器 + index.html

```bash
npx http-server -p 8080 -c-1
```

或（若你更偏好 Python）：

```bash
python -m http.server 8080
```

然后打开：`http://localhost:8080/`

### 方式 C（最省事）：直接双击（单文件版本）

直接打开 `index-direct.html`。

适用场景：只想看效果、不想搭服务器。

## 注意事项（复现常见坑）

- `index.html` 为 ES Modules + importmap 方式，通常不建议直接用 `file://` 打开（不同浏览器安全策略可能阻止模块加载）；建议用方式 A/B。
- `index-standalone.html` 引用了 `src/physics/BrownianMotion.js`、`src/physics/RouseDynamics.js`，但当前目录实际只有 `src/physics/UnifiedDynamics.js`，因此 standalone 页面很可能无法正常运行。
- `start.sh` 的注释写了 `./start.sh [port]`，但脚本内部并未读取参数 `$1`，端口实际写死为 `5555`（需要手动修改 `PORT=...` 或改用 `npm run dev/start`）。
- `src/index.js` 中导出 `Bridge`，但 `src/objects/Bridge.js` 实际导出为 `BridgeA` / `BridgeB`；若你把本项目当作库导入，需要留意该不一致。

