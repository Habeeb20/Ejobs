import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { getError, userApi } from "../../api";
import { TABS, TABS_BY_ROLE } from "./ProfileConfig";
import ProfileHeader from "./ProfileHeader";

function Skeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-40 rounded-3xl bg-orange-100/70" />
      <div className="h-12 rounded-xl bg-slate-200/70" />
      <div className="h-72 rounded-2xl bg-slate-200/60" />
    </div>
  );
}

export default function Profile() {
  const [user, setUser] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeKey, setActiveKey] = useState(null);

  // Always fetch from the server, so reloads and fresh logins show the saved data
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await userApi.getMe();
      setUser(data.user);
      setCompletion(data.completion);
    } catch (err) {
      setLoadError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tabs call this with only the fields that changed; errors bubble up to the tab
  const save = async (payload) => {
    const { data } = await userApi.updateProfile(payload);
    setUser(data.user);
    setCompletion(data.completion);
  };

  if (loading && !user) return <Skeleton />;

  if (loadError && !user) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-sm font-medium text-red-700">{loadError}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const tabs = (TABS_BY_ROLE[user.role] || ["personal", "address"]).map((k) => TABS[k]);
  const active = tabs.find((t) => t.key === activeKey) || tabs[0];
  const ActiveTab = active.component;

  return (
    <div className="space-y-6">
      <ProfileHeader user={user} completion={completion} tabs={tabs} onGoTo={setActiveKey} />

      <div
        role="tablist"
        aria-label="Profile sections"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map(({ key, label, icon: Icon }) => {
          const section = completion?.sections?.[key];
          const done = section?.percent === 100;
          const isActive = key === active.key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveKey(key)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {done ? (
                <CheckCircle2 className={`h-4 w-4 ${isActive ? "text-white" : "text-emerald-500"}`} />
              ) : (
                section && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      isActive ? "bg-white/25 text-white" : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {section.percent}%
                  </span>
                )
              )}
            </button>
          );
        })}
      </div>

      <section role="tabpanel" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <ActiveTab key={active.key} user={user} onSave={save} />
      </section>
    </div>
  );
}