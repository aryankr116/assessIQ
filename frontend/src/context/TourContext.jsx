import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";

const TourContext = createContext(null);
const storageKey = (u) => `assessiq_tour_done_${u || "anon"}`;

export function TourProvider({ children }) {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  // Show the welcome prompt once per user (first time they sign in).
  useEffect(() => {
    if (!user) return;
    let seen = false;
    try {
      seen = !!localStorage.getItem(storageKey(user.username));
    } catch {
      seen = false;
    }
    if (!seen) {
      const t = setTimeout(() => setShowWelcome(true), 700);
      return () => clearTimeout(t);
    }
  }, [user]);

  const markDone = useCallback(() => {
    if (!user) return;
    try {
      localStorage.setItem(storageKey(user.username), "1");
    } catch {
      /* ignore */
    }
  }, [user]);

  const start = useCallback(() => {
    setShowWelcome(false);
    setStep(0);
    setActive(true);
  }, []);

  const decline = useCallback(() => {
    setShowWelcome(false);
    markDone();
  }, [markDone]);

  const finish = useCallback(() => {
    setActive(false);
    setShowWelcome(false);
    markDone();
  }, [markDone]);

  // Replay from the sidebar button.
  const restart = useCallback(() => {
    setShowWelcome(false);
    setStep(0);
    setActive(true);
  }, []);

  return (
    <TourContext.Provider
      value={{ showWelcome, active, step, setStep, start, decline, finish, restart }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}
