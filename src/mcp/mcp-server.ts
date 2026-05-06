import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { MemoryService } from '../memory/memory-service.js';
import { PlatformSource } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class McpServer {
  private server: Server;
  private memoryService: MemoryService;
  private logger: Logger;

  constructor(memoryService: MemoryService, logger: Logger) {
    this.memoryService = memoryService;
    this.logger = logger;
    this.server = new Server(
      { name: 'xiaji', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'sync',
          description: '触发记忆同步，从各平台采集最新数据',
          inputSchema: {
            type: 'object',
            properties: {
              platforms: {
                type: 'array',
                items: { type: 'string' },
                description: '要同步的平台列表，默认全部',
              },
              force: {
                type: 'boolean',
                description: '是否强制全量同步，默认 false',
              },
            },
          },
        },
        {
          name: 'query',
          description: '自然语言查询记忆',
          inputSchema: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: '自然语言查询文本',
              },
              timeRange: {
                type: 'object',
                properties: {
                  start: { type: 'string', description: '开始时间 ISO 8601' },
                  end: { type: 'string', description: '结束时间 ISO 8601' },
                },
              },
              platforms: {
                type: 'array',
                items: { type: 'string' },
                description: '平台筛选',
              },
              limit: {
                type: 'number',
                description: '返回数量，默认 10，最大 100',
              },
            },
            required: ['text'],
          },
        },
        {
          name: 'add',
          description: '手动添加记忆',
          inputSchema: {
            type: 'object',
            properties: {
              content: {
                type: 'string',
                description: '记忆内容',
              },
              time: {
                type: 'string',
                description: '时间，默认当前时间 ISO 8601',
              },
              platform: {
                type: 'string',
                description: '平台，默认 manual',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: '标签',
              },
            },
            required: ['content'],
          },
        },
        {
          name: 'list',
          description: '分页列出记忆',
          inputSchema: {
            type: 'object',
            properties: {
              timeRange: {
                type: 'object',
                properties: {
                  start: { type: 'string' },
                  end: { type: 'string' },
                },
              },
              platforms: {
                type: 'array',
                items: { type: 'string' },
              },
              limit: {
                type: 'number',
                description: '返回数量，默认 20，最大 100',
              },
              offset: {
                type: 'number',
                description: '偏移量，默认 0',
              },
            },
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case 'sync': {
            const result = await this.memoryService.sync(
              args?.platforms as PlatformSource[] | undefined,
              args?.force as boolean | undefined,
            );
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'query': {
            const result = await this.memoryService.query(args?.text as string, {
              timeRange: args?.timeRange as { start?: string; end?: string } | undefined,
              platforms: args?.platforms as PlatformSource[] | undefined,
              limit: args?.limit as number | undefined,
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'add': {
            const result = await this.memoryService.add(args?.content as string, {
              time: args?.time as string | undefined,
              platform: args?.platform as string | undefined,
              tags: args?.tags as string[] | undefined,
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          case 'list': {
            const result = this.memoryService.list({
              timeRange: args?.timeRange as { start?: string; end?: string } | undefined,
              platforms: args?.platforms as PlatformSource[] | undefined,
              limit: args?.limit as number | undefined,
              offset: args?.offset as number | undefined,
            });
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (err) {
        const msg = String(err);
        this.logger.error(`Tool ${name} failed: ${msg}`);
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: false, error: msg }) }],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('MCP Server started');
  }
}
