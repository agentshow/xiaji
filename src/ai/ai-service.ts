import { Logger } from '../utils/logger';

export interface AiSummaryOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class AiService {
  private logger: Logger;
  private options: AiSummaryOptions;

  constructor(logger: Logger, options: AiSummaryOptions) {
    this.logger = logger;
    this.options = {
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      ...options,
    };
  }

  async summarize(content: string, maxLength: number = 200): Promise<string | null> {
    if (!this.options.apiKey) {
      this.logger.warn('No API key configured for AI summary');
      return null;
    }
    try {
      const prompt = `请用不超过${maxLength}个字的中文总结以下内容的核心要点，只输出总结，不要其他内容：\n\n${content}`;
      const response = await this.callApi(prompt);
      this.logger.debug('AI summary generated successfully');
      return response;
    } catch (err) {
      this.logger.error(`AI summary failed: ${String(err)}`);
      return null;
    }
  }

  async generateTitle(content: string): Promise<string> {
    if (!this.options.apiKey) {
      return content.slice(0, 50);
    }
    try {
      const prompt = `请为以下内容生成一个简洁的中文标题（不超过30个字），只输出标题，不要其他内容：\n\n${content}`;
      const response = await this.callApi(prompt);
      return response || content.slice(0, 50);
    } catch {
      return content.slice(0, 50);
    }
  }

  private async callApi(prompt: string): Promise<string> {
    const url = `${this.options.baseUrl}/chat/completions`;
    const body = JSON.stringify({
      model: this.options.model,
      messages: [
        { role: 'system', content: '你是一个专业的文本摘要助手，输出简洁准确的中文摘要。' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.options.apiKey}`,
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content || '';
  }
}
