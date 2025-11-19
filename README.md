# Pratham Demo App

A document viewer and PDF processing application built with React, TypeScript, and Vite. Features include viewing pre-processed documents with extracted tables and uploading new PDFs for processing via the Structura API.

## Features

- **Document Viewer**: View pre-processed documents (PDFs and images) with extracted table data
- **PDF Upload & Processing**: Upload new PDFs and process them using the Structura API
- **Table Extraction**: Automatically extracts and displays tables from documents
- **Real-time Processing**: Polls for processing status and displays results when complete

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**

   Copy `.env.example` to `.env` and add your Structura API key:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your API key:
   ```
   STRUCTURA_API_KEY=your_actual_api_key_here
   ```

3. **Run the development server:**

   To use the PDF upload feature, you need to run with Vercel Dev (to enable serverless functions):
   ```bash
   npm run dev:vercel
   ```

   For frontend-only development (without upload feature):
   ```bash
   npm run dev
   ```

## Project Structure

```
pratham-demo-app/
├── api/                      # Vercel serverless functions
│   ├── convert.ts            # Handles PDF upload to Structura API
│   └── convert/[taskId].ts   # Polls for processing results
├── public/
│   ├── images/pratham/       # Image files
│   ├── pdfs/pratham/         # PDF files
│   └── pratham-tables.json   # Pre-processed table data
├── src/
│   ├── App.tsx               # Main app with navigation
│   ├── ViewerPage.tsx        # Document viewer component
│   └── UploadPage.tsx        # PDF upload component
└── .env                      # Environment variables (create from .env.example)
```

## Usage

### Document Viewer

1. Navigate to the "Document Viewer" tab
2. Select a document from the dropdown
3. View the document on the left panel and extracted tables on the right

### Upload PDF

1. Navigate to the "Upload PDF" tab
2. Click to select a PDF file
3. Click "Upload & Process"
4. Wait for processing to complete (typically 10-30 seconds)
5. View extracted tables once processing is complete

## API Integration

The app uses the Structura API for PDF processing. The API calls are proxied through Vercel serverless functions to keep the API key secure:

- `POST /api/convert` - Upload PDF for processing
- `GET /api/convert/{taskId}` - Check processing status and get results

## Development

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
