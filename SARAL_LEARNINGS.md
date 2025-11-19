# Key Learnings from saral-next Implementation

## Architecture Overview

The saral-next project uses a **continuous scroll** approach for both PDF and HTML content, with synchronized bboxes overlaid on the PDF.

### Main Components

1. **Structura.tsx** - Main container component
   - Uses `PanelGroup` from `react-resizable-panels` for resizable split view
   - Each panel contains a `ScrollArea` component
   - Height: `h-[calc(100vh-220px)]` for both panels

2. **PdfDocumentViewer.tsx** - PDF rendering
   - Renders **all pages continuously** in a single scroll container
   - Uses `react-pdf` library (Document and Page components)
   - Parent handles scrolling via ScrollArea

3. **HtmlViewer.tsx** - HTML content rendering
   - Displays extracted content alongside PDF
   - Also uses continuous scroll

### Key Implementation Details

#### 1. Continuous Scroll (Not Paginated)

```tsx
// In Structura.tsx
<ScrollArea className="w-full h-[calc(100vh-220px)]">
  <PdfDocumentViewer
    fileUrl={fileUrl}
    allowedPages={pagesToRender}  // All pages
    jsonData={jsonData}
    selectedBboxId={selectedBboxId}
    onPdfBboxClick={handlePdfBboxClicked}
  />
</ScrollArea>
```

```tsx
// In PdfDocumentViewer.tsx
<Document file={fileUrl} className="flex flex-col w-full">
  {allowedPages.map((pageNum) => (
    <Page
      key={pageNum}
      pageNumber={pageNum}
      renderMode="canvas"
      // Each page stacks vertically for continuous scroll
    />
  ))}
</Document>
```

#### 2. Bbox Overlay System

**Calculating Bboxes:**
```tsx
// Each page tracks its own scale
const [pageScales, setPageScales] = useState<Record<number, number>>({});

// For each block, calculate bbox from polygon points
const points = block.polygon; // [[x1,y1], [x2,y2], ...]
const x_coords = points.map(p => p[0]);
const y_coords = points.map(p => p[1]);
const x_min = Math.min(...x_coords);
const y_min = Math.min(...y_coords);
const x_max = Math.max(...x_coords);
const y_max = Math.max(...y_coords);

// Apply scale to position bbox on rendered PDF
const style = {
  position: 'absolute',
  left: `${x_min * scale}px`,
  top: `${y_min * scale}px`,
  width: `${(x_max - x_min) * scale}px`,
  height: `${(y_max - y_min) * scale}px`,
  border: `1px solid ${selected ? 'red' : 'rgba(0, 100, 255, 0.5)'}`,
  backgroundColor: `${selected ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 100, 255, 0.1)'}`,
  cursor: 'pointer',
  zIndex: 10
};
```

**Recursive Block Collection:**
```tsx
function collectBboxes(blocks, path = "") {
  blocks.forEach((block, index) => {
    const currentPath = `${path}/${block.block_type}[${index}](${block.id})`;

    if (block.polygon && block.block_type !== "Page") {
      // Create bbox overlay div
      bboxes.push(
        <div
          key={block.id}
          style={calculateBboxStyle(block)}
          onClick={() => onPdfBboxClick(block.id)}
          title={`${block.id} (${block.block_type})`}
        />
      );
    }

    // Recursively process children
    if (block.children) {
      collectBboxes(block.children, currentPath);
    }
  });
}
```

#### 3. Synchronized Scrolling

Both panels scroll independently but can be synchronized:
- Left panel: PDF with bbox overlays
- Right panel: HTML content renderer
- Clicking a bbox highlights corresponding content

#### 4. Resizable Panels

```tsx
<PanelGroup direction="horizontal" className="h-full">
  <Panel minSize={20} defaultSize={50}>
    {/* PDF Viewer */}
  </Panel>

  <PanelResizeHandle />

  <Panel minSize={20} defaultSize={50}>
    {/* HTML Viewer */}
  </Panel>
</PanelGroup>
```

## What We Should Adopt

### 1. **Continuous Scroll Instead of Pagination**
- Render all PDF pages in a single scroll container
- Much better UX - no clicking through pages
- Natural document reading flow

### 2. **Bbox Overlay System**
- Overlay bounding boxes on PDF for all extracted blocks
- Clickable bboxes that highlight corresponding content
- Visual mapping between PDF and extracted content

### 3. **Resizable Split View**
- Use `react-resizable-panels` for adjustable split
- Let users control how much space each panel gets

### 4. **react-pdf for Better PDF Rendering**
- Currently using iframe which is limited
- `react-pdf` gives more control and better performance
- Can layer custom overlays on top of canvas

### 5. **Scale Tracking**
- Track scale for each page separately
- Accurately position bboxes based on rendered size
- Handle responsive scaling

## Libraries to Install

```bash
npm install react-pdf pdfjs-dist react-resizable-panels
```

## Implementation Priority

1. **High Priority:**
   - Switch to continuous scroll (remove pagination)
   - Use react-pdf instead of iframe
   - Add bbox overlays for visual mapping

2. **Medium Priority:**
   - Add resizable panels
   - Implement bbox click handlers
   - Sync scroll positions

3. **Nice to Have:**
   - Highlight on hover
   - Search within bboxes
   - Export with bbox annotations
