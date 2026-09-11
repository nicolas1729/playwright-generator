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
  Zap,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateTestSuite } from './lib/testGenerator';

export default function App() {
  const [swaggerJson, setSwaggerJson] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [getOnly, setGetOnly] = useState(true);
  const [swaggerUrl, setSwaggerUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isGeneratingFullSuite, setIsGeneratingFullSuite] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchSwaggerFromUrl = async () => {
    if (!swaggerUrl) return;

    setIsFetchingUrl(true);
    setError(null);

    try {
      const response = await fetch(swaggerUrl);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const text = await response.text();
      const parsed = JSON.parse(text);
      setSwaggerJson(JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.error(err);
      setError('Failed to load JSON from URL. Check the URL and that the server allows cross-origin requests (CORS).');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const generateFullSuite = async () => {
    if (!swaggerJson) {
      setError('Please provide a Swagger JSON');
      return;
    }

    setIsGeneratingFullSuite(true);
    setError(null);
    // Yield once so the loading state actually paints before the (synchronous) generation work.
    await new Promise(requestAnimationFrame);

    try {
      const code = generateTestSuite(swaggerJson, { baseUrlOverride: baseUrl, username, password, getOnly });
      setGeneratedCode(code);
    } catch (err) {
      console.error(err);
      setError('Failed to parse Swagger JSON. Please ensure it is valid JSON.');
    } finally {
      setIsGeneratingFullSuite(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
      setError('Failed to copy to clipboard.');
    }
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
              <div className="flex gap-2">
                <input
                  id="swaggerUrl"
                  type="url"
                  aria-label="Swagger or OpenAPI JSON URL"
                  className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://api.example.com/swagger.json"
                  value={swaggerUrl}
                  onChange={(e) => setSwaggerUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      fetchSwaggerFromUrl();
                    }
                  }}
                />
                <button
                  onClick={fetchSwaggerFromUrl}
                  disabled={isFetchingUrl || !swaggerUrl}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                  title="Load Swagger/OpenAPI JSON from URL"
                >
                  {isFetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Load
                </button>
              </div>
              <textarea
                aria-label="Swagger or OpenAPI JSON definition"
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder='Paste your Swagger JSON here...'
                value={swaggerJson}
                onChange={(e) => setSwaggerJson(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <input
                  id="getOnly"
                  type="checkbox"
                  checked={getOnly}
                  onChange={(e) => setGetOnly(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 outline-none"
                />
                <label htmlFor="getOnly" className="text-sm text-slate-600 select-none">
                  GET requests only
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generateFullSuite}
                  disabled={isGeneratingFullSuite || !swaggerJson}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  title={getOnly ? 'Generate tests for GET endpoints only' : 'Generate tests for ALL endpoints'}
                >
                  {isGeneratingFullSuite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {getOnly ? 'Generate GET Test Suite' : 'Generate Full Test Suite'}
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
                  <label htmlFor="baseUrl" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Base URL</label>
                  <input
                    id="baseUrl"
                    type="text"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="https://api.example.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="username" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Basic Auth User</label>
                    <input
                      id="username"
                      type="text"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Basic Auth Pass</label>
                    <input
                      id="password"
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
