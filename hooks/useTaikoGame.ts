"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { LANDMARK_INDICES, BODY_PART_COLORS } from "@/lib/rhythmPatterns";
export type GameMode = "free" | "rhythm";
export type GamePhase = "idle" | "loading" | "ready" | "playing" | "error";
interface HitEffect {
  id: number;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

interface PrevLandmark {
  x: number;
  y: number;
  vy: number;
}

export function useTaikoGame(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [score, setScore] = useState(0);
  const [hitCount, setHitCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const poseLandmarkerRef = useRef<unknown>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number>(0);
  const hitEffectsRef = useRef<HitEffect[]>([]);
  const hitEffectIdRef = useRef(0);
  const prevLandmarksRef = useRef<Map<string, PrevLandmark>>(new Map());
  const scoreRef = useRef(0);
  const hitCountRef = useRef(0);
  const isMutedRef = useRef(false);

  const HIT_THRESHOLD = 0.015;
  const CANVAS_W = 360;
  const CANVAS_H = 560;

  const playDrumSound = useCallback((freq: number = 120, gain: number = 0.5) => {
    if (isMutedRef.current) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
      const bufferSize = ctx.sampleRate * 0.1;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      const noiseGain = ctx.createGain();
      noise.buffer = buffer;
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseGain.gain.setValueAtTime(gain * 0.3, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      noise.start(ctx.currentTime);
    } catch (_e) { /* audio error non-fatal */ }
  }, []);

  const loadModel = useCallback(async () => {
    setPhase("loading");
    try {
      const vision = await import("@mediapipe/tasks-vision");
      const { PoseLandmarker, FilesetResolver } = vision;
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      const poseLandmarker = await PoseLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      poseLandmarkerRef.current = poseLandmarker;
      setPhase("ready");
    } catch (e) {
      console.error(e);
      setError("カメラモデルの読み込みに失敗しました。ページをリロードしてください。");
      setPhase("error");
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error(e);
      setError("カメラへのアクセスが拒否されました。");
      setPhase("error");
    }
  }, [videoRef]);

  const detectAndDraw = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const landmarker = poseLandmarkerRef.current as any;
    if (!video || !canvas || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectAndDraw);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -CANVAS_W, 0, CANVAS_W, CANVAS_H);
    ctx.restore();

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    try {
      const results = landmarker.detectForVideo(video, performance.now());
      if (results.landmarks && results.landmarks[0]) {
        const landmarks = results.landmarks[0];

        Object.entries(LANDMARK_INDICES).forEach(([partName, idx]) => {
          const lm = landmarks[idx];
          if (!lm || lm.visibility < 0.5) return;

          const x = (1 - lm.x) * CANVAS_W;
          const y = lm.y * CANVAS_H;
          const color = BODY_PART_COLORS[partName] || "#fff";

          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.7;
          ctx.fill();
          ctx.globalAlpha = 1;

          const prev = prevLandmarksRef.current.get(partName);
          if (prev) {
            const vy = lm.y - prev.y;
            const speed = Math.abs(vy);

            if (speed > HIT_THRESHOLD) {
              const pitch = partName.includes("shoulder") ? 80 : partName.includes("knee") ? 60 : 120;
              const vol = Math.min(0.8, speed * 20);
              playDrumSound(pitch, vol);

              const newScore = scoreRef.current + Math.floor(speed * 1000);
              scoreRef.current = newScore;
              hitCountRef.current++;
              setScore(newScore);
              setHitCount(hitCountRef.current);

              hitEffectsRef.current.push({
                id: hitEffectIdRef.current++,
                x, y,
                color,
                createdAt: performance.now(),
              });
            }
          }
          prevLandmarksRef.current.set(partName, { x: lm.x, y: lm.y, vy: lm.y - (prev?.y ?? lm.y) });
        });
      }
    } catch (_e) { /* detect error non-fatal */ }

    const now = performance.now();
    hitEffectsRef.current = hitEffectsRef.current.filter(e => now - e.createdAt < 400);
    hitEffectsRef.current.forEach(e => {
      const age = (now - e.createdAt) / 400;
      ctx.save();
      ctx.globalAlpha = 1 - age;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 15 + age * 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, CANVAS_W, 40);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 16px system-ui";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Score: " + scoreRef.current, 12, 20);
    ctx.textAlign = "right";
    ctx.fillText("Hits: " + hitCountRef.current, CANVAS_W - 12, 20);

    rafRef.current = requestAnimationFrame(detectAndDraw);
  }, [videoRef, canvasRef, playDrumSound]);

  const startGame = useCallback(async () => {
    scoreRef.current = 0;
    hitCountRef.current = 0;
    setScore(0);
    setHitCount(0);
    hitEffectsRef.current = [];
    prevLandmarksRef.current.clear();
    setPhase("playing");
    await startCamera();
    rafRef.current = requestAnimationFrame(detectAndDraw);
  }, [startCamera, detectAndDraw]);

  const stopGame = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setPhase("ready");
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    isMutedRef.current = !isMutedRef.current;
    setIsMuted(isMutedRef.current);
  }, []);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { phase, score, hitCount, error, isMuted, loadModel, startGame, stopGame, toggleMute };
}
