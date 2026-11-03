// 自我控制的盲操面板：上下滑调档、静止长按停止。
// 和滑杆一样只在松手时提交一次档位；滑动途中只更新显示和触感，不下发指令。

export const GESTURE_STEP_PX = 42;
export const GESTURE_SLOP_PX = 15;
export const GESTURE_STOP_HOLD_MS = 800;

export function levelFromDrag(startLevel, dy, levelMax) {
  const steps = Math.trunc(-dy / GESTURE_STEP_PX);
  return Math.min(levelMax, Math.max(1, startLevel + steps));
}

export function shouldKeepScreenOn({ tab, page, connected }) {
  return Boolean(connected) || (tab === "intimacy" && page !== "root");
}

export function haptic(pattern) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
}

export function attachGestureSurface(surface, {
  enabled,
  levelMax,
  startLevel,
  onPreview,
  onCommit,
  onHoldStop,
  onDisabled,
}) {
  if (!surface || surface.dataset.gestureAttached === "1") return;
  surface.dataset.gestureAttached = "1";

  let pointerId = null;
  let startY = 0;
  let startX = 0;
  let from = 1;
  let current = 1;
  let moved = false;
  let holdTimer = null;

  const reset = () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    pointerId = null;
    delete surface.dataset.dragging;
  };

  surface.addEventListener("pointerdown", (event) => {
    if (pointerId !== null) return;
    if (!enabled()) {
      onDisabled?.();
      return;
    }
    pointerId = event.pointerId;
    surface.dataset.dragging = "1";
    let captured = false;
    try {
      surface.setPointerCapture?.(event.pointerId);
      captured = surface.hasPointerCapture?.(event.pointerId) ?? false;
    } catch { /* ignore */ }
    if (!captured) {
      // 没拿到捕获时，在面板外松手不会派发到面板上。
      window.addEventListener("pointerup", finish, { once: true });
      window.addEventListener("pointercancel", abort, { once: true });
    }
    startY = event.clientY;
    startX = event.clientX;
    from = startLevel();
    current = from;
    moved = false;
    holdTimer = setTimeout(() => {
      if (moved || pointerId === null) return;
      reset();
      onHoldStop();
    }, GESTURE_STOP_HOLD_MS);
  });

  surface.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    const dy = event.clientY - startY;
    const dx = event.clientX - startX;
    if (!moved && (Math.abs(dy) > GESTURE_SLOP_PX || Math.abs(dx) > GESTURE_SLOP_PX)) {
      moved = true;
      clearTimeout(holdTimer);
    }
    if (!moved) return;
    const next = levelFromDrag(from, dy, levelMax);
    if (next === current) return;
    current = next;
    haptic(15);
    onPreview(next);
  });

  const finish = (event) => {
    if (event.pointerId !== pointerId) return;
    const commit = moved && current !== from;
    reset();
    if (commit) onCommit(current);
  };
  surface.addEventListener("pointerup", finish);
  const abort = (event) => {
    if (event.pointerId !== pointerId) return;
    reset();
    onPreview(from);
  };
  surface.addEventListener("pointercancel", abort);
  surface.addEventListener("lostpointercapture", abort);
}
