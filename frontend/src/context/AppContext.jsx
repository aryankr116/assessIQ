import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/client.js";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [documents, setDocuments] = useState([]);
  const [qaSets, setQaSets] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshDocuments = useCallback(async () => {
    const docs = await api.listDocuments();
    setDocuments(docs);
    return docs;
  }, []);

  const refreshQaSets = useCallback(async () => {
    const sets = await api.listQASets();
    setQaSets(sets);
    return sets;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [docs, sets] = await Promise.all([
        api.listDocuments(),
        api.listQASets(),
      ]);
      if (!active) return;
      setDocuments(docs);
      setQaSets(sets);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Poll while any document is still being ingested (mock pipeline advances over time).
  useEffect(() => {
    const stillProcessing = documents.some(
      (d) => d.status !== "indexed" && d.status !== "failed"
    );
    if (!stillProcessing) return;
    const t = setInterval(() => {
      refreshDocuments();
    }, 1000);
    return () => clearInterval(t);
  }, [documents, refreshDocuments]);

  const uploadDocument = useCallback(
    async (file) => {
      await api.uploadDocument(file);
      return refreshDocuments();
    },
    [refreshDocuments]
  );

  const deleteDocument = useCallback(
    async (id) => {
      await api.deleteDocument(id);
      return refreshDocuments();
    },
    [refreshDocuments]
  );

  const generateQA = useCallback(
    async (payload) => {
      const set = await api.generateQA(payload);
      await refreshQaSets();
      return set;
    },
    [refreshQaSets]
  );

  const deleteQASet = useCallback(
    async (id) => {
      await api.deleteQASet(id);
      return refreshQaSets();
    },
    [refreshQaSets]
  );

  const rateQuestion = useCallback(
    async (setId, questionId, rating) => {
      // Optimistic update so the UI feels instant.
      setQaSets((sets) =>
        sets.map((s) =>
          s.id !== setId
            ? s
            : {
                ...s,
                questions: s.questions.map((q) =>
                  q.id === questionId ? { ...q, rating } : q
                ),
              }
        )
      );
      await api.rateQuestion(setId, questionId, rating);
    },
    []
  );

  const value = {
    documents,
    qaSets,
    loading,
    refreshDocuments,
    refreshQaSets,
    uploadDocument,
    deleteDocument,
    generateQA,
    deleteQASet,
    rateQuestion,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
