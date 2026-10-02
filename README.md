# 轨道交通驾驶模拟人机交互显示屏（纯前端）

两套驾驶室 HMI 的纯前端复刻：**地铁模式**（DB37 车载人机界面）与**中国标准动车组 CR400 模式**。
无后端、无网络请求，车体数据全部由前端模拟生成。

## 快速开始

```powershell
# 方式一：直接双击（零配置，file:// 下即可运行）
start public\index.html

# 方式二：本地静态服务（与线上行为一致，推荐）
python -m http.server 8000 -d public
# 浏览器打开 http://localhost:8000/
```

`index.html` 是唯一入口，界面通过 hash 路由切换：

| 路由 | 界面 | 模式 | 参考素材 |
|---|---|---|---|
| `#/select` | 启动 / 模式选择页 | — | 自设计（无参考图） |
| `#/metro-door` | 车门状态界面 | 地铁 | `materials/31a2832b-….png`（图一） |
| `#/metro-main` | 运行主界面（25 个主显示区） | 地铁 | `materials/1593313757438339.pdf` |
| `#/cr400-run-bf` | 运行界面（CR400-AF-0003） | 动车组 | `materials/Picture1(1).png`（图二） |
| `#/cr400-brake-af` | 制动界面（CR400-AF-0003） | 动车组 | `materials/Snipaste_2026-05-02_17-54-23.png`（图三） |

> 页面时间一律取**浏览器系统时间**并实时更新；`?freeze=1` 只冻结车体运动，不再冻结时钟。

加 `?freeze=1` 可冻结时间与关键数值（用于与参考图逐像素比对），例如
`public/index.html?freeze=1#/metro-door`。

## 键盘操作

| 按键 | 作用 |
|---|---|
| `W` / `↑` | 牵引 |
| `S` / `↓` | 制动 |
| `1` – `7` | 直接给定制动级位 |
| `空格` | 快速制动 |
| `D` | 开 / 关门（地铁） |
| `M` | 自动演示 ⇄ 键盘手动驾驶 |
| `←` / `→` | 同一模式下切换界面 |
| 鼠标 | 点击参考图中的按钮（音量、门控、主页、维护、模式卡片等） |

## 固定布局与非灵活缩放

界面**不做响应式**：`#stage` 恒为 **1024×768**，窗口变化时只做整体等比缩放
（`scale = min(vw/1024, vh/768)`）并居中，多余部分留黑边。界面内部一律使用绝对定位
（不使用 flex / grid），因此元素不会错位、不会变形。

### 参考图到 1024×768 的映射

各参考图的实际宽高比与 4:3 并不完全一致（图一 1102×768、图二 802×606、
图三 1056×784）。本项目采用**把每张参考图按其自身像素坐标建模、
再整体映射到 1024×768** 的方式：

```css
.md { width: 1102px; height: 768px; transform-origin: 0 0; transform: scale(0.9292196, 1); }
```

可以验证这一映射是**还原**而非拉伸：图一中"主页"圆形按钮在截图中量得 97×90，
而 1024 设计下的正圆应为 90×90 —— 即参考截图本身是 1024×768 设计被横向拉伸到
1102×768 的结果，按上式反算后恢复为正圆。

地铁主界面（`#/metro-main`）的分区与**各区图标**均来自 DB37/XXXX.4-2020：
分区尺寸按 5.2 表1，图标按 5.4 各表的图例，直接从规范 PDF 中提取为图片
（`public/assets/metro-main/`，见下方「开发期校验工具」）。分区在 1024×768 画布上重建：

```
1区 128×95 | 8区 295×95 | 9区 295×95 | 10区 306×95
2区 128×440 | 3区 542×440            （左块 670 宽）
4区 157×88 | 5区 167×88 | 6区 179×88 | 7区 167×88
11–22区 177×88 ×12（右侧两列 354 宽，y 95…623）
23区 216×145 | 24区 439×145 | 25区 369×145
```

配色取自规范 5.3「主要颜色定义推荐值」：黑 `#000c19`、白 `#ffffff`、红 `#bd0000`、
黄 `#fff200`、浅灰 `#d4d4d4`、淡绿 `#2d9033`、橙 `#ea9100`、深蓝 `#2597e6`。

## 字体

只使用系统字体，不引入 webfont：

```css
--font-song: SimSun, "宋体", "Songti SC", "Noto Serif CJK SC", serif;
--font-hei:  SimHei, "黑体", "Heiti SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
```

中文标签用宋体，数字与部分中文用黑体。

## 车体模拟数据

- 地铁：车组号、实时时钟、起终点站、速度(km/h)、总风压力(巴)、线电压(伏)、牵引力(%)、
  车门状态、编组图、10 格车辆状态图标、工况文字。
- CR400：车组号、实时时钟、速度(km/h)、制动级位(0–7 级)、网压(kV)、网流(A)、
  总风管(kPa)、4 组变流器负载(07/05/04/02)、受电弓 06/03、各车厢电制动/空气制动/停放制动。

两种驱动：**自动演示循环**（牵引→巡航→制动→停车→折返）与**键盘手动驾驶**，按 `M` 切换。

## 目录结构

```
public/                     ← Cloudflare Pages 发布根目录（唯一被部署的目录）
├─ index.html               唯一入口：1024×768 舞台 + 路由挂载点
├─ 404.html / favicon.svg
├─ _headers                 缓存与安全响应头
├─ _redirects               深链兜底
├─ styles/                  base.css + 每个界面一份 CSS
├─ assets/metro-main/       从规范 PDF 提取的各区图标（PNG + manifest.js）
└─ src/
   ├─ bus.js  stage.js  router.js
   ├─ sim/    state / auto-driver / manual-driver / loop
   ├─ ui/     icons / widgets / metrodoor-icons.js（参考图 1:1 提取，生成）
   └─ screens/ 每个界面一个模块
materials/                  ← 参考素材（只读，不部署）
tools/                      ← 开发期测量与校验工具（不部署）
```

## 部署到 Cloudflare Pages（Git 集成）

在 Cloudflare 控制台 → Workers & Pages → Create → Pages → Connect to Git，选择
`nekonekos/mmi-webui`，按下表填写：

| 配置项 | 值 |
|---|---|
| Production branch | `main` |
| Framework preset | `None` |
| Build command | 留空 |
| Build output directory | `public` |

之后推送到 `main` 即自动部署。项目没有构建步骤，`public/` 里就是最终产物。

### 针对静态托管的优化

- **体积**：`materials/`（约 5.9 MB 参考图 + 0.8 MB PDF）与 `tools/` 位于 `public/` 之外，
  不会进入部署产物；线上只有 HTML/CSS/JS/SVG，总量在数百 KB 量级。
- **缓存**（`public/_headers`）：`/styles/*`、`/src/*`、`/assets/*`、`/favicon.svg` 使用
  `max-age=31536000, immutable`；`/` 与 `/index.html` 使用 `no-cache`，保证发版即时生效。
  另附 `X-Content-Type-Options`、`Referrer-Policy`、`X-Frame-Options` 与一条 CSP。
- **深链兜底**（`public/_redirects`）：`/* /index.html 200`。
- **请求数**：全部资源本地化（无 CDN、无 webfont）；图标以内联 SVG 复用；
  JS 全部 `defer`，不阻塞首屏。
- **运行期**：只更新发生变化的 DOM 节点；实时时钟独立 1 Hz 计时；`resize` 节流到 rAF；
  缩放只改舞台 `transform`，不触发内部回流。

## 开发期校验工具（`tools/`，不参与部署）

```powershell
cd tools
npm install                        # puppeteer-core（仅开发依赖）
node shoot.js shots metro-door     # 用系统 Chrome 无头截图 1024×768
cd ..
py -3 tools\compare.py materials\...png tools\shots\metro-door.png   # 与参考图逐像素比对
```

- `compare.py`：把参考图映射到 1024×768 后计算 MAE 与最差 32×32 区块
  （加 `--map` 输出分块误差字符热力图）。
- `make_metrodoor_icons.py`：把 `#/metro-door` 参考图里每个按钮/图标区域裁到
  `tools/refs/metrodoor/`，并按行 run-length 提取成 SVG（生成 `src/ui/metrodoor-icons.js`）。
- `extract_zone_icons.py`：按 DB37/XXXX.4-2020 表1 的 25 区规格，从规范 PDF 逐区提取
  5.4 各表的图例图片到 `public/assets/metro-main/`；`gen_mm_manifest_js.py` 再把清单转成
  供页面 `<script>` 引用的 `manifest.js`。
- `ascii.py` / `runs.py` / `probe.py` / `profile.py`：把图渲染成字符画、量墨迹区段、
  量边界与吸色、找横竖线位置 —— 用于取精确坐标。
- `dump_pdf.py` / `fig1_grid.py`：从 PDF 提取文字、坐标、矢量线与图片。
- `node tools/stage-check.js`：在 1024×768 / 1600×900 / 1366×768 / 800×600 / 2560×1080
  等窗口下校验舞台等比缩放与黑边。
- `node tools/zone-check.js`：校验地铁主界面的 25 个显示区是否与规范表1 的分区尺寸一致。
- `node tools/interact-check.js`：交互自检（路由跳转、按钮点击、键盘导航、自动/手动切换、车门联动）。
- `powershell -ExecutionPolicy Bypass -File tools/verify.ps1`：一键跑完全部截图比对 + 舞台校验。

### 当前复刻精度

`compare.py` 把参考图映射到 1024×768 后与截图逐像素相减，输出平均绝对误差 MAE（0–255，越低越好）：

| 界面 | 参考图 | MAE |
|---|---|---|
| `metro-door`（图一） | `materials/31a2832b-….png`（768×535，是 1102×768 原图的降采样） | **3.40** |
| `cr400-run-bf`（图二） | `materials/Picture1(1).png` | **1.23** |
| `cr400-brake-af`（图三） | `materials/Snipaste_2026-05-02_17-54-23.png` | **1.79** |
| `metro-main`（地铁主界面） | 无位图基准，改为按规范表1 逐项校验分区几何（`zone-check.js` 全通过） | — |

> 注：`compare.py` 的 MAE 统计口径为「32×32 分块均值 × 分块占比」后再除以全画面素数，
> 数值约为常见逐像素平均绝对误差的 1/4。改用系统时间后，各界面时间文字区与参考图
> （固定为参考时刻）必然不同；`cr400-brake-af` 按「清晰字体」要求去掉了原先的
> `blur(1px)`，因此与本身偏软的参考图相比 MAE 上升——这两项均属预期残差。

> `metro-door` 若与 1102×768 原图比对，MAE 为 **3.44**；`materials/` 中的副本是它的降采样版
> （两者互相 MAE 1.36），因此上表数值包含了一部分降采样模糊带来的差异。

**残差来源**（均已确认非布局错误）：

1. 参考图是低分辨率截图，经 LANCZOS 归一化后笔画边缘比矢量渲染更柔和，属不可消除项。
2. 参考图使用的字体不在本机字体集中，中文字形骨架与宋体/黑体存在固有差异。
3. 参考图带 ClearType 次像素着色，本渲染为灰度抗锯齿。
4. 动态量（实时时钟、速度等）与参考图中的静态取值不同，比对时构成残差；
   `?freeze=1` 会冻结车体运动，把这一项压到最小。

> 注：`materials/` 只读，请勿修改其中的参考素材。
