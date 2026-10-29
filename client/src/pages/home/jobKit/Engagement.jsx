import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, Heart, Share2, UserCheck, UserPlus } from "lucide-react";
import { getError, jobsApi } from "../../../api";

const enc = encodeURIComponent;

const CHANNELS = [
  { key: "whatsapp", label: "WhatsApp", href: (u, t) => `https://wa.me/?text=${enc(`${t} ${u}`)}` },
  { key: "facebook", label: "Facebook", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
  { key: "twitter", label: "X (Twitter)", href: (u, t) => `https://twitter.com/intent/tweet?text=${enc(t)}&url=${enc(u)}` },
  { key: "linkedin", label: "LinkedIn", href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}` },
  { key: "telegram", label: "Telegram", href: (u, t) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}` },
  { key: "email", label: "Email", href: (u, t, s) => `mailto:?subject=${enc(s)}&body=${enc(`${t}\n${u}`)}` },
  { key: "copy", label: "Copy link" },
];

const pill =
  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-600";
const idle = "bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700";
const on = "bg-orange-50 text-orange-700";

const initial = (job) => ({
  liked: !!job?.liked,
  likeCount: job?.likeCount ?? 0,
  followed: !!job?.followed,
  followCount: job?.followCount ?? 0,
  shareCount: job?.shareCount ?? 0,
  views: job?.totalViews ?? 0,
});

function useEngagement(job) {
  const navigate = useNavigate();
  const [s, setS] = useState(() => initial(job));
  const busy = useRef({});

  useEffect(() => { setS(initial(job)); }, [job?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = async (kind) => {
    if (!localStorage.getItem("token")) {
      toast(kind === "like" ? "Log in to save jobs" : "Log in to follow jobs", {
        action: { label: "Log in", onClick: () => navigate("/login") },
      });
      return;
    }
    if (busy.current[kind]) return;
    busy.current[kind] = true;

    const flag = kind === "like" ? "liked" : "followed";
    const countKey = kind === "like" ? "likeCount" : "followCount";
    const before = s;
    const next = !before[flag];
    setS({ ...before, [flag]: next, [countKey]: Math.max(0, before[countKey] + (next ? 1 : -1)) });

    try {
      const { data } = await (kind === "like" ? jobsApi.like(job._id) : jobsApi.follow(job._id));
      setS((cur) => ({
        ...cur,
        ...(typeof data?.[flag] === "boolean" && { [flag]: data[flag] }),
        ...(typeof data?.[countKey] === "number" && { [countKey]: data[countKey] }),
      }));
      toast.success(
        kind === "like"
          ? next ? "Saved to your jobs" : "Removed from saved jobs"
          : next ? "You're following this job" : "Unfollowed"
      );
    } catch (err) {
      setS(before);
      toast.error(getError(err));
    } finally {
      busy.current[kind] = false;
    }
  };

  return { s, setS, toggle };
}

function ShareMenu({ job, count, onCount, placement }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const url = `${window.location.origin}/jobs/${job._id}`;
  const text = `${job.jobTitle} at ${job.employer?.companyName || "a verified employer"} (${job.city}, ${job.state}) on EJob`;
  const list = navigator.share ? [...CHANNELS, { key: "other", label: "More options…" }] : CHANNELS;

  const share = async (c) => {
    setOpen(false);
    // Open the channel straight away (inside the click) so popup blockers don't stop it
    if (c.key === "copy") {
      try { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
      catch { toast.error("Couldn't copy the link"); }
    } else if (c.key === "other") {
      try { await navigator.share({ title: job.jobTitle, text, url }); } catch { return; }
    } else if (c.key === "email") {
      window.location.href = c.href(url, text, job.jobTitle);
    } else {
      window.open(c.href(url, text), "_blank", "noopener,noreferrer");
    }

    // The server counts one share per person per channel, so only logged-in shares are recorded
    if (localStorage.getItem("token")) {
      jobsApi.share(job._id, c.key)
        .then(({ data }) => typeof data?.shareCount === "number" && onCount(data.shareCount))
        .catch(() => { });
    }
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        aria-label={`Share job, ${count} shares`} className={`${pill} ${open ? on : idle}`}>
        <Share2 className="h-4 w-4" /> {count}
      </button>
      {open && (
        <div role="menu"
          className={`absolute left-0 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1 shadow-xl ${placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
            }`}>
          {list.map((c) => (
            <button key={c.key} role="menuitem" onClick={() => share(c)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-orange-50 hover:text-orange-700">
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EngagementBar({ job, placement = "up" }) {
  const { s, setS, toggle } = useEngagement(job);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ShareMenu job={job} count={s.shareCount} placement={placement}
        onCount={(n) => setS((c) => ({ ...c, shareCount: n }))} />

      <button type="button" onClick={() => toggle("like")} aria-pressed={s.liked}
        title={s.liked ? "Remove from saved jobs" : "Save this job"}
        className={`${pill} ${s.liked ? on : idle}`}>
        <Heart className={`h-4 w-4 ${s.liked ? "fill-orange-600 text-orange-600" : ""}`} /> {s.likeCount}
      </button>

      <button type="button" onClick={() => toggle("follow")} aria-pressed={s.followed}
        title={s.followed ? "Unfollow this job" : "Follow this job for updates"}
        className={`${pill} ${s.followed ? on : idle}`}>
        {s.followed ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />} {s.followCount}
      </button>

      <span className="inline-flex items-center gap-1.5 px-1 text-sm text-slate-500">
        <Eye className="h-4 w-4" /> {s.views.toLocaleString()} view{s.views === 1 ? "" : "s"}
      </span>
    </div>
  );
}