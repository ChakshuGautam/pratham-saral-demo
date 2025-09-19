import React, { useState, useEffect } from 'react';

interface TableData {
  id: string;
  title: string;
  html: string;
}

interface FileData {
  filename: string;
  tables: TableData[];
}

interface PrathamData {
  [key: string]: FileData;
}

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [prathamData, setPrathamData] = useState<PrathamData>({});
  const [loading, setLoading] = useState(true);

  // Map file keys to actual PDF paths
  const getDocumentPath = (fileKey: string): string => {
    const pathMap: { [key: string]: string } = {
      'Rahul_Mock_Grading.pdf': '/pdfs/pratham/Rahul_Mock_Grading.pdf',
      'Kishorshikshan_Language.pdf': '/pdfs/pratham/Kishorshikshan Language-1.pdf',
      'Kishorshikshan_Math.pdf': '/pdfs/pratham/Kishorshikshan Math-1.pdf',
      'Vipul_Demo_Sheet.pdf': '/pdfs/pratham/Vipul_Demo sheet.pdf',
      'Jitendra_Assessment.pdf': '/pdfs/pratham/Jitendra_s tutor assesment grading format.pdf',
      'WhatsApp_Image_2024-08-22_at_10-41-58_jpeg': '/images/pratham/WhatsApp Image 2024-08-22 at 10.41.58.jpeg',
      'WhatsApp_Image_2024-08-22_at_10-42-02_jpeg': '/images/pratham/WhatsApp Image 2024-08-22 at 10.42.02.jpeg',
      'Image_jpeg': '/images/pratham/Image.jpeg'
    };
    
    return pathMap[fileKey] || '';
  };

  const isImageFile = (fileKey: string): boolean => {
    return fileKey.includes('WhatsApp_Image') || fileKey.includes('jpeg') || fileKey === 'Image_jpeg';
  };

  useEffect(() => {
    // Load the pre-processed Pratham data from public directory
    fetch('/pratham-tables.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: PrathamData) => {
        console.log('Loaded Pratham data:', data);
        setPrathamData(data);
        // Select first file by default
        const firstFile = Object.keys(data)[0];
        if (firstFile) {
          setSelectedFile(firstFile);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading Pratham data:', error);
        setLoading(false);
      });
  }, []);

  const handleFileSelect = (fileKey: string) => {
    setSelectedFile(fileKey);
  };

  const selectedData = selectedFile ? prathamData[selectedFile] : null;

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading Pratham data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex">
      {/* Left Panel - Document Display */}
      <div className="w-1/2 bg-white flex flex-col">
        {/* Document Selector */}
        <select
          value={selectedFile}
          onChange={(e) => handleFileSelect(e.target.value)}
          className="w-full p-2 border-b border-gray-300 focus:outline-none focus:border-blue-500 flex-shrink-0"
        >
          <option value="">Select a document...</option>
          {Object.entries(prathamData).map(([fileKey, fileData]) => (
            <option key={fileKey} value={fileKey}>
              {fileData.filename}
            </option>
          ))}
        </select>

        {/* Document Display */}
        {selectedFile && (
          <div className="flex-1 min-h-0">
            {/* Document Viewer */}
            {isImageFile(selectedFile) ? (
              <img
                src={getDocumentPath(selectedFile)}
                alt={selectedData?.filename || 'Document'}
                className="w-full h-full object-contain"
              />
            ) : (
              <iframe
                src={`${getDocumentPath(selectedFile)}#toolbar=0&navpanes=0`}
                className="w-full h-full border-0"
                title={selectedData?.filename || 'Document'}
              />
            )}
          </div>
        )}
      </div>

      {/* Right Panel - Table Display */}
      <div className="w-1/2 bg-gray-50 overflow-auto border-l border-gray-300">
        {selectedData ? (
          <div className="p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                {selectedData.filename}
              </h2>
              <div className="text-sm text-gray-600">
                {selectedData.tables.length} extracted table{selectedData.tables.length !== 1 ? 's' : ''}
              </div>
            </div>

            <div className="space-y-4">
              {selectedData.tables.map((table, index) => (
                <div key={table.id} className="border border-gray-200 rounded overflow-hidden">
                  <div className="bg-white px-3 py-2 border-b border-gray-200">
                    <h3 className="font-medium text-gray-800 text-sm">
                      Table {index + 1}: {table.title}
                    </h3>
                  </div>
                  
                  <div className="p-3">
                    <div 
                      className="overflow-auto text-xs"
                      dangerouslySetInnerHTML={{ __html: table.html }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center p-4">
              <div className="text-4xl mb-2">📋</div>
              <div className="text-sm">Select a document to view extracted tables</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
