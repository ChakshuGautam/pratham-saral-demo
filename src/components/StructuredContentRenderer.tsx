import React from 'react';
import { resolveContentRefs } from '../utils/htmlResolver';

interface StructuredContentRendererProps {
  page: any;
  blockMap: Record<string, any>;
  selectedBboxId?: string | null;
  onBlockClick?: (blockId: string) => void;
}

/**
 * Renders a Structura page with proper structure and styling
 * Handles different block types: headings, text, math, lists, tables, etc.
 */
const StructuredContentRenderer: React.FC<StructuredContentRendererProps> = ({
  page,
  blockMap,
  selectedBboxId,
  onBlockClick
}) => {
  if (!page || !page.children) {
    return <div className="text-gray-500 text-center py-8">No content available</div>;
  }

  const renderBlock = (block: any, index: number) => {
    const { block_type, html, id } = block;

    // Resolve content-refs in the HTML
    const resolvedHtml = resolveContentRefs(html || '', blockMap);

    // Base classes for all blocks
    const baseClasses = 'mb-4';

    // Type-specific styling
    const getBlockClasses = () => {
      switch (block_type) {
        case 'SectionHeader':
          return `${baseClasses} border-l-4 border-blue-500 pl-4 bg-blue-50 py-2`;

        case 'TextInlineMath':
        case 'TextDisplayMath':
          return `${baseClasses} bg-purple-50 p-3 rounded border-l-4 border-purple-400`;

        case 'ListGroup':
        case 'ListItem':
          return `${baseClasses} ml-4`;

        case 'Table':
          return `${baseClasses} overflow-x-auto border border-gray-200 rounded`;

        case 'Picture':
        case 'Figure':
          return `${baseClasses} border border-gray-200 rounded p-2 bg-gray-50`;

        case 'Handwriting':
          return `${baseClasses} bg-yellow-50 p-3 rounded border-l-4 border-yellow-400 italic`;

        case 'Caption':
          return `${baseClasses} text-sm text-gray-600 italic text-center`;

        case 'Equation':
        case 'Formula':
          return `${baseClasses} bg-purple-50 p-4 rounded text-center font-mono`;

        case 'Code':
          return `${baseClasses} bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto`;

        default:
          return baseClasses;
      }
    };

    // Skip empty blocks
    if (!resolvedHtml || resolvedHtml.trim() === '' ||
        resolvedHtml === '<p block-type="Text"></p>' ||
        resolvedHtml === `<p block-type="${block_type}"></p>`) {
      return null;
    }

    const isSelected = id === selectedBboxId;

    return (
      <div
        key={id || index}
        className={`${getBlockClasses()} ${isSelected ? 'ring-2 ring-red-500 bg-red-50' : ''} ${onBlockClick && id ? 'cursor-pointer hover:bg-gray-50' : ''} transition-all`}
        data-block-type={block_type}
        data-block-id={id}
        onClick={() => {
          if (onBlockClick && id) {
            onBlockClick(id);
          }
        }}
      >
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: resolvedHtml }}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {page.children.map((block: any, index: number) => renderBlock(block, index))}
    </div>
  );
};

export default StructuredContentRenderer;
