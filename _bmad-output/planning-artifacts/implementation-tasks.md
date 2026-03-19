---
inputDocuments:
  - prd.md
  - architecture.md
  - epics-and-user-stories.md
workflowType: 'implementation-tasks'
project_name: 'skill-hub'
user_name: 'Ray'
date: '2026-03-17'
status: draft
---

# skill-hub Implementation Tasks

## 说明

本文档把 `_bmad-output/planning-artifacts/epics-and-user-stories.md` 继续细化为可直接开发的 implementation tasks。任务拆分原则：

- 每个任务都尽量对应一个明确代码改动或一个可验证的交付结果
- 每个任务都标明依赖、建议产出和完成定义
- 默认按 MVP 顺序组织
- 优先覆盖 Epic 1-4，Epic 5 作为增强项单列

## MVP 开发顺序

推荐主顺序：

1. 建项目骨架与基础类型
2. 完成 canonical skill 与 manifest 解析
3. 完成 registry / agent config / state 持久化
4. 完成 list / inspect / doctor
5. 完成 adapter contract 与 sync orchestration
6. 完成 Codex / OpenClaw adapter
7. 完成 sync 命令端到端

---

## Epic 1 Implementation Tasks

### Story 1.1：定义 canonical skill 目录规范

#### Task 1.1.1：建立项目目录骨架

- **目标：** 在仓库中建立 `src/`、`skills/`、`registry/`、`state/`、`templates/` 的基础目录结构
- **建议产出：** 基础文件夹、占位 README 或 `.gitkeep`
- **依赖：** 无
- **完成定义：** 项目目录结构与架构文档中的建议结构保持一致

#### Task 1.1.2：编写 canonical skill 目录规范文档

- **目标：** 明确 `skills/<name>/` 的目录规则和最小文件要求
- **建议产出：** `README.md` 或 `docs/skills-format.md`
- **依赖：** Task 1.1.1
- **完成定义：** 文档说明 `SKILL.md`、`manifest.json`、可选 `scripts/`、`resources/` 的作用与规则

#### Task 1.1.3：提供示例 skill 目录

- **目标：** 提供一个最小演示 skill 用于开发和测试扫描逻辑
- **建议产出：** `skills/example-skill/`
- **依赖：** Task 1.1.2
- **完成定义：** 示例 skill 结构合法，能被后续扫描器识别

### Story 1.2：定义 `SkillManifest` 最小字段集合

#### Task 1.2.1：定义 `SkillManifest` TypeScript 类型

- **目标：** 在 `src/types/skill.ts` 中定义 manifest 相关类型
- **建议产出：** `SkillManifest`、`SkillDescriptor`、校验结果类型
- **依赖：** Story 1.1 完成
- **完成定义：** 类型覆盖 MVP 必需字段和基础校验结果结构

#### Task 1.2.2：实现 manifest schema 校验器

- **目标：** 在 `src/core/manifest.ts` 中实现 manifest 解析和字段校验
- **建议产出：** `loadManifest()`、`validateManifest()`
- **依赖：** Task 1.2.1
- **完成定义：** 能识别缺字段、类型错误、空值和非法 entry

#### Task 1.2.3：提供 `templates/manifest.json`

- **目标：** 提供一个标准模板，支持后续新 skill 创建
- **建议产出：** `templates/manifest.json`
- **依赖：** Task 1.2.2
- **完成定义：** 模板字段与 `SkillManifest` 一致

### Story 1.3：实现 skill 扫描能力

#### Task 1.3.1：实现工作区路径解析

- **目标：** 在 `src/core/paths.ts` 中统一解析 `skills/`、`registry/`、`state/` 等工作区路径
- **建议产出：** `resolveWorkspacePaths()`
- **依赖：** Task 1.1.1
- **完成定义：** 路径解析不依赖硬编码相对路径分散在各模块中

#### Task 1.3.2：实现 skill 目录扫描器

- **目标：** 扫描 `skills/` 根目录并返回候选 skill 文件夹
- **建议产出：** `scanSkillDirectories()`
- **依赖：** Task 1.3.1
- **完成定义：** 可以过滤掉非目录项和明显非法目录

#### Task 1.3.3：实现扫描结果与 manifest 加载对接

- **目标：** 将目录扫描与 manifest 读取串起来，形成初版 skill 描述对象
- **建议产出：** `discoverSkills()`
- **依赖：** Task 1.3.2、Task 1.2.2
- **完成定义：** 能返回合法/非法候选 skill 的统一结果集合

### Story 1.4：实现 manifest 加载与校验

#### Task 1.4.1：补充 entry 文件存在性校验

- **目标：** 除字段校验外，还要检查 manifest 中声明的 `entry` 是否真实存在
- **建议产出：** `validateSkillEntry()`
- **依赖：** Task 1.3.3
- **完成定义：** 缺失 `SKILL.md` 或 entry 指向错误时返回明确错误

#### Task 1.4.2：定义统一校验错误结构

- **目标：** 统一 manifest、entry、目录扫描相关错误格式
- **建议产出：** `ValidationIssue` 类型和 formatter
- **依赖：** Task 1.4.1
- **完成定义：** 错误信息可以被 list / inspect / doctor 复用

### Story 1.5：生成 skill 源摘要模型

#### Task 1.5.1：定义 `SkillDescriptor` 结构

- **目标：** 定义后续 registry、CLI、adapter 都可消费的统一 skill 摘要对象
- **建议产出：** `SkillDescriptor` 类型
- **依赖：** Task 1.4.2
- **完成定义：** 至少包含路径、manifest、校验状态、entry 和兼容 agent 信息

#### Task 1.5.2：实现摘要构建器

- **目标：** 从扫描与校验结果生成统一摘要对象
- **建议产出：** `buildSkillDescriptor()`
- **依赖：** Task 1.5.1
- **完成定义：** registry 与 CLI 不需要再重新读目录和手写拼装逻辑

---

## Epic 2 Implementation Tasks

### Story 2.1：实现 registry 索引生成

#### Task 2.1.1：定义 registry 文件结构

- **目标：** 确定 `registry/index.json` 的字段结构
- **建议产出：** registry 类型定义与样例 JSON
- **依赖：** Epic 1 完成
- **完成定义：** 字段与 PRD/架构文档保持一致

#### Task 2.1.2：实现 registry 构建器

- **目标：** 根据 `SkillDescriptor` 集合构建 registry 索引
- **建议产出：** `buildRegistryIndex()`
- **依赖：** Task 2.1.1
- **完成定义：** 输出稳定、可重复生成

#### Task 2.1.3：实现 registry 持久化

- **目标：** 把 registry 写入 `registry/index.json`
- **建议产出：** `saveRegistryIndex()`
- **依赖：** Task 2.1.2
- **完成定义：** 写入成功且不会破坏已有无关文件

### Story 2.2：定义 agent 配置模型

#### Task 2.2.1：定义 `AgentDefinition` 类型

- **目标：** 在 `src/types/agent.ts` 中定义 agent 配置结构
- **建议产出：** `AgentDefinition` 类型
- **依赖：** Task 2.1.1
- **完成定义：** 至少覆盖 `agentName`、`adapterName`、`defaultInstallPath`、`syncMode`

#### Task 2.2.2：提供 `registry/agents.json` 初始配置

- **目标：** 为 Codex 和 OpenClaw 写出初版 agent 配置
- **建议产出：** `registry/agents.json`
- **依赖：** Task 2.2.1
- **完成定义：** 能被后续 adapter 解析使用

#### Task 2.2.3：实现 agent 配置加载器

- **目标：** 加载 agent 定义并提供查询接口
- **建议产出：** `loadAgentDefinitions()`、`getAgentDefinition()`
- **依赖：** Task 2.2.2
- **完成定义：** sync 和 doctor 可以基于统一接口取 agent 配置

### Story 2.3：实现 install state 持久化

#### Task 2.3.1：定义 `InstallRecord` 类型

- **目标：** 明确安装状态记录结构
- **建议产出：** `InstallRecord`
- **依赖：** Task 2.2.3
- **完成定义：** 字段覆盖 skill-agent-targetPath-version-hash-status

#### Task 2.3.2：实现 install state 读写器

- **目标：** 读取和更新 `state/installs.json`
- **建议产出：** `loadInstallState()`、`saveInstallState()`、`upsertInstallRecord()`
- **依赖：** Task 2.3.1
- **完成定义：** 支持更新单条记录而不丢失其他状态

### Story 2.4：实现 sync history 持久化

#### Task 2.4.1：定义 `SyncHistoryRecord` 类型

- **目标：** 明确同步历史结构
- **建议产出：** `SyncHistoryRecord`
- **依赖：** Task 2.3.2
- **完成定义：** 字段覆盖时间、agent、result、errorMessage、changedFiles

#### Task 2.4.2：实现 sync history 读写器

- **目标：** 维护 `state/sync-history.json`
- **建议产出：** `appendSyncHistory()`、`loadSyncHistory()`
- **依赖：** Task 2.4.1
- **完成定义：** 成功和失败同步均可被记录

### Story 2.5：实现 registry 与 state 的重建边界

#### Task 2.5.1：实现“从 source 重建 registry”流程

- **目标：** 提供一条可以从 canonical skills 重新生成 registry 的逻辑路径
- **建议产出：** `rebuildRegistryFromSource()`
- **依赖：** Task 2.1.3
- **完成定义：** 删除旧 registry 后仍可恢复索引

#### Task 2.5.2：文档化 source / registry / state 边界

- **目标：** 明确三者职责，减少后续设计漂移
- **建议产出：** README 或 docs 中的边界说明
- **依赖：** Task 2.5.1
- **完成定义：** 文档明确指出 canonical source 是唯一源事实

---

## Epic 3 Implementation Tasks

### Story 3.1：实现 `skillhub list`

#### Task 3.1.1：实现 list 应用服务

- **目标：** 组合 registry、descriptor、install state 生成列表视图模型
- **建议产出：** `listManagedSkills()`
- **依赖：** Epic 2 完成
- **完成定义：** 返回适合 CLI 展示的列表对象

#### Task 3.1.2：实现 `src/commands/list.ts`

- **目标：** 暴露 `skillhub list` 命令
- **建议产出：** 命令处理器
- **依赖：** Task 3.1.1
- **完成定义：** 命令输出名称、版本、兼容 Agent、校验状态、同步状态

### Story 3.2：实现 `skillhub inspect <skill>`

#### Task 3.2.1：实现 inspect 应用服务

- **目标：** 根据 skill 名称组装详细视图模型
- **建议产出：** `inspectSkill()`
- **依赖：** Task 3.1.1
- **完成定义：** 返回路径、entry、tags、triggers、compatibleAgents、当前安装状态和问题列表

#### Task 3.2.2：实现 `src/commands/inspect.ts`

- **目标：** 暴露 `skillhub inspect <skill>` 命令
- **建议产出：** 命令处理器
- **依赖：** Task 3.2.1
- **完成定义：** 缺失 skill 时返回明确错误和非零退出码

### Story 3.3：实现 `skillhub doctor`

#### Task 3.3.1：实现 doctor 检查项框架

- **目标：** 建立一组可扩展的 health checks
- **建议产出：** `runDoctorChecks()` 和 check result 类型
- **依赖：** Epic 2 完成
- **完成定义：** 可挂载 skills、registry、state、agent 配置、目标路径检查项

#### Task 3.3.2：实现 manifest / entry / path 相关检查

- **目标：** 覆盖 MVP 最核心问题检查
- **建议产出：** 一组 doctor check 实现
- **依赖：** Task 3.3.1
- **完成定义：** 至少能检测 manifest 错误、entry 缺失、adapter 缺失、路径不可写、路径冲突

#### Task 3.3.3：实现 `src/commands/doctor.ts`

- **目标：** 暴露 `skillhub doctor` 命令
- **建议产出：** 命令处理器
- **依赖：** Task 3.3.2
- **完成定义：** 输出 actionable diagnostics，不执行破坏性改动

### Story 3.4：统一 CLI 输出与退出码规范

#### Task 3.4.1：定义 CLI 输出 formatter

- **目标：** 统一 success / warning / error 的输出样式
- **建议产出：** `src/utils/logger.ts` 或 formatter 模块
- **依赖：** Story 3.1、3.2、3.3 基本完成
- **完成定义：** list / inspect / doctor / sync 可共用同一风格

#### Task 3.4.2：定义退出码约定

- **目标：** 为各命令定义退出码规范
- **建议产出：** 常量或文档说明
- **依赖：** Task 3.4.1
- **完成定义：** 成功、警告、失败有可复用退出码定义

---

## Epic 4 Implementation Tasks

### Story 4.1：定义 adapter contract

#### Task 4.1.1：实现 `src/adapters/base.ts`

- **目标：** 定义统一 `AgentAdapter` 接口和关联类型
- **建议产出：** `AgentAdapter`、`AdapterContext`、`SyncInput`、`SyncResult`
- **依赖：** Epic 2 完成
- **完成定义：** contract 能支持 Codex 与 OpenClaw 的首发差异

#### Task 4.1.2：实现 adapter 注册表

- **目标：** 用统一入口管理可用 adapter
- **建议产出：** `src/adapters/index.ts`
- **依赖：** Task 4.1.1
- **完成定义：** sync 服务可根据 agentName / adapterName 找到对应实现

### Story 4.2：实现 sync 服务编排逻辑

#### Task 4.2.1：实现 sync preflight 校验

- **目标：** 在真正同步前检查兼容性、路径、源状态
- **建议产出：** `runSyncPreflight()`
- **依赖：** Task 4.1.2
- **完成定义：** 不兼容 skill 会被跳过并返回原因

#### Task 4.2.2：实现 sync orchestration service

- **目标：** 统一串联 adapter 选择、preflight、sync、state 更新
- **建议产出：** `executeSync()`
- **依赖：** Task 4.2.1
- **完成定义：** 统一返回成功/跳过/失败汇总

### Story 4.3：实现 Codex adapter

#### Task 4.3.1：确认 Codex 默认目标路径与安装规则

- **目标：** 把 Codex 所需目录、同步模式固化为 adapter 规则
- **建议产出：** `codex.ts` 中的 path resolver
- **依赖：** Task 4.1.2
- **完成定义：** 可解析默认安装路径并返回同步目标

#### Task 4.3.2：实现 Codex 同步逻辑

- **目标：** 把合法 skill 同步到 Codex 目标目录
- **建议产出：** `CodexAdapter.sync()`
- **依赖：** Task 4.3.1、Task 4.2.2
- **完成定义：** 成功同步后目标目录可消费，失败时不破坏源目录

### Story 4.4：实现 OpenClaw adapter

#### Task 4.4.1：确认 OpenClaw 默认目标路径与安装规则

- **目标：** 固化 OpenClaw 的 adapter 路径与同步规则
- **建议产出：** `openclaw.ts` 中的 path resolver
- **依赖：** Task 4.1.2
- **完成定义：** 能稳定解析默认安装路径

#### Task 4.4.2：实现 OpenClaw 同步逻辑

- **目标：** 把合法 skill 同步到 OpenClaw 目标目录
- **建议产出：** `OpenClawAdapter.sync()`
- **依赖：** Task 4.4.1、Task 4.2.2
- **完成定义：** 成功同步后目标目录可消费，失败时不破坏源目录

### Story 4.5：实现 `skillhub sync --agent <agent>`

#### Task 4.5.1：实现 `src/commands/sync.ts`

- **目标：** 暴露 `skillhub sync --agent <agent>` 命令
- **建议产出：** 命令处理器
- **依赖：** Story 4.2、4.3、4.4 基本完成
- **完成定义：** 可以选择合法 agent 并输出成功、跳过、失败汇总

#### Task 4.5.2：把 sync 结果写入 install state 与 sync history

- **目标：** 在 sync 命令端到端流程中补齐状态记录
- **建议产出：** state/history 更新集成逻辑
- **依赖：** Task 4.5.1
- **完成定义：** 同步后 inspect 与 doctor 能看到最新状态

---

## Epic 5 Implementation Tasks

### Story 5.1：实现同步幂等性检查

#### Task 5.1.1：实现 sourceHash 计算

- **目标：** 基于 skill 内容生成稳定 hash
- **建议产出：** `src/utils/hash.ts`
- **依赖：** Epic 4 完成
- **完成定义：** 同一 skill 未变化时 hash 稳定

#### Task 5.1.2：在 sync 流程中加入“无变化跳过”判断

- **目标：** 减少重复写入
- **建议产出：** sync preflight / orchestration 增强
- **依赖：** Task 5.1.1
- **完成定义：** sync 汇总区分 skipped-no-change 与 actual-updated

### Story 5.2：增强路径冲突与目标目录安全检查

#### Task 5.2.1：实现目标目录冲突检测

- **目标：** 识别目标路径被占用、不可写或不安全情况
- **建议产出：** conflict check 模块
- **依赖：** Epic 4 完成
- **完成定义：** 冲突在真正写入前被发现并阻止危险同步

### Story 5.3：为 sync 增加 dry-run 或等价预览能力

#### Task 5.3.1：为 sync 增加 dry-run 参数通道

- **目标：** 允许用户只预览变更，不执行写入
- **建议产出：** CLI 参数与 sync service 参数扩展
- **依赖：** Task 5.1.2、Task 5.2.1
- **完成定义：** dry-run 不写文件，但输出与真实 sync 的 preflight 结果一致

### Story 5.4：为新 adapter 接入定义最小开发流程

#### Task 5.4.1：编写 adapter 开发指南

- **目标：** 让新 Agent 接入可以复制已有模式
- **建议产出：** `docs/adapter-development.md`
- **依赖：** Epic 4 完成
- **完成定义：** 指南至少包含 contract、agent 配置、路径解析、sync 逻辑四部分

---

## 建议的第一批可开发任务包

如果要最小步快跑，我建议第一批只做这些任务：

- Task 1.1.1
- Task 1.2.1
- Task 1.2.2
- Task 1.3.1
- Task 1.3.2
- Task 1.3.3
- Task 1.4.1
- Task 1.5.1
- Task 1.5.2
- Task 2.1.1
- Task 2.1.2

这一批完成后，你就会得到：

- 项目骨架
- manifest schema
- skills 扫描器
- 校验能力
- 初版 registry 生成链路

也就是一个真正能开始“看见本地 skills”的 MVP 起点。

## 每个任务的统一完成定义

每个 implementation task 在实际开发时建议统一满足以下 DoD：

- 对应模块代码已落地
- 有最基本的单元测试或可验证脚本
- 错误路径被至少验证一次
- 输出与文档定义一致
- 不破坏 canonical source 语义
- 与 PRD / 架构 / stories 保持追踪关系

## 结论

这份文档把 `epics-and-user-stories.md` 继续压缩成更接近“开始写代码”的粒度。你现在已经有了：产品目标、架构边界、Epic、Story、以及可直接执行的 implementation tasks。接下来最自然的动作，就是按“第一批可开发任务包”开始真正落代码。
