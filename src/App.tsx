/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { 
  FileJson, 
  ShieldCheck, 
  PlayCircle, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle,
  Code2,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [swaggerJson, setSwaggerJson] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isGeneratingFullSuite, setIsGeneratingFullSuite] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateFullSuite = async () => {
    if (!swaggerJson) {
      setError('Please provide a Swagger JSON');
      return;
    }

    setIsGeneratingFullSuite(true);
    setError(null);

    try {
      const swagger = JSON.parse(swaggerJson);
      const host = baseUrl || swagger.host || 'localhost:3000';
      const basePath = swagger.basePath || '';
      
      // Better protocol detection
      let protocol = 'https://';
      if (host.includes('localhost') || host.includes('127.0.0.1')) {
        protocol = 'http://';
      }
      
      const cleanHost = host.replace(/^https?:\/\//, '');
      const fullBaseUrl = host.startsWith('http') ? host : `${protocol}${cleanHost}`;
      const finalBaseUrl = `${fullBaseUrl.replace(/\/$/, '')}${basePath}`;

      let code = `import { test, expect } from '@playwright/test';\n\n`;
      
      code += `// Configuration de l'URL de base\n`;
      code += `const baseURL = '${finalBaseUrl}';\n\n`;
      
      code += `test.use({\n`;
      code += `  baseURL,\n`;
      if (username && password) {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        code += `  extraHTTPHeaders: {\n`;
        code += `    'Authorization': 'Basic ${auth}',\n`;
        code += `  },\n`;
      }
      code += `});\n\n`;

      const paths = swagger.paths || {};
      
      Object.keys(paths).forEach((path) => {
        const methods = paths[path];
        Object.keys(methods).forEach((method) => {
          if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
            const operation = methods[method];
            const testName = operation.summary || `${method.toUpperCase()} ${path}`;
            const description = operation.description || '';

            code += `/**\n * ${testName}\n`;
            if (description) code += ` * ${description}\n`;
            code += ` */\n`;
            code += `test('${method.toUpperCase()} ${path}', async ({ request }) => {\n`;
            
            // Prepare request options
            let options = '';
            if (['post', 'put', 'patch'].includes(method.toLowerCase())) {
              // Try to generate a dummy body if schema exists
              let body = {};
              if (operation.parameters) {
                const bodyParam = operation.parameters.find((p: any) => p.in === 'body');
                if (bodyParam && bodyParam.schema) {
                  const schema = bodyParam.schema;
                  if (schema.properties) {
                    Object.keys(schema.properties).forEach(prop => {
                      const p = schema.properties[prop];
                      if (p.type === 'string') (body as any)[prop] = 'string';
                      else if (p.type === 'number' || p.type === 'integer') (body as any)[prop] = 0;
                      else if (p.type === 'boolean') (body as any)[prop] = true;
                    });
                  }
                }
              }
              options = `, {\n    data: ${JSON.stringify(body, null, 6).replace(/\n/g, '\n    ')}\n  }`;
            }

            // Replace path parameters with placeholders if any
            const finalPath = path.replace(/{([^}]+)}/g, '1');

            code += `  const response = await request.${method.toLowerCase()}(\`\${baseURL}${finalPath}\`${options});\n`;
            code += `  expect(response.ok()).toBeTruthy();\n`;
            code += `});\n\n`;
          }
        });
      });

      setGeneratedCode(code);
    } catch (err) {
      console.error(err);
      setError('Failed to parse Swagger JSON. Please ensure it is valid JSON.');
    } finally {
      setIsGeneratingFullSuite(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <PlayCircle className="text-blue-600 w-8 h-8" />
              Playwright Architect
            </h1>
            <p className="text-slate-500 mt-1">Transform Swagger definitions into production-ready Playwright tests.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Input & Config */}
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                <FileJson className="w-5 h-5 text-blue-500" />
                Swagger / OpenAPI Definition
              </div>
              <textarea
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder='Paste your Swagger JSON here...'
                value={swaggerJson}
                onChange={(e) => setSwaggerJson(e.target.value)}
              />
              <div className="flex gap-3">
                <button
                  onClick={generateFullSuite}
                  disabled={isGeneratingFullSuite || !swaggerJson}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  title="Generate tests for ALL endpoints"
                >
                  {isGeneratingFullSuite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Generate Full Test Suite
                </button>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2 text-slate-700 font-semibold mb-2">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                Test Configuration
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base URL</label>
                  <input
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://api.example.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Basic Auth User</label>
                    <input
                      type="text"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Basic Auth Pass</label>
                    <input
                      type="password"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Code Output */}
          <div className="space-y-6">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            <AnimatePresence>
              {generatedCode && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Code2 className="w-4 h-4" />
                        api-tests.spec.ts
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => copyToClipboard(generatedCode)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-700"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => downloadFile(generatedCode, 'api-tests.spec.ts')}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-700"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <pre className="p-6 overflow-x-auto text-sm font-mono text-blue-300 custom-scrollbar max-h-[600px]">
                    <code>{generatedCode}</code>
                  </pre>
                </motion.section>
              )}
            </AnimatePresence>

            {!generatedCode && !isGeneratingFullSuite && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 border-2 border-dashed border-slate-200 rounded-xl">
                <FileJson className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Analyze a Swagger JSON to generate a full test suite.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
