# Nascent 开发与代码提交规范

**适用对象：**所有参与 Nascent App、后端、协议、文档和测试的同事。

> 2026-11 起硬件为萨福原厂板，旧 Nascent 玩具侧板的固件 `hardware/` 与 `datasheets/` 已从仓库删除。本文中关于固件、引脚、PlatformIO 的旧规则已经去掉；需要时查 git 历史。

**目标：**让硬件、协议、软件可以并行开发，同时避免三端各写各的字段、互相覆盖代码、形成超大 PR，或把文件提交到错误目录。

每个小任务使用一个短分支，尽早创建 Draft PR；main 始终保持可集成。不要建立个人长期分支、模块长期分支或整个阶段共用分支。

当前运行结构与红线见 [`README.md`](../README.md)。产品架构的权威副本在仓库里：[`docs/architecture/产品架构.md`](architecture/产品架构.md)。飞书可以讨论草稿，不能当作唯一出处。

# 1. 仓库与 AI 入口

GitHub 仓库：[visionary078/nascent-next](https://github.com/visionary078/nascent-next)（旧组织仓库 `Binomial-distribution/nascent` 不再使用）

仓库根目录 `AGENTS.md` 要求 AI 在开发、Review、文档和协议任务开始前阅读本文件，以及任务涉及的子目录 README。

当前**没有**独立的范围校验 Skill。本文件就是协作规范。AI 不会自动提交、推送或合并代码，除非使用者明确授权相应操作。

# 2. 首次拉取和日常更新

**首次拉取：**

```bash
git clone https://github.com/visionary078/nascent-next.git
cd nascent-next
```

**开始新任务前：**

```bash
git switch main
git pull --ff-only
git status --short --branch
```

如果工作区已有未提交修改，不要通过 reset、clean、stash 或覆盖文件来强行更新。先确认这些修改属于谁、是否与本任务相关；不能安全绕开时，及时说明。

# 3. 每个小任务建立一个短分支

分支应对应一个可以独立说明、测试和 Review 的任务，通常在 1—2 天内形成 Draft PR。

| 类型 | 示例 | 适用情况 |
|---|---|---|
| 协议 | `feat/protocol-saffo-gatt` | 改 `contract.yaml`、生成物、GATT / WiFi WebSocket 文档 |
| 软件 | `feat/app-ble-scan` | App 或后端的一块可演示功能 |
| 修复 | `fix/app-reconnect` | 明确且范围较小的问题修复 |
| 文档 | `docs/saffo-stop-behavior` | 决策、实测记录、协作规范 |
| 工程配置 | `chore/ci-node` | 工具链、依赖升级、gitignore |

```bash
git switch -c feat/your-small-task
```

不要使用“某某个人开发分支”“模块长期分支”或 `demo-phase` 共用分支。联调演示使用已经集成的 main；如需固定演示快照，在演示提交上创建 `demo-0.1` 一类标签。

# 4. 文件放置规则

| 路径 | 放置内容 | 注意事项 |
|---|---|---|
| `protocol/` | 三端唯一事实来源：`contract.yaml`、生成器、Schema、链路文档 | 改协议只改契约再跑生成器。禁止手改 `generated/`、`schemas/`，以及投放到 App/后端包内的副本 |
| `software/app/` | 浏览器控制端（FastAPI 托管的静态网站） | A 层不放调强度的控件。发指令只走 `sendCommand()`，不许绕过 `Governor` |
| `software/app-android/` | 同一套 Web UI 的 Android 壳 | 只做 WebView + 原生 GATT 桥。不要在 Kotlin 里重写页面或总督 |
| `software/backend/` | FastAPI 云端 | 云端只给建议，不控制硬件。密钥只进 `secrets/.env`（或本机 `.env`），不进仓库 |
| `docs/` | 协作规范、决策记录 | 确认结论和开放问题应分开记录 |
| `docs/architecture/` | 产品架构（权威副本） | 必须进本仓库。飞书只作讨论草稿，改完要同步回这里再提交 |

`hardware/`（旧 Nascent 玩具侧固件，含已删的 `k10-controller/`）和 `datasheets/` 已在 2026-11 删除。看到旧分支或旧文档引用这些路径，按「它不存在」处理，不要重建。

**跨端字段一律进 `protocol/contract.yaml`。** 不要在 JavaScript 常量和 Python 模型里各抄一份 UUID、档位上限或超时。改完契约后必须：

```bash
cd protocol && python3 tools/gen.py
```

并在同一个提交里带上 `contract.yaml`、`protocol/generated/`、`protocol/schemas/`、`software/app/js/protocol.js`、`software/backend/app/protocol.py` 以及 `protocol/CHANGELOG.md`。

# 5. 架构文档必须放进本仓库

飞书方便讨论，但不进 PR、不进 git 历史、没有仓库权限的同事也打不开。因此：

- **产品架构的权威副本是** [`docs/architecture/产品架构.md`](architecture/产品架构.md)，不是飞书。
- 任何人新增或修改架构、分层、硬件分工、安全不变量、接口契约口径，都必须改仓库里的这份文件（或在 `docs/architecture/` 下新增），并走短分支 + Draft PR。
- 允许先在飞书写草稿，**合并前必须把结论同步进仓库**。只改飞书、不改仓库，等于没改。
- 飞书链接可以写在文档开头当讨论入口，但不能替代仓库文件。过期的飞书内容以仓库为准。
- 接口字段一旦要给三端实现，从架构文档落到 `protocol/contract.yaml`，不要让 Markdown 和契约各写一套。

当前仓库里的架构文档由飞书 [Nascent Love 软硬件设计技术架构文档](https://my.feishu.cn/docx/FggRdEmySofDoGx2WzFc77MznCd) revision 63 归档而来，手绘图在 `docs/architecture/assets/`。之后两边若再改，以仓库这份为协作依据。

# 6. 提交前的标准流程

1. 运行本任务相关的检查（见下表）。涉及协议时必须先跑 `python3 tools/gen.py --check`。
2. 检查全部改动，确认没有混入他人的文件、密钥、本机 MAC、临时文件和超大素材。
3. 只暂存本任务明确负责的路径。
4. 创建一个语义完整的 Commit，推送分支并建立 Draft PR。

```bash
git status --short --branch
git diff --name-status
git diff --check

# 只加入自己负责的具体路径
git add -- path/you-own another/path/you-own
git diff --cached --name-status
git diff --cached

git commit -m "feat: describe the coherent change"
git push -u origin feat/your-small-task
```

禁止在混合工作区中使用 `git add .`、`git add -A` 或 `git commit -am`。

禁止提交：`.env`、私钥、访问令牌、WiFi SSID 与密码、真实设备 MAC、`node_modules`、`.venv/`、构建产物、以及整份拷进来的第三方仓库。

## 各层提交前检查

| 改了什么 | 最少要跑 |
|---|---|
| `protocol/contract.yaml` 或生成器 | `python3 protocol/tools/gen.py --check` |
| `software/app/` | `cd software/app && node tests/run.mjs`；浏览器打开后端托管的网站再点一遍三个底栏入口 |
| `software/app-android/` | `./gradlew assembleDebug`，安装到真机后再连一次设备；没有 SDK 时在 PR 写明未构建 |
| `software/backend/` | `python -m ruff check software/backend/app software/backend/tests` 和 `python -m pytest software/backend/tests -q` |

没有构建环境或真设备时，在 PR 里写明「本机未构建 / 未上真机、请 Reviewer 补跑」，不要假装已经验证过。

涉及 Web UI、Android 原生桥、系统权限或小米手环时，还必须执行
[`Web 与 Android 共用 UI：Bug 修复与权限检查清单`](implementation/Web与Android共用UI调试检查.md)。
共享页面的 Bug 不能只验证浏览器，Android 桥的 Bug 也不能只看 Kotlin 编译通过。

# 7. Pull Request 与评审

开发开始后尽早创建 Draft PR，不必等整块板或整层 App 做完。PR 应说明改了什么、为什么修改、用户或设备影响、验证结果、明确未包含的工作以及需要谁 Review。完成后由相应 Reviewer 确认，再合并 main。

| 改动类型 | 必须 Review 的角色 | 原因 |
|---|---|---|
| `docs/architecture/` 产品架构、分层职责、安全不变量 | 项目负责人 | 全员实现口径；只改飞书不算数 |
| `protocol/contract.yaml`、GATT / WiFi WebSocket 报文、枚举线序 | 项目负责人 | 三端同时失效或静默错位 |
| 安全路径：`governor.js`、`session.js`（`sendCommand`）、`stop` 调用点、`resume`、档位封顶、任何新的连续调档来源 | 项目负责人 | 停机、封顶、远程恢复都是产品红线 |
| 传输层：`ble.js`、`ws.js`、`channel.js`、Android `BleBridge`、断连处理 | 项目负责人 | 影响指令能不能到、断连后会不会停 |
| BLE / WebSocket 鉴权、会话令牌、云端密钥与审核开关 | 项目负责人 | 影响设备被谁控制 |
| 人设 prompt 的安全规则、对外文案、医疗化表述 | 项目负责人 | 文案和算法承诺受产品红线约束 |
| 普通 UI、后端桩、模块内测试、文档 | 模块主责，可邀请其他同事 | 由最熟悉该层的人负责质量 |

项目负责人不需要逐条检查每个 Commit，但需要关注每个 PR，并亲自 Review 上表中的高风险改动。协议和安全相关改动建议在开始实现后尽早建立 Draft PR，以便提前发现方向问题。

# 8. 使用 AI 开发时怎么说

在 Cursor 或其他支持仓库指令的 AI 工具中，可以使用下面的开场说明：

> 请先阅读仓库根目录 AGENTS.md、docs/Nascent 开发与代码提交规范.md，以及 docs/architecture/产品架构.md，再开始本任务。只修改本任务负责的文件，保留其他人的改动；使用短分支。架构结论写进 docs/architecture/，不要只改飞书。改协议只改 protocol/contract.yaml 再运行 python3 protocol/tools/gen.py，禁止手改 generated/ 和投放到 App/后端的协议副本。设备指令只走 sendCommand() → Governor。先创建 Draft PR，不要自行合并。

如果任务涉及协议、安全路径、停机恢复、档位封顶或人设安全规则，还应明确告诉 AI：这是需要项目负责人 Review 的高风险改动。另外要交代清楚一条容易被 AI 「顺手修好」的不变量：`resume` 不是可投递指令，不要给它补发送入口或「恢复」按钮。

# 9. 本规范覆盖到哪里

已经约定：短分支、显式暂存、Draft PR、文件放置、架构文档进仓库、协议生成流程、提交前检查和高风险评审。

尚未具备：自动范围校验器、真机在环测试。CI 配置覆盖 `pytest`、`ruff`、前端 `node tests/run.mjs` 和 `protocol/tools/gen.py --check`；CI 没跑时，按第 6、7 节在本地执行，不要因此跳过 `gen.py --check`。

本规范替代不了真机验证和人工 Review。每个涉及调档或停机路径的任务，最终仍需在真机上确认：停止立刻生效；从 App 发不出恢复；断连后设备停下，重连不会回到原档位。萨福板的具体停止与断连行为，以实测记录为准。

# 10. 适用边界

当前目录规则和红线专用于 Nascent 仓库。其它产品可以立即采用短分支、显式暂存、Draft PR 和高风险评审原则，但不能直接复制本仓库的协议生成流程。

<https://github.com/visionary078/nascent-next>
