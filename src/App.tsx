import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import ViewerPage from './ViewerPage';
import UploadPage from './UploadPage';
import HistoryPage from './HistoryPage';
import ResultViewerPage from './ResultViewerPage';

const NavBar: React.FC = () => {
  const location = useLocation();

  // Hide nav bar on result pages
  if (location.pathname.startsWith('/result/')) {
    return null;
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 flex-shrink-0">
      <div className="flex">
        <Link
          to="/upload"
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            isActive('/upload')
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Upload PDF
        </Link>
        <Link
          to="/history"
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            isActive('/history')
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          History
        </Link>
        <Link
          to="/"
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            isActive('/')
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          Document Viewer
        </Link>
      </div>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen flex flex-col">
        <NavBar />

        <div className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<ViewerPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/result/:taskId" element={<ResultViewerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
