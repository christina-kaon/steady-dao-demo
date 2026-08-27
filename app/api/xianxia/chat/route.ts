import { callStoryModel, callStoryModelStream, parseModelJson } from "../../../model-client";
import xianxiaCanon from "../../../xianxia/xianxia-canon.json";
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
  itemsGained: unknown;
  itemsLost: unknown;
  npcBelongingsUpdates: unknown;
  npcRelationUpdates: unknown;
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
  inventory?: Array<{ name: string; qty: number; note?: string }>;
  npcBelongings?: Record<string, Array<{ name: string; qty: number; note?: string }>>;
  npcRelations?: Array<{ pair: [string, string]; warmth: number; tension: number; note: string }>;
  npcStates?: Record<string, { mood: string; stanceToPlayer: string; recentPatterns: string[] }>;
  scenePresent?: string[];
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

const eventTypes = new Set(["narration", "dialogue", "action", "reaction", "os", "system", "loot"]);
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
  const completed = text.match(/(?:已经|已|终于|如今|现在|此刻)?(?:到达|抵达|来到|赶到|回到|返回|进入|身在|身处|已经在|如今在|已在|现在在|此刻在|到了|(?<![签迟想说提遇看听感找得没息等直熬])到)(?:了)?\s*([^，。！？!?；;\s』」”"）)]{1,18})/u)?.[1];
  const instantMove = text.match(/(?:瞬移|传送|挪移|闪现|飞遁|御剑|腾云)(?:到|去|至|往)(?:了)?\s*([^，。！？!?；;\s』」”"）)]{1,18})/u)?.[1];
  const actionTravel = inputKind === "action"
    ? input.match(/(?:前往|赶往|动身去|出发去)\s*([^，。！？!?；;\s]{1,18})/u)?.[1]
    : null;
  const candidate = (completed ?? instantMove ?? actionTravel)?.replace(/(?:这里|此地|了|吧|呗|嘛)$/u, "").trim();
  if (!candidate || ![...candidate].length) return null;
  // 180 轮连跑抓出的四类误伤，逐类挡掉：
  if (/(哪里|哪儿|何处|何方)/.test(candidate)) return null;            // 无问号疑问句："现在在哪里"
  if (/^[后前时中]/.test(candidate)) return null;                       // 时间从句碎片："到达后先查清对方的底牌"
  if (/(之前|以前|前)$/.test(candidate)) return null;                   // 未完成动作："进入遗迹前"
  if (/^(天亮|天黑|深夜|半夜|夜里|清晨|黎明|黄昏|傍晚|正午|午后|明日|明天|次日|来日|[子丑寅卯辰巳午未申酉戌亥]时)/.test(candidate)) return null; // 时间词："休息到天亮"
  if ([...candidate].length > 6 && /[先再才就便即且并]/.test(candidate)) return null; // 动词短语污染兜底
  return compactText(candidate, 40);
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
    itemsGained: item.items_gained ?? null,
    itemsLost: item.items_lost ?? null,
    npcBelongingsUpdates: item.npc_belongings_updates ?? null,
    npcRelationUpdates: item.npc_relation_updates ?? null,
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
    // 断言承认优先，但模型给出的层级版位置（含断言地点、按版图从大到小）比裸词更完整时用模型的。
    location: !movementBlocked && assertedLocation
      ? (delta.location && delta.location.includes(assertedLocation) ? delta.location : assertedLocation)
      : delta.location ?? base.location,
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

type LedgerItem = { name: string; qty: number; note?: string };

function cleanItems(value: unknown, max = 20): LedgerItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): LedgerItem[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.name !== "string" || !item.name.trim()) return [];
    const qty = typeof item.qty === "number" && Number.isFinite(item.qty) ? Math.max(1, Math.round(item.qty)) : 1;
    return [{ name: compactText(item.name, 24), qty, ...(typeof item.note === "string" && item.note.trim() ? { note: compactText(item.note, 60) } : {}) }];
  }).slice(0, max);
}

function mergeInventory(base: LedgerItem[], gained: unknown, lost: unknown): LedgerItem[] {
  const out = base.map((item) => ({ ...item }));
  for (const gain of cleanItems(gained, 8)) {
    const existing = out.find((item) => item.name === gain.name);
    if (existing) existing.qty += gain.qty;
    else out.push(gain);
  }
  for (const loss of cleanItems(lost, 8)) {
    const existing = out.find((item) => item.name === loss.name);
    if (!existing) continue;
    existing.qty -= loss.qty;
  }
  return out.filter((item) => item.qty > 0).slice(0, 40);
}

type NpcRelation = { pair: [string, string]; warmth: number; tension: number; note: string };

function cleanNpcRelations(value: unknown, seed: NpcRelation[]): NpcRelation[] {
  if (!Array.isArray(value)) return seed.map((r) => ({ ...r, pair: [...r.pair] as [string, string] }));
  const out = value.flatMap((raw): NpcRelation[] => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (!Array.isArray(item.pair) || item.pair.length !== 2) return [];
    return [{
      pair: [String(item.pair[0]), String(item.pair[1])],
      warmth: clamp(Number(item.warmth) || 50, 0, 100),
      tension: clamp(Number(item.tension) || 30, 0, 100),
      note: typeof item.note === "string" ? compactText(item.note, 80) : "",
    }];
  }).slice(0, 10);
  return out.length ? out : seed.map((r) => ({ ...r, pair: [...r.pair] as [string, string] }));
}

function applyNpcRelationUpdates(current: NpcRelation[], updates: unknown): NpcRelation[] {
  if (!Array.isArray(updates)) return current;
  const out = current.map((r) => ({ ...r, pair: [...r.pair] as [string, string] }));
  for (const raw of updates.slice(0, 6)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (!Array.isArray(item.pair) || item.pair.length !== 2) continue;
    const a = String(item.pair[0]); const b = String(item.pair[1]);
    const target = out.find((r) => (r.pair[0] === a && r.pair[1] === b) || (r.pair[0] === b && r.pair[1] === a));
    const wd = clamp(Number(item.warmth_delta) || 0, -5, 5);
    const td = clamp(Number(item.tension_delta) || 0, -5, 5);
    const note = typeof item.note === "string" && item.note.trim() ? compactText(item.note, 80) : null;
    if (target) {
      target.warmth = clamp(target.warmth + wd, 0, 100);
      target.tension = clamp(target.tension + td, 0, 100);
      if (note) target.note = note;
    } else if (out.length < 10) {
      out.push({ pair: [a, b], warmth: clamp(50 + wd, 0, 100), tension: clamp(30 + td, 0, 100), note: note ?? "" });
    }
  }
  return out;
}

function mergeNpcBelongings(base: Record<string, LedgerItem[]>, updates: unknown): Record<string, LedgerItem[]> {
  const out: Record<string, LedgerItem[]> = {};
  for (const [key, value] of Object.entries(base)) out[key] = value.map((item) => ({ ...item }));
  if (!Array.isArray(updates)) return out;
  for (const raw of updates.slice(0, 6)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.person !== "string" || !item.person.trim()) continue;
    const items = cleanItems(item.items, 15);
    if (items.length) out[item.person] = items;
  }
  return out;
}

type NpcState = { mood: string; stanceToPlayer: string; recentPatterns: string[] };

const stanceStages = ["戒备", "试探", "松动", "亲近", "裂痕"];

function cleanNpcStates(value: unknown, story: XianxiaStory, present: string[]): Record<string, NpcState> {
  const out: Record<string, NpcState> = {};
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  for (const id of present) {
    const item = raw[id] && typeof raw[id] === "object" ? raw[id] as Record<string, unknown> : null;
    const seed = story.npcStateSeeds?.[id];
    out[id] = {
      mood: typeof item?.mood === "string" && item.mood.trim() ? compactText(String(item.mood), 30) : (seed?.mood ?? "如常"),
      stanceToPlayer: typeof item?.stanceToPlayer === "string" && item.stanceToPlayer.trim() ? compactText(String(item.stanceToPlayer), 12) : (seed?.stanceToPlayer ?? "试探"),
      recentPatterns: Array.isArray(item?.recentPatterns) ? (item.recentPatterns as unknown[]).flatMap((p) => typeof p === "string" ? [compactText(p, 16)] : []).slice(-2) : [],
    };
  }
  // 非在场角色的状态原样保留（跨段落回归时不丢）
  for (const [id, item] of Object.entries(raw)) {
    if (out[id] || !item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    out[id] = {
      mood: typeof record.mood === "string" ? compactText(record.mood, 30) : "如常",
      stanceToPlayer: typeof record.stanceToPlayer === "string" ? compactText(record.stanceToPlayer, 12) : "试探",
      recentPatterns: Array.isArray(record.recentPatterns) ? (record.recentPatterns as unknown[]).flatMap((p) => typeof p === "string" ? [compactText(p, 16)] : []).slice(-2) : [],
    };
  }
  return out;
}

function applyNpcStateUpdates(current: Record<string, NpcState>, updates: unknown): Record<string, NpcState> {
  const out: Record<string, NpcState> = {};
  for (const [id, state] of Object.entries(current)) out[id] = { ...state, recentPatterns: [...state.recentPatterns] };
  if (!Array.isArray(updates)) return out;
  for (const raw of updates.slice(0, 6)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || !out[item.id]) continue;
    const target = out[item.id];
    if (typeof item.mood === "string" && item.mood.trim()) target.mood = compactText(item.mood, 30);
    if (typeof item.stance_to_player === "string" && stanceStages.includes(item.stance_to_player)) target.stanceToPlayer = item.stance_to_player;
    if (typeof item.pattern === "string" && item.pattern.trim()) {
      target.recentPatterns = [...target.recentPatterns, compactText(item.pattern, 16)].slice(-2);
    }
  }
  return out;
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
function stripTrailingQuestionSentence(events: XianxiaEvent[], minKeep = 0): XianxiaEvent[] {
  if (!events.length) return events;
  // 已流式发出的条目是对用户的承诺，事后校验不许再改/剪它们。
  if (events.length - 1 < minKeep) return events;
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

// 超长台词确定性拆条：>90字的 dialogue 按句子边界拆成同角色连续气泡。
function splitLongDialogue(events: XianxiaEvent[]): XianxiaEvent[] {
  const out: XianxiaEvent[] = [];
  for (const event of events) {
    if (event.type !== "dialogue" || [...(event.text ?? "")].length <= 90) { out.push(event); continue; }
    const sentences = (event.text ?? "").match(/[^。！？!?]+[。！？!?]?[”」』"]?/gu) ?? [event.text ?? ""];
    let chunk = "";
    const chunks: string[] = [];
    for (const sentence of sentences) {
      if ([...chunk].length + [...sentence].length > 70 && chunk) { chunks.push(chunk); chunk = sentence; }
      else chunk += sentence;
    }
    if (chunk) chunks.push(chunk);
    for (const piece of chunks.slice(0, 3)) out.push({ type: "dialogue", person: event.person, text: piece.trim() });
    if (chunks.length > 3) out.push({ type: "dialogue", person: event.person, text: chunks.slice(3).join("").trim() });
  }
  return out;
}

// os 事件并入同角色对白气泡，格式：正常话（os：内心话）；无相邻对白的转为气泡内独立 os 行。
function inlineOsEvents(events: XianxiaEvent[]): XianxiaEvent[] {
  const merged: XianxiaEvent[] = [];
  for (const event of events) {
    const prev = merged[merged.length - 1];
    if (event.type === "os" && prev && prev.type === "dialogue" && prev.person === event.person) {
      prev.text = `${prev.text}（os：${event.text}）`;
      continue;
    }
    merged.push({ ...event });
  }
  const out: XianxiaEvent[] = [];
  for (let i = 0; i < merged.length; i += 1) {
    const event = merged[i];
    if (event.type !== "os") { out.push(event); continue; }
    const next = merged[i + 1];
    if (next && next.type === "dialogue" && next.person === event.person) {
      out.push({ ...next, text: `${next.text}（os：${event.text}）` });
      i += 1;
      continue;
    }
    out.push({ type: "dialogue", person: event.person, text: `（os：${event.text}）` });
  }
  return out;
}

// 旁白里带引号且能锁定说话者的台词，确定性升格为 dialogue 气泡。
function promoteQuotedSpeech(events: XianxiaEvent[], story: XianxiaStory, present: string[]): XianxiaEvent[] {
  const presentChars = story.characters.filter((c) => present.includes(c.id));
  const out: XianxiaEvent[] = [];
  for (const event of events) {
    if (event.type !== "narration" || !event.text) { out.push(event); continue; }
    const text = event.text;
    const quoteRe = /[「“"]([^」”"]{2,220})[」”"]/gu;
    let cursor = 0; let splits = 0;
    let match: RegExpExecArray | null;
    const pieces: XianxiaEvent[] = [];
    while ((match = quoteRe.exec(text)) !== null && splits < 3) {
      const lookback = text.slice(Math.max(0, match.index - 50), match.index);
      const lookahead = text.slice(match.index + match[0].length, match.index + match[0].length + 16);
      let speaker = presentChars.find((c) => lookback.includes(c.name))
        ?? presentChars.find((c) => lookahead.includes(c.name) && /[说道答问叹笑]/.test(lookahead));
      let transientName: string | null = null;
      if (!speaker) {
        const generic = lookback.match(/(老?掌柜|老板娘|老板|小二|伙计|摊主|车夫|船夫|老者|老妪|老汉|少年|少女|童子|杂役|弟子|执事|长老|夫人|公子|姑娘|大婶|大汉|修士|侍女|门房)(?:[^「“"『]{0,8})$/u);
        if (generic) transientName = generic[1];
      }
      if (!speaker && !transientName) continue;
      if (speaker && speaker.id === story.playerRole.id) continue;
      let prefix = text.slice(cursor, match.index).trim().replace(/[：:，,]$/u, "");
      if (prefix) pieces.push({ type: "narration", text: /[。！？!?”」』]$/u.test(prefix) ? prefix : `${prefix}。` });
      pieces.push({ type: "dialogue", person: speaker ? speaker.id : transientName!, text: match[1] });
      cursor = match.index + match[0].length;
      splits += 1;
    }
    if (!splits) { out.push(event); continue; }
    const tail = text.slice(cursor).trim();
    if (tail.length >= 4) pieces.push({ type: "narration", text: tail });
    out.push(...pieces);
  }
  return out;
}

const hangingTail = /(?:[^。！？!?]*(?:你|少侠|师弟|师兄)[^。！？!?]*还是[^。！？!?]*[？?]|[^。！？!?]*(?:等待|等着|静候)[^。！？!?]{0,20}(?:回答|决定|答复|示下|回应)[^。！？!?]*[。！？!?]?)\s*$/u;

// 确定性剪除"A还是B问句/等待玩家回答"式悬空结尾：prompt 禁令屡被违反，改为程序义务。
function stripHangingEnding(events: XianxiaEvent[], minKeep = 0): XianxiaEvent[] {
  const out = events.map((event) => ({ ...event }));
  for (let guard = 0; guard < 3 && out.length; guard += 1) {
    // 已流式发出的条目不许再改/剪（发出即承诺）；剪尾只作用于未下发的尾格。
    if (out.length - 1 < minKeep) break;
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

// 观测器（只计数不改写）：旁白里以玩家为执行者的代写句（"你接过/你点头/你心头一紧"）。
// 命中数暴露在诊断字段，用于量化 prompt 层（底线 1.3）的拦截效果，不做文本手术。
const playerAgencyPattern = /(^|[。！？!?；;”」』])\s*你(?:又|再|也|只|便|才|就)?(接|拿|点头|摇头|说|答|应|开口|心[头中里]|不由|忍不住|伸手|迈|走|转身|抬|皱眉|笑|叹|决定|选择|跟着|坐|站|退|上前|凑|望向|看向|愣|怔|松了)/;
function countPlayerAgencyHits(events: XianxiaEvent[]): number {
  return events.filter((event) => event.type === "narration" && playerAgencyPattern.test(event.text ?? "")).length;
}

// 单条 raw event 的清洗规则：流式下发路径与终版 normalizeTurn 必须共用同一份，
// 否则（无效 person 处理 / 空文本丢弃）会造成流式与终版分歧。
// 任何非玩家角色开口一律保留为气泡台词——注册在场、注册未在场、临时路人同权；
// 出场与发言的选择权在模型（跟随玩家意图），清洗层只兜住两类硬错误：
// 代玩家写台词、把整句描述塞进 person 字段。
function cleanRawEvent(raw: unknown, story: XianxiaStory): XianxiaEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const event = raw as Record<string, unknown>;
  const text = typeof event.text === "string" ? event.text.trim() : "";
  if (!text || !eventTypes.has(String(event.type))) return [];
  if (event.type === "system") return [{ type: "system", text }];
  if (event.type === "loot") {
    const items = cleanItems(event.items, 8);
    return items.length ? [{ type: "loot", text, items }] : [{ type: "system", text }];
  }
  if (event.type === "os") {
    const osPerson = typeof event.person === "string" ? event.person.trim() : "";
    return osPerson && osPerson !== story.playerRole.id && osPerson !== story.playerRole.name
      ? [{ type: "os", person: osPerson, text }]
      : [{ type: "narration", text }];
  }
  if (event.type !== "dialogue") return [{ type: "narration", text }];
  const person = typeof event.person === "string" ? event.person.trim() : "";
  if (!person || person === story.playerRole.id || person === story.playerRole.name || [...person].length > 16) {
    return [{ type: "narration", text }];
  }
  return [{ type: "dialogue", person, text }];
}

function normalizeTurn(value: unknown, story: XianxiaStory, present: string[], minKeep = 0): TurnResult | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (!Array.isArray(item.events) || !Array.isArray(item.choices)) return null;
  const events = item.events.flatMap((raw) => cleanRawEvent(raw, story)).slice(0, 18);
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
    events: stripHangingEnding(inlineOsEvents(splitLongDialogue(promoteQuotedSpeech(events, story, present))), minKeep),
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

// 流式侧与终版同源的逐事件变换：拆引号台词、拆长台词、os并入前一气泡。
// 缓冲一格 emit，保证 os 出现时其前一个事件还未发出、可以合并——终版与流式内容从此基本一致。
function createStreamEventProcessor(story: XianxiaStory, present: string[], onEvent: (event: XianxiaEvent) => void) {
  let held: XianxiaEvent | null = null;
  // 落单 os（前一条不是同人台词）不立即发独立条：inlineOsEvents 会优先把它并进下一条
  // 同人台词的尾部，流式必须做同样的前瞻，否则中部就会与终版分歧。
  let pendingOs: XianxiaEvent | null = null;
  let sent = 0;
  // 与 normalizeTurn 的 slice(0, 18) 对齐：清洗后第 19 条起终版不会保留，流式也不许下发。
  let cleanedCount = 0;
  const transform = (event: XianxiaEvent): XianxiaEvent[] =>
    splitLongDialogue(promoteQuotedSpeech([event], story, present));
  const send = (event: XianxiaEvent) => { sent += 1; onEvent(event); };
  const flushHeld = () => {
    if (held) { send(held); held = null; }
  };
  const materializePendingOs = () => {
    if (pendingOs) {
      send({ type: "dialogue", person: pendingOs.person, text: `（os：${pendingOs.text}）` });
      pendingOs = null;
    }
  };
  return {
    push(raw: unknown) {
      const cleaned: XianxiaEvent[] = [];
      for (const item of cleanRawEvent(raw, story)) {
        if (cleanedCount >= 18) break;
        cleanedCount += 1;
        cleaned.push(item);
      }
      const pieces = cleaned.flatMap((item) => transform(item));
      for (const piece of pieces) {
        if (piece.type === "os" && piece.person) {
          if (held && held.type === "dialogue" && held.person === piece.person) {
            held = { ...held, text: `${held.text}（os：${piece.text}）` };
            continue;
          }
          flushHeld();
          materializePendingOs();
          pendingOs = piece;
          continue;
        }
        if (pendingOs) {
          if (piece.type === "dialogue" && piece.person === pendingOs.person) {
            flushHeld();
            held = { ...piece, text: `${piece.text}（os：${pendingOs.text}）` };
            pendingOs = null;
            continue;
          }
          materializePendingOs();
        }
        flushHeld();
        held = piece;
      }
    },
    // 结尾一格不经流式下发：终版的剪尾校验（悬空问句/问句冷却）只作用于未发出的尾部，
    // 把它留给终版对账追加，用户就永远不会看到"流式出现过、终版消失"的闪变。
    flush: () => { held = null; pendingOs = null; },
    emittedCount: () => sent,
  };
}

function buildCanonPacket(scanText: string) {
  const hits: Array<{ title: string; content: string }> = [];
  let used = 0;
  for (const entry of xianxiaCanon.keyed) {
    if (!entry.keys.some((k: string) => k && scanText.includes(k))) continue;
    if (used + entry.content.length > 3500) continue;
    hits.push({ title: entry.title, content: entry.content });
    used += entry.content.length;
  }
  return {
    usage: "题材硬设定资产：正文描写、能力与位阶判定、物价与称谓应与其一致；若与本故事已确立正史或人物能力冲突，以正史优先。",
    core: xianxiaCanon.core,
    hits,
  };
}

function promptForTurn(args: {
  story: XianxiaStory;
  input: string;
  inputKind: string;
  history: HistoryEntry[];
  segmentIndex: number;
  present: string[];
  storybookCandidates: StorybookCandidate[];
  perception: PerceptionPacket;
  turnsSinceMaterial: number;
  hud: HudStats;
  chapterHandoff?: ChapterHandoff;
  sceneMemory: SceneMemory;
  canon?: ReturnType<typeof buildCanonPacket> | null;
  worldProcesses?: WorldProcess[];
  mustEncounter?: boolean;
  directorBeat?: Record<string, unknown> | null;
  inventory?: LedgerItem[];
  npcBelongings?: Record<string, LedgerItem[]>;
  npcRelations?: NpcRelation[];
  npcStates?: Record<string, NpcState>;
}) {
  const {
    story,
    input,
    inputKind,
    history,
    segmentIndex,
    present,
    storybookCandidates,
    perception,
    turnsSinceMaterial,
    hud,
    chapterHandoff,
    sceneMemory,
    canon,
    worldProcesses,
    mustEncounter,
    directorBeat,
    inventory = [],
    npcBelongings = {},
    npcRelations = [],
    npcStates = {},
  } = args;
  const segment = story.segments[segmentIndex];
  const presentCharacters = story.characters
    .filter((character) => present.includes(character.id))
    .map((character) => ({
      id: character.id,
      name: character.name,
      story_core: character.storyCore,
      performance_core: character.performanceCore,
      private_goal: character.privateGoal,
      secret: character.secret,
      persona: character.persona ?? null,
      current_state: (npcStates ?? {})[character.id] ?? null,
      first_appearance: character.firstAppearance,
      has_appeared_in_visible_history: history.some((entry) =>
        entry.person === character.id || Boolean(entry.text?.includes(character.name))
      ),
    }));
  const focusRelationships = story.relationships.filter((relationship) =>
    segment.focusRelationships.includes(relationship.id)
  );
  const presentOrPlayer = new Set([...present, story.playerRole.id]);
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
    offstage_characters: story.characters
      .filter((character) => !present.includes(character.id))
      .map((character) => ({ id: character.id, name: character.name, story_core: compactText(character.storyCore, 60) })),
    focus_relationships: focusRelationships,
    present_relationships: presentRelationships,
    ...(story.worldAtlas ? { world_atlas: { usage: "本故事的地理坐标系。人物移动、提及远方、生成新地点时按版图推方位与距离，未列出的地点须与版图逻辑相容；scene_delta.location 从大到小写（宗门/区域·峰/地界·具体点）。", atlas: story.worldAtlas } } : {}),
    ...(canon ? { canon_worldbook: canon } : {}),
    world_processes: {
      usage: "世界在玩家之外自行推进的进程（数据）。正文可以让其显现为可见迹象或事件；本轮若某进程实际推进，在scene_delta.world_process_moves如实汇报；某进程走完‘合’后可在scene_delta.new_process给一条新的‘起’。不强制每轮推进。",
      items: worldProcesses ?? [],
    },
    encounter_beat: mustEncounter
      ? { must_introduce: true, guidance: "本轮必须让一名带自身目的的人物、消息或事件自然进场：公共场合可直接介入，私密场合用间接方式（门外动静、传讯、他人转述）。进场者优先与玩家当前正在做的事相关（凑热闹、送机会、添阻力都行），其次才与世界进程或未决线索相关；不得借进场把玩家拉回主线。" }
      : { must_introduce: false },
    player_inventory: { usage: "玩家背包账本。获得/失去物品用loot事件呈现并在scene_delta.items_gained/items_lost登记；账本内容跨轮一致，不得凭空消失。", items: inventory },
    npc_belongings: { usage: "NPC随身物品账本。玩家首次查看/偷看某NPC物品时现场生成合理内容并在scene_delta.npc_belongings_updates整表登记；已登记的下次必须一致。", records: npcBelongings },
    npc_relations: { usage: "NPC之间的情感账本（warmth亲近0-100/tension张力0-100）。他们彼此的语气、袒护、拆台应与当前值相称；本轮NPC间互动造成变化时在scene_delta.npc_relation_updates汇报增减（-5到+5）。", pairs: npcRelations },
    ...(directorBeat ? { director_beat: { usage: "隐藏导演对本轮的拍板：正文按beat_outline节点顺序推进——变化节点写足、过渡节点从简，本轮核心变化在中部节点完成，不得把全部变化堆到结尾；每名角色的表现依其persona三层与current_state（mood/stance）落笔，不复读recent_patterns里的旧反应模式；反应形状按engagement执行：focus时只有focus_person做主要回应、其他人至多背景小动作或整轮沉默，ensemble时被卷入者互相接话互相冲突（甲怼乙、乙拉丙），禁止每人各自对玩家说一句的排队式反应；结尾落在closing_direction指向的具体钩子上。若拍板与正史或玩家本轮实际行动冲突，以正史与玩家行动优先。", ...directorBeat } } : {}),
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
1.3 玩家的行动、反应、决定、心理与台词只能来自玩家的实际输入，正文一律不得代写或预演——"你接过""你点头""你心头一紧""你说道""你不由得"这类以玩家为执行者的句子全部违规。世界可以抵达玩家的边界：东西递到你手边、话音落在你耳边、目光落在你身上、危险逼到三步之内——写到抵达即止，玩家如何回应永远留白。需要推进剧情时，把局面推到玩家不得不反应的临界点（事件砸到面前、有人把问题摆到桌上），用结尾钩子与choices邀请玩家行动，绝不替玩家跨过那一步。
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
14.1 谁出场、谁发言，跟随玩家本轮意图决定：玩家点名、召唤、寻找或明显期待某个角色（含offstage_characters中的角色与世界观合理的路人）时，让该角色本轮实际登场并以dialogue气泡台词回应，不得以"不在预设名单"为由缺席或只在旁白里被提及。任何开口说话的角色——包括掌柜、路人、报信人等临时人物——一律用dialogue事件并在person写明其称谓，绝不把台词写进narration。offstage_characters只给了一句身份线索：让其登场时按14的首次登场规则自然引入，其言行只依据已公开信息与该身份合理推断。
15. scene_memory中的facts、unresolvedThreads与relationshipNotes是跨轮连续性，不是文风素材。不得否认已经成立的地点、时间、行动结果或关系变化；角色可以对事实的原因和意义有不同理解，但不能集体把已发生的事实说成没发生。
16. NPC的情绪与叙事反应强度必须与事件对其的实际意义相称：普通寒暄、常规动作和小决定只引起相称的回应，不因玩家身份放大普通互动，不让全场为一句日常话语停摆；高位角色的地位体现为现实影响力，不体现为对玩家居高临下或过度关注的姿态。
17. 多名角色在场且确实被卷入时，可以形成多个落点（插话、侧面小动作、背景动作）；与本拍无关的角色允许整轮沉默或不出现，不逢人发言、不按人数轮流。任何单一关系不得连续多轮独占叙事焦点；新引入的人物必须带来实际作用，不做背景板。
17.1 present_characters的secret与present_relationships、focus_relationships中的tension是NPC彼此试探、包庇、较劲与隐瞒的行为依据：NPC之间应发生不经过玩家的真实互动（对视、岔话、互相打掩护、话里带刺）。secret只影响行为与神态，未满足揭示条件不得在可见文本中说破；玩家以读心等有效能力主动读取时除外，此时按8.2以心声显形。

文风：
${story.styleProfile}

当前运行包：
${JSON.stringify(runtimePacket)}

玩家本轮输入类型：${inputKind}
玩家本轮明确提交：${JSON.stringify(input)}

生成规则：
- 每一轮是衔接自然的连续两场戏：beat_outline的每个节点都必须实际演出（谁做什么、出现什么），不许把任何节点一笔带过或合并跳过。第一场戏完整演完后，它的钩子必须当场兑现并展开成第二场戏——第二场同样要有自己的核心变化与完整展开，不许只开个头就收。两场戏之间不加任何幕次标记、场景分隔符或"与此同时/另一边/片刻之后"式转场套话：用动作、声响、人物进出或视线移动把戏自然接进下一场，读起来是一段连续的剧情。全轮合计10至18个events、1400至2200个中文字符。每场戏各有信息增量（新事实、新关系动向、可读的新细节，每场至少两样）；全轮以第二场戏的新钩子收拍。玩家输入再短，两场戏也要演完整；不用重复、排比、总结凑字。对白必须拆碎：单条dialogue以一两句话为宜（一般不超过60字），同一角色可以在一轮内多次开口、被打断、接话、补一句；严禁让任何角色一次性说一大段台词，长内容拆成多条气泡与动作narration交替。
- 前两个events内让真正听见或看见的人具体承接玩家输入，不复述后立刻转移话题。
- NPC回应的是玩家这一次实际说了什么、做了什么以及它造成的可见变化，不是角色模板。玩家沉默不自动等于隐瞒，含糊不自动等于装傻，拒绝不自动等于嘴硬，突然冒险也不能被改写成“仍在稳健布局”。既有声誉只能造成期待或反差，不能覆盖当下表现。
- 玩家必须是场面的行动中心：NPC的判断、请求、试探、照顾或阻拦要落到“你现在能决定什么”。
- 每轮同时包含前景行动、中景人物关系与远景世界压力，产生事实、人物、关系或世界运行方式上的探索收益。
- story_routing=follow时，按玩家真正关心的事继续；可以整轮谈情、闲逛、生活、修炼或调查旁支，也可以只是把当前相处自然演深，不强制每轮关系升级。不得偷用storybook_candidates里的新信息。
- story_routing=echo时只写已经公开线索造成的环境或情绪回声；invite时由有动机的NPC提出一件自然可拒绝的邀请，邀请后仍要继续生活和关系互动，不能把玩家塞进任务菜单。
- story_routing=trigger时，只把activated_candidate对应内容演成一个主要正史变化；先在events中完整发生，不能首次塞进choice。若有completion_evidence，正文必须给出可见证据。story_routing=diverge时，忠实承接玩家造成的新条件，只保留候选的戏剧功能，不保留与现状冲突的预设过程与结果。
- 对话像具体关系中的真人，允许NPC自己打断、改口、嘴硬、答非所问和连续补话；这些词描述NPC的可见表演，不得反向套给玩家。所有人物行动、反应、停顿、沉默、神情、空间和物件变化都写进narration，不输出action或reaction event。NPC问另一名NPC时，必须让被问者先以对白、动作、沉默拒绝或其他可见方式回应，不能在半截NPC对话处收尾；可以把问题交给玩家等待回答，也可以停在众人已经决定并准备行动的临界点。不要把两个choices预演成NPC口中的二选一，禁止用“你要A还是B”“是A还是B”“该A还是B”作为惯常末句。若scene_memory.lastClosingMode为question，本轮最后一个event不得再次用直接问句或等待回答收尾；即使上一轮不是question，也只有当前关系或行动确实需要玩家立即答复时才能用问句。其他回合优先落在已经发生的动作、发现、关系反应或局面变化上；两种方向只写进choices。结尾不得描写角色等待玩家回应、观察玩家反应或把决定权悬停给玩家（"他等待着你的回答""等着你的决定"类语义一律违规）；非问句结尾必须停在玩家以外角色的行为、对白或环境变化上，为下一轮留下自然牵引。
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
{"story_routing":"follow","activated_candidate":null,"chapter_complete":false,"events":[{"type":"narration","text":"现场正文"},{"type":"dialogue","person":"注册角色一律写其id（含本轮新登场的offstage角色）；临时人物（街边掌柜/路人等）直接写其称谓且全轮一致","text":"说出口的话"},{"type":"os","person":"角色id","text":"该角色此刻未说出口的真实心声（导演os_assignments指定时使用）"},{"type":"system","text":"系统口吻回执（装载/结算/判定时使用）"},{"type":"loot","text":"获得物品的一句话","items":[{"name":"物品名","qty":1,"note":"一句说明"}]}],"choices":[{"kind":"speech","text":"玩家言行"},{"kind":"action","text":"相反方向言行"}],"hud_delta":{"steadiness":0,"jiujiu_affection":0,"lan_affection":0,"cultivation":0},"scene_delta":{"time":null,"location":null,"facts_added":[],"facts_resolved":[],"threads_opened":[],"threads_resolved":[],"relationship_notes":[],"closing_mode":"action","world_process_moves":[{"id":"进程id","advance":false,"note":""}],"new_process":null,"items_gained":[],"items_lost":[],"npc_belongings_updates":[{"person":"角色id","items":[{"name":"","qty":1,"note":""}]}],"npc_relation_updates":[{"pair":["角色id","角色id"],"warmth_delta":0,"tension_delta":0,"note":""}]}}`;
}

type TurnBody = {
  storyId?: string;
  input?: string;
  inputKind?: string;
  fromChoice?: boolean;
  history?: unknown;
  state?: ClientState;
  stream?: boolean;
};

type StreamedEvent = { type: string; person?: string; text: string };

// V4.4：从生成中的 JSON 文本里增量提取 events 数组中已闭合的事件对象
function extractClosedEvents(text: string): StreamedEvent[] {
  const key = text.indexOf('"events"');
  if (key < 0) return [];
  const arrayStart = text.indexOf("[", key);
  if (arrayStart < 0) return [];
  const events: StreamedEvent[] = [];
  let index = arrayStart + 1;
  while (index < text.length) {
    while (index < text.length && text[index] !== "{" && text[index] !== "]") index += 1;
    if (index >= text.length || text[index] === "]") break;
    const objectStart = index;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objectEnd = -1;
    for (let cursor = objectStart; cursor < text.length; cursor += 1) {
      const character = text[cursor];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') inString = true;
      else if (character === "{") depth += 1;
      else if (character === "}") {
        depth -= 1;
        if (depth === 0) { objectEnd = cursor; break; }
      }
    }
    if (objectEnd < 0) break;
    try {
      const parsed = JSON.parse(text.slice(objectStart, objectEnd + 1)) as StreamedEvent;
      if (parsed && typeof parsed.text === "string" && ["narration", "dialogue", "os", "system", "loot"].includes(String(parsed.type))) {
        events.push(parsed);
      }
    } catch {
      // 坏对象（裸引号等）即停：破损点之后一律不经流式下发，交给终版 jsonrepair 补全，
      // 保证流式序列始终是终版的前缀（跳过继续会造成中部跳洞→前端换尾闪变）。
      break;
    }
    index = objectEnd + 1;
  }
  return events;
}

// V4.4：近史分层裁剪——最新 2 个玩家回合全文，再前 2 个回合只留对白与叙述首句
function tierHistory(history: HistoryEntry[]): HistoryEntry[] {
  const rounds: HistoryEntry[][] = [];
  let current: HistoryEntry[] = [];
  for (const entry of history) {
    if (entry.kind === "player" && current.length) { rounds.push(current); current = []; }
    current.push(entry);
  }
  if (current.length) rounds.push(current);
  const kept = rounds.slice(-4);
  const fullFrom = Math.max(0, kept.length - 2);
  return kept.flatMap((round, roundIndex) => {
    if (roundIndex >= fullFrom) return round;
    return round.map((entry) => {
      if (entry.kind === "player" || entry.type === "dialogue" || typeof entry.text !== "string") return entry;
      const firstSentence = entry.text.split(/(?<=[。！？])/)[0] ?? entry.text;
      return { ...entry, text: firstSentence.length > 60 ? firstSentence.slice(0, 60) + "…" : firstSentence };
    });
  });
}

class XianxiaTurnError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function POST(request: Request) {
  let body: TurnBody;
  try {
    body = await request.json() as TurnBody;
  } catch {
    return Response.json({ error: "invalid_json_body" }, { status: 400 });
  }
  if (body.stream === true) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const emit = (frame: unknown) => controller.enqueue(encoder.encode(JSON.stringify(frame) + "\n"));
        try {
          const payload = await runXianxiaTurn(body, (event) => emit({ type: "event", event }));
          emit({ type: "final", payload });
        } catch (error) {
          emit({ type: "error", error: error instanceof Error ? error.message : "xianxia_turn_failed" });
        }
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-cache" },
    });
  }
  try {
    return Response.json(await runXianxiaTurn(body));
  } catch (error) {
    const status = error instanceof XianxiaTurnError ? error.status : 502;
    return Response.json({ error: error instanceof Error ? error.message : "xianxia_turn_failed" }, { status });
  }
}

async function runXianxiaTurn(body: TurnBody, onEvent?: (event: StreamedEvent) => void) {
    const story = getXianxiaStory(body.storyId);
    const input = body.input?.trim();
    if (!story || !input) throw new XianxiaTurnError("story_or_input_missing", 400);

    const segmentIndex = Math.min(finiteIndex(body.state?.segmentIndex), story.segments.length - 1);
    let materialIndex = finiteIndex(body.state?.materialIndex, 1);
    let turnsSinceMaterial = finiteIndex(body.state?.turnsSinceMaterial);
    const hud = cleanHud(body.state?.hud);

    const segment = story.segments[segmentIndex];
    // 运行时出场名单：段落静态名单 ∪ 场景内已动态入场者 ∪ 本轮玩家点名者。
    // 玩家在回复里点名/召唤一个注册角色，就是导演意义上的"叫人进场"，链路必须承认；
    // 段落推进时动态名单清空，回到下一段的预设阵容。
    const registeredIds = new Set(story.characters.map((character) => character.id));
    const scenePresentPrev = Array.isArray(body.state?.scenePresent)
      ? body.state.scenePresent.filter((id): id is string => typeof id === "string" && registeredIds.has(id))
      : [];
    const mentionedIds = story.characters
      .filter((character) => !segment.present.includes(character.id) && !scenePresentPrev.includes(character.id))
      .filter((character) =>
        input.includes(character.name)
        || ([...character.name].length >= 3 && input.includes(character.name.slice(1))))
      .map((character) => character.id);
    const present = [...new Set([...segment.present, ...scenePresentPrev, ...mentionedIds])];
    const usedMaterialIds = new Set(
      body.state?.usedMaterialIds?.filter((id): id is string => typeof id === "string")
        ?? segment.materials.slice(0, materialIndex).map((material) => material.id),
    );
    const firstUnusedIndex = segment.materials.findIndex((material) => !usedMaterialIds.has(material.id));
    materialIndex = firstUnusedIndex < 0 ? segment.materials.length : firstUnusedIndex;
    const baseSceneMemory = cleanSceneMemory(body.state?.sceneMemory, segment.location);
    const explicitFreeformEnding = /离开|留下|改革|接任|接过|拒绝|带.{0,6}走|一起走|重建|解散/.test(input);
    const history = tierHistory(cleanHistory(body.history));
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
    const perception = buildPerceptionPacket(input, inputKind, present);
    const canonPacket = (body as { canonAssets?: boolean }).canonAssets === true
      ? buildCanonPacket(`${history.map((h) => h.text ?? "").join(" ").slice(-3000)} ${input}`)
      : null;
    const worldProcesses = cleanWorldProcesses(body.state?.worldProcesses, story.worldProcesses ?? []);
    const encounterCooldown = Math.max(0, finiteIndex(body.state?.encounterCooldown, 4));
    const mustEncounter = encounterCooldown === 0;
    const inventory = cleanItems(body.state?.inventory, 40);
    const npcBelongings: Record<string, LedgerItem[]> = {};
    if (body.state?.npcBelongings && typeof body.state.npcBelongings === "object") {
      for (const [key, value] of Object.entries(body.state.npcBelongings)) {
        const items = cleanItems(value, 15);
        if (items.length) npcBelongings[key] = items;
      }
    }
    const npcRelationSeeds: NpcRelation[] = (story.npcRelationSeeds ?? story.relationships
      .filter((r) => !r.roles.includes(story.playerRole.id) && r.roles.length === 2)
      .map((r) => ({ pair: [r.roles[0], r.roles[1]] as [string, string], warmth: 55, tension: 35, note: compactText(r.tension, 80) })));
    const npcRelations = cleanNpcRelations(body.state?.npcRelations, npcRelationSeeds);
    const npcStates = cleanNpcStates(body.state?.npcStates, story, present);

    // P3-A 隐藏导演：短结构化拍板；失败时优雅回落为单调用直出。
    let directorBeat: Record<string, unknown> | null = null;
    const directorStart = Date.now();
    try {
      const presentOrPlayerIds = new Set([...present, story.playerRole.id]);
      const directorPacket = {
        player_input: input,
        input_kind: inputKind,
        scene: { location: sceneMemory.location ?? segment.location, goal: segment.goal, pressure: segment.pressure },
        scene_memory: sceneMemory,
        perception,
        present_characters: story.characters
          .filter((character) => present.includes(character.id))
          .map((character) => ({
            id: character.id,
            name: character.name,
            private_goal: character.privateGoal,
            secret: character.secret,
            persona: character.persona ?? null,
            current_state: npcStates[character.id] ?? null,
          })),
        offstage_characters: story.characters
          .filter((character) => !present.includes(character.id))
          .map((character) => ({ id: character.id, name: character.name })),
        ...(story.worldAtlas ? { world_atlas: story.worldAtlas } : {}),
        relationships: story.relationships.filter((relationship) => relationship.roles.every((role) => presentOrPlayerIds.has(role))),
        storybook_candidates: storybookCandidates.map(({ id: _id, ...candidate }) => candidate),
        world_processes: worldProcesses,
        encounter_beat: { must_introduce: mustEncounter },
        player_inventory: inventory,
        npc_relations: npcRelations,
        recent_history: history.slice(-8),
      };
      const directorSystem = `你是互动仙侠故事的隐藏导演。不写玩家可见正文，不输出思维链，只为当前一拍输出一个JSON拍板。原则：先承认玩家本轮已造成的有效变化；只选真正相关的0-3名角色上场；角色行为由其private_goal、secret与关系张力决定；玩家引入新事物时定下其来源、限度与代价；world_processes只作机会性推进；encounter_beat.must_introduce为true时必须安排一个与玩家当前活动相关的带目的进场。满足优先：玩家索取的体验（读心心声/数值/面板清单）直接给足；storybook_candidates只是隐藏参考，玩家未指向主线时不选invite、不安排主线人物打断玩家当前玩法。os_assignments给0-2名本轮有内心戏价值的角色（口嫌体正直、表里反差优先），不逢人配OS。每名上场角色的visible_behavior必须依据其persona三层（surface外壳/core_want诉求/bedrock底色）与current_state（mood/stance_to_player）生成，且不得与其recent_patterns里的模式同轴——连续两轮同一种反应即为违规，换一个反应面。npc_state_updates汇报本轮互动造成的状态变化（mood可自由写，stance_to_player只能取戒备/试探/松动/亲近/裂痕且一次至多移一档，pattern用2-6字概括该角色本轮反应模式）。beat_outline把本轮编排成连续两幕共8-12个节点（stage取承接/发展/转/落，两幕各走一遍，发展与转可各有多个）：第一幕完成一个核心变化（信息更新/关系位移/局面改变）后不许收束——第一幕的"落"必须当场翻成第二幕的开门（钩子当轮兑现：异动的来源现身、门后的东西露出、真相揭开一角、新的人带着目的进场），第二幕接着实际展开并完成第二个核心变化，不许只开头；两幕的核心变化各自落在该幕中部节点；每个节点的note要具体到可拍摄的事（谁做什么、出现什么），足以支撑200-300字的正文展开；节点的执行者只能是NPC、环境或世界事件，绝不把玩家的行动、反应或决定编排成节点内容——要推进就把局面推到玩家面前，等玩家自己动。engagement拍板本轮反应形状：私密对谈、一对一深交、单人求助时mode取focus并写focus_person（只有他做主要回应，其他人至多背景小动作）；宣布大事、公开冲突、多人利益同时被触及（修罗场）时mode取ensemble（被卷入者必须互相接话互相冲突，形成NPC对NPC的连锁，不许每人各自对玩家说一句）。玩家做偷窃/暗中行动等风险动作时，你按关系、情境与戏剧性裁定成、败或被抓个半截（loot_hint写结果）。npc_interaction可指定一对NPC本轮发生不经过玩家的互动及其性质（依npc_relations当前值：warmth低互相带刺、tension高正面冲突）。只输出JSON：{"beat_type":"relationship|daily|exploration|conflict|reveal|aftermath|world_event","beat_goal":"一句话","beat_outline":[{"stage":"承接|发展|转|落","note":"该节点一句话"}],"npc_state_updates":[{"id":"","mood":"","stance_to_player":"","pattern":""}],"story_routing":"follow|echo|invite|trigger|diverge","on_stage":["角色id"],"npc_motives":[{"id":"","want":"","behavior":""}],"world_change":null,"process_moves":[{"id":"","advance":false,"note":""}],"introduce_encounter":null,"closing_direction":"本轮结尾必须落在的具体钩子（新异动/未完动作/他人反应/环境变化，能自然勾出玩家下一步，不许平收）","engagement":{"mode":"focus|ensemble","focus_person":"角色id或null"},"os_assignments":[{"id":"","tone":""}],"loot_hint":null,"npc_interaction":null}`;
      const rawBeat = await callStoryModel(directorSystem, JSON.stringify(directorPacket), 0.5, 2200);
      const parsedBeat = typeof rawBeat === "string" ? parseModelJson(rawBeat) : rawBeat;
      if (parsedBeat && typeof parsedBeat === "object") directorBeat = parsedBeat as Record<string, unknown>;
    } catch {
      directorBeat = null;
    }
    const directorMs = Date.now() - directorStart;

    const turnPrompt = promptForTurn({
      story,
      input,
      inputKind,
      history,
      segmentIndex,
      present,
      storybookCandidates,
      perception,
      turnsSinceMaterial,
      hud,
      chapterHandoff: body.state?.chapterHandoff,
      canon: canonPacket,
      worldProcesses,
      mustEncounter,
      directorBeat,
      inventory,
      npcBelongings,
      npcRelations,
      npcStates,
      sceneMemory,
    });
    // V4.4 流式：首发尝试用流式调用并逐个下发已闭合 event；
    // 解析或校验失败时回落到原有 callStoryModel 全套修复/换模机器（质量路径不变）。
    let raw: unknown = null;
    let streamRejectReason: string | null = null;
    // 流式已下发的事件条数：终版剪尾校验不许动这个范围内的内容（发出即承诺）。
    let streamSentCount = 0;
    if (onEvent) {
      try {
        let emittedCount = 0;
        const streamProcessor = onEvent ? createStreamEventProcessor(story, present, onEvent) : null;
        const writerModel = typeof (body as { writerModel?: string }).writerModel === "string"
          ? (body as { writerModel?: string }).writerModel
          : undefined;
        const streamedText = await callStoryModelStream(
          turnPrompt,
          "生成本轮仙侠互动场景，只输出JSON。本轮是衔接自然的连续两场戏：把beat_outline的每一个节点都完整演出来（谁做什么、出现什么、对白与反应），第一场戏的钩子当场兑现并展开成第二场戏，两场都要完整；正文必须写满1400至2200个中文字符，第二场戏只开头不展开即不合格。",
          0.62,
          9000,
          { requestTimeoutMs: 100000, ...(writerModel ? { primaryModel: writerModel } : {}) },
          (fullText) => {
            const closed = extractClosedEvents(fullText);
            for (; emittedCount < closed.length; emittedCount += 1) streamProcessor?.push(closed[emittedCount] as XianxiaEvent);
          },
        );
        streamProcessor?.flush();
        const parsed = parseModelJson(streamedText);
        const streamedTurn = normalizeTurn(parsed, story, present);
        if (streamedTurn) {
          raw = parsed;
          streamSentCount = streamProcessor?.emittedCount() ?? 0;
        } else {
          streamRejectReason = parsed ? "shape_invalid" : "parse_failed";
        }
      } catch (streamError) {
        raw = null;
        streamRejectReason = `stream_error:${streamError instanceof Error ? streamError.message.slice(0, 60) : "unknown"}`;
      }
    }
    if (raw === null) {
      raw = await callStoryModel(
        turnPrompt,
        "生成本轮仙侠互动场景，只输出JSON。本轮是衔接自然的连续两场戏：把beat_outline的每一个节点都完整演出来（谁做什么、出现什么、对白与反应），第一场戏的钩子当场兑现并展开成第二场戏，两场都要完整；正文必须写满1400至2200个中文字符，第二场戏只开头不展开即不合格。",
        0.62,
        9000,
        {
          stage: "prompt3",
          requestTimeoutMs: 100000,
          ...((body as { writerModel?: string }).writerModel ? { primaryModel: (body as { writerModel?: string }).writerModel } : {}),
          validate: (value) => {
            const turn = normalizeTurn(value, story, present);
            if (!turn) return { ok: false, reason: "xianxia_turn_shape_invalid" };
            return true;
          },
        },
      );
    }
    const result = normalizeTurn(raw, story, present, streamSentCount);
    if (!result) throw new Error("prompt3_shape_invalid_after_validation");
    if (baseSceneMemory.lastClosingMode === "question") {
      result.events = stripTrailingQuestionSentence(result.events, streamSentCount);
    }
    result.choices = ensureDivergentChoices(result.choices);
    const beatMoves = directorBeat && Array.isArray(directorBeat.process_moves) ? directorBeat.process_moves : null;
    const nextProcesses = advanceWorldProcesses(worldProcesses, beatMoves ?? result.sceneDelta.worldProcessMoves, result.sceneDelta.newProcess);
    const nextEncounterCooldown = mustEncounter ? 6 : Math.max(0, encounterCooldown - 1);
    const lootFromEvents = result.events.filter((event) => event.type === "loot").flatMap((event) => event.items ?? []);
    const nextInventory = mergeInventory(inventory, [...cleanItems(result.sceneDelta.itemsGained, 8), ...lootFromEvents], result.sceneDelta.itemsLost);
    const nextNpcBelongings = mergeNpcBelongings(npcBelongings, result.sceneDelta.npcBelongingsUpdates);
    const nextNpcRelations = applyNpcRelationUpdates(npcRelations, result.sceneDelta.npcRelationUpdates);
    const nextNpcStates = applyNpcStateUpdates(npcStates, directorBeat?.npc_state_updates);
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
    // 本轮实际开口的"注册但不在段落名单"角色也算已入场：下一轮继续在场（人设全量注入），
    // 段落推进时动态名单整体清空，回到新段落的预设阵容。
    const spokeOffstage = result.events
      .filter((event): event is XianxiaEvent & { person: string } =>
        event.type === "dialogue" && typeof event.person === "string"
        && registeredIds.has(event.person) && !segment.present.includes(event.person))
      .map((event) => event.person);
    const nextScenePresent = segmentCompleted
      ? []
      : [...new Set([...scenePresentPrev, ...mentionedIds, ...spokeOffstage])];
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
      inventory: nextInventory,
      npcBelongings: nextNpcBelongings,
      npcRelations: nextNpcRelations,
      npcStates: nextNpcStates,
      scenePresent: nextScenePresent,
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

    return {
      events: result.events,
      choices: result.choices,
      source: "model",
      state: nextState,
      turnHud: story.id === "steady-dao" ? makeTurnHud(nextHud, hudDelta, unlockedTitle) : undefined,
      current: { segmentId: segment.id, chapterId: segment.chapterId, location: nextSceneMemory.location ?? segment.location },
      directorMs,
      directorBeat,
      streamRejectReason,
      playerAgencyHits: countPlayerAgencyHits(result.events),
      chapterComplete,
      nextChapterId: chapterComplete ? nextSegment?.chapterId : undefined,
      mediaCues: materialCommitted && activatedCandidate && result.storyRouting === "trigger"
        ? story.mediaCues?.[activatedCandidate.id] ?? []
        : [],
    };
}
