# 对话记录：GitHub Skills 调研与 Skill Hub 架构

日期：2026-03-17

## 用户

openclaw 的和 github 有关的 skill 有哪些？我希望能够用在 codex 上面

## 助手

和 GitHub 相关、而且对 Codex 有实际用途的，我看下来主要是这几类：

1. `skill-installer`
用途：从 GitHub 仓库安装 Codex skill，包含公开仓库和私有仓库路径。
适合场景：你看到一个 GitHub 上的 skill，想直接装进 Codex。
说明：这是 Codex 自带系统 skill，最直接、最匹配你的需求。

2. `skill-vetter`
用途：在安装来自 GitHub 的 skill 之前做安全审查。
适合场景：你想把第三方 GitHub skill 装到 Codex，但先检查有没有高风险权限、可疑命令、typosquat。
说明：强烈建议和 `skill-installer` 配套用。

3. `agent-reach`
用途：通过 `gh` CLI 搜 GitHub repo、看 repo、搜 code、看 issue。
适合场景：研究 GitHub 上的项目、代码片段、issue，而不是安装 skill。
说明：偏“读 GitHub 内容”，不是“管理 GitHub 仓库”。

4. `get-code-context-exa`
用途：从 GitHub、StackOverflow、技术文档里抓高质量代码上下文。
适合场景：你在 Codex 里查某个库怎么用、找真实示例、排查报错。
说明：偏“从 GitHub 找代码参考”。

5. `release-skills`
用途：做 release 工作流，里面会用到 `gh` 查询 PR 作者、repo owner 等。
适合场景：你自己维护一个仓库，要发版、生成 changelog、处理 PR 归属。
说明：和 GitHub 有集成，但核心是发版，不是通用 GitHub 操作。

如果你的目标是“把 GitHub 上的 skill 用到 Codex 上”，优先级建议是：

- 必备：`skill-installer`
- 安全配套：`skill-vetter`
- 辅助发现和研究：`agent-reach`、`get-code-context-exa`

如果你愿意，我下一步可以直接帮你做两件事之一：
- 列出适合 Codex 安装的 GitHub skill 来源和安装方式
- 你给我一个 GitHub repo / skill 链接，我直接帮你判断能不能装、该怎么装

## 用户

这些都不是。openclaw 是有github 这个 skill 的

## 助手

你说的是对的。RayOS 里确实记过一组 OpenClaw 的 GitHub 相关 skill，只是它们当前不在本机已安装列表里，而是保存在资源记录里。

我本地查到的是这 4 个：

1. `read-github`
安装：
`npx skills add am-will/codex-skills@read-github`
用途：读取 GitHub 仓库内容，理解项目结构和代码。
判断：这个最像“给 Codex 用”的，名字也直接来自 `codex-skills`。

2. `github-automation`
安装：
`npx skills add composiohq/awesome-claude-skills@github-automation`
用途：GitHub 自动化操作集合，适合让 AI 自动执行任务。
判断：偏自动化操作，理论上可迁移到 Codex，但要看 skill 内部是不是绑定 Claude/OpenClaw 特定能力。

3. `github-content`
安装：
`npx skills add krmcbride/claude-plugins@github-content`
用途：获取 GitHub 原始内容。
判断：偏读取内容，兼容性通常比自动化类更好。

4. `github-workflow-automation`
安装：
`npx skills add sickn33/antigravity-awesome-skills@github-workflow-automation`
用途：专注 GitHub Workflow 自动化。
判断：偏 GitHub Actions / workflow 场景，适合 CI/CD 方向。

这些记录来源在：
- `_rayos/history/resources-add-github-skills.md`
- `_rayos/resources.yaml`

如果目标是“优先能在 Codex 上用”，我会先看这两个：
- `read-github`
- `github-content`

它们更偏读取和分析，通常比“自动化写操作”更容易兼容 Codex。

如果你要，我下一步可以继续帮你判断：
- 这两个哪个更适合你现在的工作流
- 哪个更值得先装到 Codex

## 用户

read-github 和github-content 是做什么用的？

## 助手

`read-github` 和 `github-content` 都是“读 GitHub”的，但侧重点不一样。

`read-github`
作用：读取整个 GitHub 仓库，帮助 AI 理解项目结构、目录层级、关键代码文件之间的关系。
更适合：
- 快速看懂一个 repo 是干什么的
- 让 Codex 帮你做项目导读
- 分析架构、模块分层、入口文件、依赖关系
- 做“这个项目值不值得深入看”的第一轮判断

可以把它理解成：偏“仓库阅读器 / 项目理解器”。

`github-content`
作用：获取 GitHub 上的原始内容，更偏向把某个文件、README、源码片段、页面内容直接拿出来给 AI 处理。
更适合：
- 读取某个具体文件
- 提取 README、配置文件、源码内容
- 把 GitHub 内容喂给 Codex 做总结、翻译、改写、对比
- 针对单个文件或单段内容做分析

可以把它理解成：偏“内容抓取器 / 文件级读取器”。

简单区分：
- 想“看懂整个仓库”，优先 `read-github`
- 想“拿到某个文件或页面内容”，优先 `github-content`

按你要在 Codex 里用的场景看，如果你经常做“分析 GitHub 项目”，`read-github` 更有价值；如果你经常做“抽取 GitHub 某个文件再处理”，`github-content` 更直接。

如果你要，我下一步可以继续帮你判断：
- 这两个哪个更适合你现在的工作流
- 哪个更值得先装到 Codex

## 用户

我是想根据我提出的需求，在 github 上面找一找有没有匹配的项目可以用。

## 助手

那这两个都不是第一选择。

你的需求是：
先根据你提出的需求，在 GitHub 上找可能匹配的项目，再筛选值不值得用。

对应关系应该这样看：

`read-github`
不负责“找项目”。
它更适合在你已经有 repo 之后，继续读仓库、看结构、判断适不适合。

`github-content`
也不负责“找项目”。
它更适合把某个 GitHub 文件或页面内容抓出来分析。

所以如果你的目标是“按需求找项目”，这两个更像第二阶段工具，不是第一阶段工具。

更合适的流程是：

1. 先用 GitHub 搜索类 skill / 工具找候选项目
用途：
- 按关键词搜 repo
- 看 stars、最近活跃度、issue 情况
- 初筛项目

2. 再用 `read-github`
用途：
- 深入读候选仓库
- 看目录结构、技术栈、实现方式
- 判断是不是真正要的

3. 必要时再用 `github-content`
用途：
- 抓 README、核心源码、配置文件做细读

按你现在手头这批记录，如果只在这 4 个里选：
- 第一阶段找项目：`github-automation` 更可能沾边，但名字看不出它是否真的擅长“搜索项目”
- 第二阶段读项目：`read-github` 最合适
- 第三阶段抓具体内容：`github-content` 最合适

如果按“你的真实需求”来选，我会建议：
- 用 GitHub 搜索能力做“发现”
- 用 `read-github` 做“理解”
- 用 `github-content` 做“精读”

你这类需求，最理想的其实不是单独装 `read-github` 或 `github-content`，而是配一个“GitHub 搜索/检索”能力，再把 `read-github` 当后续分析器。

如果你要，我下一步可以直接帮你做两件事之一：
- 帮你找“更适合按需求搜 GitHub 项目”的 OpenClaw/Codex skill
- 或者我直接给你设计一个在 Codex 里可用的 GitHub 项目检索工作流

## 用户

你要不帮我推荐一些相关的 skill？

## 助手

按你的目标“根据需求去 GitHub 找匹配项目”，我推荐这几类，按优先级排：

1. `github-repo-search`
安装：
`npx skills add yunshu0909/yunshu_skillshub@github-repo-search`

用途：直接搜 GitHub repo，最贴你的第一步需求。
适合你：
- 按关键词找候选项目
- 先做项目发现和初筛
- 比 `read-github` 更像“找项目”而不是“读项目”

2. `gh-search-repos`
安装：
`npx skills add aaddrick/gh-cli-search@gh-search-repos`

用途：也是 repo 搜索，名字上看更偏 `gh` CLI 工作流。
适合你：
- 如果你本身就喜欢 GitHub CLI 风格
- 想把搜索结果接到后续终端流程里

3. `github-search-before-code`
安装：
`npx skills add ruiwarn/skills@github-search-before-code`

用途：从名字看，强调“先搜现有项目/方案，再自己写代码”。
适合你：
- 你的核心诉求就是先找现成项目
- 想避免重复造轮子

第二层推荐，做“搜到之后的分析”：

4. `read-github`
安装：
`npx skills add am-will/codex-skills@read-github`

用途：读仓库、看结构、理解实现。
适合你：
- 找到候选 repo 后，快速判断值不值得深入

5. `agent-reach`
本地已安装
用途：可直接用 `gh search repos`、`gh repo view`、`gh issue list` 这类 GitHub 查询。
适合你：
- 不一定要额外装 skill
- 先把“搜项目 + 看 issue 活跃度”做起来

不建议你优先装的：
- `github-content`
原因：更偏抓某个文件或页面内容，不是“按需求找项目”
- `github-automation` / `github-workflow-automation`
原因：偏自动化执行、workflow，不是项目发现

如果只装一两个，我建议是：
- 第一优先：`github-repo-search`
- 第二优先：`read-github`

这个组合最符合你的工作流：
先找项目，再读仓库。

如果你要，我下一步可以直接帮你做两件事里的一个：
- 帮你安装 `github-repo-search` 和 `read-github`
- 或者我先继续帮你比较这 3 个搜索类 skill，选出最适合 Codex 的一个

## 用户

先继续比较这 3 个搜索类 skill，选出最适合 Codex 的一个

## 助手

我比较完了。这 3 个里，最适合 Codex 的，我会选 `gh-search-repos`。

结论先说：
- 最适合 Codex：`gh-search-repos`
- 最适合“研究员式交付报告”：`github-repo-search`
- 最适合“写代码前找参考实现”：`github-search-before-code`

为什么我选 `gh-search-repos`

`gh-search-repos` 本质上是一个 GitHub CLI 搜索技能，直接围绕 `gh search repos` 工作。它的优点是：
- 非常贴近 Codex 的终端工作流
- 规则清楚，重点是怎么正确构造搜索命令
- 支持 stars、language、topic、license、updated、owner、archived 等过滤
- 能直接输出 JSON，方便后续让 Codex继续筛选、排序、总结
- 它不是“大而全流程”，而是一个很实用的搜索基础件

对你这种需求最顺：
1. 你说需求
2. Codex 生成一组 `gh search repos ...` 查询
3. 拉回候选 repo
4. 再交给 `read-github` 或别的分析流程继续读仓库

这比那种“先走一整套固定报告流程”的 skill 更适合 Codex。

另外两个的问题

`github-repo-search`
优点：
- 非常贴你的目标，专门做“按需求搜 GitHub 开源项目并输出结构化推荐报告”
- 它连过滤、分类、重排、项目介绍模板都给你设计好了

问题：
- 它有很强的流程约束，尤其要求“先做需求收敛并等待用户确认”
- 更像一个咨询顾问/研究报告型 skill
- 在 Codex 里会显得偏重、偏流程化，不够灵活

如果你想要的是“给我一份规范的候选项目研究报告”，它很好。
如果你想要的是“我和 Codex 一边聊一边搜一边筛”，它会有点重。

`github-search-before-code`
优点：
- 很适合避免重复造轮子
- 会主动去找参考实现

问题：
- 它核心不是“找可用项目”，而是“实现新功能前找参考代码”
- 更偏代码实现参考，不是 repo 发现与选型

推荐方案

如果只装一个：
- `npx skills add aaddrick/gh-cli-search@gh-search-repos`

如果装两个，形成完整链路：
- `npx skills add aaddrick/gh-cli-search@gh-search-repos`
- `npx skills add am-will/codex-skills@read-github`

这个组合最合理：
- `gh-search-repos` 负责找项目
- `read-github` 负责看懂候选项目

补充一个实际观察：
- `gh-search-repos` 的 skills registry 显示路径和 GitHub 仓库目录映射有点不一致，但仓库里这个 skill 本身是存在的，内容也完整
- `github-repo-search` 的 skill 也存在，之前失败是安装脚本临时目录问题，不是 skill 本身缺失

如果你要，我下一步可以直接帮你安装 `gh-search-repos`，然后顺手给你做一个适合你自己的 GitHub 项目检索提示词模板。

## 用户

需要

## 助手

已经装好了：`gh-search-repos`。实际文件在 `~/.agents/skills/gh-search-repos/SKILL.md`。

有个实现细节要说明：
- 这次安装器显示它支持 Codex，并通过通用目录和软链接机制分发
- 但我本地看到 `~/.codex/skills` 目录里暂时还没出现可见项，所以稳妥起见你先重启一次 Codex，让它重新加载 skills

你之后可以这样用它的工作流来让我帮你搜 GitHub 项目：

```text
帮我在 GitHub 上找符合下面需求的项目：

目标：
- 做什么：替我写一个一句话目标
- 主要场景：学习 / 生产 / 对标
- 偏好技术栈：Python / TypeScript / Go / 不限
- 希望项目形态：可直接使用的产品 / 可二次开发的框架 / 方法论清单
- stars 门槛：100 / 500 / 1000
- 数量：10
- 排除项：教程仓库 / 归档仓库 / 纯论文复现 / 太久没更新
- 排序偏好：相关性优先 / 星标优先

输出要求：
- 先给候选列表
- 每个项目说明“它是什么、为什么适合我”
- 补充 stars、语言、最近更新时间、license、仓库链接
- 最后告诉我最值得深入看的前 3 个
```

更短一点的日常版：

```text
帮我在 GitHub 上找 10 个和“浏览器自动化 agent”相关的项目。
要求：TypeScript 或 Python，stars 至少 500，排除归档仓库和纯教程项目，优先可直接上手的产品。
```

如果你愿意，我下一步可以直接拿这个新 skill，按你的一个真实需求帮你搜第一轮项目。

## 用户

帮我在 GitHub 上找符合下面需求的项目：
目标：
- 做什么：我想实现多agent 工具（比如：openclaw、claude code、codex、opencode、cursor、antigravity、kiro） skill 互通。
- 主要场景：日常办公 / 开发
- 偏好技术栈：不限
- 希望项目形态：可直接使用的产品 / 可二次开发的框架 / 方法论清单 都可以
- 数量：10
- 排除项：归档仓库 / 太久没更新
- 排序偏好：相关性优先
输出要求：
- 先给候选列表
- 每个项目说明“它是什么、为什么适合我”
- 补充 stars、语言、最近更新时间、license、仓库链接
- 最后告诉我最值得深入看的前 3 个

## 助手

我按“相关性优先”筛了 10 个更贴近你目标的项目：重点看“技能可移植”“多 agent 兼容”“MCP/桥接层”“可直接落地到办公/开发流程”。我排除了明显过旧或无近况信号的仓库；少数仓库的公开摘要没有直接暴露 `last commit date`，我用最新 release 或可见更新来源代替，并明确标注。

1. `yusufkaraaslan/Skill_Seekers`
它是什么：把文档站、GitHub 仓库、PDF 转成可安装的 skill，并且能自动安装到 10+ agent。
为什么适合你：这是目前最贴你目标的现成方案，已经在做“skill 生成 + 多 agent 分发 + MCP 接入”。它的 README 直接写了可安装到 Claude Code、Cursor、OpenCode、Windsurf 等，并且 MCP 侧支持 5 个 coding agents。
元数据：6.4k stars；Python；最近更新时间 2026-02-20；MIT。

2. `openai/skills`
它是什么：Codex 的 skills catalog，同时明确提出 “write once, use everywhere” 的 Agent Skills open standard。
为什么适合你：如果你要做“skill 互通”的规范层，而不是只做一个桥接脚本，这个仓库最值得先研究。它更像技能格式、目录组织、安装分发方式的参考标准。
元数据：1.6k stars；Mixed；公开摘要未直出具体更新时间；许可证未在摘要正文展开，但仓库为官方 skills catalog。

3. `modelcontextprotocol/typescript-sdk`
它是什么：官方 MCP TypeScript SDK。
为什么适合你：如果你想自己做“OpenClaw / Claude Code / Codex / Cursor / OpenCode”之间的互通层，这个是最靠谱的底座。你最后大概率会落到“统一 MCP server / client / tool schema / transport”的设计。
元数据：11k stars；TypeScript；公开摘要未直出具体更新时间；MIT。

4. `modelcontextprotocol/servers`
它是什么：MCP 官方 reference servers 集合。
为什么适合你：这不是 skill 互通产品本身，但很适合做“协议层参考实现库”。你可以从这里看哪些工具暴露方式最稳定，怎样把一个能力包做成各 agent 都能接的 MCP server。
元数据：76.1k stars；TypeScript + Python；公开摘要未直出具体更新时间；MIT。

5. `vercel-labs/coding-agent-template`
它是什么：一个多 agent coding platform 模板，支持 Claude Code、Codex CLI、GitHub Copilot CLI、Cursor CLI、Gemini CLI、opencode。
为什么适合你：它不是“skill 标准仓库”，但它直接展示了多 agent 共存的一套实战架构，尤其适合你研究“同一任务系统如何调多个 agent”。
元数据：1.4k stars；Next.js/TypeScript；公开摘要未直出具体更新时间；许可证摘要未明确展开。

6. `steipete/claude-code-mcp`
它是什么：把 Claude Code 暴露成 MCP server。
为什么适合你：如果你要把 Claude Code 变成别的 agent 可调用的“能力节点”，这个方向非常直接。它适合做“把单一 agent 能力外放给其他 agent”。
元数据：992 stars；Node/TypeScript 生态；公开摘要未直出具体更新时间；MIT。

7. `cexll/codex-mcp-server`
它是什么：把 Codex CLI 暴露给 Claude、Cursor 等 MCP client 的 server。
为什么适合你：这和上一个形成天然配对。你如果想让多个 agent 共享 Codex 的执行能力，这是一个非常贴题的桥接项目。
元数据：114 stars；TypeScript；最近可见版本更新时间 2025-10-27；MIT。

8. `shinpr/sub-agents-mcp`
它是什么：把 Claude Code 风格的 sub-agents 工作流移植到任意 MCP-compatible tool。
为什么适合你：你提到的是“多 agent 工具互通”，这个项目已经在做“agent 定义可复用、跨工具执行”。它更偏“agent workflow portability”。
元数据：70 stars；TypeScript；最近更新时间 2026-03-13；MIT。

9. `rinadelph/Agent-MCP`
它是什么：基于 MCP 的多 agent 协作框架。
为什么适合你：如果你要的不只是 skill 安装，而是“多个 agent 怎样分工、怎么共享上下文和任务”，它比单一 skill 仓库更偏系统设计。
元数据：1.1k stars；Python + Node；公开摘要未直出具体更新时间；AGPL-3.0。

10. `ComposioHQ/composio`
它是什么：大规模工具集成平台，MCP 是它的重要接入方式之一。
为什么适合你：如果你的“skill 互通”本质上想解决的是“不同 agent 共享同一批外部工具能力”，Composio 很值得参考。它更像工具连接层，不是 skill 格式层。
元数据：26.3k stars；TypeScript；最近可见更新 2025-09-06；MIT。

最值得深入看的前 3 个：
1. `Skill_Seekers`
2. `openai/skills`
3. `modelcontextprotocol/typescript-sdk`

## 用户

补充一句我是想把我本地安装的 skill 在其他 agent 工具中都可以调用的工具

## 助手

那目标更具体了：

不是“找多 agent 框架”，而是找一种工具层，让你本地已经安装的 skill，能被 OpenClaw、Claude Code、Codex、OpenCode、Cursor、Antigravity、Kiro 这些 agent 统一发现和调用。

按这个目标，前面的 10 个里真正高相关的，优先级要重排：

1. `Skill_Seekers`
最贴题。
原因：它已经在做“把能力整理成 skill，并安装到多个 agent”。如果你要的是“本地 skill 多端复用”，这是最接近成品的方向。

2. `openai/skills`
最值得研究 skill 标准。
原因：你如果想让“同一份 skill”跨 agent 复用，核心不是某个单点工具，而是 skill 的目录结构、元数据、触发方式、安装方式能不能抽象成统一格式。这个仓库很适合拿来当参考标准。

3. `modelcontextprotocol/typescript-sdk`
最值得做底层桥接。
原因：如果某些 agent 不原生吃同一种 skill 格式，那最现实的做法通常不是硬同步 skill 文件，而是把 skill 包成 MCP tool / server，让其他 agent 通过 MCP 调用。

4. `modelcontextprotocol/servers`
最值得看参考实现。

5. `steipete/claude-code-mcp`
方向正确，但偏单点桥接。

6. `cexll/codex-mcp-server`
同样是单点桥接，但对 Codex 方向更直接。

反过来说，这几个现在没那么贴题：
- `vercel-labs/coding-agent-template`
- `ComposioHQ/composio`
- `github-search-before-code`

所以现在我对你的建议会更明确：

最值得深入看的前 3 个，改成：
1. `Skill_Seekers`
2. `openai/skills`
3. `modelcontextprotocol/typescript-sdk`

而且我建议你的实现路线也改成这条：

- 统一 skill 元数据格式
- 写一个本地 skill registry
- 给每个 agent 做 adapter
- 对不支持原生 skill 的 agent，走 MCP 暴露调用

一句话说，就是：
“skill 文件互通”未必可行，但“skill 能力互通”是可行的；最稳的方式是 `统一格式 + adapter + MCP bridge`。

如果你要，我下一步可以直接帮你做：
1. 从这 3 个项目里提炼一个适合你的架构草图
2. 继续搜专门做“本地 skills registry / cross-agent skill sync / portable skills”的项目

## 用户

Skill_Seekers 和openai/skills项目里提炼一个适合你的架构草图

## 助手

基于这两个项目，我会提炼成一套“本地 Skill Hub + 多 Agent Adapter + MCP Bridge”的架构。

依据：
- `openai/skills` 把 skill 定义成“instructions、scripts、resources 的文件夹”，强调 “write once, use everywhere”，并且按 `.system / curated / experimental` 组织分发与安装。
- `Skill_Seekers` 已经证明两件事可行：一是把 skill 自动安装到多个 agent；二是用 MCP server 把能力暴露给多个 agent 使用。

架构草图：

```text
                        +----------------------+
                        |   Local Skill Hub    |
                        |  ~/.skills-unified/  |
                        +----------+-----------+
                                   |
                    +--------------+--------------+
                    |                             |
          +---------v---------+         +---------v---------+
          |  Skill Registry   |         |  Skill Runtime    |
          |  index.json/yaml  |         | scripts/resources |
          | metadata, tags,   |         | invoke, sandbox   |
          | triggers, compat  |         | env, logs         |
          +---------+---------+         +---------+---------+
                    |                             |
        +-----------+-----------+      +----------+-----------+
        |                       |      |                      |
+-------v--------+    +---------v----+ | +--------------------v--+
| Agent Adapters |    | MCP Bridge   | | | Optional Wrappers     |
| codex/openclaw |    | stdio/http   | | | legacy skill formats  |
| cursor/opencode|    | tools=list   | | | import/export         |
| claude/kiro... |    | execute      | | |                       |
+-------+--------+    +---------+----+ | +-----------------------+
        |                       |      |
   install/sync            universal call path
        |                       |
+-------v---+  +--------+  +----v-----+  +--------+
| Codex     |  | Cursor |  | OpenClaw |  | Kiro   |
| native    |  | native |  | via MCP  |  | via MCP|
+-----------+  +--------+  +----------+  +--------+
```

核心设计：

1. 统一 Skill 存储层
- 建一个统一目录，比如 `~/.skills-unified/`
- 每个 skill 都是独立目录，保留 `SKILL.md + scripts/ + resources/ + manifest.json`
- 这层借鉴 `openai/skills` 的“skill 是文件夹”模型，不绑定单一 agent

2. 单独做一个 `manifest.json`
`SKILL.md` 适合给 agent 读，不适合程序稳定解析。
所以建议额外加一个结构化清单。

3. 本地 Skill Registry
- 维护一个 `index.json` 或 `index.yaml`
- 记录每个 skill 的路径、标签、触发词、兼容 agent、安装状态
- 这层负责“发现”而不是执行

4. 双通道调用
- 原生通道：能吃 skill 目录的 agent，直接同步/软链接过去
- MCP 通道：不能直接吃 skill 的 agent，统一走 MCP bridge

这就是把 `openai/skills` 的“标准化 skill 包”与 `Skill_Seekers` 的“多 agent 安装 + MCP”组合起来。

Adapter 层：

每个 agent 一个 adapter，职责只做两件事：

1. 安装映射
- Codex: 同步到它的 skills 目录
- OpenClaw: 同步到它的 skills 目录
- Cursor: 同步到项目 `.cursor/skills/`
- Claude Code: 同步到 `~/.claude/skills/`
- 其他不兼容的：只登记，不直接安装

2. 能力声明映射
- 有的 agent 读 `SKILL.md`
- 有的可能要额外 metadata
- 有的只能通过 MCP 调工具

MCP Bridge：

这层最关键。

它暴露两个核心 tool 就够了：

1. `list_skills`
- 返回所有已注册 skill
- 支持按 tag / capability / trigger 搜索

2. `run_skill`
- 输入：`skill_name + task + args`
- 由 bridge 去加载 skill、拼上下文、执行脚本或返回指令

扩展可以再加：
- `install_skill_to_agent`
- `sync_skills`
- `inspect_skill`
- `search_skills`

这样即使某个 agent 不支持“本地 skill 目录”，也能通过 MCP 调到同一批能力。

你这套系统的最小可行版本：

第一阶段不要做太大，建议只做：

1. 统一目录
- `~/.skills-unified/<skill>/`

2. 统一元数据
- `manifest.json`

3. 两个 adapter
- `codex`
- `openclaw`

4. 一个 MCP server
- `list_skills`
- `run_skill`

5. 一个同步命令
- `skillhub sync --agent codex`
- `skillhub sync --agent openclaw`
- `skillhub sync --all`

为什么这套最适合你：

- `openai/skills` 给你“skill 如何标准化”
- `Skill_Seekers` 给你“如何多端安装、如何走 MCP”
- 你的目标不是做新的 agent，而是做“本地 skills 的统一分发和调用层”
- 所以最合理的产品定位不是 “another agent”
- 而是 “Skill Hub / Skill Bus”

我建议的目录结构：

```text
~/.skills-unified/
├── registry/
│   ├── index.json
│   └── agents.json
├── skills/
│   ├── github-repo-search/
│   │   ├── SKILL.md
│   │   ├── manifest.json
│   │   ├── scripts/
│   │   └── resources/
│   └── ...
├── adapters/
│   ├── codex.ts
│   ├── openclaw.ts
│   ├── cursor.ts
│   └── claude-code.ts
└── mcp-server/
    └── server.ts
```

下一步最值得做的 3 件事：
1. 先定义 `manifest.json` 字段
2. 先做 `codex + openclaw` 两个 adapter
3. 先做最小 MCP server，把 skill 列表和执行打通

## 用户

修改一下MCP Bridge 先不考虑，后面可能会增加 cli 等方式 mcp 方式太费 token 不经济

## 助手

那就把架构收紧成“本地 Skill Hub + Adapter + CLI”，先不做 MCP。

这个修改是对的。
你的目标是“本地已安装的 skill，在多个 agent 工具里都能复用”，这件事本质上先是“分发与适配”问题，不是“远程调用协议”问题。MCP 适合后期补充，但不该当第一阶段主线。

调整后的架构：

```text
                 +----------------------+
                 |   Local Skill Hub    |
                 |  ~/.skills-unified/  |
                 +----------+-----------+
                            |
                +-----------v-----------+
                |     Skill Registry    |
                | index.json / yaml     |
                | metadata / compat     |
                +-----------+-----------+
                            |
          +-----------------+-----------------+
          |                                   |
+---------v---------+               +---------v---------+
|   Skill Runtime   |               |    CLI Gateway    |
| scripts/resources |               | skillhub install  |
| env / logs        |               | skillhub sync     |
+---------+---------+               | skillhub list     |
          |                         | skillhub run      |
          |                         +---------+---------+
          |                                   |
   +------+--------+-----------+--------------+-----------+
   |               |           |                          |
+--v----+     +----v---+  +----v----+                +----v----+
|Codex  |     |OpenClaw|  |Cursor   |                |Kiro/... |
|adapter|     |adapter |  |adapter  |                |adapter  |
+-------+     +--------+  +---------+                +---------+
```

新的核心思路：

1. `Skill Hub`
- 统一保存所有 skill
- 不绑定任何单一 agent
- 参考 `openai/skills` 的目录式 skill 结构

2. `Registry`
- 管理 skill 元数据、标签、触发词、兼容性
- 解决“我有哪些 skill、适合哪个 agent、装到哪里”

3. `Adapter`
- 负责把同一份 skill 转成不同 agent 能接受的格式
- 本质是“安装器 / 同步器 / 转换器”

4. `CLI Gateway`
- 作为统一入口
- 代替 MCP 成为第一阶段调度层
- 以后即使要加 MCP，也是在 CLI 之上再包一层

我建议 CLI 先做这几个命令：

```bash
skillhub list
skillhub inspect <skill>
skillhub sync --agent codex
skillhub sync --agent openclaw
skillhub sync --all
skillhub install <skill> --agent codex
skillhub run <skill> --agent codex
skillhub doctor
```

这样做的好处：

- 比 MCP 更省 token
- 本地执行链路更直接
- 更容易 debug
- 更适合你现在“本地 skill 互通”的目标
- 后续真要加 MCP、HTTP、RPC，都可以从 CLI 再包出去

建议的分阶段实现：

第一阶段
- 统一 skill 目录
- 统一 `manifest.json`
- `codex` / `openclaw` 两个 adapter
- `skillhub sync` 和 `skillhub list`

第二阶段
- 增加 `cursor` / `kiro` / `opencode` adapter
- 增加 `skillhub run`
- 增加安装状态与冲突处理

第三阶段
- 再考虑 MCP / daemon / HTTP API
- 这时 CLI 继续保留，作为底层能力

一句话重定义：
这不是 “MCP skill bridge”，而是：

`本地跨 Agent 的 Skill 包管理器 + 适配层`

如果你要，我下一步可以直接给你：
- 一版不含 MCP 的 `manifest.json` 规范
- 一版 `skillhub` CLI 命令设计
- 一版 MVP 目录结构

## 用户

一版 MVP 目录结构

## 助手

可以，MVP 我建议先压到最小可跑版本，只解决三件事：

- 统一存放 skill
- 记录 metadata
- 同步到不同 agent

目录结构可以这样：

```text
skill-hub/
├── README.md
├── package.json
├── tsconfig.json
├── src/
│   ├── cli/
│   │   └── index.ts
│   ├── core/
│   │   ├── registry.ts
│   │   ├── manifest.ts
│   │   ├── sync.ts
│   │   ├── install-state.ts
│   │   └── paths.ts
│   ├── adapters/
│   │   ├── base.ts
│   │   ├── codex.ts
│   │   ├── openclaw.ts
│   │   └── index.ts
│   ├── commands/
│   │   ├── list.ts
│   │   ├── inspect.ts
│   │   ├── sync.ts
│   │   └── doctor.ts
│   ├── types/
│   │   ├── skill.ts
│   │   └── agent.ts
│   └── utils/
│       ├── fs.ts
│       ├── hash.ts
│       └── logger.ts
├── skills/
│   ├── github-repo-search/
│   │   ├── SKILL.md
│   │   ├── manifest.json
│   │   ├── scripts/
│   │   └── resources/
│   └── ...
├── registry/
│   ├── index.json
│   └── agents.json
├── state/
│   ├── installs.json
│   └── sync-history.json
└── templates/
    └── manifest.json
```

各目录职责：

`src/cli/`
- CLI 入口
- 例如 `skillhub list`、`skillhub sync --agent codex`

`src/core/`
- 核心逻辑
- 解析 manifest
- 扫描本地 skills
- 计算哪些 skill 需要同步
- 写入状态文件

`src/adapters/`
- 每个 agent 一个 adapter
- 负责：
  - 目标安装路径
  - 同步方式：复制 / 软链 / 转换
  - agent 特有规则

`src/commands/`
- CLI 子命令实现
- 保持 `cli/index.ts` 干净

`src/types/`
- 类型定义
- SkillManifest、AgentAdapter、InstallRecord 这些

`skills/`
- 统一 skill 源目录
- 这是你的“单一事实来源”

`registry/index.json`
- 所有已纳管 skill 的索引
- 可以由扫描自动生成，也可以半自动维护

`registry/agents.json`
- 记录支持哪些 agent
- 各 agent 默认安装路径
- adapter 名称和能力声明

`state/installs.json`
- 记录某个 skill 是否已经同步到某个 agent
- 目标路径是什么
- 上次同步时间
- 当前版本/hash

`state/sync-history.json`
- 可选
- 用来排查问题

`templates/manifest.json`
- 新建 skill 时直接复用模板

MVP 最小命令建议：

第一版只做这 4 个：

- `skillhub list`
- `skillhub inspect <skill>`
- `skillhub sync --agent codex`
- `skillhub sync --agent openclaw`

这样就够验证整套结构了。

建议的 `skills/<name>/manifest.json` 最小字段：

```json
{
  "name": "github-repo-search",
  "version": "0.1.0",
  "entry": "SKILL.md",
  "tags": ["github", "search"],
  "triggers": ["找 GitHub 项目", "repo search"],
  "compatibleAgents": ["codex", "openclaw"]
}
```

为什么这样切：

因为你现在先别做太多：
- 不做运行时编排
- 不做 MCP
- 不做网络同步
- 不做复杂依赖解析

先把“统一源目录 + adapter 同步”跑通，后面再加 `cursor`、`kiro`、`opencode` 很自然。

如果你要，我下一步可以直接继续给你：
- 一版 `manifest.json` 完整字段设计
- 或者把这个 MVP 目录结构直接在仓库里搭出来

## 用户

metadata 是什么？

## 助手

`metadata` 就是“描述 skill 的结构化信息”。

你可以把它理解成：
不是 skill 的正文内容，而是 skill 的“说明卡”和“机器可读配置”。

比如一个 skill 里真正干活的是：
- `SKILL.md`
- `scripts/`
- `resources/`

而 `metadata` 是告诉系统：

- 这个 skill 叫什么
- 版本是多少
- 适合哪些 agent
- 入口文件是哪个
- 有哪些标签
- 触发词是什么
- 能不能同步到 codex / openclaw
- 需不需要额外依赖

也就是说：

- `SKILL.md` 是给 agent 读的
- `metadata` 是给你的 `skillhub` 这种工具读的

例子：

```json
{
  "name": "github-repo-search",
  "version": "0.1.0",
  "entry": "SKILL.md",
  "tags": ["github", "search"],
  "triggers": ["找 GitHub 项目", "repo search"],
  "compatibleAgents": ["codex", "openclaw"]
}
```

这里每个字段都是 metadata。

为什么要有 metadata

因为如果没有它，程序只能去“猜”：

- skill 名字从哪里取
- 哪个文件是入口
- 能不能装到某个 agent
- 这个 skill 属于什么类别
- CLI 里怎么列出来

这会很不稳定。

一句话区分：

- 内容：skill 真正的说明和脚本
- metadata：skill 的结构化描述信息

如果你愿意，我下一步可以直接给你一版：
“适合这个 MVP 的 metadata 字段清单”

## 用户

我希望能把我们的对话完完整整的存在一个 md 文件中
