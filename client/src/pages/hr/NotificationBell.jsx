import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { hrApi } from "../../api";
import { ago, useHrEvents } from "./HrUi";

// Replaces the dead bell in the dashboard header. New HR events arrive live and also stay in the list.
export default function NotificationBell({ className = "" }) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [, setParams] = useSearchParams();
    const box = useRef(null);

    const load = () => hrApi.notifications().then((r) => { setItems(r.data.notifications); setUnread(r.data.unread); }).catch(() => { });
    useEffect(() => { load(); }, []);
    useHrEvents(null, () => load());
    useEffect(() => {
        const away = (e) => !box.current?.contains(e.target) && setOpen(false);
        document.addEventListener("mousedown", away);
        return () => document.removeEventListener("mousedown", away);
    }, []);

    const readAll = async () => { await hrApi.readNotifications({ all: true }).catch(() => { }); load(); };
    const openItem = (n) => {
        setOpen(false);
        if (!n.readAt) hrApi.readNotifications({ ids: [n._id] }).then(load).catch(() => { });
        if (n.employee) {
            // employer notifications carry a dashboard tab, employee ones a section of "My employment"
            const employer = ["hrLeave", "hrAttendance", "hrPayroll", "hrPerformance", "hrComms", "hrEmployees"].includes(n.tab);
            setParams(employer ? { tab: n.tab, id: n.employee } : { tab: "myEmployment", eid: n.employee, section: n.tab || "overview" });
        }
    };

    return (
        <div ref={box} className={`relative ${className}`}>
            <button onClick={() => setOpen((o) => !o)} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} aria-expanded={open}
                className="relative grid h-10 w-10 place-items-center rounded-xl transition-colors hover:bg-slate-200">
                <Bell size={20} />
                {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
            </button>
            {open && (
                <div className="absolute right-0 top-12 z-40 w-[min(92vw,22rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <h3 className="font-bold">Notifications</h3>
                        {unread > 0 && <button onClick={readAll} className="flex items-center gap-1 text-xs font-semibold text-orange-700"><CheckCheck size={14} /> Mark all read</button>}
                    </div>
                    <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
                        {!items.length && <li className="p-8 text-center text-sm text-slate-400">Nothing yet</li>}
                        {items.map((n) => (
                            <li key={n._id}>
                                <button onClick={() => openItem(n)} className={`block w-full px-4 py-3 text-left hover:bg-slate-50 ${n.readAt ? "" : "bg-orange-50/60"}`}>
                                    <p className="text-sm font-semibold">{n.title}</p>
                                    {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>}
                                    <p className="mt-1 text-[11px] text-slate-400">{ago(n.createdAt)}</p>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}