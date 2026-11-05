export const NAV_TABS = ["intimacy", "records", "settings"];
export const SCENARIO_FLOW = ["new", "define", "start", "call", "chat", "play"];

export function parseHash(hash) {
  const raw = (hash || "#/intimacy").replace(/^#/, "");
  const [path, search = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const tab = parts[0] || "intimacy";
  const last = parts[parts.length - 1];
  let page = parts[1] || "root";
  let sessionId = parts[2] || null;
  let view = parts[3] || null;
  if (tab === "records") {
    if (parts[1] === "sleep") {
      page = "sleep";
      view = "sleep";
      sessionId = null;
    } else if (last === "insight") {
      page = "insight";
      view = "insight";
      sessionId = parts[1] && parts[1] !== "insight" ? parts[1] : null;
    } else {
      page = "root";
      sessionId = parts[1] || null;
      view = null;
    }
  }
  return { tab, page, sub: parts[2] || null, id: parts[3] || null, sessionId, view, query: new URLSearchParams(search) };
}

/** 「心绪」Tab 已撤掉，旧书签和旧引导落地页统一回到亲密时刻。 */
export function legacyHeartTarget(parsed) {
  return parsed.tab === "heart" ? "#/intimacy" : null;
}

export function legacyNotesTarget(parsed) {
  if (parsed.tab !== "intimacy" || parsed.page !== "notes") return null;
  const qs = parsed.query.toString();
  if (parsed.view === "insight" && parsed.sessionId) {
    return `#/records/${parsed.sessionId}/insight${qs ? `?${qs}` : ""}`;
  }
  return "#/records";
}
