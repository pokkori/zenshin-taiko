export interface RhythmBeat {
  time: number;        // ms from start
  bodyPart: string;    // "left_wrist" | "right_wrist" | "left_shoulder" | "right_shoulder"
  label: string;       // 表示名
}

export interface RhythmPattern {
  id: string;
  name: string;
  bpm: number;
  beats: RhythmBeat[];
}

export const RHYTHM_PATTERNS: RhythmPattern[] = [
  {
    id: "basic",
    name: "基本リズム",
    bpm: 80,
    beats: [
      { time: 0,    bodyPart: "right_wrist", label: "右" },
      { time: 750,  bodyPart: "left_wrist",  label: "左" },
      { time: 1500, bodyPart: "right_wrist", label: "右" },
      { time: 2250, bodyPart: "left_wrist",  label: "左" },
      { time: 3000, bodyPart: "right_wrist", label: "右" },
      { time: 3375, bodyPart: "right_wrist", label: "右" },
      { time: 3750, bodyPart: "left_wrist",  label: "左" },
    ],
  },
  {
    id: "festival",
    name: "お祭りリズム",
    bpm: 120,
    beats: [
      { time: 0,   bodyPart: "right_wrist",    label: "ドン" },
      { time: 250, bodyPart: "left_wrist",     label: "ドン" },
      { time: 500, bodyPart: "right_shoulder", label: "カッ" },
      { time: 750, bodyPart: "left_wrist",     label: "ドン" },
      { time: 1000,bodyPart: "right_wrist",    label: "ドン" },
      { time: 1250,bodyPart: "left_shoulder",  label: "カッ" },
      { time: 1500,bodyPart: "right_wrist",    label: "ドン" },
      { time: 1625,bodyPart: "right_wrist",    label: "ドン" },
    ],
  },
];

// MediaPipe Poseのランドマークインデックス
export const LANDMARK_INDICES: Record<string, number> = {
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_knee: 25,
  right_knee: 26,
};

export const BODY_PART_COLORS: Record<string, string> = {
  left_shoulder:  "#ef4444",
  right_shoulder: "#f97316",
  left_elbow:     "#eab308",
  right_elbow:    "#22c55e",
  left_wrist:     "#3b82f6",
  right_wrist:    "#a855f7",
  left_knee:      "#06b6d4",
  right_knee:     "#ec4899",
};
