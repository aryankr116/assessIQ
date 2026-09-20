import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import api from "../api/client.js";

const AppContext = createContext(null);

// Persisted Generate page state (survives navigation)
const GENERATE_STORAGE_KEY = "assessiq_generate_state";

function loadGenerateState() {
  try {
    const raw = localStorage.getItem(GENERATE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveGenerateState(state) {
  try {
    localStorage.setItem(GENERATE_STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function AppProvider({ children }) {
  const [jobProfiles, setJobProfiles] = useState([]);
  const [qaSets, setQaSets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate page state persistence
  const [generateState, setGenerateStateRaw] = useState(loadGenerateState);
  const generateStateRef = useRef(generateState);
  const setGenerateState = useCallback((updater) => {
    setGenerateStateRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      generateStateRef.current = next;
      saveGenerateState(next);
      return next;
    });
  }, []);

  const refreshJobProfiles = useCallback(async () => {
    const profiles = await api.listJobProfiles();
    setJobProfiles(profiles);
    return profiles;
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
      const [profiles, sets] = await Promise.all([
        api.listJobProfiles(),
        api.listQASets(),
      ]);
      if (!active) return;
      setJobProfiles(profiles);
      setQaSets(sets);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const createJobProfile = useCallback(
    async (data) => {
      const profile = await api.createJobProfile(data);
      await refreshJobProfiles();
      return profile;
    },
    [refreshJobProfiles]
  );

  // Quick profile creation (returns profile without forcing page refresh)
  const createJobProfileQuick = useCallback(
    async (data) => {
      const profile = await api.createJobProfile(data);
      setJobProfiles((prev) => [profile, ...prev]);
      return profile;
    },
    []
  );

  const deleteJobProfile = useCallback(
    async (id) => {
      await api.deleteJobProfile(id);
      await refreshJobProfiles();
    },
    [refreshJobProfiles]
  );

  const uploadDocument = useCallback(
    async (profileId, file) => {
      return api.uploadDocument(profileId, file);
    },
    []
  );

  const deleteDocument = useCallback(
    async (profileId, docId) => {
      return api.deleteDocument(profileId, docId);
    },
    []
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
    jobProfiles,
    qaSets,
    loading,
    refreshJobProfiles,
    refreshQaSets,
    createJobProfile,
    createJobProfileQuick,
    deleteJobProfile,
    uploadDocument,
    deleteDocument,
    generateQA,
    deleteQASet,
    rateQuestion,
    generateState,
    setGenerateState,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
