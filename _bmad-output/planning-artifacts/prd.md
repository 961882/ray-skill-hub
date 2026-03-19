---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
inputDocuments:
  - conversation-2026-03-17-github-skills-and-skillhub.md
workflowType: 'prd'
documentCounts:
  briefCount: 0
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 0
classification:
  projectType: developer_tooling_cli
  domain: ai-agent-skill-interoperability
  complexity: medium
  projectContext: brownfield
date: '2026-03-17'
projectName: skill-hub
author: Ray
status: complete
---

# 产品需求文档 - skill-hub

**作者：** Ray  
**日期：** 2026-03-17

## 执行摘要

skill-hub 是一个本地跨 Agent 的 skill 管理产品，用来让同一份规范化 skill 包在多个 AI Agent 工具之间被发现、描述、同步和复用。它要解决的核心问题是本地 skill 资产的碎片化：用户已经在本地安装或维护了很多 skill，但不同 Agent 生态对目录结构、元数据格式、加载方式和安装位置有不同要求，导致重复维护、行为不一致，以及在 OpenClaw、Codex、OpenCode、Claude Code、Kiro 等工具之间迁移成本高。

本产品通过四个核心能力解决这一问题：统一的本地 skill 源目录、结构化 registry、面向不同 Agent 的 adapter、以及一个本地 CLI 入口。第一阶段明确不纳入 MCP 和其他远程调用层，重点只做本地 packaging、本地同步、稳定元数据和 adapter 驱动的复用。

目标用户是已经会安装或维护本地 skill 的开发者与高级 AI 工具使用者。他们希望把同一批能力在多个 Agent 工具中复用，用于日常办公和软件开发，而不是在每个工具里重复安装、重复适配、重复排错。产品必须显著降低这类重复劳动，并把 skill 的复用从“文件层复制”升级为“能力层复用”。

## 目标用户模型

### 用户类型 1：Human CLI User

这类用户直接在终端中使用 `skill-hub`。他们关心的是：

- 哪些 skill 已被识别
- 哪些 agent 已安装或缺失
- 为什么某个 skill 无法同步
- 如何安全地 dry-run、repair、run

对这类用户，产品需要提供可读、可排障、按任务流组织的文档和命令输出。

### 用户类型 2：OpenClaw Operator Agent

这类用户不是人，而是 OpenClaw agent 本身。它把 `skill-hub` 当作本地控制面调用，而不是把它当作纯人类命令手册。

对这类用户，产品需要提供：

- 稳定的 `--json` 输出
- 明确的 `exitCode`
- machine-readable `reasonCode`
- 可执行的 `suggestion`
- 非交互、可重放、默认安全的命令语义

这意味着 `skill-hub` 的 CLI 不只是 human interface，也承担 agent-facing local control plane 的职责。

### 这个产品为什么特别

它不是新的 Agent，也不是通用编排平台，而是一个本地 skill 分发与兼容层。它的差异化在于把几个责任明确拆开：

- skill 的规范化存储独立于任何单一 Agent。
- 兼容性处理放在 adapter，而不是写死在 skill 本身。
- CLI 作为本地控制面，避免在 MVP 阶段引入昂贵的 token 消耗型调用层。
- 产品追求的不是“skill 文件完全互通”，而是“skill 能力可互通”。

核心洞察是：不同 Agent 间要做到完全一致的 skill 文件格式并不现实，但通过一个统一的本地 skill registry 加上 per-agent adapter，可以做到可用、稳定、可维护的能力复用。

## 项目分类

- **项目类型：** 面向开发者工具链的本地 CLI 产品
- **领域：** AI Agent skill 互通与本地开发工作流基础设施
- **复杂度：** 中等
- **项目上下文：** 基于现有 `skill-hub` 工作区继续推进的 brownfield 项目

## 成功标准

### 用户成功

- 用户只需注册一次本地 skill，就能在统一 registry 中看到完整且有效的元数据。
- 用户可以通过 CLI 查看 skill 的入口文件、标签、触发词、兼容 Agent 和同步状态，而不需要手动进入目录检查。
- 用户可以通过一条命令把兼容的 skill 同步到 Codex 或 OpenClaw。
- 用户可以通过清晰的校验和 doctor 输出快速发现不兼容 skill、缺失 metadata 或路径错误。
- 用户可以维护一份 canonical skill 副本，而不是为每个 Agent 手工维护一套拷贝。
- OpenClaw agent 可以通过 `--json` 调用 `list / inspect / doctor / sync / run`，而不依赖文本解析。

### 业务成功

- skill-hub 成为该工作流中默认的本地跨 Agent skill 管理入口。
- 产品足够降低手工同步成本，从而支撑继续扩展到更多 adapter。
- MVP 为后续增加更多 adapter、run 流程、远程接口提供稳定基础，而不需要重做核心模型。
- 当前 PRD 足够明确，能够直接支持后续技术架构与实现拆解。

### 技术成功

- 系统能稳定完成本地 skill 扫描、metadata 加载、registry 生成和 adapter 驱动同步。
- adapter 逻辑保持独立，新 Agent 接入不需要重构 canonical skill 包结构。
- 同步操作具备幂等性和状态感知能力，并能持久化 install state 与 sync history。
- CLI 能对 malformed manifest、缺失入口文件、不支持的 adapter、路径冲突等问题给出可执行的错误提示。
- CLI 与 JSON contract 使用同一套 core 能力，避免 human path 与 agent path 分叉。

### 可衡量结果

- 用户能在首个版本中成功运行 `skillhub list`、`skillhub inspect <skill>`、`skillhub sync --agent <agent>`。
- MVP 至少完整支持 `codex` 和 `openclaw` 两个 adapter。
- 同一 skill 源文件更新后，用户可以重新同步，而无需手动清理旧副本。
- registry 与 install state 可以稳定地由 canonical `skills/` 源目录和本地状态文件推导重建。
- OpenClaw agent 可以稳定消费 `--json` 返回的 `status / exitCode / output / data` envelope。

## 产品范围

### MVP - 最小可行产品

- 统一的 canonical `skills/` 源目录
- 每个 skill 通过 `manifest.json` 提供结构化 metadata
- registry 索引与 agent 配置记录
- `codex` adapter
- `openclaw` adapter
- CLI 命令：`list`、`inspect`、`sync`、`doctor`
- install state 和 sync history 的本地持久化
- adapter 所需的 copy / symlink / transform 同步能力

### Growth Features（MVP 之后）

- 扩展到 OpenCode、Claude Code、Kiro 等更多 adapter
- `skillhub run <skill> --agent <agent>` 执行能力
- 更丰富的兼容性诊断和冲突处理机制
- 新 skill 的模板生成能力
- legacy skill 格式的 import / export 工作流

### Vision（未来阶段）

- 在 CLI 之上增加可选的 MCP、daemon、HTTP API 或其他远程调用层
- 面向社区的 adapter SDK
- 更高级的兼容性策略与能力映射机制
- 面向多机器或团队协作的发布与共享流程

## 用户旅程

### 旅程 1：跨 Agent 重度用户接管现有本地 skills

Ray 已经在本地维护了一批 skills，但每个 Agent 工具都要单独安装和调整。他把 canonical skills 收拢到统一目录，运行 `skillhub list` 确认识别结果，再把某个 GitHub 搜索 skill 一次性同步到 Codex 和 OpenClaw。关键价值时刻是：同一份源 skill 可以被多个工具消费，而不需要手工复制文件和重复改配置。

### 旅程 2：用户更新 skill 后安全重同步

Ray 修改了某个 canonical skill 的 `SKILL.md` 或 metadata，希望下游 Agent 都能跟上。他再次运行 `skillhub sync --agent codex`。skill-hub 会比较当前状态，只更新变化部分，记录新的同步状态，并报告是否成功。关键价值时刻是：用户清楚知道哪份 skill 是最新源头，下游更新过程可预测、可追踪。

### 旅程 3：用户排查损坏或不兼容的 skill

Ray 新增了一个 skill 文件夹，但忘了写 `manifest.json` 中的关键字段。`skillhub doctor` 或 `skillhub inspect` 能直接指出问题，例如缺失 metadata、入口路径无效、兼容 Agent 未声明等。关键价值时刻是：问题在 hub 层就被发现，而不是等到某个 Agent 静默失败时再倒查。

### 旅程 4：维护者新增一个 Agent adapter

高级用户想让系统支持 OpenCode。他按照统一 adapter 接口新增实现，配置目标目录和同步规则，复用现有 registry 和 manifest 模型。关键价值时刻是：新 Agent 的接入不需要改 skill 包结构，也不需要推翻已有 CLI 和 registry 设计。

### 旅程 5：OpenClaw agent 作为操作者调用本地控制面

OpenClaw 不是同步目标，而是 skill-hub 的使用者。它先执行 `skillhub doctor --json` 确认工作区健康，再执行 `skillhub inspect <skill> --json` 获取结构化 metadata，必要时用 `skillhub sync --agent openclaw --skill <skill> --dry-run --json` 预览写操作。关键价值时刻是：agent 不需要解析面向人类的文本说明，而是直接基于结构化 contract 做决策。

### 旅程要求总结

这些旅程共同揭示了产品所需的能力域：skill 发现、metadata 校验、registry 管理、adapter 分发、状态追踪、问题诊断和可扩展的 Agent 集成。

## 领域特定要求

该产品属于中等复杂度的开发者工具领域，不处于强监管行业。领域层面的关键关注点不是合规审计，而是互通一致性、本地文件系统安全、兼容性透明度和长期可维护性。

### 技术约束

- 产品必须围绕本地文件系统中的 skill 包工作。
- 产品必须容忍不同 Agent 在目录约定和 metadata 期待上的差异。
- MVP 不能把 token 消耗高、网络依赖强的远程调用层作为主路径。

### 集成要求

- 系统必须能与各 Agent 的本地 skill 目录集成。
- 系统必须支持 adapter 决定具体同步策略，例如复制、软链接或转换。
- 系统必须记录 skill 与 agent 维度的安装状态和兼容声明。

### 风险缓解

- 通过强校验与 doctor 输出防止静默同步失败。
- 通过统一 manifest schema 防止 metadata 漂移。
- 通过共享 adapter contract 防止 adapter 体系失控生长。

## 开发者工具特定要求

### 项目类型概述

skill-hub 是一个以 CLI 为中心的本地开发者工具产品，定位是 skill 包管理与兼容层，而不是 Agent 运行时本身。它负责发现、验证、索引、同步和状态管理，不负责替代各 Agent 的执行模型。

### 技术架构考量

- 核心领域模型必须明确区分 canonical skill source、registry metadata、adapter configuration 和 install state。
- CLI 层保持尽量薄，只负责参数入口和结果输出，核心逻辑下沉到 core 模块。
- adapter 封装目标 Agent 的路径解析和同步规则。
- registry 的生成必须对 canonical 源目录和本地状态具有确定性。

### 实现考量

- 产品应优先使用 TypeScript 实现，以获得较好的 CLI 开发体验和 adapter 可维护性。
- 路径处理必须显式设计，虽然当前环境以 macOS 为主，但不应把路径逻辑写死。
- 第一阶段不依赖远程服务、daemon 或网络同步。
- 错误信息必须适合高级用户直接排障，输出要可执行、可定位、少废话。

## 项目范围与分阶段开发

### MVP 策略与哲学

**MVP 方式：** 以“解决重复维护问题”为核心的问题导向型 MVP。  
**资源要求：** 如果保持 adapter-first 且首批目标只做两个 Agent，一个主要维护者即可完成 MVP。

### MVP 功能集合（Phase 1）

**需要覆盖的核心用户旅程：**

- 发现并纳管 canonical local skills
- 查看 metadata 与兼容性
- 同步到 Codex
- 同步到 OpenClaw
- 诊断 malformed 或不兼容 skill

**必须具备的能力：**

- canonical `skills/` 源目录
- manifest 加载与校验
- registry 索引生成
- agent 配置加载
- adapter 接口与两个首发 adapter 实现
- install state 持久化
- sync history 持久化
- CLI 入口与四个 MVP 命令

### Post-MVP 功能

**Phase 2（MVP 之后）：**

- 更多 adapter
- 更丰富的兼容规则
- `run` 命令
- legacy import / export 支持
- 更好的冲突处理与 dry-run 输出

**Phase 3（扩展阶段）：**

- 远程或 transport-based 执行层
- adapter / plugin SDK
- 发布与共享工作流
- 更广的生态支持

### 风险缓解策略

**技术风险：** adapter 抽象可能过弱或过强。缓解方式：尽早定义最小 adapter contract，并用两个差异明显的 Agent 做验证。  
**市场风险：** 问题场景可能主要集中在多 Agent 重度用户。缓解方式：先服务真实内部工作流，验证同步复用是否显著降低摩擦。  
**资源风险：** 过早支持太多 Agent 会稀释质量。缓解方式：首发严格限制在两个 adapter，并推迟执行层与运行时能力。

## 功能需求

### Skill 源管理

- FR1：用户可以在统一的本地 `skills/` 目录下存放 canonical skills。
- FR2：用户可以把每个 skill 组织为包含 `SKILL.md`、metadata 和可选 scripts/resources 的自包含目录。
- FR3：系统可以扫描 canonical skill 目录并发现全部有效 skill 文件夹。
- FR4：系统可以忽略不支持或格式损坏的目录，而不污染 registry。

### Metadata 与 Registry

- FR5：用户可以通过 `manifest.json` 为 skill 定义结构化 metadata。
- FR6：系统可以在 skill 被视为可安装之前校验 manifest 必填字段。
- FR7：系统可以生成并维护本地托管 skill 的 registry 索引。
- FR8：系统可以记录 skill 对各 Agent 的兼容性声明。
- FR9：用户可以通过 CLI 查看 skill 的 metadata、兼容性和源路径。

### 基于 Adapter 的分发

- FR10：系统可以通过 adapter 将 canonical skill 映射到某个 Agent 的安装目标。
- FR11：系统可以通过 Codex adapter 把 skill 同步到 Codex。
- FR12：系统可以通过 OpenClaw adapter 把 skill 同步到 OpenClaw。
- FR13：adapter 可以定义目标路径和同步规则。
- FR14：adapter 可以根据目标 Agent 选择复制、软链接或转换策略。
- FR15：当 skill 未声明兼容目标 Agent 时，系统可以拒绝同步并给出原因。

### CLI 操作

- FR16：用户可以通过 `skillhub list` 查看全部托管 skills。
- FR17：用户可以通过 `skillhub inspect <skill>` 查看单个 skill 的详细信息。
- FR18：用户可以通过 `skillhub sync --agent <agent>` 把 skills 同步到指定 Agent。
- FR19：用户可以通过 `skillhub doctor` 执行工作区诊断。
- FR20：CLI 命令可以对成功、警告和失败状态输出可执行的结果信息。
- FR21：所有主要命令都必须支持 `--json`，供 OpenClaw 等 agent 稳定消费。
- FR22：JSON 输出必须包含统一 envelope：`status`、`exitCode`、`output`、`data`。
- FR23：可诊断失败必须尽量提供 machine-readable `reasonCode` 与 `suggestion`。
- FR24：高风险写操作必须保持显式 opt-in，例如 `--repair-conflicts`、`--exec`。

### 状态与诊断

- FR25：系统可以按 skill-agent 维度持久化安装状态。
- FR26：系统可以记录 sync history 以便排障。
- FR27：系统可以发现缺失入口文件、无效 manifest、不支持的 adapter 和路径冲突。
- FR28：系统可以解释某个 skill 为什么无法同步到指定 Agent。
- FR29：系统可以在 skill 源内容更新后对已安装 skill 重新同步。

### 可扩展性

- FR30：开发者可以在不改变 canonical skill 包结构的前提下新增 adapter。
- FR31：系统可以从 registry 配置中加载 agent 定义。
- FR32：adapter 层可以独立于 CLI 命令层演进。
- FR33：系统可以在不替换 registry 模型的前提下支持未来的新命令和新 transport 层。
- FR34：human-facing 文档与 agent-facing contract 必须能独立演进，但共享同一套 core 能力。

## 非功能需求

### 性能

- NFR1：`skillhub list` 在典型本地工作区中的返回时间应低于 2 秒。
- NFR2：`skillhub inspect <skill>` 在合法 skill 上解析 metadata 与状态的时间应低于 2 秒。
- NFR3：同步操作应在单次命令执行内报告进度与最终状态，不依赖后台服务。

### 可靠性

- NFR4：对未变化的源 skill 执行同步时，操作应具备幂等性。
- NFR5：registry 和 state 写入在命令失败时不能留下半写入状态文件。
- NFR6：即使 adapter 同步失败，系统也必须保留 canonical 源 skill 不受破坏。

### 安全性

- NFR7：MVP 必须可以在纯本地环境运行，核心 registry 与 sync 流程不依赖网络访问。
- NFR8：系统在 `list`、`inspect` 或校验流程中不得执行任意 skill 脚本。
- NFR9：系统的文件操作必须限制在配置好的工作区和 adapter 目标路径内。

### 可扩展性

- NFR10：架构必须支持增加新 adapter，而不需要重做 registry 或 canonical manifest 模型。
- NFR11：registry 模型应支持数十个本地 skills 和多个 Agent 目标，而不改变命令语义。

### 集成性

- NFR12：adapter 配置必须以机器可读格式定义安装目标和同步行为。
- NFR13：系统必须通过 adapter 封装来处理不同 Agent 的文件系统约定，而不是在 core 中写大量分支。
- NFR14：agent 调用路径必须非交互、可重放、可脚本化。

### 可维护性

- NFR15：core logic、adapter logic 和 command logic 必须保持模块边界清晰。
- NFR16：错误输出必须明确指出失败的 skill、失败的 agent，以及失败的校验或同步原因。
- NFR17：human renderer 与 JSON renderer 必须建立在同一套结果结构之上，避免双实现漂移。
