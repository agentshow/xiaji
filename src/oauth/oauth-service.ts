import * as http from 'node:http';
import * as url from 'node:url';
import { Logger } from '../utils/logger';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class OAuthService {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  getAuthorizationUrl(config: OAuthConfig, state: string): string {
    const params = new url.URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });
    return `${config.authUrl}?${params.toString()}`;
  }

  async exchangeCode(config: OAuthConfig, code: string): Promise<TokenResponse> {
    const body = new url.URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    });
    const response = await this.httpPost(config.tokenUrl, body.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    if (response.statusCode !== 200) {
      this.logger.error(`OAuth token exchange failed: ${response.statusCode}`);
      throw new Error(`OAuth token exchange failed with status ${response.statusCode}`);
    }
    const data = JSON.parse(response.body) as TokenResponse;
    this.logger.info('OAuth token exchange successful');
    return data;
  }

  async refreshToken(config: OAuthConfig, refreshToken: string): Promise<TokenResponse> {
    const body = new url.URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    });
    const response = await this.httpPost(config.tokenUrl, body.toString(), {
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    if (response.statusCode !== 200) {
      this.logger.error(`Token refresh failed: ${response.statusCode}`);
      throw new Error(`Token refresh failed with status ${response.statusCode}`);
    }
    const data = JSON.parse(response.body) as TokenResponse;
    this.logger.info('Token refreshed successfully');
    return data;
  }

  startLocalServer(port: number): Promise<{ code: string; state: string }> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const parsed = url.parse(req.url || '', true);
        const query = parsed.query;
        if (query.code && query.state) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body><h1>授权成功！</h1><p>可以关闭此页面。</p></body></html>');
          server.close();
          resolve({ code: query.code as string, state: query.state as string });
        } else if (query.error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body><h1>授权失败</h1><p>${query.error_description || query.error}</p></body></html>`);
          server.close();
          reject(new Error(`OAuth error: ${query.error}`));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });
      server.listen(port, () => {
        this.logger.debug(`OAuth callback server listening on port ${port}`);
      });
      server.on('error', reject);
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth authorization timed out'));
      }, 300000);
    });
  }

  private httpPost(
    requestUrl: string,
    body: string,
    headers: Record<string, string>,
  ): Promise<{ statusCode: number; body: string }> {
    return new Promise((resolve, reject) => {
      const parsed = url.parse(requestUrl);
      const options: http.RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.path,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve({ statusCode: res.statusCode || 500, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
