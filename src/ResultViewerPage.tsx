import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buildBlockMap } from './utils/htmlResolver';
import StructuredContentRenderer from './components/StructuredContentRenderer';
import ContinuousPdfViewer from './components/ContinuousPdfViewer';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

const ResultViewerPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedBboxId, setSelectedBboxId] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      fetchResult();
    }
  }, [taskId]);

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/convert/${taskId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch result');
      }

      // If still processing, poll again
      if (data.status === 'processing') {
        setTimeout(fetchResult, 2000); // Poll every 2 seconds
        return;
      }

      // If failed, show error
      if (data.status === 'failed') {
        throw new Error(data.error || 'Conversion failed');
      }

      setResult(data.result);
      setPdfUrl(data.blob_url || data.pdf_url);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load result');
      setLoading(false);
    }
  };

  // Build block map for content-ref resolution
  const blockMap = useMemo(() => {
    if (!result) return {};
    return buildBlockMap(result);
  }, [result]);

  // Handler for bbox clicks
  const handleBboxClick = (blockId: string) => {
    setSelectedBboxId(blockId);
  };

  // Handler for downloading JSON
  const handleDownloadJson = () => {
    if (!result) return;

    const dataStr = JSON.stringify(result, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `structura-result-${taskId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading result...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Back Button and Download JSON */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/history')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to History
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800">Conversion Result</h1>
            <p className="text-sm text-gray-600">Task ID: {taskId?.slice(0, 16)}...</p>
          </div>
          {result && (
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download JSON
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side View with Resizable Panels */}
      {pdfUrl && result ? (
        <div className="flex-1 overflow-hidden p-4">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - PDF Viewer with Bbox Overlays */}
            <Panel minSize={20} defaultSize={50}>
              <div className="h-full flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex-1 overflow-auto bg-gray-50">
                  <ContinuousPdfViewer
                    pdfUrl={pdfUrl}
                    jsonData={result}
                    selectedBboxId={selectedBboxId}
                    onBboxClick={handleBboxClick}
                  />
                </div>
              </div>
            </Panel>

            <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-blue-400 transition-colors" />

            {/* Right Panel - Extraction Results */}
            <Panel minSize={20} defaultSize={50}>
              <div className="h-full flex flex-col bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex-1 overflow-auto p-6 bg-white">
                  {result.children && result.children.length > 0 ? (
                    <div className="space-y-8">
                      {result.children.map((page: any, pageIndex: number) => {
                        if (page.block_type !== 'Page') return null;

                        return (
                          <div key={page.id || pageIndex}>
                            <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">
                              Page {pageIndex + 1}
                            </h3>
                            <StructuredContentRenderer
                              page={page}
                              blockMap={blockMap}
                              selectedBboxId={selectedBboxId}
                              onBlockClick={handleBboxClick}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No content found</p>
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          </PanelGroup>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p>No conversion result available</p>
            <button
              onClick={() => navigate('/history')}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              ← Back to History
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultViewerPage;
