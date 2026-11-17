import { useNavigate, useParams } from "react-router-dom";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import useInterviewCall from "./useInterviewCall";

const MESSAGES = {
  starting: "Starting your camera and microphone…",
  connecting: "Connecting…",
  reconnecting: "Connection lost. Trying to reconnect…",
  replaced: "You joined this interview from another tab or device. Close this one.",
};

function RoundButton({ onClick, active = true, danger = false, label, children }) {
  const tone = danger
    ? "bg-red-600 text-white hover:bg-red-700"
    : active
    ? "bg-white/15 text-white hover:bg-white/25"
    : "bg-white text-slate-900 hover:bg-slate-200";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-12 w-12 place-items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 ${tone}`}
    >
      {children}
    </button>
  );
}

export default function InterviewRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { localRef, remoteRef, status, error, peerLabel, micOn, camOn, hasVideo, toggleMic, toggleCam } =
    useInterviewCall(id);

  const leave = () => navigate("/"); // change to your dashboard route
  const overlay =
    status === "waiting" ? `Waiting for the ${peerLabel.toLowerCase()} to join…`
    : status === "error" ? error
    : status !== "connected" ? MESSAGES[status]
    : null;

  return (
    <div className="mx-auto max-w-6xl p-3">
      <div className="relative h-[calc(100dvh-6rem)] overflow-hidden rounded-2xl bg-slate-900">
        {/* Remote person */}
        <video ref={remoteRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-contain" />

        {/* Status overlay */}
        {overlay && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div className="max-w-sm">
              <p className={`text-lg font-medium ${status === "error" ? "text-red-300" : "text-white"}`}>{overlay}</p>
              {(status === "error" || status === "replaced") && (
                <button onClick={leave}
                  className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">
                  Back to dashboard
                </button>
              )}
            </div>
          </div>
        )}

        {/* You (picture-in-picture). Always mounted so the stream can attach. */}
        <div className={`absolute bottom-24 right-4 h-36 w-28 overflow-hidden rounded-xl bg-slate-800 shadow-lg ring-1 ring-white/20 sm:h-44 sm:w-32 ${status === "error" || status === "replaced" ? "hidden" : ""}`}>
          <video ref={localRef} autoPlay playsInline muted
            className={`h-full w-full object-cover [transform:scaleX(-1)] ${camOn ? "" : "invisible"}`} />
          {!camOn && (
            <div className="absolute inset-0 grid place-items-center text-xs text-slate-400">
              {hasVideo ? "Camera off" : "No camera"}
            </div>
          )}
        </div>

        {/* Controls */}
        {status !== "error" && status !== "replaced" && (
          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3">
            <RoundButton onClick={toggleMic} active={micOn} label={micOn ? "Mute microphone" : "Unmute microphone"}>
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </RoundButton>
            {hasVideo && (
              <RoundButton onClick={toggleCam} active={camOn} label={camOn ? "Turn camera off" : "Turn camera on"}>
                {camOn ? <Video size={20} /> : <VideoOff size={20} />}
              </RoundButton>
            )}
            <RoundButton onClick={leave} danger label="Leave interview">
              <PhoneOff size={20} />
            </RoundButton>
          </div>
        )}
      </div>
    </div>
  );
}