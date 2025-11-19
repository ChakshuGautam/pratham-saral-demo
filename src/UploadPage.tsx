import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { upload } from '@vercel/blob/client';
import { computeFileHash } from './utils/hash';

interface ConversionResult {
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  html_file_id?: string;
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiVersion] = useState<'v2' | 'v3'>('v3'); // Default to v3 API

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError(null);
      setResult(null);
      setTaskId(null);
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const uploadPDF = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Computing PDF hash...');
      const pdfHash = await computeFileHash(selectedFile);
      console.log('PDF hash:', pdfHash);

      // Check if this PDF was already converted
      const cacheCheck = await fetch(`/api/check-cache?hash=${pdfHash}`);
      const cacheData = await cacheCheck.json();

      if (cacheData.exists && cacheData.status === 'completed') {
        console.log('✅ Found cached conversion!');
        setTaskId(cacheData.task_id);
        setResult(cacheData);
        setUploading(false);
        return;
      }

      console.log('Starting client-side upload to Vercel Blob...');

      // Upload directly to Vercel Blob from browser
      const blob = await upload(selectedFile.name, selectedFile, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      console.log('File uploaded to Blob:', blob.url);

      // Now send the blob URL to our convert API
      const response = await fetch('/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blob_url: blob.url,
          output_format: 'json',
          use_llm: 'true',
          pdf_hash: pdfHash,
          api_version: apiVersion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      console.log('Conversion request submitted:', data.request_id);
      setTaskId(data.request_id);

      // Start polling for result
      pollForResult(data.request_id);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  const pollForResult = async (id: string, maxAttempts = 60) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`/api/convert/${id}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setResult(data);
          setUploading(false);
          return;
        } else if (data.status === 'failed') {
          setError(data.error || 'Processing failed');
          setUploading(false);
          return;
        }

        // Still processing, wait 2 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to check status');
        setUploading(false);
        return;
      }
    }

    setError('Timeout waiting for conversion');
    setUploading(false);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploading(false);
    setTaskId(null);
    setResult(null);
    setError(null);
  };


  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Upload Section - Always visible but compact when result is shown */}
      <div className={`flex-shrink-0 ${result ? 'p-4' : 'p-8'}`}>
        {!result && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Upload & Process PDF</h1>
            <p className="text-gray-600">Upload a PDF to extract and view its content</p>
          </div>
        )}

        <div className={`bg-white rounded-lg shadow-md p-6 ${!result && 'mb-8'}`}>
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select PDF File
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/>
                  </svg>
                  <span className="text-sm text-gray-700">{selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                {!uploading && (
                  <button
                    onClick={resetUpload}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}

            {/* Upload Button */}
            <button
              onClick={uploadPDF}
              disabled={!selectedFile || uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Processing Status */}
            {uploading && taskId && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-blue-600">
                    Processing document... (Task ID: {taskId.slice(0, 8)}...)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Completion Message with View Result Button */}
        {result?.status === 'completed' && taskId && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Conversion Complete!</h3>
                <p className="text-sm text-green-700 mb-4">
                  Your PDF has been successfully processed and extracted. View the results to see the side-by-side comparison.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/result/${taskId}`)}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium"
                  >
                    View Result →
                  </button>
                  <button
                    onClick={resetUpload}
                    className="bg-white text-gray-700 px-4 py-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Upload Another PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
