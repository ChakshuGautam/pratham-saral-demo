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
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineDescription, setPipelineDescription] = useState('');
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

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
    if (!pipelineName.trim()) {
      setError('Pipeline name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = selectedPipeline
        ? `/api/pipelines/${selectedPipeline.id}`
        : '/api/pipelines';
      const method = selectedPipeline ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pipelineName,
          description: pipelineDescription,
          transformer_ids: selectedPipeline?.transformer_ids || [],
        }),
      });

      if (!response.ok) throw new Error('Failed to save pipeline');
      await fetchPipelines();
      handleNewPipeline();
    } catch (err) {
      setError('Failed to save pipeline');
    } finally {
      setLoading(false);
    }
  };

  const handleNewPipeline = () => {
    setSelectedPipeline(null);
    setPipelineName('');
    setPipelineDescription('');
  };

  const handleSelectPipeline = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setPipelineName(pipeline.name);
    setPipelineDescription(pipeline.description || '');
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
                onClick={handleNewPipeline}
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
                <div
                  key={p.id}
                  onClick={() => handleSelectPipeline(p)}
                  className={`p-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                    selectedPipeline?.id === p.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-800">{p.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePipeline(p.id); }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  {p.description && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{p.description}</p>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {p.transformer_ids?.length || 0} transformer(s)
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
          <div className="flex-1 flex flex-col bg-white">
            {/* Pipeline Form */}
            <div className="p-4 bg-white border-b border-gray-200 flex gap-4">
              <input
                type="text"
                placeholder="Pipeline name"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800"
              />
              <input
                type="text"
                placeholder="Description"
                value={pipelineDescription}
                onChange={(e) => setPipelineDescription(e.target.value)}
                className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800"
              />
              <button
                onClick={handleSavePipeline}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
              >
                {selectedPipeline ? 'Update' : 'Create'}
              </button>
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Pipeline Editor */}
            <div className="flex-1 p-6 overflow-auto">
              {selectedPipeline ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Transformer Chain
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add transformers to this pipeline. They will be executed in order.
                  </p>

                  {/* Current transformers in pipeline */}
                  <div className="space-y-2 mb-6">
                    {selectedPipeline.transformer_ids?.length > 0 ? (
                      selectedPipeline.transformer_ids.map((tid, idx) => {
                        const t = transformers.find(tr => tr.id === tid);
                        return (
                          <div key={idx} className="flex items-center bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <span className="font-medium text-gray-800">{t?.name || `Unknown (${tid})`}</span>
                              {t?.description && (
                                <p className="text-xs text-gray-500">{t.description}</p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveFromPipeline(selectedPipeline.id, idx)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                        No transformers added yet
                      </div>
                    )}
                  </div>

                  {/* Add transformer dropdown */}
                  <div className="flex gap-2">
                    <select
                      id="add-transformer-select"
                      className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-sm text-gray-800"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddToPipeline(selectedPipeline.id, parseInt(e.target.value));
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="">Select a transformer to add...</option>
                      {transformers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center h-full">
                  <div className="text-center text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-lg mb-2">Create or select a pipeline</p>
                    <p className="text-sm">Enter a name above and click Create, or select an existing pipeline from the sidebar</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransformerIDEPage;
