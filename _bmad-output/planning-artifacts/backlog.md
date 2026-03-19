---
inputDocuments:
  - prd.md
  - architecture.md
  - epics-and-user-stories.md
  - implementation-tasks.md
workflowType: 'backlog'
project_name: 'skill-hub'
user_name: 'Ray'
date: '2026-03-17'
status: draft
---

# skill-hub Backlog

## 说明

本文档用于记录 `skill-hub` 在当前 MVP 完成后的后续待办项。排序原则如下：

- `P1`：直接增强当前 MVP 的可用性、稳定性或可执行性
- `P2`：扩展能力边界，提升产品完整度
- `P3`：面向发布、生态化和远期能力建设

## 当前基线

当前已完成的 MVP 主线包括：

- canonical source (`skills/`)
- `manifest.json` schema 校验
- discovery / registry / state
- `list / inspect / doctor / sync`
- `codex` / `openclaw` adapter
- 幂等 sync、目标路径冲突检查、`--dry-run`
- 示例 skill、README、边界文档、adapter 开发指南

Backlog 只覆盖“当前还没做”或“当前已做但还不够完整”的部分。

## P1 - 高优先级

### 1. `run` 命令

**目标：** 提供 `skillhub run <skill> --agent <agent>` 能力，形成从“发现与同步”到“触发执行”的闭环。  
**价值：** 让 skill-hub 从管理层进一步进入使用层。  
**当前状态：** 未开始。

### 2. 更严格的兼容性校验

**目标：** 不只是判断 `compatibleAgents`，还要根据 adapter 要求验证文件结构、目标约束和必要资源。  
**价值：** 提前拦截伪兼容 skill，减少运行时失败。  
**当前状态：** 仅有基础兼容判断。

### 3. sync 输出增强

**目标：** 在同步结果中显示更细的 changed files 明细、跳过原因分类和失败上下文。  
**价值：** 提高可解释性和排障效率。  
**当前状态：** 只输出 changed 数量和基础结果摘要。

### 4. 初始化脚手架

**目标：** 提供初始化命令或脚本，自动创建 `skills/`、`registry/`、`state/`、`templates/` 等基础结构。  
**价值：** 降低新仓库接入成本。  
**当前状态：** 目录是手工建立的。

### 5. registry 自动更新策略

**目标：** 在 `list / inspect / doctor / sync` 前自动重建 registry，避免用户手工维护索引。  
**价值：** 降低“状态不同步”的认知负担。  
**当前状态：** registry 已可重建，但尚未自动接入主流程。

## P2 - 中优先级

### 6. 新 skill 创建模板命令

**目标：** 提供如 `skillhub init-skill <name>` 的能力。  
**价值：** 降低新 skill 创建成本，减少 manifest 格式错误。  
**当前状态：** 仅有 `templates/manifest.json`。

### 7. 更多 adapter

**目标：** 扩展到更多 Agent。  
**建议顺序：**

- `opencode`
- `claude-code`
- `kiro`

**价值：** 扩大 skill-hub 的实际复用范围。  
**当前状态：** 已完成 `codex`、`openclaw`。

### 8. 更强的 doctor

**目标：** 检查陈旧安装、坏链接、未注册但已存在的目标目录、目标内容漂移等。  
**价值：** 让 doctor 成为真正的运维和排障入口。  
**当前状态：** 主要覆盖基础目录、manifest、agent、路径冲突。

### 9. 幂等同步增强

**目标：** 区分“内容未变”“配置未变”“目标已漂移”“历史状态不一致”等不同 skipped 原因。  
**价值：** 提高 sync 诊断精度。  
**当前状态：** 仅支持 no-change skip。

### 10. 冲突处理策略

**目标：** 不仅发现冲突，还提供修复建议，必要时支持用户选择策略。  
**价值：** 把“报错终止”升级为“可恢复工作流”。  
**当前状态：** 仅检测并阻止冲突。

## P3 - 低优先级 / 中长期

### 11. 发布流程

**目标：** 增加版本号管理、changelog、发布前检查与打包流程。  
**价值：** 让项目从内部 MVP 走向可发布版本。  
**当前状态：** 未开始。

### 12. import / export

**目标：** 支持从已有 skill 目录导入 canonical source，或导出为 bundle。  
**价值：** 降低迁移成本，提升跨机器/跨仓库使用体验。  
**当前状态：** 未开始。

### 13. adapter SDK

**目标：** 把新增 adapter 的流程做成更清晰的 SDK 或模板。  
**价值：** 降低生态扩展门槛。  
**当前状态：** 已有开发指南，但还不是 SDK。

### 14. 远程接口

**目标：** 提供 MCP、HTTP API、daemon 等远程调用方式。  
**价值：** 支持更复杂的系统集成。  
**当前状态：** 按架构决策刻意后置。

### 15. 多机或团队共享

**目标：** 支持 bundle、共享仓库、团队级分发。  
**价值：** 从个人本地工具扩展到团队协作场景。  
**当前状态：** 未开始。

## 工程质量类 Backlog

### 16. 命令层测试补强

**目标：** 增加 `commands/*` 与 CLI 端到端测试。  
**价值：** 提高命令行为稳定性。  
**当前状态：** 目前以 core 层测试为主。

### 17. 覆盖率与质量门禁

**目标：** 增加覆盖率统计、最低门槛和失败阻断机制。  
**价值：** 控制回归风险。  
**当前状态：** 未配置。

### 18. lint / format / CI

**目标：** 增加 lint、format、CI。  
**价值：** 提升协作质量，减少风格和构建漂移。  
**当前状态：** 未配置。

### 19. FAQ 与用户文档补强

**目标：** 在 README 基础上补充常见问题、故障排查和新增 skill 流程说明。  
**价值：** 降低使用门槛。  
**当前状态：** README 已有基础使用说明。

### 20. LSP 级静态诊断能力

**目标：** 在开发环境安装 `typescript-language-server`，补齐 LSP diagnostics 工作流。  
**价值：** 补强更细粒度的静态反馈。  
**当前状态：** 当前环境未安装 LSP server。

## 建议的下一阶段优先顺序

我建议的下一阶段执行顺序：

1. `skillhub init-skill <name>`
2. `run` 命令
3. registry 自动更新策略
4. doctor 对陈旧安装和坏链接的增强检查
5. 新增一个高价值 adapter（建议 `opencode` 或 `claude-code`）

## 结论

当前 `skill-hub` 已经完成 MVP 主线，backlog 的重点不再是“补大洞”，而是把项目从“可运行的本地工具 MVP”继续推进到“更完整、更稳定、更易扩展的 v0.2 / v0.3 产品”。
