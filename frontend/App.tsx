import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ProcessedDocument } from './types';
import { Spinner } from './constants';
import AppShell from './components/AppShell';
import Settings from './components/Settings';
import DocumentsPage from './components/DocumentsPage';
import DocumentEditor from './components/DocumentEditor';
import SearchModal from './components/SearchModal';
import { useToast } from './components/ToastProvider';
import { useAuth } from './auth/AuthContext';
import { AuthForm } from './auth/AuthForm';
import { createDocument, deleteDocument, listDocuments, updateDocument } from './services/documentsApi';

const App: React.FC = () => {
  const auth = useAuth();
  const { toast } = useToast();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const navigate = useNavigate();
  const location = useLocation();

  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [activeDocument, setActiveDocument] = useState<ProcessedDocument | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const saveTimersRef = useRef<Record<string, number>>({});

  const token = auth.token;

  const canSync = useMemo(() => !!token && !!auth.user, [token, auth.user]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) return;
      try {
        const res = await listDocuments(token);
        if (cancelled) return;
        setDocuments(
          res.documents.map((d) => ({
            id: d.id,
            fileName: d.fileName,
            originalContent: d.originalContent,
            translatedContent: d.translatedContent,
            summary: d.summary,
            chatHistory: d.chatHistory,
            targetLanguage: d.targetLanguage,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          }))
        );
      } catch (e) {
        if (!cancelled) setDocuments([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSaveDocument = useCallback(
    (doc: ProcessedDocument) => {
      setDocuments((prevDocs) => {
        const existingIndex = prevDocs.findIndex((d) => d.id === doc.id);
        if (existingIndex > -1) {
          const updatedDocs = [...prevDocs];
          updatedDocs[existingIndex] = doc;
          return updatedDocs;
        }
        return [...prevDocs, doc];
      });
      setActiveDocument(doc);

      if (!canSync || !token) return;

      if (saveTimersRef.current[doc.id]) {
        window.clearTimeout(saveTimersRef.current[doc.id]);
      }

      saveTimersRef.current[doc.id] = window.setTimeout(async () => {
        try {
          const res = await updateDocument(token, doc.id, doc);
          setDocuments((prev) => prev.map((d) => (d.id === doc.id ? { ...d, updatedAt: res.document.updatedAt } : d)));
        } catch (e) {
        }
      }, 500);
    },
    [canSync, token]
  );

  const handleDeleteDocument = useCallback(
    async (docId: string) => {
      setDocuments((prevDocs) => prevDocs.filter((d) => d.id !== docId));
      if (activeDocument?.id === docId) {
        setActiveDocument(null);
        navigate('/documents');
      }

      if (!canSync || !token) return;
      try {
        await deleteDocument(token, docId);
      } catch (e) {
      }
    },
    [activeDocument, canSync, navigate, token]
  );

  const handleCreateNew = useCallback(async () => {
    setActiveDocument(null);
    navigate('/workspace');
  }, [navigate]);

  const handleSelectDocument = useCallback((doc: ProcessedDocument) => {
    setActiveDocument(doc);
    navigate('/workspace');
  }, [navigate]);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);

  const navigateToDocuments = useCallback(() => {
    setActiveDocument(null);
    navigate('/documents');
  }, [navigate]);

  const navigateToSettings = useCallback(() => {
    setActiveDocument(null);
    navigate('/settings');
  }, [navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const key = e.key?.toLowerCase();
      if (key !== 'k') return;
      const combo = isMac ? e.metaKey : e.ctrlKey;
      if (!combo) return;
      e.preventDefault();
      setSearchOpen(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleRenameDocument = useCallback(
    async (docId: string, nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed) return;

      setDocuments((prev) => prev.map((d) => (d.id === docId ? { ...d, fileName: trimmed } : d)));
      setActiveDocument((prev) => (prev?.id === docId ? { ...prev, fileName: trimmed } : prev));

      if (!canSync || !token) return;
      try {
        await updateDocument(token, docId, { fileName: trimmed });
      } catch (e) {
      }
    },
    [canSync, token]
  );

  const handleCreateDocumentFromEditor = useCallback(
    async (payload: Omit<ProcessedDocument, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!token) {
        toast({ type: 'error', title: 'Not signed in', message: 'Please sign in again.' });
        throw new Error('Not signed in');
      }

      const res = await createDocument(token, {
        fileName: payload.fileName,
        originalContent: payload.originalContent,
        translatedContent: payload.translatedContent,
        summary: payload.summary,
        chatHistory: payload.chatHistory,
        targetLanguage: payload.targetLanguage,
      });

      const newDoc: ProcessedDocument = {
        id: res.document.id,
        fileName: res.document.fileName,
        originalContent: res.document.originalContent,
        translatedContent: res.document.translatedContent,
        summary: res.document.summary,
        chatHistory: res.document.chatHistory,
        targetLanguage: res.document.targetLanguage,
        createdAt: res.document.createdAt,
        updatedAt: res.document.updatedAt,
      };

      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocument(newDoc);
      return newDoc;
    },
    [toast, token]
  );

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 flex items-center justify-center">
        <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 rounded-lg px-5 py-4">
          <Spinner className="w-6 h-6 text-sky-400" />
          <span className="text-slate-200">Loading...</span>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <AuthForm
        mode={authMode}
        onSubmit={authMode === 'login' ? auth.login : auth.register}
        loading={auth.loading}
        error={auth.error}
        onSwitchMode={() => setAuthMode((m) => (m === 'login' ? 'register' : 'login'))}
      />
    );
  }

  const path = location.pathname || '/';
  const shellActive = path.startsWith('/settings') ? 'settings' : path.startsWith('/documents') ? 'documents' : 'workspace';

  return (
    <>
      <AppShell
        active={shellActive}
        userEmail={auth.user.email}
        userName={auth.profile.displayName}
        userAvatar={auth.profile.avatar}
        onNav={(key) => {
          if (key === 'workspace') handleCreateNew();
          if (key === 'documents') navigateToDocuments();
          if (key === 'settings') navigateToSettings();
          if (key === 'search') openSearch();
        }}
        onCreateNew={handleCreateNew}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route
            path="/documents"
            element={
              <div className="h-full min-h-0 overflow-y-auto">
                <DocumentsPage
                  documents={documents}
                  allDocumentsCount={documents.length}
                  viewMode={'grid'}
                  onSelectDocument={handleSelectDocument}
                  onCreateNew={handleCreateNew}
                  onDeleteDocument={handleDeleteDocument}
                  onRenameDocument={handleRenameDocument}
                />
              </div>
            }
          />
          <Route
            path="/workspace"
            element={
              <DocumentEditor
                defaultLanguage={activeDocument?.targetLanguage ?? 'Tamil'}
                document={activeDocument}
                onSave={handleSaveDocument}
                onCreateDocument={handleCreateDocumentFromEditor}
              />
            }
          />
          <Route
            path="/settings"
            element={
              <div className="h-full min-h-0 overflow-y-auto">
                <Settings />
              </div>
            }
          />
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
      </AppShell>

      <SearchModal
        open={searchOpen}
        query={searchQuery}
        documents={documents}
        onQueryChange={setSearchQuery}
        onClose={closeSearch}
        onSelect={(doc) => {
          closeSearch();
          handleSelectDocument(doc);
        }}
      />
    </>
  );
};

export default App;
