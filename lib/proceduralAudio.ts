/**
 * proceduralAudio.ts -- 全身太鼓
 * ---------------------------------------------------------------
 * Web Audio API によるプロシージャル BGM / SE 生成モジュール v2.0
 *
 * ジャンル: Taiko Drums / Japanese Percussion
 * BPM: 126 (通常) / 150 (フィーバー)
 * キー: D (major_penta)
 *
 * 特徴:
 * - 5声部 BGM (メロディ + サブメロディ + ベース + コードパッド + ドラム)
 * - フィーバー時: BPM+24, アルペジオ追加, フィルター解放, コンプ感UP
 * - 緊張モード: BPM+30, マイナー転調, 8分ドラム
 * - リバーブ (マルチタップディレイ)
 * - 9種 SE (tap/success/fail/combo/gameover/levelup/fever_start/fever_end/new_record)
 * - コンボSE: 4段階音程上昇
 * - React Native ネイティブ環境では no-op フォールバック
 * ---------------------------------------------------------------
 */
// Web-only (Next.js) -- no react-native dependency

// ================================================================
// 型定義
// ================================================================

export type SEType =
  | 'tap' | 'success' | 'fail' | 'combo'
  | 'gameover' | 'levelup' | 'fever_start' | 'fever_end' | 'new_record';

export type GameGenre = 'puzzle' | 'action' | 'battle' | 'rhythm' | 'ambient' | 'clicker' | 'word';

export interface BGMOptions {
  bpm?: number;
  key?: string;
  volume?: number;
  genre?: GameGenre;
}

export interface SEOptions {
  pitch?: number;
  volume?: number;
  comboCount?: number;
}

// ================================================================
// 音楽理論ベース
// ================================================================

/** 12音の周波数テーブル (A4=440Hz) */
const SEMITONE_RATIO = Math.pow(2, 1 / 12);
function midiToFreq(midi: number): number {
  return 440 * Math.pow(SEMITONE_RATIO, midi - 69);
}

/** ノート名 -> MIDIノート番号 */
const NOTE_TO_MIDI: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

function noteToMidi(note: string, octave: number): number {
  return (NOTE_TO_MIDI[note] ?? 0) + (octave + 1) * 12;
}

/** スケール定義 (半音ステップ) */
const SCALES: Record<string, number[]> = {
  major_penta:  [0, 2, 4, 7, 9],
  minor_penta:  [0, 3, 5, 7, 10],
  major:        [0, 2, 4, 5, 7, 9, 11],
  minor:        [0, 2, 3, 5, 7, 8, 10],
  dorian:       [0, 2, 3, 5, 7, 9, 10],
  mixolydian:   [0, 2, 4, 5, 7, 9, 10],
  blues:        [0, 3, 5, 6, 7, 10],
};

/** コード進行テンプレート (スケールディグリー, 0-indexed) */
const CHORD_PROGRESSIONS: Record<string, number[][]> = {
  pop:         [[0,2,4], [3,5,0], [5,0,2], [4,6,1]],    // I - IV - vi - V
  emotional:   [[5,0,2], [3,5,0], [0,2,4], [4,6,1]],    // vi - IV - I - V
  lofi:        [[0,2,4], [2,4,6], [3,5,0], [4,6,1]],    // I - iii - IV - V
  tension:     [[0,2,4], [5,0,2], [3,5,0], [6,1,3]],    // i - iv - III - VII
  epic:        [[0,2,4], [5,0,2], [6,1,3], [4,6,1]],    // i - iv - VII - v
  chill:       [[0,2,4], [1,3,5], [2,4,6], [3,5,0]],    // I - ii - iii - IV
  funk:        [[0,2,4], [0,2,4], [3,5,0], [4,6,1]],    // I - I - IV - V
};

// ================================================================
// ゲーム別プリセット
// ================================================================

interface GamePreset {
  bpm: number;
  feverBpmAdd: number;
  tensionBpmAdd: number;
  rootNote: string;
  scale: string;
  feverScale: string;
  tensionScale: string;
  chordProgression: string;
  melodyOctave: number;
  melodyWave: OscillatorType;
  melodyVolume: number;
  melodyNoteDensity: number;   // 0.0-1.0 (メロディが鳴る確率)
  subMelodyWave: OscillatorType;
  subMelodyOctave: number;
  subMelodyVolume: number;
  bassWave: OscillatorType;
  bassOctave: number;
  bassVolume: number;
  bassStyle: 'sustained' | 'staccato' | 'walking' | 'arp';
  chordWave: OscillatorType;
  chordVolume: number;
  chordStyle: 'pad' | 'stab' | 'arp';
  drumStyle: 'four_on_floor' | 'breakbeat' | 'brush' | 'ambient' | 'electronic' | 'none';
  kickVolume: number;
  snareVolume: number;
  hihatVolume: number;
  clapVolume: number;
  reverbMix: number;           // 0.0-1.0
  filterCutoff: number;        // Hz (LPF for warmth)
  feverArpWave: OscillatorType;
  feverArpVolume: number;
  bgmMasterVolume: number;
  seMasterVolume: number;
  swingAmount: number;         // 0.0-1.0 (0=straight, 0.3=light swing)
}

const PRESET: GamePreset = {
  bpm: 126,
  feverBpmAdd: 24,
  tensionBpmAdd: 30,
  rootNote: 'D',
  scale: 'major_penta',
  feverScale: 'mixolydian',
  tensionScale: 'minor_penta',
  chordProgression: 'funk',
  melodyOctave: 5,
  melodyWave: 'triangle',
  melodyVolume: 0.08,
  melodyNoteDensity: 0.4,
  subMelodyWave: 'sine',
  subMelodyOctave: 4,
  subMelodyVolume: 0.04,
  bassWave: 'sine',
  bassOctave: 1,
  bassVolume: 0.20,
  bassStyle: 'staccato',
  chordWave: 'triangle',
  chordVolume: 0.03,
  chordStyle: 'stab',
  drumStyle: 'breakbeat',
  kickVolume: 0.18,
  snareVolume: 0.12,
  hihatVolume: 0.06,
  clapVolume: 0.0,
  reverbMix: 0.25,
  filterCutoff: 3000,
  feverArpWave: 'triangle',
  feverArpVolume: 0.05,
  bgmMasterVolume: 0.38,
  seMasterVolume: 0.6,
  swingAmount: 0.10,
};

// ================================================================
// プロシージャルオーディオエンジン v2.0
// ================================================================

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private seGain: GainNode | null = null;
  private lpFilter: BiquadFilterNode | null = null;
  private hpFilter: BiquadFilterNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private bgmPlaying = false;
  private bgmSchedulerId: ReturnType<typeof setInterval> | null = null;
  private activeNodes: Set<AudioNode> = new Set();
  private feverMode = false;
  private tensionMode = false;
  private beatIndex = 0;
  private barIndex = 0;

  // 生成済みパターン
  private melodyPattern: (number | null)[] = [];
  private subMelodyPattern: (number | null)[] = [];
  private bassPattern: number[] = [];
  private currentScale: number[] = [];
  private currentRoot: number = 0;
  private currentChords: number[][] = [];

  private readonly isWeb: boolean;

  constructor() {
    this.isWeb =
      typeof window !== 'undefined' &&
      typeof (window as any).AudioContext !== 'undefined';
  }

  // ----------------------------------------------------------------
  // AudioContext 初期化
  // ----------------------------------------------------------------

  private getContext(): AudioContext | null {
    if (!this.isWeb) return null;
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();

        // マスターコンプレッサー (音圧を均一化)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.15;
        this.compressor.connect(this.ctx.destination);

        // マスターゲイン
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.compressor);

        // BGMバス
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = PRESET.bgmMasterVolume;

        // LPフィルター (温かみ)
        this.lpFilter = this.ctx.createBiquadFilter();
        this.lpFilter.type = 'lowpass';
        this.lpFilter.frequency.value = PRESET.filterCutoff;
        this.lpFilter.Q.value = 0.7;

        // HPフィルター (フィーバー解放用)
        this.hpFilter = this.ctx.createBiquadFilter();
        this.hpFilter.type = 'highpass';
        this.hpFilter.frequency.value = 20;
        this.hpFilter.Q.value = 0.7;

        // リバーブ (シンプルなディレイベースリバーブ)
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = PRESET.reverbMix;
        this.dryGain = this.ctx.createGain();
        this.dryGain.gain.value = 1.0 - PRESET.reverbMix * 0.5;

        // ルーティング: bgmGain -> lpFilter -> hpFilter -> dry/reverb -> masterGain
        this.bgmGain.connect(this.lpFilter);
        this.lpFilter.connect(this.hpFilter);
        this.hpFilter.connect(this.dryGain);
        this.dryGain.connect(this.masterGain);

        // リバーブ用のディレイフィードバック
        this.setupReverb(this.ctx, this.hpFilter, this.masterGain);

        // SEバス
        this.seGain = this.ctx.createGain();
        this.seGain.gain.value = PRESET.seMasterVolume;
        this.seGain.connect(this.masterGain);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /** マルチタップディレイでリバーブ風エフェクトを生成 */
  private setupReverb(ctx: AudioContext, input: AudioNode, output: AudioNode): void {
    const delays = [0.03, 0.07, 0.13, 0.02, 0.09];
    const gains  = [0.15, 0.12, 0.08, 0.10, 0.06];

    delays.forEach((delayTime, i) => {
      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = delayTime;
      const gain = ctx.createGain();
      gain.gain.value = gains[i] * PRESET.reverbMix;
      input.connect(delay);
      delay.connect(gain);
      gain.connect(output);
    });
  }

  // ----------------------------------------------------------------
  // スケール & パターン生成
  // ----------------------------------------------------------------

  private getActiveScale(): number[] {
    if (this.tensionMode) return SCALES[PRESET.tensionScale] ?? SCALES.minor_penta;
    if (this.feverMode) return SCALES[PRESET.feverScale] ?? SCALES.mixolydian;
    return SCALES[PRESET.scale] ?? SCALES.major_penta;
  }

  private getActiveRoot(): number {
    return NOTE_TO_MIDI[PRESET.rootNote] ?? 0;
  }

  private getActiveBpm(): number {
    let bpm = PRESET.bpm;
    if (this.tensionMode) bpm += PRESET.tensionBpmAdd;
    else if (this.feverMode) bpm += PRESET.feverBpmAdd;
    return bpm;
  }

  /** MIDIノートをスケール内の音に量子化 */
  private quantizeToScale(midi: number, scale: number[], root: number): number {
    const noteInOctave = ((midi % 12) - root + 12) % 12;
    const octave = Math.floor(midi / 12);
    let closest = scale[0];
    let minDist = 12;
    for (const degree of scale) {
      const dist = Math.abs(noteInOctave - degree);
      if (dist < minDist) {
        minDist = dist;
        closest = degree;
      }
    }
    return octave * 12 + root + closest;
  }

  /** メロディパターン生成 (16ステップ, 音楽的に意味のある旋律) */
  private generateMelodyPattern(scale: number[], root: number, octave: number, density: number): (number | null)[] {
    const pattern: (number | null)[] = [];
    const baseNote = noteToMidi(PRESET.rootNote, octave);
    let prev = baseNote;

    for (let i = 0; i < 16; i++) {
      // 密度に応じて休符を入れる
      if (Math.random() > density) {
        pattern.push(null);
        continue;
      }

      // ステップワイズモーション (隣接音に移動) を70%、跳躍を30%
      let next: number;
      if (Math.random() < 0.7) {
        // ステップ: -2 ~ +2 のスケールステップ
        const step = Math.floor(Math.random() * 5) - 2;
        next = prev + step;
      } else {
        // 跳躍: ランダムなスケールノート
        const degree = scale[Math.floor(Math.random() * scale.length)];
        const oct = octave + (Math.random() > 0.7 ? 1 : 0);
        next = noteToMidi(PRESET.rootNote, oct) + degree - root;
      }
      next = this.quantizeToScale(next, scale, root);

      // 範囲制限
      const lo = baseNote - 7;
      const hi = baseNote + 14;
      next = Math.max(lo, Math.min(hi, next));

      pattern.push(next);
      prev = next;
    }

    // フレーズ終端をルートに解決 (8拍目と16拍目)
    if (pattern[7] !== null) pattern[7] = this.quantizeToScale(baseNote, scale, root);
    if (pattern[15] !== null) pattern[15] = this.quantizeToScale(baseNote, scale, root);

    return pattern;
  }

  /** ベースパターン生成 */
  private generateBassPattern(chords: number[][], scale: number[], root: number): number[] {
    const bassMidi = noteToMidi(PRESET.rootNote, PRESET.bassOctave);
    const pattern: number[] = [];

    for (let bar = 0; bar < 4; bar++) {
      const chordTones = chords[bar % chords.length];
      const chordRoot = scale[chordTones[0] % scale.length];

      for (let beat = 0; beat < 4; beat++) {
        let note: number;
        if (PRESET.bassStyle === 'walking') {
          // ウォーキングベース: ルート→5度→オクターブ→5度
          const walkPattern = [0, 7, 12, 7];
          note = bassMidi + chordRoot + walkPattern[beat];
        } else if (PRESET.bassStyle === 'arp') {
          // アルペジオベース
          const arpDegree = chordTones[beat % chordTones.length];
          note = bassMidi + scale[arpDegree % scale.length];
        } else if (PRESET.bassStyle === 'staccato') {
          // スタッカート: ルート音のみ
          note = bassMidi + chordRoot;
        } else {
          // サステイン: ルート音 (各小節)
          note = bassMidi + chordRoot;
        }
        pattern.push(note);
      }
    }
    return pattern;
  }

  /** コード進行を取得 */
  private getChordProgression(): number[][] {
    return CHORD_PROGRESSIONS[PRESET.chordProgression] ?? CHORD_PROGRESSIONS.pop;
  }

  private regeneratePatterns(): void {
    this.currentScale = this.getActiveScale();
    this.currentRoot = this.getActiveRoot();
    this.currentChords = this.getChordProgression();

    this.melodyPattern = this.generateMelodyPattern(
      this.currentScale, this.currentRoot, PRESET.melodyOctave, PRESET.melodyNoteDensity,
    );
    this.subMelodyPattern = this.generateMelodyPattern(
      this.currentScale, this.currentRoot, PRESET.subMelodyOctave, PRESET.melodyNoteDensity * 0.5,
    );
    this.bassPattern = this.generateBassPattern(
      this.currentChords, this.currentScale, this.currentRoot,
    );
  }

  // ----------------------------------------------------------------
  // BGM再生
  // ----------------------------------------------------------------

  startBGM(options?: BGMOptions): void {
    if (!this.isWeb) return;
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;
    if (this.bgmPlaying) this.stopBGMImmediate();

    this.bgmGain.gain.value = options?.volume ?? PRESET.bgmMasterVolume;
    this.bgmPlaying = true;
    this.beatIndex = 0;
    this.barIndex = 0;

    this.regeneratePatterns();

    // フェードイン
    this.bgmGain.gain.setValueAtTime(0, ctx.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(
      options?.volume ?? PRESET.bgmMasterVolume,
      ctx.currentTime + 0.5,
    );

    const beatMs = (60 / this.getActiveBpm()) * 1000;
    this.bgmSchedulerId = setInterval(() => this.onBeat(), beatMs);
    this.onBeat();
  }

  stopBGM(fadeMs = 500): void {
    if (!this.isWeb || !this.bgmPlaying) return;
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;

    const now = ctx.currentTime;
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
    this.bgmGain.gain.linearRampToValueAtTime(0.001, now + fadeMs / 1000);
    setTimeout(() => this.stopBGMImmediate(), fadeMs);
  }

  private stopBGMImmediate(): void {
    if (this.bgmSchedulerId) {
      clearInterval(this.bgmSchedulerId);
      this.bgmSchedulerId = null;
    }
    this.cleanupAllNodes();
    this.bgmPlaying = false;
    this.beatIndex = 0;
    this.barIndex = 0;
  }

  private cleanupAllNodes(): void {
    for (const node of this.activeNodes) {
      try {
        if ('stop' in node && typeof (node as any).stop === 'function') {
          (node as any).stop();
        }
        node.disconnect();
      } catch { /* already stopped */ }
    }
    this.activeNodes.clear();
  }

  // ----------------------------------------------------------------
  // フィーバー / 緊張モード
  // ----------------------------------------------------------------

  setFeverMode(enabled: boolean): void {
    if (this.feverMode === enabled) return;
    this.feverMode = enabled;
    if (!this.isWeb || !this.bgmPlaying) return;

    // フィルター解放 (フィーバー時はLPFを上げ、HPFを下げて音を「開く」)
    const ctx = this.getContext();
    if (ctx && this.lpFilter && this.hpFilter) {
      const now = ctx.currentTime;
      if (enabled) {
        this.lpFilter.frequency.linearRampToValueAtTime(8000, now + 0.3);
        this.hpFilter.frequency.linearRampToValueAtTime(10, now + 0.3);
      } else {
        this.lpFilter.frequency.linearRampToValueAtTime(PRESET.filterCutoff, now + 0.3);
        this.hpFilter.frequency.linearRampToValueAtTime(20, now + 0.3);
      }
    }

    // テンポ変更のためBGM再起動
    this.restartBGMWithNewTempo();
  }

  setTensionMode(enabled: boolean): void {
    if (this.tensionMode === enabled) return;
    this.tensionMode = enabled;
    if (!this.isWeb || !this.bgmPlaying) return;
    this.restartBGMWithNewTempo();
  }

  private restartBGMWithNewTempo(): void {
    if (!this.bgmPlaying) return;
    if (this.bgmSchedulerId) {
      clearInterval(this.bgmSchedulerId);
    }
    this.regeneratePatterns();
    const beatMs = (60 / this.getActiveBpm()) * 1000;
    this.bgmSchedulerId = setInterval(() => this.onBeat(), beatMs);
  }

  // ----------------------------------------------------------------
  // ビートスケジューラ
  // ----------------------------------------------------------------

  private onBeat(): void {
    const ctx = this.getContext();
    if (!ctx || !this.bgmGain) return;

    const now = ctx.currentTime;
    const bpm = this.getActiveBpm();
    const beatDur = 60 / bpm;
    const idx = this.beatIndex % 16;

    // ガベージコレクション
    this.gcNodes();

    // 4小節ごとにパターン再生成 (変化を生む)
    if (idx === 0 && this.beatIndex > 0 && this.beatIndex % 64 === 0) {
      this.regeneratePatterns();
    }

    // スウィング (偶数拍を少し遅らせる)
    const swing = (idx % 2 === 1) ? beatDur * PRESET.swingAmount * 0.5 : 0;
    const t = now + swing;

    // === Voice 1: メロディ ===
    this.playMelodyBeat(ctx, t, beatDur, idx);

    // === Voice 2: サブメロディ (カウンターメロディ) ===
    this.playSubMelodyBeat(ctx, t, beatDur, idx);

    // === Voice 3: ベース ===
    this.playBassBeat(ctx, t, beatDur, idx);

    // === Voice 4: コードパッド ===
    if (idx % 4 === 0) {
      this.playChordPad(ctx, t, beatDur, idx);
    }

    // === Voice 5: ドラム ===
    this.playDrum(ctx, t, beatDur, idx);

    // === Voice 6 (フィーバー): アルペジオ ===
    if (this.feverMode) {
      this.playFeverArp(ctx, t, beatDur, idx);
    }

    this.beatIndex++;
    if (idx === 15) this.barIndex++;
  }

  // ----------------------------------------------------------------
  // 各声部
  // ----------------------------------------------------------------

  private playMelodyBeat(ctx: AudioContext, t: number, beatDur: number, idx: number): void {
    const note = this.melodyPattern[idx];
    if (note === null || note === undefined) return;

    const freq = midiToFreq(note);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();

    // ビブラート (微細な揺れで生き生きとした音に)
    vibrato.type = 'sine';
    vibrato.frequency.value = 5;
    vibratoGain.gain.value = freq * 0.005;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    osc.type = PRESET.melodyWave;
    osc.frequency.value = freq;

    // ADSR: Attack 10ms, Decay 50ms, Sustain 70%, Release
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(PRESET.melodyVolume, t + 0.01);
    gain.gain.linearRampToValueAtTime(PRESET.melodyVolume * 0.7, t + 0.06);
    gain.gain.setValueAtTime(PRESET.melodyVolume * 0.7, t + beatDur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.85);

    osc.connect(gain);
    gain.connect(this.bgmGain!);
    vibrato.start(t);
    osc.start(t);
    osc.stop(t + beatDur * 0.9);
    vibrato.stop(t + beatDur * 0.9);

    this.trackNodes(osc, gain, vibrato, vibratoGain);
  }

  private playSubMelodyBeat(ctx: AudioContext, t: number, beatDur: number, idx: number): void {
    const note = this.subMelodyPattern[idx];
    if (note === null || note === undefined) return;

    const freq = midiToFreq(note);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = PRESET.subMelodyWave;
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(PRESET.subMelodyVolume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.7);

    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(t);
    osc.stop(t + beatDur * 0.75);

    this.trackNodes(osc, gain);
  }

  private playBassBeat(ctx: AudioContext, t: number, beatDur: number, idx: number): void {
    const note = this.bassPattern[idx % this.bassPattern.length];
    if (!note) return;

    const freq = midiToFreq(note);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = PRESET.bassWave;
    osc.frequency.value = freq;

    const dur = PRESET.bassStyle === 'staccato' ? beatDur * 0.4 : beatDur * 0.8;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(PRESET.bassVolume, t + 0.005);
    gain.gain.setValueAtTime(PRESET.bassVolume, t + dur * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    // サブベース (1オクターブ下のサイン波を薄く重ねる)
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.value = freq * 0.5;
    subGain.gain.setValueAtTime(PRESET.bassVolume * 0.3, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    sub.connect(subGain);
    subGain.connect(this.bgmGain!);
    sub.start(t);
    sub.stop(t + dur + 0.01);

    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(t);
    osc.stop(t + dur + 0.01);

    this.trackNodes(osc, gain, sub, subGain);
  }

  private playChordPad(ctx: AudioContext, t: number, beatDur: number, idx: number): void {
    const barIdx = Math.floor(idx / 4) % this.currentChords.length;
    const chordDegrees = this.currentChords[barIdx];
    const scale = this.currentScale;
    const padDur = beatDur * 3.8;

    chordDegrees.forEach((degree) => {
      const scaleDegree = scale[degree % scale.length];
      const midi = noteToMidi(PRESET.rootNote, 4) + scaleDegree;
      const freq = midiToFreq(midi);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = PRESET.chordWave;
      osc.frequency.value = freq;

      if (PRESET.chordStyle === 'pad') {
        // パッド: ゆっくりアタック、ロングサステイン
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(PRESET.chordVolume, t + 0.1);
        gain.gain.setValueAtTime(PRESET.chordVolume, t + padDur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + padDur);
      } else {
        // スタブ: 短いアタック
        gain.gain.setValueAtTime(PRESET.chordVolume * 1.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + beatDur * 0.3);
      }

      osc.connect(gain);
      gain.connect(this.bgmGain!);
      osc.start(t);
      osc.stop(t + padDur + 0.01);

      this.trackNodes(osc, gain);
    });
  }

  private playDrum(ctx: AudioContext, t: number, beatDur: number, idx: number): void {
    if (PRESET.drumStyle === 'none') return;

    const isFever = this.feverMode;
    const isTension = this.tensionMode;

    // === キック ===
    const kickPattern = isTension
      ? [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]
      : PRESET.drumStyle === 'four_on_floor'
        ? [true,false,false,false, true,false,false,false, true,false,false,false, true,false,false,false]
        : PRESET.drumStyle === 'breakbeat'
          ? [true,false,false,false, false,false,true,false, false,true,false,false, false,false,true,false]
          : [true,false,false,false, false,false,false,false, true,false,false,false, false,false,false,false];

    if (kickPattern[idx] && PRESET.kickVolume > 0) {
      this.playKick(ctx, t, PRESET.kickVolume);
    }

    // === スネア/クラップ ===
    const snarePattern = PRESET.drumStyle === 'breakbeat'
      ? [false,false,false,false, true,false,false,true, false,false,false,false, true,false,false,false]
      : [false,false,false,false, true,false,false,false, false,false,false,false, true,false,false,false];

    if (snarePattern[idx] && PRESET.snareVolume > 0) {
      this.playSnare(ctx, t, PRESET.snareVolume);
    }

    // === ハイハット ===
    const hhInterval = (isFever || isTension) ? 1 : 2;
    if (idx % hhInterval === 0 && PRESET.hihatVolume > 0) {
      const open = (idx % 8 === 6); // 6拍目はオープンハイハット
      this.playHihat(ctx, t, PRESET.hihatVolume, open);
    }

    // === クラップ ===
    if (PRESET.clapVolume > 0 && idx % 8 === 4) {
      this.playClap(ctx, t, PRESET.clapVolume);
    }
  }

  private playKick(ctx: AudioContext, t: number, vol: number): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.15);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.bgmGain!);
    osc.start(t);
    osc.stop(t + 0.28);
    this.trackNodes(osc, gain);

    // キックのクリック成分
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(1000, t);
    click.frequency.exponentialRampToValueAtTime(100, t + 0.02);
    clickGain.gain.setValueAtTime(vol * 0.3, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    click.connect(clickGain);
    clickGain.connect(this.bgmGain!);
    click.start(t);
    click.stop(t + 0.04);
    this.trackNodes(click, clickGain);
  }

  private playSnare(ctx: AudioContext, t: number, vol: number): void {
    // ノイズ成分
    const bufSize = Math.ceil(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.bgmGain!);
    noise.start(t);
    noise.stop(t + 0.15);

    // トーン成分
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(250, t);
    tone.frequency.exponentialRampToValueAtTime(120, t + 0.05);
    toneGain.gain.setValueAtTime(vol * 0.5, t);
    toneGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    tone.connect(toneGain);
    toneGain.connect(this.bgmGain!);
    tone.start(t);
    tone.stop(t + 0.1);

    this.trackNodes(noise, noiseGain, tone, toneGain);
  }

  private playHihat(ctx: AudioContext, t: number, vol: number, open: boolean): void {
    const dur = open ? 0.12 : 0.04;
    const bufSize = Math.ceil(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = open ? 8000 : 10000;
    filter.Q.value = open ? 0.5 : 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain!);
    source.start(t);
    source.stop(t + dur + 0.01);

    this.trackNodes(source, gain);
  }

  private playClap(ctx: AudioContext, t: number, vol: number): void {
    // クラップ = 3連打のノイズバースト
    for (let i = 0; i < 3; i++) {
      const offset = t + i * 0.01;
      const bufSize = Math.ceil(ctx.sampleRate * 0.03);
      const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2500;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol * (i === 2 ? 1.0 : 0.5), offset);
      gain.gain.exponentialRampToValueAtTime(0.001, offset + 0.06);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.bgmGain!);
      source.start(offset);
      source.stop(offset + 0.07);
      this.trackNodes(source, gain);
    }
  }

  private playFeverArp(ctx: AudioContext, t: number, beatDur: number, idx: number): void {
    const scale = this.currentScale;
    const arpIdx = idx % scale.length;
    const degree = scale[arpIdx];
    const octave = PRESET.melodyOctave + 1;
    const midi = noteToMidi(PRESET.rootNote, octave) + degree;
    const freq = midiToFreq(midi);

    // 16分音符のアルペジオ
    const noteDur = beatDur * 0.25;
    for (let i = 0; i < 2; i++) {
      const noteT = t + i * noteDur;
      const arpFreq = i === 0 ? freq : freq * (i % 2 === 0 ? 1 : 1.5);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = PRESET.feverArpWave;
      osc.frequency.value = arpFreq;
      gain.gain.setValueAtTime(PRESET.feverArpVolume, noteT);
      gain.gain.exponentialRampToValueAtTime(0.001, noteT + noteDur * 0.9);
      osc.connect(gain);
      gain.connect(this.bgmGain!);
      osc.start(noteT);
      osc.stop(noteT + noteDur);
      this.trackNodes(osc, gain);
    }
  }

  // ----------------------------------------------------------------
  // ノード管理
  // ----------------------------------------------------------------

  private trackNodes(...nodes: AudioNode[]): void {
    nodes.forEach((n) => this.activeNodes.add(n));
  }

  private gcNodes(): void {
    if (this.activeNodes.size > 200) {
      const toRemove: AudioNode[] = [];
      let count = 0;
      for (const node of this.activeNodes) {
        if (count++ < this.activeNodes.size - 50) {
          toRemove.push(node);
        }
      }
      toRemove.forEach((n) => {
        try { n.disconnect(); } catch { /* */ }
        this.activeNodes.delete(n);
      });
    }
  }

  // ----------------------------------------------------------------
  // SE (効果音)
  // ----------------------------------------------------------------

  playSE(type: SEType, options?: SEOptions): void {
    if (!this.isWeb) return;
    const ctx = this.getContext();
    if (!ctx || !this.seGain) return;
    const vol = options?.volume ?? 0.6;
    const pitch = options?.pitch ?? 1.0;

    switch (type) {
      case 'tap':          this.seTap(ctx, vol, pitch); break;
      case 'success':      this.seSuccess(ctx, vol, pitch); break;
      case 'fail':         this.seFail(ctx, vol, pitch); break;
      case 'combo':        this.seCombo(ctx, vol, pitch, options?.comboCount ?? 1); break;
      case 'gameover':     this.seGameOver(ctx, vol, pitch); break;
      case 'levelup':      this.seLevelUp(ctx, vol, pitch); break;
      case 'fever_start':  this.seFeverStart(ctx, vol, pitch); break;
      case 'fever_end':    this.seFeverEnd(ctx, vol, pitch); break;
      case 'new_record':   this.seNewRecord(ctx, vol, pitch); break;
    }
  }

  /** タップ音: 「ポコッ」系 -- 短い正弦波 + 高周波クリック */
  private seTap(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    // メイン音
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(400 * pitch, now + 0.04);
    gain.gain.setValueAtTime(vol * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.seGain!);
    osc.start(now);
    osc.stop(now + 0.07);

    // クリック成分
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.value = 2000 * pitch;
    clickGain.gain.setValueAtTime(vol * 0.15, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);
    click.connect(clickGain);
    clickGain.connect(this.seGain!);
    click.start(now);
    click.stop(now + 0.02);
  }

  /** 成功音: 上昇アルペジオ C-E-G-C */
  private seSuccess(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    const notes = [523.25, 659.26, 783.99, 1046.50]; // C5-E5-G5-C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * pitch;
      const start = now + i * 0.06;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.45, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(start);
      osc.stop(start + 0.18);
    });
    // リバーブ尾
    const pad = ctx.createOscillator();
    const padGain = ctx.createGain();
    pad.type = 'triangle';
    pad.frequency.value = 1046.50 * pitch;
    const padStart = now + 0.24;
    padGain.gain.setValueAtTime(vol * 0.15, padStart);
    padGain.gain.exponentialRampToValueAtTime(0.001, padStart + 0.3);
    pad.connect(padGain);
    padGain.connect(this.seGain!);
    pad.start(padStart);
    pad.stop(padStart + 0.35);
  }

  /** 失敗音: 下降半音階 + ノイズ */
  private seFail(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    // 下降トーン
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(150 * pitch, now + 0.3);
    gain.gain.setValueAtTime(vol * 0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.seGain!);
    osc.start(now);
    osc.stop(now + 0.38);

    // 不協和音
    const dis = ctx.createOscillator();
    const disGain = ctx.createGain();
    dis.type = 'square';
    dis.frequency.setValueAtTime(480 * pitch, now);
    dis.frequency.exponentialRampToValueAtTime(140 * pitch, now + 0.3);
    disGain.gain.setValueAtTime(vol * 0.15, now);
    disGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    dis.connect(disGain);
    disGain.connect(this.seGain!);
    dis.start(now);
    dis.stop(now + 0.33);
  }

  /** コンボ音: 4段階で音程上昇 + ハーモニクス追加 */
  private seCombo(ctx: AudioContext, vol: number, pitch: number, comboCount: number): void {
    const now = ctx.currentTime;
    // コンボ段階: 1-4, 5-9, 10-19, 20+
    const stage = comboCount >= 20 ? 3 : comboCount >= 10 ? 2 : comboCount >= 5 ? 1 : 0;

    const baseFreqs = [600, 800, 1000, 1200];
    const baseFreq = baseFreqs[stage];
    const intervals = [
      [1.0, 1.25],
      [1.0, 1.25, 1.5],
      [1.0, 1.25, 1.5, 2.0],
      [1.0, 1.25, 1.5, 1.75, 2.0],
    ];
    const waves: OscillatorType[] = ['triangle', 'triangle', 'sine', 'sine'];

    const combo = intervals[stage];
    combo.forEach((interval, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = waves[stage];
      osc.frequency.value = baseFreq * interval * pitch;
      const start = now + i * 0.025;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * (0.35 + stage * 0.05), start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12 + stage * 0.03);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(start);
      osc.stop(start + 0.15 + stage * 0.03);
    });

    // ステージ3 (20+): きらきらエフェクト追加
    if (stage >= 3) {
      for (let i = 0; i < 3; i++) {
        const sparkle = ctx.createOscillator();
        const sGain = ctx.createGain();
        sparkle.type = 'sine';
        sparkle.frequency.value = (2000 + Math.random() * 2000) * pitch;
        const sStart = now + 0.05 + i * 0.04;
        sGain.gain.setValueAtTime(vol * 0.1, sStart);
        sGain.gain.exponentialRampToValueAtTime(0.001, sStart + 0.06);
        sparkle.connect(sGain);
        sGain.connect(this.seGain!);
        sparkle.start(sStart);
        sparkle.stop(sStart + 0.07);
      }
    }
  }

  /** ゲームオーバー: 下降和音 + リバーブテール */
  private seGameOver(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    const chords = [
      [400, 500, 600],
      [350, 440, 520],
      [300, 380, 450],
      [250, 310, 370],
    ];

    chords.forEach((chord, i) => {
      const start = now + i * 0.18;
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq * pitch;
        gain.gain.setValueAtTime(vol * 0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
        osc.connect(gain);
        gain.connect(this.seGain!);
        osc.start(start);
        osc.stop(start + 0.28);
      });
    });

    // 長いリバーブテール
    const tailStart = now + 0.72;
    const tail = ctx.createOscillator();
    const tailGain = ctx.createGain();
    tail.type = 'sine';
    tail.frequency.value = 200 * pitch;
    tailGain.gain.setValueAtTime(vol * 0.2, tailStart);
    tailGain.gain.exponentialRampToValueAtTime(0.001, tailStart + 0.8);
    tail.connect(tailGain);
    tailGain.connect(this.seGain!);
    tail.start(tailStart);
    tail.stop(tailStart + 0.85);
  }

  /** レベルアップ: C-E-G の上昇 + ファイナルコード */
  private seLevelUp(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    const notes = [523.25, 659.26, 783.99]; // C5-E5-G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * pitch;
      const start = now + i * 0.1;
      gain.gain.setValueAtTime(vol * 0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(start);
      osc.stop(start + 0.18);
    });

    // ファイナルコード (C major)
    const chordStart = now + 0.35;
    notes.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq * pitch;
      gain.gain.setValueAtTime(vol * 0.3, chordStart);
      gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.4);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(chordStart);
      osc.stop(chordStart + 0.45);
    });
  }

  /** フィーバー突入: 上昇ファンファーレ (5音) */
  private seFeverStart(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    const notes = [523.25, 659.26, 783.99, 1046.50, 1318.51]; // C5-E5-G5-C6-E6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq * pitch;
      const start = now + i * 0.05;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.4, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(start);
      osc.stop(start + 0.25);
    });

    // シンバルクラッシュ
    const crashStart = now + 0.25;
    const bufSize = Math.ceil(ctx.sampleRate * 0.4);
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const crash = ctx.createBufferSource();
    crash.buffer = buffer;
    const crashFilter = ctx.createBiquadFilter();
    crashFilter.type = 'highpass';
    crashFilter.frequency.value = 6000;
    const crashGain = ctx.createGain();
    crashGain.gain.setValueAtTime(vol * 0.25, crashStart);
    crashGain.gain.exponentialRampToValueAtTime(0.001, crashStart + 0.35);
    crash.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(this.seGain!);
    crash.start(crashStart);
    crash.stop(crashStart + 0.4);
  }

  /** フィーバー終了: 下降チャイム */
  private seFeverEnd(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    const notes = [1318.51, 1046.50, 783.99, 659.26, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * pitch;
      const start = now + i * 0.08;
      gain.gain.setValueAtTime(vol * 0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(start);
      osc.stop(start + 0.18);
    });
  }

  /** 新記録: キラキラファンファーレ */
  private seNewRecord(ctx: AudioContext, vol: number, pitch: number): void {
    const now = ctx.currentTime;
    // メインファンファーレ
    const notes = [659.26, 783.99, 987.77, 1174.66, 1318.51, 1567.98];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq * pitch;
      const start = now + i * 0.07;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol * 0.5, start + 0.01);
      gain.gain.setValueAtTime(vol * 0.5, start + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(start);
      osc.stop(start + 0.25);
    });

    // きらきらエフェクト
    for (let i = 0; i < 8; i++) {
      const sparkle = ctx.createOscillator();
      const sGain = ctx.createGain();
      sparkle.type = 'sine';
      sparkle.frequency.value = (1500 + Math.random() * 3000) * pitch;
      const sStart = now + 0.2 + i * 0.05;
      sGain.gain.setValueAtTime(vol * 0.12, sStart);
      sGain.gain.exponentialRampToValueAtTime(0.001, sStart + 0.08);
      sparkle.connect(sGain);
      sGain.connect(this.seGain!);
      sparkle.start(sStart);
      sparkle.stop(sStart + 0.1);
    }

    // ファイナルコード
    const chordStart = now + 0.6;
    [659.26, 783.99, 987.77, 1318.51].forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq * pitch;
      gain.gain.setValueAtTime(vol * 0.25, chordStart);
      gain.gain.exponentialRampToValueAtTime(0.001, chordStart + 0.6);
      osc.connect(gain);
      gain.connect(this.seGain!);
      osc.start(chordStart);
      osc.stop(chordStart + 0.65);
    });
  }

  // ----------------------------------------------------------------
  // 音量制御
  // ----------------------------------------------------------------

  setMasterVolume(volume: number): void {
    if (!this.isWeb || !this.masterGain) return;
    const ctx = this.getContext();
    if (ctx) {
      this.masterGain.gain.setValueAtTime(
        Math.max(0.001, Math.min(1.0, volume)),
        ctx.currentTime,
      );
    }
  }

  setBGMVolume(volume: number): void {
    if (!this.isWeb || !this.bgmGain) return;
    const ctx = this.getContext();
    if (ctx) {
      this.bgmGain.gain.setValueAtTime(
        Math.max(0.001, Math.min(1.0, volume)),
        ctx.currentTime,
      );
    }
  }

  setSEVolume(volume: number): void {
    if (!this.isWeb || !this.seGain) return;
    const ctx = this.getContext();
    if (ctx) {
      this.seGain.gain.setValueAtTime(
        Math.max(0.001, Math.min(1.0, volume)),
        ctx.currentTime,
      );
    }
  }

  isBGMPlaying(): boolean { return this.bgmPlaying; }
  isFeverActive(): boolean { return this.feverMode; }
  isTensionActive(): boolean { return this.tensionMode; }

  cleanup(): void {
    this.stopBGMImmediate();
    this.feverMode = false;
    this.tensionMode = false;
    if (this.lpFilter) { try { this.lpFilter.disconnect(); } catch { /* */ } this.lpFilter = null; }
    if (this.hpFilter) { try { this.hpFilter.disconnect(); } catch { /* */ } this.hpFilter = null; }
    if (this.reverbGain) { try { this.reverbGain.disconnect(); } catch { /* */ } this.reverbGain = null; }
    if (this.dryGain) { try { this.dryGain.disconnect(); } catch { /* */ } this.dryGain = null; }
    if (this.compressor) { try { this.compressor.disconnect(); } catch { /* */ } this.compressor = null; }
    if (this.bgmGain) { try { this.bgmGain.disconnect(); } catch { /* */ } this.bgmGain = null; }
    if (this.seGain) { try { this.seGain.disconnect(); } catch { /* */ } this.seGain = null; }
    if (this.masterGain) { try { this.masterGain.disconnect(); } catch { /* */ } this.masterGain = null; }
    if (this.ctx) { this.ctx.close().catch(() => {}); this.ctx = null; }
  }
}

// ================================================================
// Singleton & Exports
// ================================================================

export const proceduralAudio = new ProceduralAudioEngine();

export const startBGM = (options?: BGMOptions) => proceduralAudio.startBGM(options);
export const stopBGM = (fadeMs?: number) => proceduralAudio.stopBGM(fadeMs);
export const setFeverMode = (enabled: boolean) => proceduralAudio.setFeverMode(enabled);
export const setTensionMode = (enabled: boolean) => proceduralAudio.setTensionMode(enabled);
export const playSE = (type: SEType, options?: SEOptions) => proceduralAudio.playSE(type, options);
export const setMasterVolume = (volume: number) => proceduralAudio.setMasterVolume(volume);
export const setBGMVolume = (volume: number) => proceduralAudio.setBGMVolume(volume);
export const setSEVolume = (volume: number) => proceduralAudio.setSEVolume(volume);
export const isBGMPlaying = () => proceduralAudio.isBGMPlaying();
export const cleanupAudio = () => proceduralAudio.cleanup();
