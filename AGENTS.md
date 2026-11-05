# AGENTS

开始任何开发、Review、文档、协议或 CI 任务之前，先读：

1. [`docs/Nascent 开发与代码提交规范.md`](docs/Nascent%20开发与代码提交规范.md)
2. [`docs/architecture/产品架构.md`](docs/architecture/产品架构.md)（产品架构权威副本；不要只改飞书。开头写明了 2026-11 硬件变更后哪些章节只作历史参考）
3. 本任务涉及的子目录 README（`protocol/`、`software/app/`、`software/app-android/`、`software/backend/`）
4. 涉及 Web UI、Android、蓝牙、权限或手环：[`docs/implementation/Web与Android共用UI调试检查.md`](docs/implementation/Web与Android共用UI调试检查.md)

现状：硬件是萨福原厂板（配套 App 为轻喃），没有我们的 ESP32，也没有温度、压力、六轴传感器。旧 Nascent 玩具侧板的固件 `hardware/` 和 `datasheets/` 已删除，不要重建。`protocol/` 仍是旧板的 `Nascent-Toy` 协议，拿到萨福协议之前 App 继续用它，届时整体替换。

硬性约束：

- 只改本任务负责的路径，保留他人未提交的修改。
- 使用短分支；不要在 main 上直接开发。
- 改跨端字段只改 `protocol/contract.yaml`，然后运行 `python3 protocol/tools/gen.py`。禁止手改 `protocol/generated/`、`protocol/schemas/`，以及 App / 后端包内的协议副本。
- 设备指令只能走 `sendCommand()` → `Governor`。页面不得直接写 Bluetooth characteristic、WebSocket 或 `NascentNative.send()`。
- 停止永远可发。停机不能由 App、云端或外部 AI 解除：`resume` 不是可投递指令，不要给它加发送入口或「恢复」按钮。
- LLM 不直接出电机指令；Control 只出语义建议，落地必须再过一次 `Governor`。
- 不要把萨福板没有的能力（BOOT 键恢复、温度熔断、传感器判断）写进新的用户文案。设备侧的停止、断连行为以实测为准，结论写进 `docs/architecture/`。
- 架构、分层、安全不变量的结论写进 `docs/architecture/`，飞书只作草稿。
- 不要提交 `.env`、密钥、真实设备 MAC。
- 不要自行合并 PR，除非使用者明确要求。
