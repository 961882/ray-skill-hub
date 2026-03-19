# RaySkillHub

[English](README.md) | [简体中文](README_ZH.md)

`RaySkillHub` 是一个面向 AI Agent 工具的本地优先 skill control plane。

这个公开仓库当前提供的是 public-core snapshot，只保留理解和构建项目所需的核心源码、canonical skills 和 adapter 逻辑。扩展文档、测试源码、规划资产、发布材料以及本地机器状态都不会被跟踪到这个公开仓库中。

## 它能做什么

- 发现 `skills/` 下的 canonical skills
- 校验 `manifest.json` 元数据与入口文件
- 将 skills 同步到已支持的 agent 目录
- 检查安装漂移和目标冲突
- 同时提供面向人的 CLI，以及面向 agent 的稳定 `--json` 响应

## 当前支持的 Agent

- `codex`
- `claude-code`
- `openclaw`
- `opencode`

## 常用命令

```bash
npm install
npm run build

rayskillhub list
rayskillhub inspect example-skill
rayskillhub doctor
rayskillhub sync --agent codex --dry-run
rayskillhub run demo-exec-skill --agent codex --exec
```

在本地开发阶段，你也可以直接运行编译后的 CLI：

```bash
node dist/cli/index.js list
```

## 仓库结构

- `src/` - TypeScript 实现
- `skills/` - canonical 示例 skills
- `templates/manifest.json` - `init-skill` 使用的脚手架模板
- `registry/agents.json` - 已支持的 agent 定义
- `scripts/pre-release-check.mjs` - 轻量级 build/health 预检脚本



## 说明

- `codex` 和 `claude-code` 目标会把 `SKILL.md` 渲染为带 YAML frontmatter 的格式。
- `openclaw` 在 `sync` 之后如果复用了旧会话，可能需要 fresh session 才能避免陈旧 skill 快照。
- 这个包仍然是本地优先工具，不是远程编排服务。
