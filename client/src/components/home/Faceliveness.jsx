import { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

/**
 * FaceLiveness: frontend-only liveness check.
 * The user must blink, open their mouth, turn right and turn left.
 * Each action is detected live from the camera and a frame is captured when it passes.
 * If an action is not performed in time (or the face leaves the frame), the check fails.
 *
 * Install:  npm i @mediapipe/tasks-vision
 * Camera access needs HTTPS (or localhost).
 *
 * Usage:
 *   <FaceLiveness
 *     onSuccess={(captures) => console.log(captures)} // [{ step: "blink", image: "data:image/jpeg;base64,..." }, ...]
 *     onFail={(reason) => console.log(reason)}
 *   />
 */

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Tune these if detection feels too strict or too loose.
const CFG = {
  stepTimeoutMs: 8000, // time allowed per action
  faceLostMs: 3000, // face missing this long = fail
  settleMs: 700, // pause between actions
};

// yaw = nose position across the face width, minus 0.5 (computed on the raw, un-mirrored frame).
// Negative = user turned to THEIR right. Positive = user turned to THEIR left.
// If your turns feel swapped on some device, swap the "right" and "left" tests below.
const STEPS = {
  blink: {
    label: "Blink your eyes",
    hint: "Close both eyes, then open them",
    reset: "Keep your eyes open",
    hold: 2,
    neutral: (m) => m.blink < 0.25,
    done: (m) => m.blink > 0.5,
  },
  mouth: {
    label: "Open your mouth",
    hint: "Open wide, like saying “ahh”",
    reset: "Close your mouth",
    hold: 3,
    neutral: (m) => m.jaw < 0.12,
    done: (m) => m.jaw > 0.45,
  },
  right: {
    label: "Turn your head right",
    hint: "Slowly turn to your right",
    reset: "Face the camera",
    hold: 4,
    neutral: (m) => Math.abs(m.yaw) < 0.08,
    done: (m) => m.yaw < -0.15,
  },
  left: {
    label: "Turn your head left",
    hint: "Slowly turn to your left",
    reset: "Face the camera",
    hold: 4,
    neutral: (m) => Math.abs(m.yaw) < 0.08,
    done: (m) => m.yaw > 0.15,
  },
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const cameraError = (err) => {
  if (err?.name === "NotAllowedError") return "Camera access was blocked. Allow the camera in your browser settings, then try again.";
  if (err?.name === "NotFoundError") return "No camera was found on this device.";
  return "The face check could not start. Check your connection and try again.";
};

export default function FaceLiveness({ onSuccess, onFail, randomize = true }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(0);
  const run = useRef(null);
  const cb = useRef({ onSuccess, onFail });
  cb.current = { onSuccess, onFail };

  const [phase, setPhase] = useState("idle"); // idle | loading | running | success | failed
  const [order, setOrder] = useState([]);
  const [index, setIndex] = useState(0);
  const [captures, setCaptures] = useState([]);
  const [notice, setNotice] = useState("");
  const [failReason, setFailReason] = useState("");
  const [flash, setFlash] = useState(false);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(
    () => () => {
      stopCamera();
      landmarkerRef.current?.close();
    },
    []
  );

  const grabFrame = () => {
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    return c.toDataURL("image/jpeg", 0.85);
  };

  const fail = (reason) => {
    stopCamera();
    run.current = null;
    setFailReason(reason);
    setPhase("failed");
    cb.current.onFail?.(reason);
  };

  const say = (text) => {
    const r = run.current;
    if (r && r.notice !== text) {
      r.notice = text;
      setNotice(text);
    }
  };

  const tick = () => {
    const r = run.current;
    const v = videoRef.current;
    if (!r || !v) return;
    const now = performance.now();

    if (v.readyState >= 2 && v.currentTime !== r.lastTime) {
      r.lastTime = v.currentTime;
      const res = landmarkerRef.current.detectForVideo(v, now);
      const faces = res.faceLandmarks.length;

      if (faces === 1) {
        r.lastSeen = now;
        const lm = res.faceLandmarks[0];
        const bs = Object.fromEntries(res.faceBlendshapes[0].categories.map((c) => [c.categoryName, c.score]));
        const m = {
          blink: Math.min(bs.eyeBlinkLeft, bs.eyeBlinkRight),
          jaw: bs.jawOpen,
          yaw: (lm[1].x - lm[234].x) / (lm[454].x - lm[234].x) - 0.5,
        };

        if (now >= r.stepStart) {
          const key = r.steps[r.i];
          const step = STEPS[key];
          if (!r.armed) {
            if (step.neutral(m)) {
              r.armed = true;
              say("");
            } else say(step.reset);
          } else if (step.done(m)) {
            r.hold += 1;
            if (r.hold >= step.hold) {
              r.captures.push({ step: key, image: grabFrame() });
              setCaptures([...r.captures]);
              setFlash(true);
              setTimeout(() => setFlash(false), 180);
              r.i += 1;
              r.armed = false;
              r.hold = 0;
              r.stepStart = now + CFG.settleMs;
              setIndex(r.i);
              if (r.i >= r.steps.length) {
                const all = r.captures;
                stopCamera();
                run.current = null;
                setPhase("success");
                cb.current.onSuccess?.(all);
                return;
              }
            }
          } else r.hold = 0;
        }
      } else if (faces > 1) {
        r.lastSeen = now;
        r.hold = 0;
        say("Only one person should be in view");
      } else {
        r.hold = 0;
        say("Face not found. Look at the camera");
      }
    }

    if (now - r.lastSeen > CFG.faceLostMs) return fail("Your face left the camera view. Keep your face inside the oval and try again.");
    if (now - r.stepStart > CFG.stepTimeoutMs) return fail(`We didn’t detect this action: “${STEPS[r.steps[r.i]].label}”. Try again.`);

    rafRef.current = requestAnimationFrame(tick);
  };

  const start = async () => {
    setPhase("loading");
    setFailReason("");
    setCaptures([]);
    setIndex(0);
    setNotice("");
    try {
      if (!landmarkerRef.current) {
        const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
        const make = (delegate) =>
          FaceLandmarker.createFromOptions(fileset, {
            baseOptions: { modelAssetPath: MODEL_URL, delegate },
            runningMode: "VIDEO",
            numFaces: 2,
            outputFaceBlendshapes: true,
          });
        landmarkerRef.current = await make("GPU").catch(() => make("CPU"));
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch (err) {
      stopCamera();
      setFailReason(cameraError(err));
      setPhase("failed");
      return;
    }

    const steps = randomize ? shuffle(Object.keys(STEPS)) : ["blink", "mouth", "right", "left"];
    const now = performance.now();
    run.current = { steps, i: 0, armed: false, hold: 0, stepStart: now + CFG.settleMs, lastSeen: now, lastTime: -1, captures: [], notice: "" };
    setOrder(steps);
    setPhase("running");
    rafRef.current = requestAnimationFrame(tick);
  };

  const active = phase === "running" || phase === "loading";
  const current = phase === "running" ? STEPS[order[index]] : null;
  const ring =
    phase === "success" || flash ? "ring-emerald-400" : phase === "failed" ? "ring-red-400" : "ring-stone-600";

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl bg-stone-950 p-6 text-stone-100 shadow-xl">
      <style>{`@keyframes fl-shrink{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>

      <h2 className="text-xl font-semibold">Verify it’s you</h2>
      <p className="mt-1 text-sm text-stone-400">
        {phase === "success"
          ? "Verification complete."
          : "We’ll ask for four quick actions. Stay in a well-lit place."}
      </p>

      {/* Camera */}
      <div className="mt-6 flex justify-center">
        <div
          className={`relative h-80 w-60 overflow-hidden rounded-[50%/46%] bg-stone-900 ring-4 transition-shadow duration-150 ${ring} ${
            flash ? "shadow-[0_0_40px_rgba(52,211,153,0.6)]" : ""
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
            style={{ transform: "scaleX(-1)" }}
          />
          {!active && (
            <div className="absolute inset-0 flex items-center justify-center">
              {phase === "success" ? (
                <svg viewBox="0 0 24 24" className="h-20 w-20 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : phase === "failed" ? (
                <svg viewBox="0 0 24 24" className="h-16 w-16 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-16 w-16 text-stone-600" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="9" r="4" />
                  <path d="M4.5 20c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5" />
                </svg>
              )}
            </div>
          )}
          {phase === "loading" && (
            <div className="absolute inset-0 flex items-end justify-center bg-stone-950/50 pb-6 text-sm text-stone-300">
              Starting camera…
            </div>
          )}
        </div>
      </div>

      {/* Instruction */}
      <div className="mt-6 min-h-[88px] text-center" aria-live="polite">
        {current && (
          <>
            <p className="text-lg font-medium">{current.label}</p>
            <p className="mt-1 text-sm text-stone-400">{current.hint}</p>
            <p className="mt-2 h-5 text-sm text-amber-300">{notice}</p>
            <div className="mx-auto mt-2 h-1 w-48 overflow-hidden rounded-full bg-stone-800">
              <div
                key={index}
                className="h-full origin-left bg-stone-300"
                style={{ animation: `fl-shrink ${CFG.stepTimeoutMs}ms linear ${CFG.settleMs}ms both` }}
              />
            </div>
          </>
        )}
        {phase === "failed" && <p className="text-sm text-red-300">{failReason}</p>}
        {phase === "success" && <p className="text-sm text-emerald-300">All four actions were detected.</p>}
      </div>

      {/* Step list */}
      {(phase === "running" || phase === "success") && (
        <ol className="mt-4 space-y-2">
          {order.map((key, i) => {
            const done = i < index || phase === "success";
            const isCurrent = i === index && phase === "running";
            return (
              <li key={key} className={`flex items-center gap-3 text-sm ${done ? "text-stone-100" : isCurrent ? "text-stone-100" : "text-stone-500"}`}>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
                    done ? "border-emerald-400 bg-emerald-400 text-stone-950" : isCurrent ? "border-stone-300" : "border-stone-700"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {STEPS[key].label}
              </li>
            );
          })}
        </ol>
      )}

      {/* Captured frames */}
      {phase === "success" && captures.length > 0 && (
        <div className="mt-5 grid grid-cols-4 gap-2">
          {captures.map((c) => (
            <figure key={c.step}>
              <img src={c.image} alt={`Captured: ${STEPS[c.step].label}`} className="aspect-[3/4] w-full rounded-lg object-cover" style={{ transform: "scaleX(-1)" }} />
            </figure>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6">
        {(phase === "idle" || phase === "failed") && (
          <button
            onClick={start}
            className="w-full rounded-xl bg-stone-100 py-3 font-medium text-stone-950 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300"
          >
            {phase === "failed" ? "Try again" : "Start face check"}
          </button>
        )}
        {phase === "success" && (
          <button
            onClick={start}
            className="w-full rounded-xl border border-stone-700 py-3 text-sm text-stone-300 transition hover:bg-stone-900"
          >
            Run again
          </button>
        )}
        {active && (
          <button
            onClick={() => {
              stopCamera();
              run.current = null;
              setPhase("idle");
            }}
            className="w-full rounded-xl border border-stone-700 py-3 text-sm text-stone-300 transition hover:bg-stone-900"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}