import React, { useState, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import '../utils/pdfWorker';

interface BboxOverlayProps {
  blocks: any[];
  pageScale: number;
  selectedBboxId?: string | null;
  onBboxClick?: (blockId: string) => void;
}

const BboxOverlay: React.FC<BboxOverlayProps> = ({ blocks, pageScale, selectedBboxId, onBboxClick }) => {
  const bboxes: React.ReactNode[] = [];

  const collectBboxes = (blockList: any[], path: string = "") => {
    blockList.forEach((block, index) => {
      const currentPath = `${path}/${block.block_type}[${index}]`;

      // Skip Page blocks, only render child bboxes
      if (block.polygon && block.block_type !== "Page") {
        const points = block.polygon as number[][];

        if (points && Array.isArray(points) && points.length >= 2) {
          const x_coords = points.map(p => p[0]);
          const y_coords = points.map(p => p[1]);
          const x_min = Math.min(...x_coords);
          const y_min = Math.min(...y_coords);
          const x_max = Math.max(...x_coords);
          const y_max = Math.max(...y_coords);

          if (x_max > x_min && y_max > y_min) {
            const isSelected = block.id === selectedBboxId;

            const style: React.CSSProperties = {
              position: 'absolute',
              left: `${x_min * pageScale}px`,
              top: `${y_min * pageScale}px`,
              width: `${(x_max - x_min) * pageScale}px`,
              height: `${(y_max - y_min) * pageScale}px`,
              border: `1px solid ${isSelected ? '#ef4444' : 'rgba(59, 130, 246, 0.5)'}`,
              backgroundColor: `${isSelected ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.1)'}`,
              cursor: 'pointer',
              pointerEvents: 'auto',
              zIndex: isSelected ? 20 : 10,
              transition: 'all 0.2s ease',
            };

            bboxes.push(
              <div
                key={block.id}
                style={style}
                title={`${block.block_type}: ${block.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onBboxClick?.(block.id);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected
                    ? 'rgba(239, 68, 68, 0.3)'
                    : 'rgba(59, 130, 246, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isSelected
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(59, 130, 246, 0.1)';
                }}
              />
            );
          }
        }
      }

      // Recursively process children
      if (block.children && Array.isArray(block.children)) {
        collectBboxes(block.children, currentPath);
      }
    });
  };

  collectBboxes(blocks);

  return <>{bboxes}</>;
};

interface ContinuousPdfViewerProps {
  pdfUrl: string;
  jsonData?: any;
  selectedBboxId?: string | null;
  onBboxClick?: (blockId: string) => void;
}

const ContinuousPdfViewer: React.FC<ContinuousPdfViewerProps> = ({
  pdfUrl,
  jsonData,
  selectedBboxId,
  onBboxClick,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageScales, setPageScales] = useState<Record<number, number>>({});

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  const onPageLoadSuccess = useCallback((pageNum: number) => (page: any) => {
    // Calculate scale based on rendered page size
    const viewport = page.getViewport({ scale: 1 });
    const containerWidth = 600; // Default width, will be adjusted by CSS
    const scale = containerWidth / viewport.width;

    setPageScales((prev) => ({
      ...prev,
      [pageNum]: scale,
    }));
  }, []);

  return (
    <div className="w-full">
      <Document
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        className="flex flex-col items-center"
        loading={
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        }
      >
        {Array.from({ length: numPages }, (_, index) => {
          const pageNum = index + 1;
          const pageIndex = index;
          const pageData = jsonData?.children?.[pageIndex];
          const scale = pageScales[pageNum];

          return (
            <div key={`page_${pageNum}`} className="relative mb-4">
              <Page
                pageNumber={pageNum}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                width={600}
                onLoadSuccess={onPageLoadSuccess(pageNum)}
                className="shadow-lg"
              />

              {/* Bbox overlays */}
              {pageData && scale && (
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  <BboxOverlay
                    blocks={pageData.children || []}
                    pageScale={scale}
                    selectedBboxId={selectedBboxId}
                    onBboxClick={onBboxClick}
                  />
                </div>
              )}
            </div>
          );
        })}
      </Document>
    </div>
  );
};

export default ContinuousPdfViewer;
