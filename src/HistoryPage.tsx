import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface HistoryItem {
  id: number;
  task_id: string;
  pdf_url: string;
  blob_url: string;
  status: string;
  result: any;
  error: string | null;
  created_at: string;
  updated_at: string;
}

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();

    // Set up polling interval to refresh history every 3 seconds
    // This will update processing documents in real-time
    const intervalId = setInterval(() => {
      fetchHistory();
    }, 3000);

    // Clean up interval when component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch history');
      }

      setHistory(data.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleRerun = async (item: HistoryItem) => {
    if (!confirm('Are you sure you want to rerun this conversion? This will discard the existing result.')) {
      return;
    }

    try {
      // Delete the existing record and trigger new conversion
      const response = await fetch('/api/rerun', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId: item.task_id,
          pdfUrl: item.blob_url || item.pdf_url,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to rerun conversion');
      }

      // Refresh history
      fetchHistory();
      alert('Conversion restarted successfully!');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to rerun conversion');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchHistory}
            className="mt-4 text-sm text-red-700 hover:text-red-900 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Conversion History</h1>
          <p className="text-gray-600">View all your PDF conversions</p>
        </div>

        {history.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500">No conversions yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour12: false,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {item.task_id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-3">
                        {item.status === 'completed' ? (
                          <>
                            <button
                              onClick={() => navigate(`/result/${item.task_id}`)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                            >
                              View Result →
                            </button>
                            <button
                              onClick={() => handleRerun(item)}
                              className="text-orange-600 hover:text-orange-900 font-medium"
                            >
                              Rerun
                            </button>
                          </>
                        ) : item.status === 'failed' ? (
                          <>
                            <span className="text-red-600 text-xs">
                              {item.error || 'Conversion failed'}
                            </span>
                            <button
                              onClick={() => handleRerun(item)}
                              className="text-orange-600 hover:text-orange-900 font-medium ml-2"
                            >
                              Rerun
                            </button>
                          </>
                        ) : (
                          <span className="text-blue-600 text-xs">Processing...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPage;
