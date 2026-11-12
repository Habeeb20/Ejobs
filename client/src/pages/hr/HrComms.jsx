import { useEffect, useState } from "react";
import { Megaphone, Pin, Trash2, Send, MessageSquare, ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { hrApi } from "../../api";
import { Btn, Card, Avatar, Badge, Tabs, Spinner, Empty, Field, inputCls, useAsync, useHrEvents, ago, fmtDate, fullName, toastErr } from "./HrUi";
import Chat from "./Chat";

export default function HrComms() {
    const [tab, setTab] = useState("inbox");
    const threads = useAsync(() => hrApi.threads(), []);
    useHrEvents(["message"], threads.reload);
    const unread = (threads.data?.threads || []).reduce((s, t) => s + t.unread, 0);
    return (
        <div className="space-y-4">
            <Tabs value={tab} onChange={setTab} tabs={[["inbox", "Inbox", unread], ["announcements", "Announcements"]]} />
            {tab === "inbox" ? <Inbox threads={threads} /> : <Announcements />}
        </div>
    );
}

function Inbox({ threads }) {
    const [sel, setSel] = useState(null); // employee
    const [q, setQ] = useState("");
    const staff = useAsync(() => hrApi.employees({ status: "current", limit: 100 }), []);
    const list = threads.data?.threads || [];
    const people = (staff.data?.employees || []).filter((e) => !list.some((t) => t.employee._id === e._id));
    const match = (e) => fullName(e).toLowerCase().includes(q.toLowerCase());

    const Left = (
        <div className="space-y-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className={`${inputCls} pl-9`} placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            {!threads.data ? <Spinner /> : (
                <ul className="max-h-[30rem] divide-y divide-slate-50 overflow-y-auto">
                    {list.filter((t) => match(t.employee)).map((t) => (
                        <li key={t.employee._id}><button onClick={() => { setSel(t.employee); threads.reload(); }} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50 ${sel?._id === t.employee._id ? "bg-orange-50" : ""}`}>
                            <Avatar name={fullName(t.employee)} src={t.employee.photo} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{fullName(t.employee)}</p><p className="truncate text-xs text-slate-400">{t.last.from === "employer" ? "You: " : ""}{t.last.body}</p></div>
                            <div className="text-right"><p className="text-[11px] text-slate-400">{ago(t.last.createdAt)}</p>{t.unread > 0 && <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-[11px] font-bold text-white">{t.unread}</span>}</div></button></li>
                    ))}
                    {people.filter(match).slice(0, q ? 20 : 0).map((e) => (
                        <li key={e._id}><button onClick={() => setSel(e)} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50"><Avatar name={fullName(e)} src={e.photo} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{fullName(e)}</p><p className="text-xs text-slate-400">Start a conversation</p></div></button></li>
                    ))}
                    {!list.length && !q && <li className="py-8 text-center text-sm text-slate-400">No conversations yet. Search for someone to message.</li>}
                </ul>
            )}
        </div>
    );

    return (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className={sel ? "hidden lg:block" : ""}>{Left}</div>
            <div className={sel ? "" : "hidden lg:block"}>
                {sel ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-3"><Btn variant="ghost" className="lg:hidden" onClick={() => setSel(null)}><ArrowLeft size={16} /></Btn><Avatar name={fullName(sel)} src={sel.photo} /><div><p className="font-bold">{fullName(sel)}</p><p className="text-xs text-slate-400">{sel.jobTitle}</p></div></div>
                        <Chat key={sel._id} me="employer" load={() => hrApi.thread(sel._id)} send={(b) => hrApi.send(sel._id, b)} />
                    </div>
                ) : <Empty icon={MessageSquare} title="Pick a conversation" text="Messages reach your staff instantly, and they get an email if they're away." />}
            </div>
        </div>
    );
}

function Announcements() {
    const { data, reload } = useAsync(() => hrApi.announcements(), []);
    const settings = useAsync(() => hrApi.settings(), []);
    const [f, setF] = useState({ title: "", body: "", audience: "all", department: "", pinned: false });
    const [busy, setBusy] = useState(false);
    const depts = settings.data?.settings?.departments || [];
    const send = async (e) => {
        e.preventDefault(); setBusy(true);
        try { const r = await hrApi.createAnnouncement(f); toast.success(`Sent to ${r.data.recipients} people. They see it instantly and are being emailed.`); setF({ ...f, title: "", body: "" }); reload(); }
        catch (err) { toastErr(err); } finally { setBusy(false); }
    };
    const del = async (a) => { if (!window.confirm("Delete this announcement?")) return; try { await hrApi.deleteAnnouncement(a._id); reload(); } catch (err) { toastErr(err); } };
    return (
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
            <Card title="New announcement">
                <form onSubmit={send} className="space-y-3">
                    <Field label="Title"><input required className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
                    <Field label="Message"><textarea required rows={5} className={inputCls} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Send to"><select className={inputCls} value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}><option value="all">Everyone</option><option value="department">One department</option></select></Field>
                        {f.audience === "department" && <Field label="Department"><select required className={inputCls} value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })}><option value="">Select…</option>{depts.map((d) => <option key={d}>{d}</option>)}</select></Field>}
                    </div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-orange-600" checked={f.pinned} onChange={(e) => setF({ ...f, pinned: e.target.checked })} /> Pin to the top</label>
                    <Btn loading={busy} className="w-full"><Send size={16} /> Send announcement</Btn>
                </form>
            </Card>
            <div className="space-y-3">
                {!data ? <Spinner /> : !data.announcements.length ? <Empty icon={Megaphone} title="No announcements yet" text="Share news, policy changes and reminders with your whole team in one go." /> : data.announcements.map((a) => (
                    <Card key={a._id}><div className="flex items-start justify-between gap-2"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{a.title}</h3>{a.pinned && <Badge tone="orange"><Pin size={11} className="mr-1" />Pinned</Badge>}<Badge>{a.audience === "all" ? "Everyone" : a.department}</Badge></div><p className="mt-0.5 text-xs text-slate-400">{fmtDate(a.createdAt)}</p></div>
                        <button aria-label="Delete" onClick={() => del(a)} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>
                        <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{a.body}</p>
                        <p className="mt-3 text-xs text-slate-400">Read by {a.readCount} of {a.recipients}</p></Card>
                ))}
            </div>
        </div>
    );
}