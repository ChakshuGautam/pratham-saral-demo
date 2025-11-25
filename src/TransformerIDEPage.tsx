import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface Transformer {
  id: number;
  name: string;
  description: string;
  code: string;
  input_schema?: any;
  output_schema?: any;
}

interface Pipeline {
  id: number;
  name: string;
  description: string;
  transformer_ids: number[];
  transformers?: Transformer[];
}

const defaultCode = `// Transformer function
// 'input' contains the data from the previous step (HTML string or JSON object)
// Return the transformed output

// Example: Extract all headings from HTML
const parser = new DOMParser();
const doc = parser.parseFromString(input, 'text/html');
const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));

return {
  headings: headings.map(h => ({
    level: h.tagName.toLowerCase(),
    text: h.textContent?.trim()
  }))
};
`;

const TransformerIDEPage: React.FC = () => {
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedTransformer, setSelectedTransformer] = useState<Transformer | null>(null);
  const [code, setCode] = useState(defaultCode);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [testInput, setTestInput] = useState('<h1>Test Heading</h1><p>Some content</p>');
  const [testOutput, setTestOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transformers' | 'pipelines'>('transformers');

  useEffect(() => {
    fetchTransformers();
    fetchPipelines();
  }, []);

  const fetchTransformers = async () => {
    try {
      const response = await fetch('/api/transformers');
      const data = await response.json();
      setTransformers(data.transformers || []);
    } catch (err) {
      console.error('Failed to fetch transformers:', err);
    }
  };

  const fetchPipelines = async () => {
    try {
      const response = await fetch('/api/pipelines');
      const data = await response.json();
      setPipelines(data.pipelines || []);
    } catch (err) {
      console.error('Failed to fetch pipelines:', err);
    }
  };

  const handleSaveTransformer = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = selectedTransformer
        ? `/api/transformers/${selectedTransformer.id}`
        : '/api/transformers';
      const method = selectedTransformer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, code }),
      });

      if (!response.ok) {
        throw new Error('Failed to save transformer');
      }

      await fetchTransformers();
      setSelectedTransformer(null);
      setName('');
      setDescription('');
      setCode(defaultCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransformer = async (id: number) => {
    if (!confirm('Are you sure you want to delete this transformer?')) return;

    try {
      await fetch(`/api/transformers/${id}`, { method: 'DELETE' });
      await fetchTransformers();
      if (selectedTransformer?.id === id) {
        setSelectedTransformer(null);
        setName('');
        setDescription('');
        setCode(defaultCode);
      }
    } catch (err) {
      setError('Failed to delete transformer');
    }
  };

  const handleSelectTransformer = (transformer: Transformer) => {
    setSelectedTransformer(transformer);
    setName(transformer.name);
    setDescription(transformer.description || '');
    setCode(transformer.code);
  };

  const handleTestCode = async () => {
    setLoading(true);
    setError(null);

    try {
      // For testing, we execute locally using Function constructor
      const fn = new Function('input', `"use strict"; ${code}`);
      const result = fn(testInput);
      setTestOutput(JSON.stringify(result, null, 2));
    } catch (err) {
      setTestOutput(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTransformer = () => {
    setSelectedTransformer(null);
    setName('');
    setDescription('');
    setCode(defaultCode);
  };

  // Pipeline management
  const handleSavePipeline = async () => {
    const pipelineName = prompt('Enter pipeline name:');
    if (!pipelineName) return;

    try {
      const response = await fetch('/api/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pipelineName,
          description: '',
          transformer_ids: [],
        }),
      });

      if (!response.ok) throw new Error('Failed to create pipeline');
      await fetchPipelines();
    } catch (err) {
      setError('Failed to create pipeline');
    }
  };

  const handleAddToPipeline = async (pipelineId: number, transformerId: number) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;

    const newIds = [...(pipeline.transformer_ids || []), transformerId];

    try {
      await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transformer_ids: newIds }),
      });
      await fetchPipelines();
    } catch (err) {
      setError('Failed to update pipeline');
    }
  };

  const handleRemoveFromPipeline = async (pipelineId: number, index: number) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (!pipeline) return;

    const newIds = pipeline.transformer_ids.filter((_, i) => i !== index);

    try {
      await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transformer_ids: newIds }),
      });
      await fetchPipelines();
    } catch (err) {
      setError('Failed to update pipeline');
    }
  };

  const handleDeletePipeline = async (id: number) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;

    try {
      await fetch(`/api/pipelines/${id}`, { method: 'DELETE' });
      await fetchPipelines();
    } catch (err) {
      setError('Failed to delete pipeline');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">Transformer IDE</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('transformers')}
              className={`px-4 py-2 rounded font-medium text-sm ${activeTab === 'transformers' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Transformers
            </button>
            <button
              onClick={() => setActiveTab('pipelines')}
              className={`px-4 py-2 rounded font-medium text-sm ${activeTab === 'pipelines' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              Pipelines
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            {activeTab === 'transformers' ? (
              <button
                onClick={handleNewTransformer}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
              >
                + New Transformer
              </button>
            ) : (
              <button
                onClick={handleSavePipeline}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium"
              >
                + New Pipeline
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'transformers' ? (
              transformers.map(t => (
                <div
                  key={t.id}
                  onClick={() => handleSelectTransformer(t)}
                  className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                    selectedTransformer?.id === t.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">{t.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTransformer(t.id); }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{t.description}</p>
                  )}
                </div>
              ))
            ) : (
              pipelines.map(p => (
                <div key={p.id} className="p-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    <button
                      onClick={() => handleDeletePipeline(p.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {p.transformer_ids?.map((tid, idx) => {
                      const t = transformers.find(tr => tr.id === tid);
                      return (
                        <div key={idx} className="flex items-center text-xs bg-gray-100 rounded px-2 py-1">
                          <span className="text-gray-500 mr-2">{idx + 1}.</span>
                          <span className="flex-1 text-gray-700">{t?.name || `Unknown (${tid})`}</span>
                          <button
                            onClick={() => handleRemoveFromPipeline(p.id, idx)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddToPipeline(p.id, parseInt(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="w-full bg-gray-100 text-gray-700 text-xs rounded px-2 py-1 mt-2 border border-gray-300"
                      defaultValue=""
                    >
                      <option value="">+ Add transformer...</option>
                      {transformers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        {activeTab === 'transformers' && (
          <div className="flex-1 flex flex-col">
            {/* Transformer Info */}
            <div className="p-4 bg-white border-b border-gray-200 flex gap-4">
              <input
                type="text"
                placeholder="Transformer name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800"
              />
              <input
                type="text"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800"
              />
              <button
                onClick={handleSaveTransformer}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {selectedTransformer ? 'Update' : 'Save'}
              </button>
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Editor */}
            <div className="flex-1 flex">
              <div className="flex-1 flex flex-col">
                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 text-sm text-gray-600 font-medium">
                  Code Editor
                </div>
                <Editor
                  height="100%"
                  defaultLanguage="javascript"
                  theme="light"
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                  }}
                />
              </div>

              {/* Test Panel */}
              <div className="w-96 border-l border-gray-200 flex flex-col bg-white">
                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
                  <span className="text-sm text-gray-600 font-medium">Test Input</span>
                  <button
                    onClick={handleTestCode}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium disabled:opacity-50"
                  >
                    Run Test
                  </button>
                </div>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="flex-1 bg-gray-50 p-4 text-sm font-mono resize-none border-b border-gray-200 text-gray-800"
                  placeholder="Enter test input (HTML or JSON)..."
                />
                <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 text-sm text-gray-600 font-medium">
                  Output
                </div>
                <pre className="flex-1 bg-gray-50 p-4 text-sm font-mono overflow-auto text-gray-800">
                  {testOutput || 'Run test to see output...'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Pipelines Tab Content */}
        {activeTab === 'pipelines' && (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">Select a pipeline from the sidebar</p>
              <p className="text-sm">Add transformers to create a processing pipeline</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransformerIDEPage;
