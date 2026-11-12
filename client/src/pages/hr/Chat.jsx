import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Spinner, Btn, inputCls, toastErr, useHrEvents, fmtTime, fmtDate } from "./HrUi";

/**
 * One conversation between the employer and a staff member, used on both sides.
 *   load()  -> axios promise returning { messages }
 *   send(text) -> axios promise
 *   me      -> "employer" or "employee" (which bubbles are mine)
 * New messages from the other side appear instantly through the live HR event.
 */
export default function Chat({ load, send, me, empty = "No messages yet. Say hello." }) {
    const [messages, setMessages] = useState(null);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const end = useRef(null);

    const refresh = () => load().then((r) => setMessages(r.data.messages)).catch(toastErr);
    useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    useHrEvents(["message"], () => refresh());
    useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages?.length]);

    const submit = async (e) => {
        e.preventDefault();
        const body = text.trim();
        if (!body) return;
        setBusy(true);
        try { const r = await send(body); setMessages((m) => [...(m || []), r.data.message]); setText(""); }
        catch (err) { toastErr(err); }
        finally { setBusy(false); }
    };

    if (!messages) return <Spinner label="Loading messages…" />;
    let lastDay = "";
    return (
        <div className="flex h-[28rem] flex-col rounded-2xl bg-white shadow-sm">
            <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {!messages.length && <p className="py-10 text-center text-sm text-slate-400">{empty}</p>}
                {messages.map((m) => {
                    const mine = m.from === me, day = fmtDate(m.createdAt), show = day !== lastDay;
                    lastDay = day;
                    return (
                        <div key={m._id}>
                            {show && <p className="my-2 text-center text-xs text-slate-400">{day}</p>}
                            <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                                    <p className="whitespace-pre-line break-words">{m.body}</p>
                                    <p className={`mt-1 text-[11px] ${mine ? "text-orange-100" : "text-slate-400"}`}>{fmtTime(m.createdAt)}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={end} />
            </div>
            <form onSubmit={submit} className="flex gap-2 border-t border-slate-100 p-3">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" maxLength={3000} className={inputCls} />
                <Btn loading={busy} aria-label="Send"><Send size={16} /></Btn>
            </form>
        </div>
    );
}