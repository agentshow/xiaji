import { Logger } from '../utils/logger.js';

export interface AilyAgentConfig {
  agentId: string;
}

export interface AilyTokenResponse {
  access_token: string;
  expires_in: number;
}

export class AilyService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async getAccessToken(config: AilyAgentConfig): Promise<string> {
    this.logger.info(`Getting access token for Aily agent: ${config.agentId}`);
    const url = `https://aily.feishu.cn/open-apis/agent/v1/token`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: config.agentId }),
    });
    if (!response.ok) {
      this.logger.error(`Aily token request failed: ${response.status}`);
      throw new Error(`Aily token request failed with status ${response.status}`);
    }
    const data = await response.json() as { code: number; data: AilyTokenResponse };
    if (data.code !== 0) {
      this.logger.error(`Aily API error: code ${data.code}`);
      throw new Error(`Aily API error: code ${data.code}`);
    }
    this.logger.info('Aily access token obtained successfully');
    return data.data.access_token;
  }

  async validateAgent(agentId: string): Promise<boolean> {
    try {
      await this.getAccessToken({ agentId });
      return true;
    } catch {
      return false;
    }
  }
}
