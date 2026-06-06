import { useCallback, useEffect, useRef, useState } from "react";
import API from "../services/api";

const SILENCE_MS = 1500;
const MIN_SPEECH_MS = 900;
const MIN_RECORD_MS = 1200;
const VOLUME_THRESHOLD = 0.02;
const MIN_BLOB_BYTES = 1200;
const POST_SPEAK_COOLDOWN_MS = 1000;
const RETRY_COOLDOWN_MS = 2000;

function getRmsVolume(analyser) {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const sample = (data[i] - 128) / 128;
    sum += sample * sample;
  }
  return Math.sqrt(sum / data.length);
}

function playBase64Audio(base64Audio, audioRef, urlRef) {
  return new Promise((resolve, reject) => {
    if (!base64Audio) {
      resolve();
      return;
    }

    try {
      const blob = new Blob(
        [Uint8Array.from(atob(base64Audio), (c) => c.charCodeAt(0))],
        { type: "audio/wav" }
      );
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current || new Audio();
      audioRef.current = audio;

      const done = () => {
        audio.onended = null;
        audio.onerror = null;
        resolve();
      };

      audio.onended = done;
      audio.onerror = () => {
        audio.onended = null;
        audio.onerror = null;
        reject(new Error("Playback failed"));
      };

      if (urlRef.current && urlRef.current !== url) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = url;

      audio.src = url;
      audio.currentTime = 0;
      audio.play().catch(reject);
    } catch (err) {
      reject(err);
    }
  });
}

export function useRealtimeVoice() {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState("idle");
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const [liveLevel, setLiveLevel] = useState(0);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const rafRef = useRef(null);
  const phaseRef = useRef("idle");
  const speechStartedAtRef = useRef(null);
  const silenceStartedAtRef = useRef(null);
  const isCapturingRef = useRef(false);
  const isSendingRef = useRef(false);
  const playbackAudioRef = useRef(null);
  const playbackUrlRef = useRef(null);
  const activeRef = useRef(false);
  const listenAfterRef = useRef(0);
  const retryAfterRef = useRef(0);
  const captureMimeRef = useRef("audio/webm");

  const setPhaseSafe = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const stopPlayback = () => {
    const audio = playbackAudioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
    }
  };

  const cleanupStream = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    isCapturingRef.current = false;
    isSendingRef.current = false;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const resumeListening = useCallback(() => {
    if (activeRef.current) {
      setPhaseSafe("listening");
    }
  }, []);

  const sendUtterance = useCallback(async () => {
    if (isSendingRef.current) return;
    if (Date.now() < retryAfterRef.current) {
      resumeListening();
      return;
    }

    if (!chunksRef.current.length) {
      resumeListening();
      return;
    }

    const blob = new Blob(chunksRef.current, {
      type: captureMimeRef.current,
    });
    chunksRef.current = [];

    if (blob.size < MIN_BLOB_BYTES) {
      resumeListening();
      return;
    }

    isSendingRef.current = true;
    setPhaseSafe("processing");
    setError("");

    const formData = new FormData();
    formData.append("audio", blob, "utterance.webm");

    try {
      const result = await API.post("/voice-chat", formData);

      const userText = result.data.user_text || "";
      const assistantText =
        result.data.ai_response || result.data.ai_text || "";

      setMessages((prev) => [
        ...prev,
        { role: "user", text: userText },
        { role: "assistant", text: assistantText },
      ]);

      setPhaseSafe("speaking");

      if (result.data.audio) {
        await playBase64Audio(
          result.data.audio,
          playbackAudioRef,
          playbackUrlRef
        );
      }

      listenAfterRef.current = Date.now() + POST_SPEAK_COOLDOWN_MS;
    } catch (err) {
      if (err.recoverable || err.status === 400) {
        retryAfterRef.current = Date.now() + RETRY_COOLDOWN_MS;
      } else {
        setError(err.message || "Voice request failed.");
        retryAfterRef.current = Date.now() + RETRY_COOLDOWN_MS;
      }
    } finally {
      isSendingRef.current = false;
      resumeListening();
    }
  }, [resumeListening]);

  const startCapture = useCallback(() => {
    if (!streamRef.current || isCapturingRef.current || isSendingRef.current) {
      return;
    }
    if (phaseRef.current !== "listening") return;
    if (Date.now() < listenAfterRef.current) return;
    if (Date.now() < retryAfterRef.current) return;

    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    captureMimeRef.current = mimeType;

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      isCapturingRef.current = false;
      mediaRecorderRef.current = null;

      window.setTimeout(() => {
        if (activeRef.current && !isSendingRef.current) {
          sendUtterance();
        }
      }, 120);
    };

    recorder.start(250);
    isCapturingRef.current = true;
    speechStartedAtRef.current = Date.now();
    silenceStartedAtRef.current = null;
  }, [sendUtterance]);

  const stopCapture = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state !== "recording") return;

    const duration = speechStartedAtRef.current
      ? Date.now() - speechStartedAtRef.current
      : 0;

    if (duration < MIN_RECORD_MS) {
      try {
        recorder.stop();
      } catch {
        /* ignore */
      }
      chunksRef.current = [];
      isCapturingRef.current = false;
      mediaRecorderRef.current = null;
      speechStartedAtRef.current = null;
      silenceStartedAtRef.current = null;
      return;
    }

    try {
      if (typeof recorder.requestData === "function") {
        recorder.requestData();
      }
      recorder.stop();
    } catch {
      /* ignore */
    }
  }, []);

  const runVadLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser || !activeRef.current) return;

    const volume = getRmsVolume(analyser);

    if (phaseRef.current === "listening") {
      setLiveLevel(volume);
    }

    const currentPhase = phaseRef.current;
    const loud = volume > VOLUME_THRESHOLD;
    const pastCooldown = Date.now() >= listenAfterRef.current;
    const pastRetry = Date.now() >= retryAfterRef.current;

    if (
      currentPhase === "listening" &&
      pastCooldown &&
      pastRetry &&
      !isSendingRef.current
    ) {
      if (loud) {
        silenceStartedAtRef.current = null;
        if (!isCapturingRef.current) {
          startCapture();
        }
      } else if (isCapturingRef.current && speechStartedAtRef.current) {
        const speechDuration = Date.now() - speechStartedAtRef.current;
        if (speechDuration >= MIN_SPEECH_MS) {
          if (!silenceStartedAtRef.current) {
            silenceStartedAtRef.current = Date.now();
          } else if (Date.now() - silenceStartedAtRef.current >= SILENCE_MS) {
            stopCapture();
            silenceStartedAtRef.current = null;
            speechStartedAtRef.current = null;
          }
        }
      }
    }

    rafRef.current = requestAnimationFrame(runVadLoop);
  }, [startCapture, stopCapture]);

  const startConversation = useCallback(async () => {
    setError("");
    retryAfterRef.current = 0;
    listenAfterRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      const audioContext = new AudioContext();
      await audioContext.resume();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.55;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      activeRef.current = true;
      setActive(true);
      setPhaseSafe("listening");
      runVadLoop();
    } catch (err) {
      setError("Microphone access denied or unavailable.");
      console.error(err);
    }
  }, [runVadLoop]);

  const endConversation = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    stopPlayback();
    cleanupStream();
    setPhaseSafe("idle");
    setLiveLevel(0);
  }, [cleanupStream]);

  const clearChat = useCallback(async () => {
    setError("");
    try {
      await API.post("/clear-chat");
      setMessages([]);
    } catch (err) {
      setError(err.message || "Failed to clear chat.");
    }
  }, []);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopPlayback();
      cleanupStream();
      if (playbackUrlRef.current) {
        URL.revokeObjectURL(playbackUrlRef.current);
      }
    };
  }, [cleanupStream]);

  return {
    active,
    phase,
    messages,
    error,
    liveLevel,
    startConversation,
    endConversation,
    clearChat,
  };
}
