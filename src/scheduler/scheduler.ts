import * as cron from 'node-cron';
import { MemoryService } from '../memory/memory-service';
import { ConfigService } from '../config/config-service';
import { Logger } from '../utils/logger';

export class Scheduler {
  private memoryService: MemoryService;
  private config: ConfigService;
  private logger: Logger;
  private task: cron.ScheduledTask | null = null;

  constructor(memoryService: MemoryService, config: ConfigService, logger: Logger) {
    this.memoryService = memoryService;
    this.config = config;
    this.logger = logger;
  }

  start(): void {
    const cfg = this.config.get();
    if (!cfg.sync.enabled) {
      this.logger.info('Sync scheduler is disabled');
      return;
    }
    this.task = cron.schedule(cfg.sync.cron, async () => {
      this.logger.info('Scheduled sync started');
      try {
        const result = await this.memoryService.sync();
        this.logger.info(`Scheduled sync completed: ${result.count} items`);
      } catch (err) {
        this.logger.error(`Scheduled sync failed: ${String(err)}`);
      }
    });
    this.logger.info(`Sync scheduler started with cron: ${cfg.sync.cron}`);
  }

  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.logger.info('Sync scheduler stopped');
    }
  }

  async runNow(): Promise<void> {
    this.logger.info('Manual sync triggered');
    try {
      const result = await this.memoryService.sync();
      this.logger.info(`Manual sync completed: ${result.count} items`);
    } catch (err) {
      this.logger.error(`Manual sync failed: ${String(err)}`);
    }
  }
}
