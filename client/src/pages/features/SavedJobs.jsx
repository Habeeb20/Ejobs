import { useEffect, useState } from "react";
import { toast } from "sonner";
import { jobsApi, getError } from "../../api";
import { Spinner } from "./jobUi";
import JobCard from "./JobCard";
import JobDetails from "./JobDetails";

export default function SavedJobs({ user }) {
  const [jobs, setJobs] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    jobsApi.saved().then((r) => setJobs(r.data.jobs)).catch((e) => { toast.error(getError(e)); setJobs([]); });
  }, [selected]); // reload when coming back from a job, in case it was un-saved

  if (selected) return <JobDetails jobId={selected} user={user} onBack={() => setSelected(null)} />;
  if (!jobs) return <Spinner label="Loading saved jobs…" />;
  if (!jobs.length)
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">No saved jobs</h2>
        <p className="mt-1 text-slate-500">Tap the heart on any job to keep it here.</p>
      </div>
    );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {jobs.map((j) => (
        <JobCard key={j._id} job={j} onOpen={setSelected}
          onLiked={(id) => setJobs((js) => js.filter((x) => x._id !== id))} />
      ))}
    </div>
  );
}