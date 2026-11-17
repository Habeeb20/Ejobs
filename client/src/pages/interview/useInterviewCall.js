import { useCallback, useEffect, useRef, useState } from "react";
import api, { getError } from "../../api";
import socket from "../../socket";

/**
 * status: starting | waiting | connecting | connected | reconnecting | replaced | error
 */
export default function useInterviewCall(interviewId) {
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState("starting");
  const [error, setError] = useState("");
  const [peerLabel, setPeerLabel] = useState("the other person");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [hasVideo, setHasVideo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let iceServers = [];
    let pc = null;
    let isOfferer = false;
    let pending = []; // ICE candidates that arrived before the remote description

    const closePc = () => {
      if (pc) {
        pc.onicecandidate = pc.ontrack = pc.onnegotiationneeded = pc.oniceconnectionstatechange = null;
        pc.close();
        pc = null;
      }
      pending = [];
      if (remoteRef.current) remoteRef.current.srcObject = null;
    };

    const createPc = () => {
      closePc();
      const conn = new RTCPeerConnection({ iceServers });
      pc = conn;
      stream.getTracks().forEach((t) => conn.addTrack(t, stream));

      conn.onicecandidate = (e) => {
        if (e.candidate) socket.emit("rtc:signal", { candidate: e.candidate });
      };

      conn.ontrack = (e) => {
        if (remoteRef.current) {
          remoteRef.current.srcObject = e.streams[0];
          remoteRef.current.play?.().catch(() => {});
        }
      };

      // Fires once tracks are added, and again after restartIce()
      conn.onnegotiationneeded = async () => {
        if (!isOfferer || pc !== conn) return;
        try {
          const offer = await conn.createOffer();
          if (pc !== conn || conn.signalingState !== "stable") return;
          await conn.setLocalDescription(offer);
          socket.emit("rtc:signal", { description: conn.localDescription });
        } catch (err) {
          console.error("offer failed", err);
        }
      };

      conn.oniceconnectionstatechange = () => {
        if (pc !== conn) return;
        const s = conn.iceConnectionState;
        if (s === "connected" || s === "completed") setStatus("connected");
        else if (s === "disconnected") setStatus("reconnecting");
        else if (s === "failed") {
          setStatus("reconnecting");
          if (isOfferer) conn.restartIce();
        }
      };
    };

    const flushCandidates = async () => {
      const list = pending;
      pending = [];
      for (const c of list) {
        try { await pc.addIceCandidate(c); } catch (err) { console.warn("candidate", err); }
      }
    };

    const onSignal = async ({ description, candidate }) => {
      try {
        if (description) {
          if (description.type === "offer") {
            if (!pc) createPc(); // we're the answerer
            await pc.setRemoteDescription(description);
            await flushCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("rtc:signal", { description: pc.localDescription });
          } else if (pc) {
            await pc.setRemoteDescription(description);
            await flushCandidates();
          }
        } else if (candidate) {
          if (pc?.remoteDescription) await pc.addIceCandidate(candidate);
          else pending.push(candidate);
        }
      } catch (err) {
        console.error("signal error", err);
      }
    };

    // Someone joined after us: we send the offer
    const onPeerJoined = () => {
      isOfferer = true;
      setStatus("connecting");
      createPc();
    };

    const onPeerLeft = () => {
      closePc();
      setStatus("waiting");
    };

    const onReplaced = () => {
      closePc();
      stream?.getTracks().forEach((t) => t.stop());
      setStatus("replaced");
    };

    // Runs on first connect and again after every socket reconnect
    // (rooms are lost on reconnect, so we have to rejoin)
    const join = () => {
      socket.emit("interview:join", { interviewId }, (res) => {
        if (cancelled) return;
        if (!res?.ok) {
          setError(res?.message || "Could not join the interview");
          setStatus("error");
          return;
        }
        closePc();
        if (res.peerPresent) {
          isOfferer = false; // they'll send us an offer
          setStatus("connecting");
        } else {
          setStatus("waiting");
        }
      });
    };

    const start = async () => {
      try {
        const { data } = await api.get(`/interviews/${interviewId}/join`);
        if (cancelled) return;
        iceServers = data.iceServers;
        setPeerLabel(data.peerLabel || "the other person");

        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
            audio: { echoCancellation: true, noiseSuppression: true },
          });
        } catch (mediaErr) {
          // No camera or camera blocked: fall back to audio only
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasVideo(false);
            setCamOn(false);
          } catch {
            throw Object.assign(new Error(
              "We couldn't access your microphone or camera. Allow access in your browser settings and reload."
            ), { friendly: true });
          }
        }
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }

        streamRef.current = stream;
        if (localRef.current) localRef.current.srcObject = stream;

        socket.on("rtc:signal", onSignal);
        socket.on("interview:peer-joined", onPeerJoined);
        socket.on("interview:peer-left", onPeerLeft);
        socket.on("interview:replaced", onReplaced);
        socket.on("connect", join);
        if (socket.connected) join();
        else socket.connect(); // 'connect' handler above then calls join()
      } catch (err) {
        if (cancelled) return;
        if (err.friendly) setError(err.message);
        else if (err.response?.status === 425)
          setError(`This interview hasn't opened yet. It starts ${new Date(err.response.data.startsAt).toLocaleString()}.`);
        else setError(getError(err));
        setStatus("error");
      }
    };

    start();

    return () => {
      cancelled = true;
      socket.emit("interview:leave");
      socket.off("rtc:signal", onSignal);
      socket.off("interview:peer-joined", onPeerJoined);
      socket.off("interview:peer-left", onPeerLeft);
      socket.off("interview:replaced", onReplaced);
      socket.off("connect", join);
      closePc();
      stream?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [interviewId]);

  const toggleMic = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  const toggleCam = useCallback(() => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
  }, []);

  return { localRef, remoteRef, status, error, peerLabel, micOn, camOn, hasVideo, toggleMic, toggleCam };
}