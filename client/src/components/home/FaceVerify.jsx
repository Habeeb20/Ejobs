// import { useEffect, useState } from "react";
// import { toast } from "sonner";
// import FaceLiveness from "./Faceliveness";

// /**
//  * Env (Vite):
//  *   VITE_BACKEND_URL=https://your-api.com        (no trailing slash, no /api)
//  *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
//  *   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
//  *
//  * Flow: FaceLiveness captures 4 frames -> each is uploaded to Cloudinary
//  * -> the 4 Cloudinary URLs are POSTed to /api/face-verification.
//  * On load it also checks GET /api/face-verification/me for an existing record.
//  */

// const BACKEND = import.meta.env.VITE_BACKEND_URL;
// const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
// const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
// const ENDPOINT = `${BACKEND}/api/face-verification`;

// const authHeaders = () => {
//   const token = localStorage.getItem("token");
//   return token ? { Authorization: `Bearer ${token}` } : {};
// };

// const STATUS_LABEL = {
//   pending: "Pending review",
//   approved: "Approved",
//   rejected: "Rejected",
// };

// // Upload one captured frame (base64 data URL) to Cloudinary.
// async function uploadToCloudinary({ step, image }) {
//   const form = new FormData();
//   form.append("file", image);
//   form.append("upload_preset", UPLOAD_PRESET);
//   form.append("folder", "face-verification");
//   form.append("tags", `face-liveness,${step}`);

//   const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
//     method: "POST",
//     body: form,
//   });
//   const data = await res.json();
//   if (!res.ok) throw new Error(data?.error?.message || `Cloudinary upload failed (${step})`);
//   return { step, url: data.secure_url, publicId: data.public_id };
// }

// // Send the four Cloudinary results to the backend.
// async function saveToBackend(actions) {
//   const res = await fetch(ENDPOINT, {
//     method: "POST",
//     headers: { "Content-Type": "application/json", ...authHeaders() },
//     body: JSON.stringify({ actions }),
//   });
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) throw new Error(data?.message || "Could not save verification");
//   return data;
// }

// export default function FaceVerify({ onSaved }) {
//   const [checking, setChecking] = useState(true);
//   const [existing, setExisting] = useState(null);
//   const [showFlow, setShowFlow] = useState(false);

//   const [captures, setCaptures] = useState(null);
//   const [uploaded, setUploaded] = useState(null); // kept so a retry skips re-uploading
//   const [status, setStatus] = useState("idle"); // idle | saving | saved | error
//   const [error, setError] = useState("");

//   // Load any existing verification for this user.
//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         const res = await fetch(`${ENDPOINT}/me`, { headers: authHeaders() });
//         if (res.ok) {
//           const data = await res.json();
//           if (!cancelled) setExisting(data.data);
//         } else if (!cancelled) {
//           setShowFlow(true);
//         }
//       } catch {
//         if (!cancelled) setShowFlow(true);
//       } finally {
//         if (!cancelled) setChecking(false);
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, []);

//   const save = async (frames, alreadyUploaded) => {
//     setStatus("saving");
//     setError("");
//     try {
//       const actions = alreadyUploaded || (await Promise.all(frames.map(uploadToCloudinary)));
//       setUploaded(actions);
//       const result = await saveToBackend(actions);
//       setExisting(result.data);
//       setStatus("saved");
//       toast.success("Face verification saved");
//       onSaved?.(result.data);
//     } catch (err) {
//       setError(err.message || "Something went wrong while saving.");
//       setStatus("error");
//       toast.error(err.message || "Could not save face verification");
//     }
//   };

//   if (checking) {
//     return <div className="mx-auto w-full max-w-md p-6 text-center text-sm text-stone-500">Loading…</div>;
//   }

//   if (existing && !showFlow) {
//     return (
//       <div className="mx-auto w-full max-w-md rounded-3xl bg-stone-950 p-6 text-stone-100 shadow-xl">
//         <h2 className="text-xl font-semibold">Face verification on file</h2>
//         <p className="mt-1 text-sm text-stone-400">
//           Status: <span className="text-stone-100">{STATUS_LABEL[existing.status] || existing.status}</span>
//         </p>
//         <div className="mt-5 grid grid-cols-4 gap-2">
//           {existing.actions?.map((a) => (
//             <img key={a.step} src={a.url} alt={a.step} className="aspect-[3/4] w-full rounded-lg object-cover" style={{ transform: "scaleX(-1)" }} />
//           ))}
//         </div>
//         <button
//           onClick={() => setShowFlow(true)}
//           className="mt-6 w-full rounded-xl border border-stone-700 py-3 text-sm text-stone-300 transition hover:bg-stone-900"
//         >
//           Verify again
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="mx-auto w-full max-w-md">
//       <FaceLiveness
//         onSuccess={(frames) => {
//           setCaptures(frames);
//           setUploaded(null);
//           save(frames, null);
//         }}
//         onFail={() => {
//           setCaptures(null);
//           setUploaded(null);
//           setStatus("idle");
//         }}
//       />

//       {status !== "idle" && (
//         <div className="mt-4 rounded-2xl bg-stone-950 p-4 text-center text-sm text-stone-200" aria-live="polite">
//           {status === "saving" && "Saving your verification…"}
//           {status === "saved" && <span className="text-emerald-300">Verification saved.</span>}
//           {status === "error" && (
//             <>
//               <p className="text-red-300">{error}</p>
//               <button
//                 onClick={() => save(captures, uploaded)}
//                 className="mt-3 rounded-xl bg-stone-100 px-4 py-2 font-medium text-stone-950 hover:bg-white"
//               >
//                 Retry saving
//               </button>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// }


import { useEffect, useState } from "react";
import { toast } from "sonner";
import FaceLiveness from "./FaceLiveness";

/**
 * Env (Vite):
 *   VITE_BACKEND_URL=https://your-api.com        (no trailing slash, no /api)
 *   VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
 *
 * Flow: FaceLiveness captures 4 frames -> each is uploaded to Cloudinary
 * -> the 4 Cloudinary URLs are POSTed to /api/face-verification.
 * On load it also checks GET /api/face-verification/me for an existing record.
 */

const BACKEND = import.meta.env.VITE_BACKEND;
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const ENDPOINT = `${BACKEND}/api/face-verification`;

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const STATUS_LABEL = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

// Upload one captured frame (base64 data URL) to Cloudinary.
async function uploadToCloudinary({ step, image }) {
  const form = new FormData();
  form.append("file", image);
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("folder", "face-verification");
  form.append("tags", `face-liveness,${step}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Cloudinary upload failed (${step})`);
  return { step, url: data.secure_url, publicId: data.public_id };
}

// Send the four Cloudinary results to the backend.
async function saveToBackend(actions) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ actions }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Could not save verification");
  return data;
}

export default function FaceVerify({ onSaved }) {
  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState(null);
  const [showFlow, setShowFlow] = useState(false);

  const [captures, setCaptures] = useState(null);
  const [uploaded, setUploaded] = useState(null); // kept so a retry skips re-uploading
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState("");

  // Load any existing verification for this user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${ENDPOINT}/me`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setExisting(data.data);
        } else if (!cancelled) {
          setShowFlow(true);
        }
      } catch {
        if (!cancelled) setShowFlow(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (frames, alreadyUploaded) => {
    setStatus("saving");
    setError("");
    try {
      const actions = alreadyUploaded || (await Promise.all(frames.map(uploadToCloudinary)));
      setUploaded(actions);
      const result = await saveToBackend(actions);
      setExisting(result.data);
      setStatus("saved");
      toast.success("Face verification saved");
      onSaved?.(result.data);
    } catch (err) {
      setError(err.message || "Something went wrong while saving.");
      setStatus("error");
      toast.error(err.message || "Could not save face verification");
    }
  };

  if (checking) {
    return <div className="mx-auto w-full max-w-md p-6 text-center text-sm text-stone-500">Loading…</div>;
  }

  if (existing && !showFlow) {
    return (
      <div className="mx-auto w-full max-w-md rounded-3xl bg-stone-950 p-6 text-stone-100 shadow-xl">
        <h2 className="text-xl font-semibold">Face verification on file</h2>
        <p className="mt-1 text-sm text-stone-400">
          Status: <span className="text-stone-100">{STATUS_LABEL[existing.status] || existing.status}</span>
        </p>
        {existing.status === "rejected" && existing.rejectionReason && (
          <p className="mt-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-300">Reason: {existing.rejectionReason}</p>
        )}
        <div className="mt-5 grid grid-cols-4 gap-2">
          {existing.actions?.map((a) => (
            <img key={a.step} src={a.url} alt={a.step} className="aspect-[3/4] w-full rounded-lg object-cover" style={{ transform: "scaleX(-1)" }} />
          ))}
        </div>
        <button
          onClick={() => setShowFlow(true)}
          className="mt-6 w-full rounded-xl border border-stone-700 py-3 text-sm text-stone-300 transition hover:bg-stone-900"
        >
          Verify again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <FaceLiveness
        onSuccess={(frames) => {
          setCaptures(frames);
          setUploaded(null);
          save(frames, null);
        }}
        onFail={() => {
          setCaptures(null);
          setUploaded(null);
          setStatus("idle");
        }}
      />

      {status !== "idle" && (
        <div className="mt-4 rounded-2xl bg-stone-950 p-4 text-center text-sm text-stone-200" aria-live="polite">
          {status === "saving" && "Saving your verification…"}
          {status === "saved" && <span className="text-emerald-300">Verification saved.</span>}
          {status === "error" && (
            <>
              <p className="text-red-300">{error}</p>
              <button
                onClick={() => save(captures, uploaded)}
                className="mt-3 rounded-xl bg-stone-100 px-4 py-2 font-medium text-stone-950 hover:bg-white"
              >
                Retry saving
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}