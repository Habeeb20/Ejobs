import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { benefitApi, getError } from "../../api";
import {
  Card,
  EmptyState,
  PageHeader,
  Spinner,
  fmtDate,
  fullName,
  ghostBtn,
  inputCls,
  primaryBtn,
} from "../../components/benefits/shared";

export default function BenefitAttendance() {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "superadmin";

  const [settings, setSettings] = useState(null);
  const [records, setRecords] = useState(null);

  const [checkIn, setCheckIn] = useState({ benefitNumber: "", note: "", liftBlacklist: false });
  const [checkingIn, setCheckingIn] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const [saving, setSaving] = useState(false);
  const [enforcing, setEnforcing] = useState(false);

  const loadRecords = useCallback(() => {
    benefitApi.admin
      .attendance()
      .then(({ data }) => setRecords(data.records))
      .catch((err) => {
        toast.error(getError(err));
        setRecords([]);
      });
  }, []);

  useEffect(() => {
    benefitApi.admin
      .getSettings()
      .then(({ data }) => setSettings(data.settings))
      .catch((err) => toast.error(getError(err)));
    loadRecords();
  }, [loadRecords]);

  const submitCheckIn = async (e) => {
    e.preventDefault();
    if (!checkIn.benefitNumber.trim()) return toast.error("Enter the benefit number");
    setCheckingIn(true);
    setLastResult(null);
    try {
      const { data } = await benefitApi.admin.checkIn({
        benefitNumber: checkIn.benefitNumber.trim(),
        note: checkIn.note,
        liftBlacklist: checkIn.liftBlacklist,
      });
      setLastResult(data);
      toast.success(data.message);
      setCheckIn({ benefitNumber: "", note: "", liftBlacklist: false });
      loadRecords();
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setCheckingIn(false);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await benefitApi.admin.saveSettings({
        attendanceIntervalDays: Number(settings.attendanceIntervalDays),
        maxBenefitAmount: Number(settings.maxBenefitAmount || 0),
        venueName: settings.venueName,
        venueAddress: settings.venueAddress,
      });
      setSettings(data.settings);
      toast.success("Settings saved");
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const runCheck = async () => {
    setEnforcing(true);
    try {
      const { data } = await benefitApi.admin.enforce();
      toast.success(
        data.blacklisted
          ? `${data.blacklisted} absent beneficiar${data.blacklisted === 1 ? "y was" : "ies were"} blacklisted`
          : "No one is overdue"
      );
    } catch (err) {
      toast.error(getError(err));
    } finally {
      setEnforcing(false);
    }
  };

  const setField = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title="Venue attendance" text="Record who is present and control how often they must come." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Record a visit">
          <form onSubmit={submitCheckIn} className="space-y-4">
            <div>
              <label htmlFor="benefitNumber" className="mb-1.5 block text-sm font-medium text-slate-700">
                Benefit number
              </label>
              <input
                id="benefitNumber"
                value={checkIn.benefitNumber}
                onChange={(e) => setCheckIn((c) => ({ ...c, benefitNumber: e.target.value.toUpperCase() }))}
                placeholder="BEN-XXXXXXXX"
                autoComplete="off"
                autoFocus
                className={`${inputCls} font-medium tracking-wider`}
              />
            </div>
            <div>
              <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-slate-700">
                Note <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input id="note" value={checkIn.note} onChange={(e) => setCheckIn((c) => ({ ...c, note: e.target.value }))} className={inputCls} />
            </div>
            <label className="flex items-start gap-2.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={checkIn.liftBlacklist}
                onChange={(e) => setCheckIn((c) => ({ ...c, liftBlacklist: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Lift the blacklist if this person was blacklisted for missing a visit</span>
            </label>
            <button type="submit" disabled={checkingIn} className={primaryBtn}>
              {checkingIn ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Recording…
                </>
              ) : (
                "Record visit"
              )}
            </button>
          </form>

          {lastResult && (
            <div role="status" className="mt-5 rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-slate-800">
              <p className="font-semibold">{lastResult.person || "Beneficiary"} checked in</p>
              <p className="mt-0.5">Next visit due {fmtDate(lastResult.nextAttendanceDue)}.</p>
              {lastResult.stillBlacklisted && (
                <p className="mt-1 font-medium text-red-700">
                  Still blacklisted. Tick "Lift the blacklist" and record again to restore them.
                </p>
              )}
            </div>
          )}
        </Card>

        <Card title="Rules and venue">
          {!settings ? (
            <Spinner />
          ) : (
            <form onSubmit={saveSettings} className="space-y-4">
              <fieldset disabled={!isSuperAdmin} className="space-y-4">
                <div>
                  <label htmlFor="interval" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Must be present every (days)
                  </label>
                  <input id="interval" type="number" min="1" max="365" value={settings.attendanceIntervalDays} onChange={setField("attendanceIntervalDays")} className={inputCls} />
                  <p className="mt-1.5 text-xs text-slate-500">
                    Beneficiaries who miss a visit are blacklisted from all employers. Changes apply from each person's next visit.
                  </p>
                </div>
                <div>
                  <label htmlFor="venueName" className="mb-1.5 block text-sm font-medium text-slate-700">Venue name</label>
                  <input id="venueName" value={settings.venueName || ""} onChange={setField("venueName")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="venueAddress" className="mb-1.5 block text-sm font-medium text-slate-700">Venue address</label>
                  <input id="venueAddress" value={settings.venueAddress || ""} onChange={setField("venueAddress")} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="maxAmount" className="mb-1.5 block text-sm font-medium text-slate-700">Largest amount per request (₦)</label>
                  <input id="maxAmount" type="number" min="0" value={settings.maxBenefitAmount ?? 0} onChange={setField("maxBenefitAmount")} className={inputCls} />
                  <p className="mt-1.5 text-xs text-slate-500">Use 0 for no limit.</p>
                </div>
              </fieldset>

              {isSuperAdmin ? (
                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={saving} className={primaryBtn}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save settings
                  </button>
                  <button type="button" onClick={runCheck} disabled={enforcing} className={ghostBtn}>
                    {enforcing && <Loader2 className="h-4 w-4 animate-spin" />} Run absence check now
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Only a super admin can change these settings.</p>
              )}
            </form>
          )}
        </Card>
      </div>

      <Card title="Recent visits">
        {records === null ? (
          <Spinner />
        ) : records.length === 0 ? (
          <EmptyState title="No visits recorded" text="Visits you record will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Beneficiary</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">Benefit number</th>
                  <th scope="col" className="py-2.5 pr-4 font-medium">When</th>
                  <th scope="col" className="py-2.5 font-medium">Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r._id}>
                    <td className="py-2.5 pr-4 text-slate-900">
                      {fullName(r.user)}
                      {r.liftedBlacklist && (
                        <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">Blacklist lifted</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{r.benefitNumber}</td>
                    <td className="py-2.5 pr-4 text-slate-600">{fmtDate(r.checkedInAt, true)}</td>
                    <td className="py-2.5 text-slate-600">{fullName(r.markedBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}