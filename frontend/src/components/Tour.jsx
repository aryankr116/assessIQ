import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  LayoutDashboard,
  FileText,
  ClipboardList,
  Shield,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  MapPin,
} from "lucide-react";
import { useTour } from "../context/TourContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { Button } from "./ui.jsx";

const ALL_STEPS = [
  {
    route: "/",
    icon: LayoutDashboard,
    title: "Your Dashboard",
    body:
      "This is your home base. It shows how many documents are indexed, how many questions you've generated, and the split between Knowledge-Based and Skill-Based questions.",
  },
  {
    route: "/documents",
    icon: FileText,
    title: "Step 1 — Upload documents",
    body:
      "Drag in PDF, DOCX, or TXT files. Each one is parsed, split into chunks, embedded, and indexed. Watch the progress bar until the card shows ‘indexed’. Answers are grounded only in these files.",
  },
  {
    route: "/generate",
    icon: Sparkles,
    title: "Step 2 — Generate Q&A",
    body:
      "Enter a job role, choose which documents to ground answers in, and set the retrieval depth (top-k). Turn on ‘Two-round’ to generate Knowledge questions and Skill questions separately. Then click Generate.",
  },
  {
    route: "/results",
    icon: ClipboardList,
    title: "Step 3 — Review & export",
    body:
      "Browse the generated questions, filter by type or out-of-scope, rate them with a thumbs up or down, and export to JSON or CSV. The percentage bar shows how strongly each answer is grounded in its source chunk.",
  },
  {
    route: "/admin",
    icon: Shield,
    adminOnly: true,
    title: "Admin tools",
    body:
      "As an admin, you can view user accounts and tune system parameters such as the default top-k, questions per set, and the answerability threshold that flags out-of-scope prompts.",
  },
  {
    route: "/",
    icon: CheckCircle2,
    title: "You're all set!",
    body:
      "Every answer is traceable to a source chunk, and off-topic prompts are flagged rather than made up. You can replay this tour anytime from ‘Take a tour’ at the bottom of the sidebar.",
  },
];

export default function Tour() {
  const { showWelcome, active, step, setStep, start, decline, finish } = useTour();
  const { user } = useAuth();
  const navigate = useNavigate();

  const steps = useMemo(
    () => ALL_STEPS.filter((s) => !s.adminOnly || user?.role === "admin"),
    [user]
  );

  // Navigate to the screen for the current step.
  useEffect(() => {
    if (active && steps[step]) navigate(steps[step].route);
  }, [active, step, steps, navigate]);

  // ---- Welcome prompt ----
  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-fade-in-up">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Sparkles size={22} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Welcome to AssessIQ 👋</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            New here? Take a quick one-minute tour to see how to upload documents and
            generate grounded, job-specific interview questions.
          </p>
          <div className="mt-5 flex gap-2">
            <Button onClick={start} className="flex-1">
              <MapPin size={16} /> Take the tour
            </Button>
            <Button variant="secondary" onClick={decline} className="flex-1">
              Not now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!active) return null;

  const s = steps[step];
  if (!s) return null;
  const Icon = s.icon;
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  // ---- Step card (corner, non-blocking so the real screen is visible) ----
  return (
    <>
      {/* light backdrop that still shows the page behind */}
      <div className="fixed inset-0 z-40 bg-slate-900/10" onClick={finish} />
      <div className="fixed bottom-6 right-6 z-50 w-[22rem] max-w-[calc(100vw-3rem)] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 animate-fade-in-up">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
              <Icon size={18} />
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              Step {step + 1} of {steps.length}
            </span>
          </div>
          <button
            onClick={finish}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="End tour"
          >
            <X size={16} />
          </button>
        </div>

        <h3 className="mt-3 text-base font-semibold text-slate-900">{s.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.body}</p>

        {/* progress dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-5 bg-brand-600" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="secondary" size="sm" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={15} /> Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={finish}>
                <CheckCircle2 size={15} /> Finish
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep(step + 1)}>
                Next <ArrowRight size={15} />
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
