# 虾记 (Xiaoji)

> 极轻量跨平台个人记忆索引工具 | Cross-platform Memory Indexing Tool

[![npm version](https://img.shields.io/npm/v/xiaji.svg)](https://www.npmjs.com/package/xiaji)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

虾记是一个基于 MCP (Model Context Protocol) 协议的极轻量个人记忆索引工具，帮助用户自动采集、存储和检索跨平台的数字记忆目录。

## 功能

- 🔄 **多平台同步**：支持飞书文档、妙记、日历等平台数据采集
- 🔍 **自然语言查询**：用自然语言搜索你的记忆
- 📋 **手动记录**：支持手动添加记忆
- 🔐 **OAuth 2.0**：安全的平台授权
- ⏰ **定时任务**：自动定期同步
- 🔌 **MCP 协议**：标准 MCP Server，任何 AI Agent 可直接调用

## 安装

```bash
npm install -g xiaji
```

要求 Node.js >= 18。

## 快速开始

```bash
# 初始化配置
xj config init

# 授权飞书
xj config auth feishu

# 同步记忆
xj sync

# 查询记忆
xj query "这周做了什么"

# 手动添加记忆
xj add "今天完成了虾记开发"

# 列出记忆
xj list
```

## MCP 集成（开发者工具）

xiaji 通过 MCP 协议与 AI Agent 集成。部署后，以下开发者工具均可直接调用 xiaji：

| 开发者工具 | 集成方式 | MCP Server 启动方式 | 状态 |
|-----------|---------|-------------------|------|
| **Trae** | MCP 原生 | `npx xiaji serve` | ✅ 已完成 |
| **Cursor** | MCP 原生 | `npx xiaji serve` | ✅ 已完成 |
| **Claude Code** | CLI 直接调用 | 直接运行 `xj` 命令 | ✅ 已完成 |
| **VS Code** | MCP 原生 | `npx xiaji serve` | ✅ 已完成 |
| **Codex** | MCP 原生 | `npx xiaji serve` | ✅ 已完成 |

### 配置方式

**步骤 1：启动 xiaji MCP Server**

```bash
npx xiaji serve
```

**步骤 2：在 IDE 中配置 MCP**

以 Trae 为例，在 MCP 配置中添加：

```json
{
  "mcpServers": {
    "xiaji": {
      "command": "npx",
      "args": ["xiaji", "serve"]
    }
  }
}
```

**步骤 3：开始使用**

安装配置完成后，在 IDE 中对 AI Agent 说：

- "帮我查一下这周的工作记录"
- "帮我记录今天完成了 xxx"

AI Agent 会自动通过 MCP 调用 xiaji 的功能。

### MCP Tools

| Tool | 说明 |
|------|------|
| `sync` | 触发记忆同步 |
| `query` | 自然语言查询记忆 |
| `add` | 手动添加记忆 |
| `list` | 分页列出记忆 |

## 使用场景

### 场景 1：飞书定时自动采集

```
xiaji CLI（定时 cron，每天 22:00）
    ↓
自动调用飞书开放平台 API
    ↓
获取：文档列表 / 会议列表 / 日历列表（仅标题+链接+时间）
    ↓
写入 ~/xiaji/by-platform/feishu-doc/
```

### 场景 2：AI Agent 对话中记录

```
用户（在 Trae/Cursor 等 IDE 中）：
"帮我记录今天完成了 xxx"

    ↓

IDE 的 AI Agent
    ↓
调用 xiaji MCP Server → xj add → 写入记忆
```

### 场景 3：AI Agent 对话中查询

```
用户：
"我这周做了什么？"

    ↓

IDE 的 AI Agent
    ↓
调用 xiaji MCP Server → xj query
    ↓
返回记忆列表 → AI 分析总结 → 回答用户
```

### 场景 4：直接 CLI 查询

```bash
# 在终端直接查询
xj query "项目进度"
xj list --time week
```

## 开发

```bash
git clone https://github.com/agentshow/xiaji.git
cd xiaji
npm install
npm run build
npm test
```

## License

MIT © 2026 Alisa Github

## 反馈与支持

请直接提交 [GitHub Issue](https://github.com/agentshow/xiaji/issues)，AI 助手将每日收集、分类反馈，同步给维护者迭代优化。

Issue 提交规范：
1. 标题格式：【功能建议/问题反馈/优化提议】+ 具体内容
2. 内容：简洁描述需求/问题，可附命令行报错、使用场景截图

## 运营说明

本项目由 AI 助手负责日常运营（反馈收集、推广同步），维护者专注产品迭代，所有合理反馈将在版本更新中逐步落地。
