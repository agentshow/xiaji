#!/usr/bin/env node
import { Command } from 'commander';
import * as path from 'node:path';
import * as os from 'node:os';
import { Logger, LogLevel } from '../utils/logger';
import { ConfigService } from '../config/config-service';
import { StorageService } from '../storage/storage';
import { AiService } from '../ai/ai-service';
import { MemoryService } from '../memory/memory-service';
import { FeishuCollector } from '../collectors/feishu/feishu-collector';
import { Scheduler } from '../scheduler/scheduler';
import { McpServer } from '../mcp/mcp-server';

const program = new Command();

program
  .name('xj')
  .description('虾记 - 个人记忆索引工具')
  .version('0.1.0');

const configDir = path.join(os.homedir(), '.xiaji');
const logDir = path.join(configDir, 'logs');
const configPath = path.join(configDir, 'config.json');

function createServices() {
  const logger = new Logger(logDir, LogLevel.INFO);
  const config = new ConfigService(configPath, logger);
  const storagePath = config.getStoragePath();
  const storage = new StorageService(storagePath, logger);
  const aiService = new AiService(logger, { apiKey: config.get().apiKey });
  const feishuToken = config.getPlatformToken('feishu');
  let feishuCollector: FeishuCollector | null = null;
  if (feishuToken) {
    feishuCollector = new FeishuCollector(logger, aiService, {
      appId: config.get().platforms.feishu?.app_id || '',
      appSecret: feishuToken,
    });
  }
  const memoryService = new MemoryService(storage, config, aiService, logger, feishuCollector);
  return { logger, config, storage, aiService, memoryService, feishuCollector };
}

program
  .command('sync')
  .description('触发记忆同步')
  .option('-p, --platforms <platforms...>', '指定平台')
  .option('-f, --force', '强制全量同步')
  .action(async (options) => {
    const { memoryService } = createServices();
    const result = await memoryService.sync(options.platforms, options.force);
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('query')
  .description('查询记忆')
  .argument('<text>', '查询文本')
  .option('-s, --start <date>', '开始时间')
  .option('-e, --end <date>', '结束时间')
  .option('-p, --platforms <platforms...>', '平台筛选')
  .option('-l, --limit <number>', '返回数量', '10')
  .action(async (text, options) => {
    const { memoryService } = createServices();
    const result = await memoryService.query(text, {
      timeRange: options.start || options.end ? { start: options.start, end: options.end } : undefined,
      platforms: options.platforms,
      limit: parseInt(options.limit, 10),
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('add')
  .description('手动添加记忆')
  .argument('<content>', '记忆内容')
  .option('-t, --time <time>', '时间')
  .option('-p, --platform <platform>', '平台', 'manual')
  .option('-g, --tags <tags...>', '标签')
  .action(async (content, options) => {
    const { memoryService } = createServices();
    const result = await memoryService.add(content, {
      time: options.time,
      platform: options.platform,
      tags: options.tags,
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('list')
  .description('列出记忆')
  .option('-s, --start <date>', '开始时间')
  .option('-e, --end <date>', '结束时间')
  .option('-p, --platforms <platforms...>', '平台筛选')
  .option('-l, --limit <number>', '返回数量', '20')
  .option('-o, --offset <number>', '偏移量', '0')
  .action((options) => {
    const { memoryService } = createServices();
    const result = memoryService.list({
      timeRange: options.start || options.end ? { start: options.start, end: options.end } : undefined,
      platforms: options.platforms,
      limit: parseInt(options.limit, 10),
      offset: parseInt(options.offset, 10),
    });
    console.log(JSON.stringify(result, null, 2));
  });

program
  .command('config')
  .description('配置管理')
  .argument('<action>', 'init | set | get | auth | reauth')
  .argument('[key]', '配置键')
  .argument('[value]', '配置值')
  .action((action, key, value) => {
    const { config } = createServices();
    switch (action) {
      case 'init':
        config.init();
        console.log('Config initialized');
        break;
      case 'set':
        if (key === 'storage.path') {
          config.setStoragePath(value);
          console.log(`Storage path set to: ${value}`);
        } else if (key === 'apiKey') {
          config.setApiKey(value);
          console.log('API key set');
        } else {
          console.log(`Unknown config key: ${key}`);
        }
        break;
      case 'get':
        console.log(JSON.stringify(config.get(), null, 2));
        break;
      case 'auth':
        console.log(`To authorize ${key || 'a platform'}, visit the authorization URL in your browser.`);
        console.log('After authorization, run: xj config set platforms.<name>.token <token>');
        break;
      case 'reauth':
        console.log(`Re-authorizing ${key || 'platform'}...`);
        console.log('Please re-authorize and update the token.');
        break;
      default:
        console.log(`Unknown action: ${action}`);
    }
  });

program
  .command('serve')
  .description('启动 MCP Server')
  .action(async () => {
    const { memoryService, logger } = createServices();
    const mcpServer = new McpServer(memoryService, logger);
    await mcpServer.start();
  });

program
  .command('start')
  .description('启动虾记（含定时同步）')
  .action(async () => {
    const { memoryService, config, logger } = createServices();
    const scheduler = new Scheduler(memoryService, config, logger);
    scheduler.start();
    const mcpServer = new McpServer(memoryService, logger);
    await mcpServer.start();
  });

program.parse();
