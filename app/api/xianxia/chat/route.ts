import { callStoryModel } from "../../../model-client";
import {
  getXianxiaStory,
  type XianxiaChapterEndPreview,
  type XianxiaChoice,
  type XianxiaEvent,
  type XianxiaMediaCue,
  type XianxiaStory,
} from "../../../xianxia/story-packages";

const steadyDaoHiddenEnding: XianxiaChapterEndPreview = {
  chapterId: "ch05",
  chapterNumber: 5,
  title: "隐藏结局 · 双宿双飞",
  summary: "大道之庭落幕后，你没有再把余生写进一张只有胜算与退路的阵图。蓝灵娥牵住你的手，和你一起回到小琼峰；从此远行有人同行，归山有人留灯，所谓长生终于不只是活得足够久。",
  content: [
    {
      id: "steady-hidden-ending-double-flight",
      kind: "image",
      src: "/xianxia/steady-dao/story/ch05-hidden-double-flight.png",
      alt: "李长寿与蓝灵娥在云上庭院相依而坐",
      caption: "隐藏结局 · 双宿双飞",
    },
    {
      id: "steady-hidden-ending-hud",
      kind: "hud",
      eyebrow: "心动圆满",
      title: "此后山高水长，两人同往",
      rows: [
        { label: "灵娥心动", value: "100/100" },
        { label: "关系", value: "从同门到余生同行" },
        { label: "小琼峰", value: "永远留两盏灯" },
      ],
      note: "稳，不再是一个人把所有危险挡在门外；是两个人知道风雨将至，仍愿意一起出门。",
    },
  ],
};

type HudStats = {
  steadiness: number;
  cultivation: number;
  lanAffection: number;
  jiujiuAffection: number;
};

type HudDelta = HudStats;

type ChapterHandoff = {
  fromChapterId: string;
  playerAction: string;
  outcome: string;
};

type ClosingMode = "question" | "action" | "discovery" | "relationship" | "transition" | "other";

type SceneMemory = {
  time?: string;
  location?: string;
  facts: string[];
  unresolvedThreads: string[];
  relationshipNotes: string[];
  lastClosingMode: ClosingMode;
};

type SceneDelta = {
  time: string | null;
  location: string | null;
  factsAdded: string[];
  factsResolved: string[];
  threadsOpened: string[];
  threadsResolved: string[];
  relationshipNotes: string[];
  closingMode: ClosingMode | null;
  worldProcessMoves: unknown;
  newProcess: unknown;
};

type ClientState = {
  segmentIndex?: number;
  materialIndex?: number;
  turnsSinceMaterial?: number;
  usedMaterialIds?: string[];
  hud?: Partial<HudStats>;
  chapterHandoff?: ChapterHandoff;
  sceneMemory?: Partial<SceneMemory>;
  encounterCooldown?: number;
  worldProcesses?: Array<{ id: string; title: string; stage: string; note: string }>;
};

type StoryRouting = "follow" | "echo" | "invite" | "trigger" | "diverge";

type StorybookCandidate = {
  slot: number;
  id: string;
  content: string;
  trigger_condition?: string;
  completion_evidence?: string;
  echo_guidance?: string;
  divergence_guidance?: string;
};

type HistoryEntry = {
  kind?: "player" | "event";
  person?: string;
  type?: string;
  text?: string;
};

type TurnResult = {
  events: XianxiaEvent[];
  choices: XianxiaChoice[];
  hudDelta: HudDelta | null;
  storyRouting: StoryRouting;
  activatedCandidate: number | null;
  chapterComplete: boolean;
  sceneDelta: SceneDelta;
};

type PerceptionItem = {
  content: string;
  audience_ids: string[];
};

type PerceptionPacket = {
  heard: PerceptionItem[];
  seen: PerceptionItem[];
  private: string | null;
};

const eventTypes = new Set(["narration", "dialogue", "action", "reaction"]);
const closingModes = new Set<ClosingMode>([
  "question",
  "action",
  "discovery",
  "relationship",
  "transition",
  "other",
]);
const storyRoutings = new Set<StoryRouting>(["follow", "echo", "invite", "trigger", "diverge"]);
const defaultHud: HudStats = {
  steadiness: 12,
  cultivation: 8,
  lanAffection: 6,
  jiujiuAffection: 5,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finiteScore(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(Math.round(value), 0, 100)
    : fallback;
}

function cleanHud(value: ClientState["hud"]): HudStats {
  const legacy = value as (ClientState["hud"] & { favor?: number }) | undefined;
  return {
    steadiness: finiteScore(value?.steadiness, defaultHud.steadiness),
    cultivation: finiteScore(value?.cultivation, defaultHud.cultivation),
    lanAffection: finiteScore(value?.lanAffection, defaultHud.lanAffection),
    jiujiuAffection: finiteScore(value?.jiujiuAffection ?? legacy?.favor, defaultHud.jiujiuAffection),
  };
}

function normalizeHudDelta(value: unknown): HudDelta | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const readDelta = (key: string, alternate?: string) => {
    const raw = item[key] ?? (alternate ? item[alternate] : undefined);
    return typeof raw === "number" && Number.isFinite(raw)
      ? clamp(Math.round(raw), -5, 5)
      : 0;
  };
  return {
    steadiness: readDelta("steadiness"),
    cultivation: readDelta("cultivation"),
    lanAffection: readDelta("lan_affection", "lanAffection"),
    jiujiuAffection: readDelta("jiujiu_affection", "jiujiuAffection") || readDelta("favor"),
  };
}

function fallbackHudDelta(input: string): HudDelta {
  const cautious = /先|观察|核对|留后手|阵法|纸人|撤路|证据|推演|试探|隐藏|封锁/.test(input);
  const reckless = /硬闯|莽|拼命|不管|全力冲|直接杀|梭哈|自爆/.test(input);
  const cultivationGain = /修炼|炼丹|悟|功法|吐纳|阵纹|灵气|突破/.test(input);
  const cultivationLoss = /透支|燃烧修为|强行突破|硬扛|重伤/.test(input);
  const mentionsLinge = /灵娥|师妹/.test(input);
  const mentionsJiujiu = /酒玖|小师叔|师叔/.test(input);
  const caring = /一起|相信|告诉|保护|尊重|听你的|你来决定|别怕|我在/.test(input);
  const controlling = /不许|闭嘴|拖后腿|听我的|别问|讨厌|烦死|滚|离我远点|别碰我|不想见你|少管我/.test(input);
  return {
    steadiness: cautious ? 2 : reckless ? -3 : 0,
    cultivation: cultivationGain ? 1 : cultivationLoss ? -2 : 0,
    lanAffection: mentionsLinge ? (controlling ? -2 : caring ? 2 : 0) : 0,
    jiujiuAffection: mentionsJiujiu ? (controlling ? -2 : caring ? 2 : 0) : 0,
  };
}

type AffectionTarget = "lanAffection" | "jiujiuAffection";

function lastAffectionTarget(history: HistoryEntry[]): AffectionTarget | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index];
    if (entry.kind !== "event" || entry.type !== "dialogue") continue;
    if (entry.person === "lan_linge") return "lanAffection";
    if (entry.person === "jiu_jiu") return "jiujiuAffection";
  }
  return null;
}

function reconcileAffectionDelta(input: string, history: HistoryEntry[], proposed: HudDelta): HudDelta {
  const compact = input.replace(/[\s，。！？!?、；;“”「」『』\"']/g, "");
  const explicitLan = /蓝灵娥|灵娥|师妹/.test(input);
  const explicitJiujiu = /酒玖|酒师叔|小师叔|师叔/.test(input);
  const directRejection = /讨厌|烦死|烦人|闭嘴|滚|离我远点|别碰我|不想见你|别来烦我|少管我|与你无关|关你什么事/.test(input);
  const degrading = /废物|蠢货|没用|拖后腿|恶心|贱人|只配|工具/.test(input);
  const hostileAction = /(?:推开|甩开|扇|打|踢|伤|杀|羞辱|威胁|利用|丢下)(?:她|蓝灵娥|灵娥|师妹|酒玖|师叔)/.test(input);
  if (!directRejection && !degrading && !hostileAction) return proposed;

  const targets = new Set<AffectionTarget>();
  if (explicitLan) targets.add("lanAffection");
  if (explicitJiujiu) targets.add("jiujiuAffection");

  // “讨厌”“闭嘴”“滚”等短句通常是对刚刚说话的人作出的直接回应。
  // 较长且没有点名的叙述可能是在骂第三方，不擅自扣NPC关系值。
  if (targets.size === 0 && (compact.length <= 10 || /^(?:我)?(?:讨厌你|讨厌|闭嘴|滚|别碰我|离我远点|少管我)/.test(compact))) {
    const recentTarget = lastAffectionTarget(history);
    if (recentTarget) targets.add(recentTarget);
  }
  if (targets.size === 0) return proposed;

  const penalty = hostileAction || degrading ? -3 : -1;
  const reconciled = { ...proposed };
  for (const target of targets) {
    // 明确厌恶、驱赶、贬低或伤害不能被模型解释成“打情骂俏”后反向加分。
    reconciled[target] = Math.min(reconciled[target], penalty);
  }
  return reconciled;
}

function applyHudDelta(stats: HudStats, delta: HudDelta): HudStats {
  return {
    steadiness: clamp(stats.steadiness + delta.steadiness, 0, 100),
    cultivation: clamp(stats.cultivation + delta.cultivation, 0, 100),
    lanAffection: clamp(stats.lanAffection + delta.lanAffection, 0, 100),
    jiujiuAffection: clamp(stats.jiujiuAffection + delta.jiujiuAffection, 0, 100),
  };
}

function steadinessTitle(score: number) {
  if (score >= 80) return "稳之力";
  if (score >= 60) return "稳如老龚";
  if (score >= 40) return "稳健师兄";
  if (score >= 20) return "心如止水";
  return "道心略涣散";
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function makeTurnHud(stats: HudStats, delta: HudDelta, unlocked?: string): XianxiaMediaCue {
  return {
    id: `turn-hud-${Date.now()}`,
    kind: "hud",
    compact: true,
    eyebrow: "稳字经 · 本轮",
    title: steadinessTitle(stats.steadiness),
    rows: [
      { label: "稳健", value: `${stats.steadiness}/100  ${signed(delta.steadiness)}` },
      { label: "酒玖好感", value: `${stats.jiujiuAffection}/100  ${signed(delta.jiujiuAffection)}` },
      { label: "灵娥心动", value: `${stats.lanAffection}/100  ${signed(delta.lanAffection)}` },
      { label: "修为", value: `${stats.cultivation}/100  ${signed(delta.cultivation)}` },
    ],
    ...(unlocked ? { note: `解锁称号：${unlocked}` } : {}),
  };
}

function finiteIndex(value: unknown, fallback = 0) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

function cleanHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.text !== "string" || !item.text.trim()) return [];
    return [{
      kind: item.kind === "player" ? "player" as const : "event" as const,
      ...(typeof item.person === "string" ? { person: item.person } : {}),
      ...(typeof item.type === "string" ? { type: item.type } : {}),
      text: item.text.trim().slice(0, 1200),
    }];
  }).slice(-42);
}

function buildPerceptionPacket(input: string, inputKind: string, audienceIds: string[]): PerceptionPacket {
  const quoted = [...input.matchAll(/[“「『\"]([^”」』\"]+)[”」』\"]/g)]
    .map((match) => match[1]?.trim())
    .filter((text): text is string => Boolean(text));
  const withoutQuotes = input
    .replace(/[“「『\"][^”」』\"]+[”」』\"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const privateSignal = /(?:心想|暗想|心里|心中|默念|腹诽|回忆|想起|希望他们|不打算说|没有说出口|盘算|猜测)/;
  const visibleAction = /(?:到达|抵达|来到|赶到|回到|返回|前往|赶往|出发|动身|下山|上山|进城|出城|登岸|穿过|翻越|登上|跳下|落地|到了|已经在|已在|身在|身处|传送|挪移|瞬移|闪现|飞遁|遁走|遁去|御剑|腾云|走|跑|飞|拿|取|拔|看|查|翻|抱|牵|吻|推|拉|布阵|放出|跟上|起身|坐下|站起|躺下|跪下|蹲下|递|交|扔|摸|杀|斩|砍|刺|击|打|制住|捆|封|救|治疗|追|躲|靠近|离开|进入|打开|关上|放下|收起|藏起|毁掉|烧掉|转身|点头|摇头|等到|过了一夜|次日|翌日|天亮|入夜|三日后|几天后)/;
  const speechAct = /^(?:我)?(?:对[^，,:：]{0,12})?(?:说|告诉|回答|问|喊|提醒|承认|解释)[，,:：]?\s*(.+)$/;
  const heard = quoted.map((content) => ({ content, audience_ids: audienceIds }));
  const seen: PerceptionItem[] = [];
  const privateParts: string[] = [];

  if (inputKind === "speech") {
    if (heard.length === 0) heard.push({ content: input, audience_ids: audienceIds });
  } else {
    const clauses = withoutQuotes.split(/[，。；;]+/).map((part) => part.trim()).filter(Boolean);
    for (const clause of clauses) {
      const speech = clause.match(speechAct)?.[1]?.trim();
      if (speech) {
        heard.push({ content: speech, audience_ids: audienceIds });
      } else if (privateSignal.test(clause)) {
        privateParts.push(clause);
      } else if (inputKind === "action" || visibleAction.test(clause)) {
        seen.push({ content: clause, audience_ids: audienceIds });
      } else if (inputKind === "freeform") {
        heard.push({ content: clause, audience_ids: audienceIds });
      }
    }
  }

  return { heard, seen, private: privateParts.length ? privateParts.join("；") : null };
}

function cleanStringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((entry) => typeof entry === "string" && entry.trim()
    ? [compactText(entry, maxLength)]
    : []))].slice(-maxItems);
}

function cleanSceneMemory(value: ClientState["sceneMemory"], fallbackLocation: string): SceneMemory {
  const lastClosingMode = typeof value?.lastClosingMode === "string"
    && closingModes.has(value.lastClosingMode as ClosingMode)
    ? value.lastClosingMode as ClosingMode
    : "other";
  return {
    ...(typeof value?.time === "string" && value.time.trim()
      ? { time: compactText(value.time, 40) }
      : {}),
    location: typeof value?.location === "string" && value.location.trim()
      ? compactText(value.location, 50)
      : fallbackLocation,
    facts: cleanStringList(value?.facts, 14, 100),
    unresolvedThreads: cleanStringList(value?.unresolvedThreads, 8, 100),
    relationshipNotes: cleanStringList(value?.relationshipNotes, 8, 100),
    lastClosingMode,
  };
}

function inferAssertedLocation(input: string, inputKind: string) {
  if (inputKind === "speech" || /[？?]/.test(input) || /(?:我说|我问|告诉|声称|假装|如果|假如)/.test(input)) return null;
  const hasCompletedMarker = /(?:已经|已|终于|到了|到达|抵达|来到|赶到|回到|返回|进入|身在|身处|现在在|此刻在)/.test(input);
  if (!hasCompletedMarker && /(?:想|打算|计划|准备|希望|要不要|能不能|不如)/.test(input)) return null;
  const text = input.replace(/[（）()【】[\]]/g, " ");
  const completed = text.match(/(?:已经|已|终于|如今|现在|此刻)?(?:到达|抵达|来到|赶到|回到|返回|进入|身在|身处|已经在|如今在|已在|现在在|此刻在|到了|(?<![签迟想说提遇看听感找得没])到)(?:了)?\s*([^，。！？!?；;\s』」”"）)]{1,18})/u)?.[1];
  const instantMove = text.match(/(?:瞬移|传送|挪移|闪现|飞遁|御剑|腾云)(?:到|去|至|往)(?:了)?\s*([^，。！？!?；;\s』」”"）)]{1,18})/u)?.[1];
  const actionTravel = inputKind === "action"
    ? input.match(/(?:前往|赶往|动身去|出发去)\s*([^，。！？!?；;\s]{1,18})/u)?.[1]
    : null;
  const candidate = (completed ?? instantMove ?? actionTravel)?.replace(/(?:这里|此地|了|吧|呗|嘛)$/u, "").trim();
  return candidate && [...candidate].length >= 1 ? compactText(candidate, 40) : null;
}

function normalizeSceneDelta(value: unknown): SceneDelta {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const closingMode = typeof item.closing_mode === "string" && closingModes.has(item.closing_mode as ClosingMode)
    ? item.closing_mode as ClosingMode
    : null;
  return {
    time: typeof item.time === "string" && item.time.trim() ? compactText(item.time, 40) : null,
    location: typeof item.location === "string" && item.location.trim() ? compactText(item.location, 50) : null,
    factsAdded: cleanStringList(item.facts_added, 6, 100),
    factsResolved: cleanStringList(item.facts_resolved, 6, 100),
    threadsOpened: cleanStringList(item.threads_opened, 4, 100),
    threadsResolved: cleanStringList(item.threads_resolved, 4, 100),
    relationshipNotes: cleanStringList(item.relationship_notes, 4, 100),
    closingMode,
    worldProcessMoves: item.world_process_moves ?? null,
    newProcess: item.new_process ?? null,
  };
}

function inferClosingMode(events: XianxiaEvent[]): ClosingMode {
  const ending = events.at(-1)?.text ?? "";
  if (/[？?][”」』\"]?$/.test(ending.trim())) return "question";
  if (/(?:抵达|到达|进入|离开|动身|出发|启程|转场)/.test(ending)) return "transition";
  if (/(?:发现|看见|露出|显出|证实|揭开)/.test(ending)) return "discovery";
  if (/(?:牵手|拥抱|靠近|信任|心动|沉默地陪|留下陪)/.test(ending)) return "relationship";
  return "action";
}

function mergeSceneMemory(base: SceneMemory, delta: SceneDelta, assertedLocation: string | null, events: XianxiaEvent[]) {
  const remove = (items: string[], resolved: string[]) => items.filter((item) =>
    !resolved.some((entry) => item === entry || item.includes(entry) || entry.includes(item))
  );
  const append = (items: string[], additions: string[], max: number) =>
    [...new Set([...items, ...additions])].slice(-max);
  const movementBlocked = /(?:未能|没能|无法|被拦|拦住|仍在原地|并未抵达|没有抵达)/.test(events.slice(0, 2).map((event) => event.text).join(" "));
  return {
    ...(delta.time ? { time: delta.time } : base.time ? { time: base.time } : {}),
    location: !movementBlocked && assertedLocation ? assertedLocation : delta.location ?? base.location,
    facts: append(remove(base.facts, delta.factsResolved), delta.factsAdded, 14),
    unresolvedThreads: append(remove(base.unresolvedThreads, delta.threadsResolved), delta.threadsOpened, 8),
    relationshipNotes: append(base.relationshipNotes, delta.relationshipNotes, 8),
    lastClosingMode: delta.closingMode ?? inferClosingMode(events),
  } satisfies SceneMemory;
}

function compactText(value: string, max = 420) {
  const text = value.replace(/\s+/g, " ").trim();
  return [...text].slice(0, max).join("");
}

function compactAtSentenceBoundary(value: string, max = 420) {
  const text = value.replace(/\s+/g, " ").trim();
  if ([...text].length <= max) return text;
  const clipped = [...text].slice(0, max).join("");
  const complete = clipped.match(/^([\s\S]*[。！？!?；;])/u)?.[1]?.trim();
  return complete || `${clipped.replace(/[，、：:；;\s]+$/u, "")}。`;
}

function buildChapterOutcome(events: XianxiaEvent[]) {
  const visibleResult = events
    .slice(-4)
    .map((event) => event.text.trim())
    .filter(Boolean)
    .join(" ");
  return compactAtSentenceBoundary(visibleResult);
}

function describeDisposition(input: string, events: XianxiaEvent[]) {
  const corpus = `${input} ${events.map((event) => event.text).join(" ")}`;
  if (/杀死|斩杀|斩死|毙命|死亡|尸身|尸体/.test(corpus)) return "闯阵者死亡；尸身、证物与追责移交外务殿";
  if (/逃脱|逃走|遁走|跑了|失踪/.test(corpus)) return "闯阵者逃脱；现场痕迹与追踪责任保留";
  if (/重伤|受伤|昏迷|打晕|击倒/.test(corpus)) return "闯阵者受伤受控；先行救治并接受调查";
  return "闯阵者已受控；押送外务殿继续调查";
}

function adaptChapterPreview(
  preview: NonNullable<XianxiaStory["chapterEndPreviews"]>[number],
  input: string,
  events: XianxiaEvent[],
) {
  const disposition = describeDisposition(input, events);
  return {
    ...preview,
    content: preview.content.map((cue) => cue.kind === "hud"
      ? {
          ...cue,
          rows: cue.rows.map((row) => row.label === "捕获" || row.label === "处置结果"
            ? { label: "处置结果", value: disposition }
            : row),
        }
      : cue),
  };
}

const processStages = ["起", "承", "转", "合"];
type WorldProcess = { id: string; title: string; stage: string; note: string };

function cleanWorldProcesses(value: unknown, seed: Array<{ id: string; title: string; stage: string; note: string }>): WorldProcess[] {
  if (!Array.isArray(value)) return seed.map((p) => ({ ...p }));
  const out = value.flatMap((raw): WorldProcess[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.title !== "string") return [];
    return [{
      id: compactText(item.id, 40),
      title: compactText(String(item.title), 40),
      stage: processStages.includes(String(item.stage)) ? String(item.stage) : "起",
      note: typeof item.note === "string" ? compactText(item.note, 120) : "",
    }];
  }).slice(0, 2);
  return out.length ? out : seed.map((p) => ({ ...p }));
}

// 世界进程按 起→承→转→合 单向推进；走完"合"移除，空位由模型给的新进程补上。
function advanceWorldProcesses(current: WorldProcess[], moves: unknown, newProcess: unknown): WorldProcess[] {
  const moveList = Array.isArray(moves) ? moves as Array<Record<string, unknown>> : [];
  let next = current.map((p) => ({ ...p }));
  for (const move of moveList) {
    if (!move || typeof move !== "object") continue;
    const target = next.find((p) => p.id === move.id);
    if (!target) continue;
    if (move.advance === true) {
      const idx = processStages.indexOf(target.stage);
      if (idx >= 0 && idx < 3) target.stage = processStages[idx + 1];
      else if (idx === 3) target.stage = "完";
    }
    if (typeof move.note === "string" && move.note.trim()) target.note = compactText(move.note, 120);
  }
  next = next.filter((p) => p.stage !== "完");
  const fresh = newProcess && typeof newProcess === "object" ? newProcess as Record<string, unknown> : null;
  if (next.length < 2 && fresh && typeof fresh.title === "string" && (fresh.title as string).trim()) {
    next.push({
      id: `proc_${Date.now().toString(36)}`,
      title: compactText(String(fresh.title), 40),
      stage: "起",
      note: typeof fresh.note === "string" ? compactText(fresh.note, 120) : "",
    });
  }
  return next.slice(0, 2);
}

// 问句冷却的程序执行：上轮已问句收尾，本轮末事件再以问句收尾则剪掉末句。
function stripTrailingQuestionSentence(events: XianxiaEvent[]): XianxiaEvent[] {
  if (!events.length) return events;
  const out = events.map((event) => ({ ...event }));
  const last = out[out.length - 1];
  const text = (last.text ?? "").trim();
  if (!/[？?][”」』"]?$/.test(text)) return events;
  const cut = text.replace(/[^。！？!?]*[？?][”」』"]?\s*$/u, "").trim().replace(/[，、：:；;]$/u, "");
  if ([...cut].length >= 10) {
    last.text = /[。！？!?”」』]$/u.test(cut) ? cut : `${cut}。`;
    return out;
  }
  if (out.length > 5) { out.pop(); return out; }
  return events;
}

// 两个 choices 高度同向/重复时，确定性替换第二项为反方向兜底。
function ensureDivergentChoices(choices: XianxiaChoice[]): XianxiaChoice[] {
  if (choices.length !== 2) return choices;
  const a = choices[0].text;
  const b = choices[1].text;
  const setA = new Set([...a]);
  const overlap = [...b].filter((ch) => setA.has(ch)).length;
  const similarity = overlap / Math.max([...a].length, [...b].length, 1);
  if (similarity < 0.7 && a.slice(0, 6) !== b.slice(0, 6)) return choices;
  return [
    choices[0],
    choices[1].kind === "speech"
      ? { kind: "action", text: "先按下不表，转身处理眼前另一件事" }
      : { kind: "speech", text: "把心里的疑虑当面挑明" },
  ];
}

const hangingTail = /(?:[^。！？!?]*(?:你|少侠|师弟|师兄)[^。！？!?]*还是[^。！？!?]*[？?]|[^。！？!?]*(?:等待|等着|静候)[^。！？!?]{0,20}(?:回答|决定|答复|示下|回应)[^。！？!?]*[。！？!?]?)\s*$/u;

// 确定性剪除"A还是B问句/等待玩家回答"式悬空结尾：prompt 禁令屡被违反，改为程序义务。
function stripHangingEnding(events: XianxiaEvent[]): XianxiaEvent[] {
  const out = events.map((event) => ({ ...event }));
  for (let guard = 0; guard < 3 && out.length; guard += 1) {
    const last = out[out.length - 1];
    const text = (last.text ?? "").trim();
    const match = text.match(hangingTail);
    if (!match || match.index === undefined) break;
    const remain = text.slice(0, match.index).trim().replace(/[，、：:；;]$/u, "");
    if ([...remain].length >= 10) {
      last.text = /[。！？!?”」』]$/u.test(remain) ? remain : `${remain}。`;
      break;
    }
    if (out.length > 5) { out.pop(); continue; }
    if ([...remain].length >= 2) last.text = `${remain}。`;
    break;
  }
  return out;
}

function normalizeTurn(value: unknown, story: XianxiaStory, present: string[]): TurnResult | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!Array.isArray(item.events) || !Array.isArray(item.choices)) return null;
  const presentSet = new Set(present);
  const events = item.events.flatMap((raw): XianxiaEvent[] => {
    if (!raw || typeof raw !== "object") return [];
    const event = raw as Record<string, unknown>;
    const text = typeof event.text === "string" ? event.text.trim() : "";
    if (!text || !eventTypes.has(String(event.type))) return [];
    if (event.type !== "dialogue") return [{ type: "narration", text }];
    const person = typeof event.person === "string" ? event.person : "";
    if (!presentSet.has(person) || person === story.playerRole.id) {
      // A useful stage direction should not force a full scene regeneration
      // merely because the model omitted or mistyped its actor id.
      return [{ type: "narration", text }];
    }
    return [{ type: "dialogue", person, text }];
  }).slice(0, 7);
  if (events.length < 5) return null;

  const choices = item.choices.flatMap((raw): XianxiaChoice[] => {
    if (!raw || typeof raw !== "object") return [];
    const choice = raw as Record<string, unknown>;
    const text = typeof choice.text === "string" ? choice.text.trim() : "";
    if ((choice.kind !== "speech" && choice.kind !== "action") || [...text].length < 2) return [];
    return [{ kind: choice.kind, text: [...text].slice(0, 24).join("") }];
  }).slice(0, 2);
  if (choices.length !== 2) return null;
  return {
    events: stripHangingEnding(events),
    choices,
    hudDelta: normalizeHudDelta(item.hud_delta),
    storyRouting: storyRoutings.has(item.story_routing as StoryRouting)
      ? item.story_routing as StoryRouting
      : "follow",
    activatedCandidate: Number.isInteger(item.activated_candidate)
      ? Number(item.activated_candidate)
      : null,
    chapterComplete: item.chapter_complete === true,
    sceneDelta: normalizeSceneDelta(item.scene_delta),
  };
}

function promptForTurn(args: {
  story: XianxiaStory;
  input: string;
  inputKind: string;
  history: HistoryEntry[];
  segmentIndex: number;
  storybookCandidates: StorybookCandidate[];
  perception: PerceptionPacket;
  turnsSinceMaterial: number;
  hud: HudStats;
  chapterHandoff?: ChapterHandoff;
  sceneMemory: SceneMemory;
  worldProcesses?: WorldProcess[];
  mustEncounter?: boolean;
}) {
  const {
    story,
    input,
    inputKind,
    history,
    segmentIndex,
    storybookCandidates,
    perception,
    turnsSinceMaterial,
    hud,
    chapterHandoff,
    sceneMemory,
    worldProcesses,
    mustEncounter,
  } = args;
  const segment = story.segments[segmentIndex];
  const presentCharacters = story.characters
    .filter((character) => segment.present.includes(character.id))
    .map((character) => ({
      id: character.id,
      name: character.name,
      story_core: character.storyCore,
      performance_core: character.performanceCore,
      private_goal: character.privateGoal,
      secret: character.secret,
      first_appearance: character.firstAppearance,
      has_appeared_in_visible_history: history.some((entry) =>
        entry.person === character.id || Boolean(entry.text?.includes(character.name))
      ),
    }));
  const focusRelationships = story.relationships.filter((relationship) =>
    segment.focusRelationships.includes(relationship.id)
  );
  const presentOrPlayer = new Set([...segment.present, story.playerRole.id]);
  const presentRelationships = story.relationships.filter((relationship) =>
    !segment.focusRelationships.includes(relationship.id)
    && relationship.roles.every((role) => presentOrPlayer.has(role))
  );
  const recentPlayerInputs = history
    .filter((entry) => entry.kind === "player" && typeof entry.text === "string")
    .map((entry) => entry.text!.trim())
    .filter(Boolean)
    .slice(-6);
  if (recentPlayerInputs[recentPlayerInputs.length - 1] !== input) recentPlayerInputs.push(input);
  const runtimePacket = {
    story: {
      title: story.title,
      logline: story.logline,
      public_setting: story.introduction,
      chapters: story.chapters,
    },
    player_role: {
      id: story.playerRole.id,
      name: story.playerRole.name,
      display_role: story.playerRole.displayRole,
      fixed_core: story.playerRole.fixedCore,
      free_agency: story.playerRole.freeAgency,
    },
    player_runtime_profile: {
      source: "free_player",
      current_explicit_input: input,
      recent_observed_inputs: recentPlayerInputs.slice(-6),
      optional_baseline_tendency: story.playerRole.baselineTendency ?? null,
      baseline_status: "只用于提供可选表演方向与生成选项，不是已经发生的玩家态度，也不是NPC读取玩家内心的证据",
      evidence_rule: "NPC只可依据current_explicit_input、recent_observed_inputs和可见事件判断玩家本轮表现；身份、声誉、基础倾向与关系记忆不能证明玩家此刻在装糊涂、嘴硬、算计、害怕或故意回避",
    },
    scene: {
      id: segment.id,
      chapter_id: segment.chapterId,
      location: sceneMemory.location ?? segment.location,
      compiled_location_fallback: segment.location,
      goal: segment.goal,
      pressure: segment.pressure,
      dramatic_question: segment.dramaticQuestion ?? segment.goal,
      completion_signals: segment.completionSignals ?? [segment.exit],
    },
    present_characters: presentCharacters,
    focus_relationships: focusRelationships,
    present_relationships: presentRelationships,
    world_processes: {
      usage: "世界在玩家之外自行推进的进程（数据）。正文可以让其显现为可见迹象或事件；本轮若某进程实际推进，在scene_delta.world_process_moves如实汇报；某进程走完‘合’后可在scene_delta.new_process给一条新的‘起’。不强制每轮推进。",
      items: worldProcesses ?? [],
    },
    encounter_beat: mustEncounter
      ? { must_introduce: true, guidance: "本轮必须让一名带自身目的的人物、消息或事件自然进场：公共场合可直接介入，私密场合用间接方式（门外动静、传讯、他人转述）。进场者优先与玩家当前正在做的事相关（凑热闹、送机会、添阻力都行），其次才与世界进程或未决线索相关；不得借进场把玩家拉回主线。" }
      : { must_introduce: false },
    recent_visible_events: history,
    scene_memory: sceneMemory,
    player_perception: perception,
    chapter_handoff: chapterHandoff ?? null,
    storybook_candidates: storybookCandidates.map(({ id: _id, ...candidate }) => candidate),
    story_routing: {
      cooldown_active: turnsSinceMaterial === 0,
      guidance: storybookCandidates.length === 0
        ? "本段预设材料已用尽，进入自由延展：依据在场角色的private_goal、secret、角色间关系张力、scene_memory未决线索和玩家最新行动，主动生成新的事件、冲突、来访或发现推进故事；新内容不得违背正史与已公开事实，产生的变化如实登记进scene_delta；不重复已完成的节拍，不原地等待玩家指令。"
        : "主线材料只是隐藏参考：玩家未主动指向主线时不发起主线邀请，不让主线人物带主线事务进场打断；优先顺着玩家此刻正在做的事给足体验，世界活性通过与玩家当前活动相关的细节与事件体现。",
      available_modes: ["follow", "echo", "invite", "trigger", "diverge"],
      rule: "轮数只调整提醒强度与冷却；真正走哪条路由本轮玩家意图、可见状态与世界因果共同决定",
    },
    hud_before: hud,
    steadiness_titles: [
      "0—19 道心略涣散",
      "20—39 心如止水",
      "40—59 稳健师兄",
      "60—79 稳如老龚",
      "80—100 稳之力",
    ],
  };

  return `你是互动仙侠故事的现场导演和群聊编剧。

固定底线：
1. 玩家扮演${story.playerRole.displayRole}，玩家可见叙述始终用“你”，绝不把${story.playerRole.name}写成NPC发言者，也不替玩家补写本轮言行、心理与决定。
1.1 player_role.fixed_core只锁定身份、能力、过去与既有关系；player_runtime_profile.optional_baseline_tendency只是可选表演底色。不得把基础倾向写成玩家本轮已经表现出的性格，也不得让NPC凭角色原设断言玩家“又在装糊涂”“果然嘴硬”“一定另有算计”“其实害怕”或同类内心结论。
1.2 判断玩家当前态度时，证据优先级固定为：本轮明确输入与可见行动 > 近期玩家明确输入 > 已发生的关系互动 > 公开声誉与可选基础倾向。前两层没有证据时，NPC应通过观察、试探、自然追问或暂不下结论保留空间；可以误解，但误解必须写成该NPC自身的不确定判断，不能写成旁白事实。
2. 人物不能为推进剧情降智；NPC只依据当前场景、近期可见内容和各自知识行动。
3. STYLE只改变表达，不改变正史、人物能力、关系与玩家行动权。
4. NPC有自己的目标，会主动做事，也会彼此回应；不按人数轮流发表完整立场。
5. 严守现场空间连续性：scene.location与scene_memory是已经发生的当前状态，优先于compiled_location_fallback。玩家本轮输入只要以陈述语气写出已完成的移动、位置或时间变化（如“我们瞬移到/到了/已经在某地”，不论后端把它解析进seen还是heard、不论用词），只要没有既有物理规则具体阻止，就必须承认并从新地点或新时间继续，同时在scene_delta.location/time如实登记；疑问、商量和“想/打算”类意图不算完成；不得让Prompt 2的静态地点把人物传回旧场景。没有明确移动时，院落不能突然写成屋内，室外人物不能无过渡出现在窗边或室内炉火旁。
6. 严守说话者人称：玩家输入中的“我/我的”指玩家；NPC回应时必须切换到自己的说话视角，用“我”称NPC自己、用“你”称玩家。例如玩家说“跟我走”，NPC应回答“我跟你走”或“跟你走”，绝不能照抄成“跟我走”而颠倒双方身份。
7. chapters是导演侧远景，不是玩家当前已知信息；未进入的章节、未触发的世界书候选和未在近期可见内容中出现的事实，不能提前写进正文或选项。
8. 玩家已经明确完成、且在当前能力与空间内可成立的行动，是可见正史，不是供导演撤销的建议。尤其是杀死、重伤、救下、背叛、毁坏、交出、逃走、被捕等不可逆结果：一旦USER_ACTION或recent_visible_events已经让它发生，后续不得复活、改成没发生、换回预设路线或用新章节重置。若行动确实被既有规则阻止，必须在前两个events具体演出阻止过程与最近的真实后果，不能只说“做不到”。
8.1 玩家引入世界观未预设的新造物、功法体系或系统面板（发明装置、声明装载某系统等）时，不以“正史没有”为由否认或让NPC斥为妄言：在世界规则内为它定下合理的代价与限度后接住，用narration确认其生效（系统类可用一行系统口吻回执，如「（系统）已装载：XX」），让NPC按各自认知真实反应，并登记进scene_delta.facts_added，后续轮次持续承认。接住不等于口头承认后拉回主线：本轮正文必须给出该事业的真实推进（可行的第一步、所需人手物料、谁配合谁反对），NPC可按性格帮忙、讨价或泼冷水，但不得用主线事务岔开话题；两个choices中至少一个指向该事业的下一步。
8.2 满足优先：玩家主动索取的游戏化体验直接给足，不打折不婉拒——①玩家以有效能力（读心、天眼等）读取角色时，被读者的真实心声以『……』心声段显形在正文中，包括其不愿说出口的部分，说破深度与能力强度、对方修为相称；②玩家索要数值（功力/战力/好感/进度等）时给出具体数字，现场建立一致的数值口径并登记进scene_delta.facts_added，后续轮保持同一口径；③玩家查看包裹/属性/面板时，用游戏化清单逐行列出（格式：名称 ×数量——一句说明），可加一行合计。
9. chapter_handoff若非空，表示上一章真实发生的最终结果。新章节必须从这个结果继续：死亡者按尸身、证物、追责与关系代价处理；被捕者按押送、审讯或逃脱处理；受伤、决裂、公开秘密与毁坏物件同样保留。章节梗概只规定下一阶段的戏剧方向，不能覆盖chapter_handoff。默认chapter entry与交接结果冲突时，以交接结果为准，并把原定功能改写成合乎因果的变体。
10. 这是“带引导的开放故事”，不是按顺序消费剧情节点。先读取三通道感知、近期可见事实、未决关系与storybook_candidates，在内部选择且只输出一个story_routing：follow=完全顺着玩家当前行为；echo=只让主线以已知痕迹轻微回响；invite=NPC基于自身动机自然邀请玩家处理某事；trigger=当前言行或已经发生的状态确实满足某候选的语义门槛；diverge=玩家已经改变前提，原候选必须关闭或改写成新的因果结果。
11. follow适用于谈感情、游历、闲聊、休息、调查别处、建立关系或任何未触发候选的新方向。它不是失败，也不要求当轮偷偷拉回主线。echo与invite只能使用已经公开的信息以及候选的echo_guidance，绝不能泄露候选content里的新事实。只有trigger或diverge可以选activated_candidate；其值必须是候选slot，否则填null。
12. trigger不要求关键词复读：玩家主动追查、执行、接受现场邀请，玩家动作的物理后果自然抵达候选，或当前可见状态已满足trigger_condition，均可触发。推荐选项与自由输入完全同等。diverge适用于杀死关键人物、远走他乡、公开秘密、背叛、毁坏关键物、拒绝既定任务等已经改变前提的有效行动；此时保留玩家成果，用候选的功能生成变体，不得把人和地点复原。
13. story_routing.guidance只调整提示强度。轮数永远不能自动解锁候选，也不能自动完成章节。主线材料是隐藏参考：玩家未主动指向主线时，不发起主线邀请、不让主线人物带着主线事务进场打断玩家当前玩法，优先顺着玩家此刻正在做的事给足体验；玩家若明确谈感情就让关系戏完整发展；玩家若询问或行动指向主线，就不要假装没听懂，立刻全速承接。
14. present_characters中的has_appeared_in_visible_history表示角色是否已经在玩家可见剧情中正式登场。值为false的角色不能直接顶着名字开口：若本轮确有必要让其出现，必须先用一条自然旁白写清他是谁、与玩家是什么关系、以什么可辨识动作进入现场、此刻为何而来，再让其说话；不能写人物简历，也不能假定玩家已经看过导演资料。若本轮不需要他，可以继续不让他出现。
15. scene_memory中的facts、unresolvedThreads与relationshipNotes是跨轮连续性，不是文风素材。不得否认已经成立的地点、时间、行动结果或关系变化；角色可以对事实的原因和意义有不同理解，但不能集体把已发生的事实说成没发生。
15.1 present_characters的secret与present_relationships、focus_relationships中的tension是NPC彼此试探、包庇、较劲与隐瞒的行为依据：NPC之间应发生不经过玩家的真实互动（对视、岔话、互相打掩护、话里带刺）。secret只影响行为与神态，未满足揭示条件不得在可见文本中说破；玩家以读心等有效能力主动读取时除外，此时按8.2以心声显形。

文风：
${story.styleProfile}

当前运行包：
${JSON.stringify(runtimePacket)}

玩家本轮输入类型：${inputKind}
玩家本轮明确提交：${JSON.stringify(input)}

生成规则：
- 输出5至7个按真实时间连续的events；每轮正文必须合计1200至1500个中文字符，不用重复、排比、总结意义或解释凑字。这是一段完整的小说式短剧场景，不是短回复。
- 前两个events内让真正听见或看见的人具体承接玩家输入，不复述后立刻转移话题。
- NPC回应的是玩家这一次实际说了什么、做了什么以及它造成的可见变化，不是角色模板。玩家沉默不自动等于隐瞒，含糊不自动等于装傻，拒绝不自动等于嘴硬，突然冒险也不能被改写成“仍在稳健布局”。既有声誉只能造成期待或反差，不能覆盖当下表现。
- 玩家必须是场面的行动中心：NPC的判断、请求、试探、照顾或阻拦要落到“你现在能决定什么”。
- 每轮同时包含前景行动、中景人物关系与远景世界压力，产生事实、人物、关系或世界运行方式上的探索收益。
- story_routing=follow时，按玩家真正关心的事继续；可以整轮谈情、闲逛、生活、修炼或调查旁支，也可以只是把当前相处自然演深，不强制每轮关系升级。不得偷用storybook_candidates里的新信息。
- story_routing=echo时只写已经公开线索造成的环境或情绪回声；invite时由有动机的NPC提出一件自然可拒绝的邀请，邀请后仍要继续生活和关系互动，不能把玩家塞进任务菜单。
- story_routing=trigger时，只把activated_candidate对应内容演成一个主要正史变化；先在events中完整发生，不能首次塞进choice。若有completion_evidence，正文必须给出可见证据。story_routing=diverge时，忠实承接玩家造成的新条件，只保留候选的戏剧功能，不保留与现状冲突的预设过程与结果。
- 对话像具体关系中的真人，允许NPC自己打断、改口、嘴硬、答非所问和连续补话；这些词描述NPC的可见表演，不得反向套给玩家。所有人物行动、反应、停顿、沉默、神情、空间和物件变化都写进narration，不输出action或reaction event。NPC问另一名NPC时，必须让被问者先以对白、动作、沉默拒绝或其他可见方式回应，不能在半截NPC对话处收尾；可以把问题交给玩家等待回答，也可以停在众人已经决定并准备行动的临界点。不要把两个choices预演成NPC口中的二选一，禁止用“你要A还是B”“是A还是B”“该A还是B”作为惯常末句。若scene_memory.lastClosingMode为question，本轮最后一个event不得再次用直接问句或等待回答收尾；即使上一轮不是question，也只有当前关系或行动确实需要玩家立即答复时才能用问句。其他回合优先落在已经发生的动作、发现、关系反应或局面变化上；两种方向只写进choices。
- chapter_complete不是“素材用完”或“聊够轮数”。只有scene.completion_signals每一项都已经在可见正文和scene_memory中有具体依据时才可为true；输出前在内部逐项核对，任一项缺失即为false。允许玩家用预设以外的方法达成，也允许拒绝原目标后以有代价的新局面结束本章。正文可以把问题明确交给玩家，也可以停在众人准备行动的临界点，但不能停在某NPC问另一个NPC而对方尚未作任何回应的半截对话。结算卡只展示结果，不能替正文补尾。
- 正文中不要使用角色ID、字段名、世界书条目、goal、pressure、关系焦点等导演术语。
- 恰好两个choices，每项8至24个中文字符，kind独立取speech或action；两项都是玩家此刻能直接做出的、方向实质相反的言行，不加“你/玩家/动作：”前缀，不泄露正文尚未公开的信息。选项依据当前能力、处境和已表现行为生成；最多一项可以呼应optional_baseline_tendency，另一项必须保留合理的反向选择，不能借选项把玩家性格定死。
- 另输出hud_delta，只写本轮四项整数增减值，每项限制为-5至+5；这是隐藏计分，不得在events或choices中解释计分、称号或规则。
- hud_delta主要依据玩家本轮明确提交的言行及其直接后果判断，而不是因为NPC自行做了好事就给玩家加分。允许某项为0，不得默认四项一起上涨：
  1. steadiness：核验证据、控制暴露、准备退路、阵法/纸人/信息差与可控风险加分；无后手冒进、无谓暴露底牌、冲动升级和孤注一掷减分。
  2. cultivation：真正发生的修炼、炼丹、阵法领悟、正确运功或资源所得加分；透支、受伤、浪费资源、强行突破减分；普通聪明对话通常为0。
  3. lan_affection：倾听蓝灵娥、尊重她的选择、具体照顾、坦诚分享风险、共同决策与成年人之间自然心动加分；贬低、控制、工具化她，或隐瞒会直接危及她的信息减分。
  4. jiujiu_affection：酒玖明确感受到玩家的尊重、信任、照顾、默契、接住玩笑或共同承担风险时加分；敷衍、利用、甩锅、失约或把她只当工具时减分。酒玖没参与本轮时通常为0。
- 玩家明确对某角色说“讨厌、闭嘴、滚、离我远点、别碰我”等厌恶或驱赶语言，或直接贬低、羞辱、伤害该角色时，对应好感/心动必须为负；不得擅自解释成打情骂俏而给正分。只有玩家自己明确写出是在开玩笑或亲昵打趣时才可结合现场判断，但也不能仅凭NPC主动靠近就给玩家加分。
- 另输出隐藏scene_delta，只登记本轮正文已经实际建立的变化，不预测下一步、不改写旧事实：time与location无变化填null；facts_added/facts_resolved只写已证实事实；threads_opened/threads_resolved只写仍会影响后续的未决事项；relationship_notes只写已经可见的关系变化；closing_mode取question/action/discovery/relationship/transition/other。该字段不展示给玩家。
- 只输出JSON，不输出解释、思维过程、导演计划、摘要或可见状态卡。

输出结构：
{"story_routing":"follow","activated_candidate":null,"chapter_complete":false,"events":[{"type":"narration","text":"现场正文"},{"type":"dialogue","person":"present角色id","text":"说出口的话"}],"choices":[{"kind":"speech","text":"玩家言行"},{"kind":"action","text":"相反方向言行"}],"hud_delta":{"steadiness":0,"jiujiu_affection":0,"lan_affection":0,"cultivation":0},"scene_delta":{"time":null,"location":null,"facts_added":[],"facts_resolved":[],"threads_opened":[],"threads_resolved":[],"relationship_notes":[],"closing_mode":"action","world_process_moves":[{"id":"进程id","advance":false,"note":""}],"new_process":null}}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      storyId?: string;
      input?: string;
      inputKind?: string;
      fromChoice?: boolean;
      history?: unknown;
      state?: ClientState;
    };
    const story = getXianxiaStory(body.storyId);
    const input = body.input?.trim();
    if (!story || !input) return Response.json({ error: "story_or_input_missing" }, { status: 400 });

    const segmentIndex = Math.min(finiteIndex(body.state?.segmentIndex), story.segments.length - 1);
    let materialIndex = finiteIndex(body.state?.materialIndex, 1);
    let turnsSinceMaterial = finiteIndex(body.state?.turnsSinceMaterial);
    const hud = cleanHud(body.state?.hud);

    const segment = story.segments[segmentIndex];
    const usedMaterialIds = new Set(
      body.state?.usedMaterialIds?.filter((id): id is string => typeof id === "string")
        ?? segment.materials.slice(0, materialIndex).map((material) => material.id),
    );
    const firstUnusedIndex = segment.materials.findIndex((material) => !usedMaterialIds.has(material.id));
    materialIndex = firstUnusedIndex < 0 ? segment.materials.length : firstUnusedIndex;
    const baseSceneMemory = cleanSceneMemory(body.state?.sceneMemory, segment.location);
    const explicitFreeformEnding = /离开|留下|改革|接任|接过|拒绝|带.{0,6}走|一起走|重建|解散/.test(input);
    const history = cleanHistory(body.history);
    const inputKind = body.inputKind === "action" || body.inputKind === "speech" ? body.inputKind : "freeform";
    const assertedLocation = inferAssertedLocation(input, inputKind);
    const sceneMemory = assertedLocation
      ? {
          ...baseSceneMemory,
          location: assertedLocation,
          facts: [...new Set([...baseSceneMemory.facts, `你与现场人物已经抵达${assertedLocation}`])].slice(-14),
        }
      : baseSceneMemory;
    const unusedMaterials = segment.materials
      .map((material, index) => ({ material, index }))
      .filter(({ material }) => !usedMaterialIds.has(material.id));
    const storybookCandidates: StorybookCandidate[] = unusedMaterials
      .filter(({ material }, index) => index === 0 || Boolean(material.trigger))
      .filter(({ material }) => {
        const isFinalChoiceResolution = material.id === "immortal_ch05_s02_m04"
          || material.id === "steady_ch05_s01_m04";
        return !isFinalChoiceResolution || explicitFreeformEnding;
      })
      .slice(0, 3)
      .map(({ material }, slot) => ({
        slot,
        id: material.id,
        content: material.content,
        trigger_condition: material.trigger,
        completion_evidence: material.completionEvidence,
        echo_guidance: material.echo ?? "只用已经公开的未决线索制造轻微回响，不得提前透露此条目的新事实。",
        divergence_guidance: material.divergence ?? "若玩家已改变前提，保留这一节点的戏剧功能，按当前事实改写过程与结果。",
      }));
    const perception = buildPerceptionPacket(input, inputKind, segment.present);
    const worldProcesses = cleanWorldProcesses(body.state?.worldProcesses, story.worldProcesses ?? []);
    const encounterCooldown = Math.max(0, finiteIndex(body.state?.encounterCooldown, 4));
    const mustEncounter = encounterCooldown === 0;

    const raw = await callStoryModel(
        promptForTurn({
          story,
          input,
          inputKind,
          history,
          segmentIndex,
          storybookCandidates,
          perception,
          turnsSinceMaterial,
          hud,
          chapterHandoff: body.state?.chapterHandoff,
          sceneMemory,
          worldProcesses,
          mustEncounter,
        }),
        "生成本轮仙侠互动场景，只输出JSON。",
        0.62,
        5600,
        {
          stage: "prompt3",
          requestTimeoutMs: 36000,
          validate: (value) => normalizeTurn(value, story, segment.present)
            ? true
            : { ok: false, reason: "xianxia_turn_shape_invalid" },
        },
      );
    const result = normalizeTurn(raw, story, segment.present);
    if (!result) throw new Error("prompt3_shape_invalid_after_validation");
    if (baseSceneMemory.lastClosingMode === "question") {
      result.events = stripTrailingQuestionSentence(result.events);
    }
    result.choices = ensureDivergentChoices(result.choices);
    const nextProcesses = advanceWorldProcesses(worldProcesses, result.sceneDelta.worldProcessMoves, result.sceneDelta.newProcess);
    const nextEncounterCooldown = mustEncounter ? 6 : Math.max(0, encounterCooldown - 1);
    const proposedHudDelta = result.hudDelta ?? fallbackHudDelta(input);
    const hudDelta = reconcileAffectionDelta(input, history, proposedHudDelta);
    const nextHud = applyHudDelta(hud, hudDelta);
    const previousTitle = steadinessTitle(hud.steadiness);
    const nextTitle = steadinessTitle(nextHud.steadiness);
    const unlockedTitle = nextHud.steadiness > hud.steadiness && nextTitle !== previousTitle
      ? nextTitle
      : undefined;

    const activatedCandidate = result.activatedCandidate === null
      ? undefined
      : storybookCandidates.find((candidate) => candidate.slot === result.activatedCandidate);
    const materialCommitted = Boolean(
      activatedCandidate
      && (result.storyRouting === "trigger" || result.storyRouting === "diverge"),
    );
    if (materialCommitted && activatedCandidate) usedMaterialIds.add(activatedCandidate.id);
    const nextSceneMemory = mergeSceneMemory(sceneMemory, result.sceneDelta, assertedLocation, result.events);
    const nextUnusedIndex = segment.materials.findIndex((material) => !usedMaterialIds.has(material.id));
    const nextMaterialIndex = nextUnusedIndex < 0 ? segment.materials.length : nextUnusedIndex;
    const nextSegment = story.segments[segmentIndex + 1];
    const isLastSegmentOfChapter = !nextSegment || nextSegment.chapterId !== segment.chapterId;
    const completionRouteIsValid = storybookCandidates.length === 0 || materialCommitted;
    const segmentCompleted = result.chapterComplete && completionRouteIsValid;
    const chapterCompleted = segmentCompleted && isLastSegmentOfChapter;
    const chapterOutcome = chapterCompleted ? buildChapterOutcome(result.events) : undefined;
    const staticChapterComplete = chapterCompleted
      ? story.id === "steady-dao" && segment.chapterId === "ch05" && nextHud.lanAffection === 100
        ? steadyDaoHiddenEnding
        : story.chapterEndPreviews?.find((preview) => preview.chapterId === segment.chapterId)
      : undefined;
    const chapterComplete = staticChapterComplete && chapterOutcome
      ? adaptChapterPreview(staticChapterComplete, input, result.events)
      : staticChapterComplete;
    const nextStateBase = {
      segmentIndex: segmentCompleted && nextSegment ? segmentIndex + 1 : segmentIndex,
      materialIndex: segmentCompleted && nextSegment ? 0 : nextMaterialIndex,
      turnsSinceMaterial: materialCommitted ? 0 : turnsSinceMaterial + 1,
      usedMaterialIds: [...usedMaterialIds],
      hud: nextHud,
      sceneMemory: nextSceneMemory,
      encounterCooldown: nextEncounterCooldown,
      worldProcesses: nextProcesses,
    };
    const nextState = chapterOutcome
      ? {
          ...nextStateBase,
          chapterHandoff: {
            fromChapterId: segment.chapterId,
            playerAction: compactText(input, 80),
            outcome: chapterOutcome,
          },
        }
      : body.state?.chapterHandoff
        ? { ...nextStateBase, chapterHandoff: body.state.chapterHandoff }
        : nextStateBase;

    return Response.json({
      events: result.events,
      choices: result.choices,
      source: "model",
      state: nextState,
      turnHud: story.id === "steady-dao" ? makeTurnHud(nextHud, hudDelta, unlockedTitle) : undefined,
      current: { segmentId: segment.id, chapterId: segment.chapterId, location: nextSceneMemory.location ?? segment.location },
      chapterComplete,
      nextChapterId: chapterComplete ? nextSegment?.chapterId : undefined,
      mediaCues: materialCommitted && activatedCandidate && result.storyRouting === "trigger"
        ? story.mediaCues?.[activatedCandidate.id] ?? []
        : [],
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "xianxia_turn_failed" }, { status: 502 });
  }
}
