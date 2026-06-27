# Gendoc Assistant

Gendoc Assistant is a full-stack document processing application that helps users upload or paste content, translate it into supported languages, generate summaries, and ask questions about the document in a chat-based workflow. The project combines a React and TypeScript frontend with a Node.js and Express backend, backed by MongoDB and optional Python-based translation services.

## Project Description

Gendoc Assistant is designed for working with documents that need multilingual translation and quick understanding. Users can:

- Upload text files, Word documents, PDFs, or image files
- Extract document content from supported file types
- Translate content into supported target languages
- Generate document summaries
- Chat with the document content using an AI assistant
- Save and reopen processed documents from a personal workspace

The application is implemented as a monorepo with separate frontend and backend services.

## Features

- User authentication and session management with JWT-based login and logout
- Document workspace for creating, saving, renaming, and deleting documents
- File upload and text extraction for:
  - Plain text files
  - DOCX files
  - PDF files
  - Image files
- Translation workflow with support for:
  - Tamil
  - Hindi
  - Malayalam
  - Telugu
  - Kannada
  - English
- AI-assisted summarization
- Chat-based Q&A grounded in the uploaded or translated document content
- Search across saved documents
- Persistent document storage in MongoDB
- Download translated output or summaries as plain text or DOCX files

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- Tailwind-style utility classes in the UI layer
- Document processing libraries including Mammoth, PDF.js, Tesseract.js, and docx

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT authentication
- Zod validation
- CORS and Helmet security middleware

### Translation and AI Integration
- Python-based NLLB translation workflow
- FastAPI translation service support
- Google Gemini API for summarization and chat assistance

## Project Structure

- [backend](backend) – Express API, authentication, document persistence, and translation endpoints
- [frontend](frontend) – React/Vite app for the user interface and document workflow
- [backend/backend_translate_nllb.py](backend/backend_translate_nllb.py) – Python script for local NLLB translation
- [backend/nllb_service.py](backend/nllb_service.py) – FastAPI service exposing translation functionality

## Prerequisites

Before running the project locally, make sure you have:

- Node.js 18+ and npm
- MongoDB running and reachable
- Python 3.10+ and pip (for the optional Python-based translation service)
- A Google Gemini API key for summarization and chat features

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/RishiSivaprakasan/Gendoc-Assistant.git
cd Gendoc-Assistant
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Configuration

### Backend environment variables

Create a `.env` file in [backend](backend) with values similar to the following:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/gendoc-assistant
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
CORS_ORIGIN=http://localhost:3000
PYTHON_PATH=venv\\Scripts\\python.exe
NLLB_SERVICE_URL=http://127.0.0.1:8001
```

### Frontend environment variables

Create a `.env` file in [frontend](frontend) with a Gemini API key:

```env
API_KEY=your-google-gemini-api-key
```

### Optional translation service

The translation pipeline can use the Python-based NLLB service when available. If you want to run the service locally, install the required Python packages and start the FastAPI app:

```bash
cd backend
pip install torch transformers sentencepiece fastapi uvicorn
uvicorn nllb_service:app --host 127.0.0.1 --port 8001
```

## Usage

### Start the backend

```bash
cd backend
npm run dev
```

The API will run on the port defined in your backend environment configuration.

### Start the frontend

```bash
cd frontend
npm run dev
```

Then open the frontend URL shown by Vite in your browser.

### Typical workflow

1. Register or sign in to the application
2. Create or open a document from the workspace
3. Upload a file or paste text into the editor
4. Choose a target language and click Translate
5. Generate a summary if needed
6. Ask questions in the chat panel
7. Save, search, and reopen documents later

## Folder Structure

```text
backend/
  src/
    app.js
    server.js
    config/
    controllers/
    middleware/
    models/
    routes/
    scripts/
    services/
    utils/
  backend_translate_nllb.py
  nllb_service.py
  package.json

frontend/
  src/
  auth/
  components/
  services/
  theme/
  App.tsx
  constants.tsx
  package.json
```

## Contributing

Contributions are welcome. If you would like to improve the project, please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes and test them locally
4. Submit a pull request with a clear description of the update

## Contributors

- Rishi Sivaprakasan – https://github.com/RishiSivaprakasan
- Thirilose Jones Nithish R – https://github.com/ThiriloseJonesNithish-R
