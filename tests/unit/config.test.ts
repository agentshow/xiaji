import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ConfigService } from '../../src/config/config-service';
import { Logger, LogLevel } from '../../src/utils/logger';

describe('ConfigService', () => {
  let config: ConfigService;
  let logger: Logger;
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = path.join(os.tmpdir(), `xiaji-config-test-${Date.now()}`);
    configPath = path.join(tmpDir, 'config.json');
    logger = new Logger(tmpDir, LogLevel.DEBUG);
    config = new ConfigService(configPath, logger);
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('init', () => {
    it('should create default config', () => {
      config.init();
      const cfg = config.get();
      expect(cfg.version).toBe('1.0');
      expect(cfg.storage.type).toBe('local');
      expect(cfg.sync.enabled).toBe(true);
      expect(cfg.sync.cron).toBe('0 22 * * *');
      expect(cfg.sync.retryCount).toBe(3);
      expect(cfg.sync.retryDelay).toBe(60000);
    });

    it('should persist config to disk', () => {
      config.init();
      expect(fs.existsSync(configPath)).toBe(true);
    });
  });

  describe('getStoragePath', () => {
    it('should expand ~ to home directory', () => {
      config.init();
      const p = config.getStoragePath();
      expect(p).toContain(os.homedir());
      expect(p).not.toContain('~');
    });
  });

  describe('setStoragePath', () => {
    it('should update storage path', () => {
      config.init();
      config.setStoragePath('/custom/path');
      expect(config.get().storage.path).toBe('/custom/path');
    });
  });

  describe('aily agent id management', () => {
    it('should set and get aily agent id', () => {
      config.init();
      config.setAilyAgentId('feishu', 'agent_test_123');
      const agentId = config.getAilyAgentId('feishu');
      expect(agentId).toBe('agent_test_123');
    });

    it('should return undefined for non-existent platform', () => {
      config.init();
      const agentId = config.getAilyAgentId('non-existent');
      expect(agentId).toBeUndefined();
    });

    it('should enable platform when setting agent id', () => {
      config.init();
      config.setAilyAgentId('feishu', 'agent_test_123');
      expect(config.isPlatformEnabled('feishu')).toBe(true);
    });
  });

  describe('updateLastSync', () => {
    it('should update last sync timestamp', () => {
      config.init();
      config.updateLastSync('2026-05-07T22:00:00+08:00');
      expect(config.get().lastSync).toBe('2026-05-07T22:00:00+08:00');
    });
  });

  describe('getSyncPlatforms', () => {
    it('should return default sync platforms', () => {
      config.init();
      const platforms = config.getSyncPlatforms();
      expect(platforms).toContain('feishu-doc');
      expect(platforms).toContain('feishu-minutes');
      expect(platforms).toContain('feishu-calendar');
    });
  });
});
