/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface SwaggerOperation {
  summary?: string;
  description?: string;
  parameters?: Array<{
    in?: string;
    schema?: { properties?: Record<string, { type?: string }> };
  }>;
  requestBody?: {
    content?: Record<string, { schema?: { properties?: Record<string, { type?: string }> } }>;
  };
}

interface SwaggerDocument {
  host?: string;
  basePath?: string;
  servers?: Array<{ url?: string }>;
  paths?: Record<string, Record<string, SwaggerOperation>>;
}

export interface GenerateOptions {
  baseUrlOverride?: string;
  username?: string;
  password?: string;
  getOnly?: boolean;
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'];
const BODY_METHODS = ['post', 'put', 'patch'];

export function generateTestSuite(swaggerJson: string, options: GenerateOptions): string {
  const swagger: SwaggerDocument = JSON.parse(swaggerJson);
  const baseUrl = resolveBaseUrl(swagger, options.baseUrlOverride);

  let code = `import { test, expect } from '@playwright/test';\n\n`;
  code += `// Configuration de l'URL de base\n`;
  code += `const baseURL = '${baseUrl}';\n\n`;
  code += `test.use({\n  baseURL,\n${buildAuthHeaderBlock(options.username, options.password)}});\n\n`;

  const allowedMethods = options.getOnly ? ['get'] : HTTP_METHODS;
  const paths = swagger.paths || {};
  for (const path of Object.keys(paths)) {
    const methods = paths[path];
    for (const method of Object.keys(methods)) {
      if (!allowedMethods.includes(method.toLowerCase())) continue;
      code += buildTest(path, method, methods[method]);
    }
  }

  return code;
}

function resolveBaseUrl(swagger: SwaggerDocument, override?: string): string {
  const raw = override || swagger.servers?.[0]?.url || buildLegacyHostUrl(swagger);
  const hasProtocol = /^https?:\/\//i.test(raw);
  const protocol = hasProtocol ? '' : isLocal(raw) ? 'http://' : 'https://';
  return `${protocol}${raw}`.replace(/\/$/, '');
}

function buildLegacyHostUrl(swagger: SwaggerDocument): string {
  const host = swagger.host || 'localhost:3000';
  const basePath = swagger.basePath || '';
  return `${host}${basePath}`;
}

function isLocal(host: string): boolean {
  return host.includes('localhost') || host.includes('127.0.0.1');
}

function buildAuthHeaderBlock(username?: string, password?: string): string {
  if (!username || !password) return '';
  const token = btoa(`${username}:${password}`);
  return `  extraHTTPHeaders: {\n    'Authorization': 'Basic ${token}',\n  },\n`;
}

function buildTest(path: string, method: string, operation: SwaggerOperation): string {
  const testName = operation.summary || `${method.toUpperCase()} ${path}`;
  const description = operation.description || '';
  const finalPath = path.replace(/\{([^}]+)\}/g, '1');

  let block = `/**\n * ${testName}\n`;
  if (description) block += ` * ${description}\n`;
  block += ` */\n`;
  block += `test('${method.toUpperCase()} ${path}', async ({ request }) => {\n`;

  const requestOptions = BODY_METHODS.includes(method.toLowerCase())
    ? `, {\n    data: ${JSON.stringify(buildRequestBody(operation), null, 6).replace(/\n/g, '\n    ')}\n  }`
    : '';

  block += `  const response = await request.${method.toLowerCase()}(\`\${baseURL}${finalPath}\`${requestOptions});\n`;
  block += `  expect(response.ok()).toBeTruthy();\n`;
  block += `});\n\n`;
  return block;
}

function buildRequestBody(operation: SwaggerOperation): Record<string, unknown> {
  const schema =
    operation.requestBody?.content?.['application/json']?.schema ??
    operation.parameters?.find((p) => p.in === 'body')?.schema;

  const body: Record<string, unknown> = {};
  if (!schema?.properties) return body;

  for (const [prop, def] of Object.entries(schema.properties)) {
    body[prop] = exampleValueForType(def.type);
  }
  return body;
}

function exampleValueForType(type?: string): string | number | boolean {
  switch (type) {
    case 'integer':
    case 'number':
      return 0;
    case 'boolean':
      return true;
    default:
      return 'string';
  }
}
