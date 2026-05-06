# 虾记 (Xiaoji)

> AI-powered personal memory indexing tool | 个人记忆索引工具

[![npm version](https://img.shields.io/npm/v/xiaji.svg)](https://www.npmjs.com/package/xiaji)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

虾记是一个基于 MCP (Model Context Protocol) 协议的个人记忆索引工具，帮助 AI Agent 自动采集、存储和检索你的数字记忆。

## 功能

- 🔄 **多平台同步**：支持飞书文档、妙记、日历等平台数据采集
- 🧠 **AI 摘要**：自动为记忆生成智能摘要
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

## MCP 集成

在 AI Agent（如 Claude Desktop、Trae）中配置：

```json
{
  "mcpServers": {
    "xiaji": {
      "command": "npx",
      "args": ["xiaji"]
    }
  }
}
```

### MCP Tools

| Tool | 说明 |
|------|------|
| `sync` | 触发记忆同步 |
| `query` | 自然语言查询记忆 |
| `add` | 手动添加记忆 |
| `list` | 分页列出记忆 |

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
