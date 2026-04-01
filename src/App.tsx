/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  FileJson, 
  ShieldCheck, 
  PlayCircle, 
  Download, 
  Copy, 
  Check, 
  Loader2, 
  AlertCircle,
  Plus,
  Trash2,
  ChevronRight,
  Code2,
  Braces,
  Type,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Scenario {
  id: string;
  name: string;
  description: string;
  method: string;
  path: string;
  expectedStatus: number;
  selected: boolean;
}

type OutputTab = 'tests' | 'types';

export default function App() {
  const [swaggerJson, setSwaggerJson] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isGeneratingScenarios, setIsGeneratingScenarios] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [isGeneratingTypes, setIsGeneratingTypes] = useState(false);
  const [isGeneratingFullSuite, setIsGeneratingFullSuite] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedTypes, setGeneratedTypes] = useState('');
  const [activeTab, setActiveTab] = useState<OutputTab>('tests');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateScenarios = async () => {
    if (!swaggerJson) {
      setError('Please provide a Swagger JSON');
      return;
    }

    setIsGeneratingScenarios(true);
    setError(null);
    setGeneratedCode('');
    setGeneratedTypes('');

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analyze this Swagger/OpenAPI JSON and suggest 5-8 critical API test scenarios. 
        Return the result as a JSON array of objects with these properties: 
        name (string), description (string), method (string, e.g. GET, POST), path (string), expectedStatus (number).
        
        Swagger JSON:
        ${swaggerJson}`,
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(response.text || '[]');
      setScenarios(result.map((s: any, index: number) => ({
        ...s,
        id: `scenario-${index}`,
        selected: true
      })));
    } catch (err) {
      console.error(err);
      setError('Failed to generate scenarios. Please check your JSON format.');
    } finally {
      setIsGeneratingScenarios(false);
    }
  };

  const generatePlaywrightCode = async () => {
    const selectedScenarios = scenarios.filter(s => s.selected);
    if (selectedScenarios.length === 0) {
      setError('Please select at least one scenario');
      return;
    }

    setIsGeneratingCode(true);
    setError(null);
    setActiveTab('tests');

    try {
      const authHeader = username && password 
        ? `Basic \${Buffer.from('${username}:${password}').toString('base64')}`
        : null;

      const prompt = `Generate a Playwright API test file in TypeScript.
      Base URL: ${baseUrl || 'http://localhost:3000'}
      ${authHeader ? `Authentication: Basic Auth with username "${username}" and password "${password}"` : 'Authentication: None'}
      
      Scenarios to implement:
      ${JSON.stringify(selectedScenarios, null, 2)}
      
      Requirements:
      1. Use @playwright/test
      2. Include proper setup for Basic Auth in the request headers if provided.
      3. Each scenario should be a separate test() block.
      4. Include comments explaining each test.
      5. Use descriptive test names.
      6. Return ONLY the code block, no markdown formatting.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setGeneratedCode(response.text || '');
    } catch (err) {
      console.error(err);
      setError('Failed to generate Playwright code.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const generateFullSuite = async () => {
    if (!swaggerJson) {
      setError('Please provide a Swagger JSON');
      return;
    }

    setIsGeneratingFullSuite(true);
    setError(null);
    setActiveTab('tests');

    try {
      const authHeader = username && password 
        ? `Basic \${Buffer.from('${username}:${password}').toString('base64')}`
        : null;

      const prompt = `Generate a COMPREHENSIVE Playwright API test suite in TypeScript that tests ALL endpoints defined in the provided Swagger JSON.
      Focus on "passing" calls (successful 2xx responses).
      
      Base URL: ${baseUrl || 'http://localhost:3000'}
      ${authHeader ? `Authentication: Basic Auth with username "${username}" and password "${password}"` : 'Authentication: None'}
      
      Requirements:
      1. Use @playwright/test.
      2. Iterate through EVERY path and method in the Swagger JSON.
      3. For each endpoint, create a test that expects a successful status code (usually 200 or 201).
      4. Provide realistic mock data for request bodies if required by the Swagger.
      5. Include proper Basic Auth headers if provided.
      6. Organize tests using describe() blocks if appropriate (e.g., grouped by resource).
      7. Return ONLY the TypeScript code, no markdown formatting.
      
      Swagger JSON:
      ${swaggerJson}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setGeneratedCode(response.text || '');
      setScenarios([]); // Clear scenarios to focus on the full suite
    } catch (err) {
      console.error(err);
      setError('Failed to generate full test suite.');
    } finally {
      setIsGeneratingFullSuite(false);
    }
  };

  const generateTypeScriptTypes = async () => {
    if (!swaggerJson) {
      setError('Please provide a Swagger JSON');
      return;
    }

    setIsGeneratingTypes(true);
    setError(null);
    setActiveTab('types');

    try {
      const prompt = `Convert this Swagger/OpenAPI JSON into clean, well-structured TypeScript interfaces and types.
      Include types for all schemas, request bodies, and responses.
      Use standard TypeScript naming conventions (PascalCase for interfaces).
      Return ONLY the TypeScript code, no markdown formatting.
      
      Swagger JSON:
      ${swaggerJson}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      setGeneratedTypes(response.text || '');
    } catch (err) {
      console.error(err);
      setError('Failed to generate TypeScript types.');
    } finally {
      setIsGeneratingTypes(false);
    }
  };

  const toggleScenario = (id: string) => {
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
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
            <p className="text-slate-500 mt-1">Transform Swagger definitions into production-ready Playwright tests and TypeScript types.</p>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={generateScenarios}
                  disabled={isGeneratingScenarios || !swaggerJson}
                  className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {isGeneratingScenarios ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  Suggest Scenarios
                </button>
                <button
                  onClick={generateFullSuite}
                  disabled={isGeneratingFullSuite || !swaggerJson}
                  className="py-2.5 px-4 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 text-sm"
                  title="Generate tests for ALL endpoints"
                >
                  {isGeneratingFullSuite ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Full Suite (All)
                </button>
                <button
                  onClick={generateTypeScriptTypes}
                  disabled={isGeneratingTypes || !swaggerJson}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-slate-200 text-sm"
                >
                  {isGeneratingTypes ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Braces className="w-4 h-4" />
                  )}
                  Extract Types
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

          {/* Right Column: Scenarios & Code */}
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

            <AnimatePresence mode="wait">
              {scenarios.length > 0 && (
                <motion.section 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                      <Plus className="w-5 h-5 text-orange-500" />
                      Test Scenarios
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {scenarios.filter(s => s.selected).length} selected
                    </span>
                  </div>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {scenarios.map((scenario) => (
                      <div 
                        key={scenario.id}
                        onClick={() => toggleScenario(scenario.id)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-start gap-3 ${
                          scenario.selected 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          scenario.selected ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                        }`}>
                          {scenario.selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              scenario.method === 'GET' ? 'bg-green-100 text-green-700' :
                              scenario.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {scenario.method}
                            </span>
                            <h4 className="text-sm font-semibold text-slate-800">{scenario.name}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{scenario.description}</p>
                          <code className="text-[10px] text-slate-400 mt-2 block font-mono">{scenario.path}</code>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={generatePlaywrightCode}
                    disabled={isGeneratingCode || scenarios.filter(s => s.selected).length === 0}
                    className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Code2 className="w-5 h-5" />
                    )}
                    Generate Playwright Code
                  </button>
                </motion.section>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {(generatedCode || generatedTypes) && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-900 rounded-xl shadow-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
                    <div className="flex gap-4">
                      {generatedCode && (
                        <button 
                          onClick={() => setActiveTab('tests')}
                          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                            activeTab === 'tests' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Code2 className="w-4 h-4" />
                          api-tests.spec.ts
                        </button>
                      )}
                      {generatedTypes && (
                        <button 
                          onClick={() => setActiveTab('types')}
                          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                            activeTab === 'types' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Braces className="w-4 h-4" />
                          types.ts
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => copyToClipboard(activeTab === 'tests' ? generatedCode : generatedTypes)}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-700"
                        title="Copy to clipboard"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => downloadFile(
                          activeTab === 'tests' ? generatedCode : generatedTypes, 
                          activeTab === 'tests' ? 'api-tests.spec.ts' : 'types.ts'
                        )}
                        className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-slate-700"
                        title="Download file"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <pre className="p-6 overflow-x-auto text-sm font-mono text-blue-300 custom-scrollbar max-h-[600px]">
                    <code>{activeTab === 'tests' ? generatedCode : generatedTypes}</code>
                  </pre>
                </motion.section>
              )}
            </AnimatePresence>

            {!scenarios.length && !isGeneratingScenarios && !generatedTypes && !isGeneratingTypes && !isGeneratingFullSuite && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-20 border-2 border-dashed border-slate-200 rounded-xl">
                <FileJson className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Analyze a Swagger JSON to see suggested scenarios, generate a full suite, or extract types.</p>
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
