// 频率广场：一段「频率」就是一串离散档位，按固定步长依次下发。
// 播放只走调用方传进来的 send()（即 Governor → sendCommand），这里不碰传输层。

export const FREQ_LEVEL_MIN = 1;
export const FREQ_LEVEL_MAX = 9;
export const FREQ_STEPS_MIN = 4;
export const FREQ_STEPS_MAX = 32;
export const FREQ_STEP_MS_MIN = 500;
export const FREQ_STEP_MS_MAX = 3000;
export const FREQ_NAME_MAX = 16;
export const FREQ_CODE_PREFIX = "NLF1:";
export const FREQ_EDITOR_STEPS = 12;

const MINE_KEY = "nascent.frequency.mine";
const FAV_KEY = "nascent.frequency.favorites";

export const FREQ_PRESETS = Object.freeze([
  { id: "preset:wave", name: "海浪", tags: ["舒缓", "循环"], stepMs: 1000, steps: [2, 3, 4, 5, 4, 3, 2, 2] },
  { id: "preset:breath", name: "慢呼吸", tags: ["舒缓", "入门"], stepMs: 2000, steps: [1, 2, 3, 3, 2, 1] },
  { id: "preset:heartbeat", name: "心跳", tags: ["节奏"], stepMs: 500, steps: [4, 2, 5, 2, 1, 1, 4, 2, 5, 2, 1, 1] },
  { id: "preset:stairs", name: "台阶", tags: ["渐强"], stepMs: 1500, steps: [1, 2, 3, 4, 5, 6, 6, 3] },
  { id: "preset:tide", name: "潮汐", tags: ["渐强", "循环"], stepMs: 1000, steps: [2, 3, 3, 4, 5, 6, 5, 4, 3, 2] },
  { id: "preset:rain", name: "雨点", tags: ["轻快"], stepMs: 500, steps: [3, 1, 4, 2, 3, 1, 5, 2] },
]);

export function normalizeFrequency(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name ?? "").trim().slice(0, FREQ_NAME_MAX);
  const stepMs = Number(raw.stepMs);
  const steps = Array.isArray(raw.steps) ? raw.steps.map(Number) : [];
  if (!name) return null;
  if (!Number.isInteger(stepMs) || stepMs < FREQ_STEP_MS_MIN || stepMs > FREQ_STEP_MS_MAX) return null;
  if (steps.length < FREQ_STEPS_MIN || steps.length > FREQ_STEPS_MAX) return null;
  if (!steps.every((lv) => Number.isInteger(lv) && lv >= FREQ_LEVEL_MIN && lv <= FREQ_LEVEL_MAX)) return null;
  const id = String(raw.id || "");
  if (id && !/^[a-z0-9:_-]{1,48}$/i.test(id)) return null;
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((tag) => String(tag).trim().slice(0, 6)).filter(Boolean).slice(0, 3)
    : [];
  return { id, name, tags, stepMs, steps };
}

export function frequencyDurationMs(freq) {
  return freq.stepMs * freq.steps.length;
}

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** 分享码只带名字、标签、步长和档位串，不带任何设备或用户信息。 */
export function encodeFrequency(freq) {
  const clean = normalizeFrequency(freq);
  if (!clean) throw new Error("invalid frequency");
  const body = { n: clean.name, t: clean.tags, s: clean.stepMs, l: clean.steps.join("") };
  return FREQ_CODE_PREFIX + toBase64Url(JSON.stringify(body));
}

export function decodeFrequency(code) {
  const text = String(code ?? "").trim();
  const start = text.indexOf(FREQ_CODE_PREFIX);
  if (start < 0) return null;
  const payload = text.slice(start + FREQ_CODE_PREFIX.length).match(/^[A-Za-z0-9_-]+/)?.[0];
  if (!payload) return null;
  try {
    const body = JSON.parse(fromBase64Url(payload));
    if (typeof body?.l !== "string" || !/^[1-9]+$/.test(body.l)) return null;
    return normalizeFrequency({
      name: body.n,
      tags: body.t,
      stepMs: body.s,
      steps: [...body.l].map(Number),
    });
  } catch {
    return null;
  }
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(storage, key, value) {
  try { storage?.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export class FrequencyLibrary {
  constructor(storage = globalThis.localStorage) {
    this._storage = storage;
    this._mine = readJson(storage, MINE_KEY, []).map(normalizeFrequency).filter(Boolean);
    this._favorites = new Set(readJson(storage, FAV_KEY, []));
  }

  get presets() {
    return FREQ_PRESETS;
  }

  get mine() {
    return this._mine.slice();
  }

  find(id) {
    return FREQ_PRESETS.find((item) => item.id === id) || this._mine.find((item) => item.id === id) || null;
  }

  isFavorite(id) {
    return this._favorites.has(id);
  }

  toggleFavorite(id) {
    if (this._favorites.has(id)) this._favorites.delete(id);
    else this._favorites.add(id);
    writeJson(this._storage, FAV_KEY, [...this._favorites]);
    return this._favorites.has(id);
  }

  save(raw) {
    const clean = normalizeFrequency(raw);
    if (!clean) return null;
    clean.id = clean.id.startsWith("mine:") ? clean.id : `mine:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    this._mine = [clean, ...this._mine.filter((item) => item.id !== clean.id)];
    writeJson(this._storage, MINE_KEY, this._mine);
    return clean;
  }

  remove(id) {
    this._mine = this._mine.filter((item) => item.id !== id);
    this._favorites.delete(id);
    writeJson(this._storage, MINE_KEY, this._mine);
    writeJson(this._storage, FAV_KEY, [...this._favorites]);
  }
}

/**
 * 循环播放一段频率。任何一次下发被拒绝（已停止、断连等）就立即停下，
 * 不重试、不跳过，由调用方决定要不要再发 stop。
 */
export class FrequencyPlayer {
  constructor({
    send,
    onStep,
    onHalt,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = (id) => clearTimeout(id),
  }) {
    this._send = send;
    this._onStep = onStep;
    this._onHalt = onHalt;
    this._setTimer = setTimer;
    this._clearTimer = clearTimer;
    this._timer = null;
    this._run = 0;
    this.current = null;
    this.index = -1;
  }

  get playing() {
    return this.current != null;
  }

  start(freq) {
    this.halt(null);
    this.current = freq;
    this.index = -1;
    const run = ++this._run;
    this._tick(run);
  }

  halt(reason = null) {
    const was = this.current;
    this._run += 1;
    if (this._timer != null) this._clearTimer(this._timer);
    this._timer = null;
    this.current = null;
    this.index = -1;
    if (was) this._onHalt?.(was, reason);
  }

  async _tick(run) {
    if (run !== this._run || !this.current) return;
    const freq = this.current;
    this.index = (this.index + 1) % freq.steps.length;
    const level = freq.steps[this.index];
    let reason;
    try {
      reason = await this._send(level);
    } catch {
      reason = "下发失败，已停止播放";
    }
    if (run !== this._run) return;
    if (reason) {
      this.halt(reason);
      return;
    }
    this._onStep?.(freq, this.index, level);
    this._timer = this._setTimer(() => this._tick(run), freq.stepMs);
  }
}
