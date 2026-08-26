"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { XianxiaChoice, XianxiaEvent, XianxiaMediaCue } from "./story-packages";

type PublicCharacter = {
  id: string;
  name: string;
  role: string;
  shortBio: string;
  portrait?: string;
  featured?: boolean;
};

export type PublicXianxiaStory = {
  id: string;
  title: string;
  subtitle: string;
  logline: string;
  accent: string;
  playerRole: {
    name: string;
    displayRole: string;
    fixedCore: string;
    freeAgency: string;
  };
  introduction: {
    time: string;
    place: string;
    world: string;
    situation: string;
    objective: string;
  };
  threeAct: string[];
  chapters: Array<{
    id: string;
    title: string;
    summary: string;
    entry?: string;
    entryChoices?: XianxiaChoice[];
  }>;
  characters: PublicCharacter[];
  opening: {
    events: XianxiaEvent[];
    choices: XianxiaChoice[];
  };
  initialHud?: XianxiaMediaCue;
  chapterBackgrounds?: Record<string, {
    video?: string;
    image?: string;
    poster?: string;
    label: string;
    tone?: { top: string; middle: string; bottom: string };
  }>;
  chapterEndPreviews?: Array<{
    chapterId: string;
    chapterNumber: number;
    title: string;
    summary: string;
    nextObjective?: string;
    content: XianxiaMediaCue[];
  }>;
  backgroundMusic?: {
    src: string;
    title: string;
    queue?: Array<{ src: string; title: string }>;
  };
};

type TranscriptItem =
  | { id: string; kind: "player"; text: string }
  | ({ id: string; kind: "event" } & XianxiaEvent)
  | { id: string; kind: "media"; cue: XianxiaMediaCue };

type RuntimeState = {
  segmentIndex: number;
  materialIndex: number;
  turnsSinceMaterial: number;
  usedMaterialIds?: string[];
  hud: {
    steadiness: number;
    cultivation: number;
    lanAffection: number;
    jiujiuAffection: number;
  };
  chapterHandoff?: {
    fromChapterId: string;
    playerAction: string;
    outcome: string;
  };
  sceneMemory?: {
    time?: string;
    location?: string;
    facts: string[];
    unresolvedThreads: string[];
    relationshipNotes: string[];
    lastClosingMode: "question" | "action" | "discovery" | "relationship" | "transition" | "other";
  };
};

function makeInitialState(storyId: string): RuntimeState {
  return {
    segmentIndex: 0,
    materialIndex: 1,
    turnsSinceMaterial: 0,
    usedMaterialIds: [storyId === "immortal-sister" ? "immortal_ch01_s01_m01" : "steady_ch01_s01_m01"],
    hud: { steadiness: 12, cultivation: 8, lanAffection: 6, jiujiuAffection: 5 },
  };
}

const CHAPTER_SETTLEMENT_REVEAL_DELAY_MS = 10_000;

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function CharacterPortrait({ character }: { character: PublicCharacter }) {
  if (character.portrait) return <img src={character.portrait} alt={character.name} />;
  return <i>{character.name.slice(0, 1)}</i>;
}

export default function XianxiaExperience({ story }: { story: PublicXianxiaStory }) {
  const [entered, setEntered] = useState(false);
  const [dossierPage, setDossierPage] = useState(0);
  const [messages, setMessages] = useState<TranscriptItem[]>([]);
  const [chapterArchives, setChapterArchives] = useState<Record<string, TranscriptItem[]>>({});
  const [viewingChapterId, setViewingChapterId] = useState<string | null>(null);
  const [choices, setChoices] = useState<XianxiaChoice[]>(story.opening.choices);
  const [runtime, setRuntime] = useState<RuntimeState>(() => makeInitialState(story.id));
  const [currentChapterId, setCurrentChapterId] = useState("ch01");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [activeCharacter, setActiveCharacter] = useState<PublicCharacter | null>(null);
  const [choiceWheelOpen, setChoiceWheelOpen] = useState(false);
  const [choiceWheelSelection, setChoiceWheelSelection] = useState<number | null>(null);
  const [chapterSettlement, setChapterSettlement] = useState<NonNullable<PublicXianxiaStory["chapterEndPreviews"]>[number] | null>(null);
  const [settlementNextChapterId, setSettlementNextChapterId] = useState<string | null>(null);
  const [settlementQueued, setSettlementQueued] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicTrackIndex, setMusicTrackIndex] = useState(0);
  const transcriptStartRef = useRef<HTMLElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const choiceWheelStartY = useRef<number | null>(null);
  const choiceWheelSelectionRef = useRef<number | null>(null);
  const chapterSettlementTimerRef = useRef<number | null>(null);
  const musicTracks = useMemo(
    () => story.backgroundMusic
      ? [{ src: story.backgroundMusic.src, title: story.backgroundMusic.title }, ...(story.backgroundMusic.queue ?? [])]
      : [],
    [story.backgroundMusic],
  );
  const activeMusicTrack = musicTracks[musicTrackIndex] ?? musicTracks[0];

  useEffect(() => () => {
    if (chapterSettlementTimerRef.current !== null) window.clearTimeout(chapterSettlementTimerRef.current);
  }, []);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio || !musicPlaying) return;
    audio.volume = 0.2;
    const timer = window.setTimeout(() => {
      void audio.play().catch(() => setMusicPlaying(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [entered, musicPlaying, musicTrackIndex]);

  const characterById = useMemo(
    () => new Map(story.characters.map((character) => [character.id, character])),
    [story.characters],
  );
  const displayedMessages = viewingChapterId ? (chapterArchives[viewingChapterId] ?? []) : messages;
  const displayedChapterId = viewingChapterId ?? currentChapterId;
  const activeBackground = story.chapterBackgrounds?.[displayedChapterId];
  const currentChapterIndex = story.chapters.findIndex((chapter) => chapter.id === currentChapterId);
  const previousChapterId = currentChapterIndex > 0 ? story.chapters[currentChapterIndex - 1]?.id : undefined;

  async function startMusic() {
    const audio = musicRef.current;
    if (!audio || !activeMusicTrack) return;
    audio.volume = 0.2;
    try {
      await audio.play();
      setMusicPlaying(true);
    } catch {
      setMusicPlaying(false);
    }
  }

  function toggleMusic() {
    const audio = musicRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      void startMusic();
    }
  }

  function advanceMusicQueue() {
    if (musicTracks.length < 2) return;
    setMusicTrackIndex((index) => (index + 1) % musicTracks.length);
  }

  function enterStory() {
    setMessages([
      ...story.opening.events.map((event, index) => ({
        ...event,
        id: `opening-${index}`,
        kind: "event" as const,
      })),
      ...(story.initialHud ? [{ id: "opening-hud", kind: "media" as const, cue: story.initialHud }] : []),
    ]);
    setEntered(true);
    window.setTimeout(() => void startMusic(), 0);
    window.setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 120);
  }

  async function send(text: string, inputKind: "speech" | "action" | "freeform", fromChoice = false) {
    const input = text.trim();
    if (!input || pending || settlementQueued) return;

    const playerItem: TranscriptItem = { id: makeId("player"), kind: "player", text: input };
    const nextMessages = [...messages, playerItem];
    setMessages(nextMessages);
    setChoices([]);
    setChoiceWheelOpen(false);
    setChoiceWheelSelection(null);
    choiceWheelSelectionRef.current = null;
    choiceWheelStartY.current = null;
    setDraft("");
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/xianxia/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storyId: story.id,
          input,
          inputKind,
          fromChoice,
          state: runtime,
          history: nextMessages.filter((item) => item.kind !== "media").map((item) => ({
            kind: item.kind,
            ...(item.kind === "event" ? { type: item.type, person: item.person } : {}),
            text: item.text,
          })),
        }),
      });
      const payload = await response.json() as {
        error?: string;
        events?: XianxiaEvent[];
        choices?: XianxiaChoice[];
        state?: RuntimeState;
        current?: { location?: string; chapterId?: string };
        mediaCues?: XianxiaMediaCue[];
        turnHud?: XianxiaMediaCue;
        chapterComplete?: NonNullable<PublicXianxiaStory["chapterEndPreviews"]>[number];
        nextChapterId?: string;
      };
      if (!response.ok || !payload.events || !payload.choices || !payload.state) {
        throw new Error(payload.error || "这一轮暂时没有生成成功");
      }
      setMessages((current) => [
        ...current,
        ...payload.events!.map((event) => ({ ...event, id: makeId("event"), kind: "event" as const })),
        ...(payload.mediaCues ?? []).map((cue) => ({ id: makeId("media"), kind: "media" as const, cue })),
        ...(payload.turnHud ? [{ id: makeId("turn-hud"), kind: "media" as const, cue: payload.turnHud }] : []),
      ]);
      setChoices(payload.choices);
      setRuntime(payload.state);
      if (payload.current?.chapterId) setCurrentChapterId(payload.current.chapterId);
      if (payload.chapterComplete) {
        setChoices([]);
        setSettlementQueued(true);
        const completedChapter = payload.chapterComplete;
        const nextChapterId = payload.nextChapterId ?? null;
        if (chapterSettlementTimerRef.current !== null) window.clearTimeout(chapterSettlementTimerRef.current);
        chapterSettlementTimerRef.current = window.setTimeout(() => {
          setChapterSettlement(completedChapter);
          setSettlementNextChapterId(nextChapterId);
          setSettlementQueued(false);
          chapterSettlementTimerRef.current = null;
        }, CHAPTER_SETTLEMENT_REVEAL_DELAY_MS);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "这一轮暂时没有生成成功");
      setChoices(choices.length ? choices : story.opening.choices);
    } finally {
      setPending(false);
      window.setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }

  function restart() {
    if (chapterSettlementTimerRef.current !== null) window.clearTimeout(chapterSettlementTimerRef.current);
    chapterSettlementTimerRef.current = null;
    setEntered(false);
    setDossierPage(0);
    setMessages([]);
    setChapterArchives({});
    setViewingChapterId(null);
    setChoices(story.opening.choices);
    setRuntime(makeInitialState(story.id));
    setCurrentChapterId("ch01");
    setChapterSettlement(null);
    setSettlementNextChapterId(null);
    setSettlementQueued(false);
    setDraft("");
    setError("");
    setChoiceWheelOpen(false);
    setChoiceWheelSelection(null);
    choiceWheelSelectionRef.current = null;
    choiceWheelStartY.current = null;
  }

  function updateWheelSelection(index: number | null) {
    choiceWheelSelectionRef.current = index;
    setChoiceWheelSelection(index);
  }

  function beginWheelDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (pending || !choices.length) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    choiceWheelStartY.current = event.clientY;
    updateWheelSelection(null);
  }

  function moveWheelDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (choiceWheelStartY.current === null) return;
    const distance = event.clientY - choiceWheelStartY.current;
    updateWheelSelection(distance < -16 ? 0 : distance > 16 ? Math.min(1, choices.length - 1) : null);
  }

  function endWheelDrag() {
    if (choiceWheelStartY.current === null) return;
    choiceWheelStartY.current = null;
    const selected = choiceWheelSelectionRef.current;
    if (selected !== null && choices[selected]) {
      setChoiceWheelOpen(false);
      updateWheelSelection(null);
      const choice = choices[selected];
      void send(choice.text, choice.kind, true);
      return;
    }
    setChoiceWheelOpen((open) => !open);
  }

  function cancelWheelDrag() {
    choiceWheelStartY.current = null;
    updateWheelSelection(null);
  }

  if (!entered) {
    return (
      <main className={`xx-shell xx-story-${story.id}`} style={{ "--xx-accent": story.accent } as React.CSSProperties}>
        {activeMusicTrack && (
          <audio
            ref={musicRef}
            src={activeMusicTrack.src}
            loop={musicTracks.length === 1}
            onEnded={advanceMusicQueue}
            preload="metadata"
          />
        )}
        <header className="xx-topbar">
          <a href="/xianxia" aria-label="返回选择故事">←</a>
          <span>仙途故事档案</span>
          <em>卷宗 01</em>
        </header>

        <section className="xx-dossier-stage">
          <div className="xx-dossier-meta">
            <span>{story.introduction.time}</span>
            <i />
            <b>{story.introduction.place}</b>
          </div>

          <article className="xx-archive" aria-label={`${story.title}时代背景档案`}>
            <header className="xx-archive-masthead">
              <small>ARCHIVE OF CULTIVATION · INTERNAL</small>
              <h1>{story.title}</h1>
              <span>{story.subtitle}</span>
            </header>

            <div className="xx-archive-body">
              {dossierPage === 0 && (
                <div className="xx-archive-page">
                  <p className="xx-archive-kicker">卷一 · 时代背景</p>
                  <h2>{story.id === "steady-dao" ? "封神未落子，因果已先动" : "山门之外，天下已经变了"}</h2>
                  <dl className="xx-archive-facts">
                    <div><dt>时间范围</dt><dd>{story.introduction.time}</dd></div>
                    <div><dt>故事地点</dt><dd>{story.introduction.place}</dd></div>
                    <div><dt>社会环境评估</dt><dd>{story.introduction.world}</dd></div>
                  </dl>
                </div>
              )}

              {dossierPage === 1 && (
                <div className="xx-archive-page">
                  <p className="xx-archive-kicker">卷二 · 当前处境</p>
                  <h2>{story.id === "steady-dao" ? "小琼峰今日原本无事" : "今夜，轮到你决定"}</h2>
                  <p className="xx-archive-lead">{story.introduction.situation}</p>
                  <div className="xx-objective-card">
                    <span>当前场景目标</span>
                    <strong>{story.introduction.objective}</strong>
                  </div>
                  <p className="xx-agency"><b>你的选择空间</b>{story.playerRole.freeAgency}</p>
                </div>
              )}

              {dossierPage === 2 && (
                <div className="xx-archive-page">
                  <p className="xx-archive-kicker">卷三 · 故事入口</p>
                  <h2>{story.id === "steady-dao" ? "危险警示：西崖迷阵有人进入" : "危险警示：剑冢提前认出了你"}</h2>
                  <p className="xx-archive-lead">{story.logline}</p>
                  <div className="xx-role-card">
                    <span>本次由你扮演</span>
                    <strong>{story.playerRole.name}</strong>
                    <small>{story.playerRole.displayRole}</small>
                    <p>{story.playerRole.fixedCore}</p>
                  </div>
                </div>
              )}
            </div>

            <footer className="xx-archive-footer">
              <button type="button" aria-label="上一页档案" onClick={() => setDossierPage((page) => Math.max(0, page - 1))} disabled={dossierPage === 0}>←</button>
              <span>PAGE {dossierPage + 1} / 3</span>
              <button type="button" aria-label="下一页档案" onClick={() => setDossierPage((page) => Math.min(2, page + 1))} disabled={dossierPage === 2}>→</button>
            </footer>
          </article>

          {dossierPage === 2 && (
            <button className="xx-enter" onClick={enterStory}>
              <span><small>CHAPTER 01</small>进入第一章</span><b>→</b>
            </button>
          )}
        </section>

        <section className="xx-cast-preview">
          <header><span>本故事主要角色</span><small>点击查看人物档案</small></header>
          <div>
            {story.characters.filter((character) => character.featured !== false).map((character) => (
              <button key={character.id} onClick={() => setActiveCharacter((current) => current?.id === character.id ? null : character)}>
                <CharacterPortrait character={character} />
                <b>{character.name}</b>
                <small>{character.role}</small>
              </button>
            ))}
          </div>
        </section>

        {activeCharacter && (
          <CharacterSheet character={activeCharacter} onClose={() => setActiveCharacter(null)} />
        )}
      </main>
    );
  }

  return (
    <main
      className={`xx-shell xx-play xx-story-${story.id}`}
      style={{
        "--xx-accent": story.accent,
        "--xx-scene-top": activeBackground?.tone?.top ?? "#eef7ff",
        "--xx-scene-middle": activeBackground?.tone?.middle ?? "#d9dff0",
        "--xx-scene-bottom": activeBackground?.tone?.bottom ?? "#9daac7",
      } as React.CSSProperties}
    >
      {activeMusicTrack && (
        <audio
          ref={musicRef}
          src={activeMusicTrack.src}
          loop={musicTracks.length === 1}
          onEnded={advanceMusicQueue}
          preload="metadata"
        />
      )}
      <header className="xx-playbar">
        <button onClick={restart}>从头开始</button>
        <nav className="xx-playbar-cast" aria-label="主要角色">
          {story.characters.filter((character) => character.featured !== false).map((character) => (
            <button
              key={character.id}
              onClick={() => setActiveCharacter((current) => current?.id === character.id ? null : character)}
              aria-label={`查看${character.name}`}
              aria-pressed={activeCharacter?.id === character.id}
            >
              <CharacterPortrait character={character} />
            </button>
          ))}
        </nav>
        <div className="xx-playbar-actions">
          {story.backgroundMusic && (
            <button type="button" onClick={toggleMusic} aria-pressed={musicPlaying}>
              {musicPlaying ? "静音" : "音乐"}
            </button>
          )}
          <button
            type="button"
            disabled={!viewingChapterId && !previousChapterId}
            onClick={() => {
              setViewingChapterId((current) => current ? null : (previousChapterId ?? null));
              window.setTimeout(() => transcriptStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            }}
          >
            {viewingChapterId ? "返回本章" : "上一章"}
          </button>
        </div>
      </header>

      {activeBackground && (
        <section className="xx-scene-media" aria-label={activeBackground.label}>
          {activeBackground.image ? (
            <img key={activeBackground.image} src={activeBackground.image} alt={activeBackground.label} />
          ) : activeBackground.video ? (
            <video
              key={activeBackground.video}
              src={activeBackground.video}
              poster={activeBackground.poster}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
            />
          ) : null}
        </section>
      )}

      <section className="xx-transcript" ref={transcriptStartRef}>
        {displayedMessages.map((item) => {
          if (item.kind === "media") {
            return <MediaCueCard cue={item.cue} key={item.id} />;
          }
          if (item.kind === "player") {
            return <div className="xx-player-message" key={item.id}><small>你</small><p>{item.text}</p></div>;
          }
          if (item.type !== "dialogue" || !item.person) {
            return <p className="xx-narration" key={item.id}>{item.text}</p>;
          }
          const character = characterById.get(item.person);
          return (
            <article className={`xx-npc-event xx-${item.type}`} key={item.id}>
              <button onClick={() => character && setActiveCharacter((current) => current?.id === character.id ? null : character)}>{character ? <CharacterPortrait character={character} /> : "·"}</button>
              <div>
                {character && <header>{character.name}</header>}
                <p>{item.text}</p>
              </div>
            </article>
          );
        })}
        {pending && <p className="xx-pending">山风里，有人正在组织下一句话……</p>}
        {settlementQueued && <p className="xx-chapter-closing">檐铃渐止，这一章正在落款……</p>}
        <div ref={transcriptEndRef} />
      </section>

      {error && <div className="xx-error"><span>{error}</span><button onClick={() => setError("")}>知道了</button></div>}

      {chapterSettlement && (
        <div className="xx-chapter-complete-overlay" role="presentation">
          <article className="xx-preview-settlement" role="dialog" aria-modal="true" aria-label={`第${chapterSettlement.chapterNumber}章完成`}>
            <header>
              <small>CHAPTER {String(chapterSettlement.chapterNumber).padStart(2, "0")} COMPLETE</small>
              <span>第{chapterSettlement.chapterNumber}章 · 完成</span>
              <h1>{chapterSettlement.title}</h1>
              <p>{chapterSettlement.summary}</p>
              {chapterSettlement.nextObjective && (
                <div className="xx-preview-next-objective">
                  <small>下一章目标</small>
                  <strong>{chapterSettlement.nextObjective}</strong>
                </div>
              )}
            </header>
            <section className="xx-preview-content">
              {chapterSettlement.content.map((cue) => <MediaCueCard cue={cue} key={cue.id} />)}
            </section>
            <footer className="xx-preview-actions xx-live-settlement-action">
              <button
                type="button"
                onClick={() => {
                  if (!settlementNextChapterId) {
                    restart();
                    return;
                  }
                  const nextChapter = story.chapters.find((chapter) => chapter.id === settlementNextChapterId);
                  const nextChapterNumber = story.chapters.findIndex((chapter) => chapter.id === settlementNextChapterId) + 1;
                  setChapterArchives((current) => ({ ...current, [currentChapterId]: messages }));
                  setViewingChapterId(null);
                  setCurrentChapterId(settlementNextChapterId);
                  setMessages([{
                    id: makeId("chapter-entry"),
                    kind: "event",
                    type: "narration",
                    text: nextChapter?.entry ?? `第${nextChapterNumber}章 · ${nextChapter?.title ?? "新的旅程"}。`,
                  }]);
                  setChoices(nextChapter?.entryChoices ?? [
                    { kind: "action", text: "先观察眼前的新情况" },
                    { kind: "speech", text: "先问清接下来要做什么" },
                  ]);
                  setDraft("");
                  setError("");
                  setChoiceWheelOpen(false);
                  setChoiceWheelSelection(null);
                  setChapterSettlement(null);
                  setSettlementNextChapterId(null);
                  window.setTimeout(() => transcriptStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
                }}
              >
                {settlementNextChapterId ? `进入第${chapterSettlement.chapterNumber + 1}章 →` : "从头再来"}
              </button>
            </footer>
          </article>
        </div>
      )}

      <section className="xx-interaction-dock" hidden={Boolean(viewingChapterId)}>
        <form className="xx-composer" onSubmit={(event) => { event.preventDefault(); void send(draft, "freeform"); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="或者直接说你想做什么……" disabled={pending || settlementQueued || Boolean(chapterSettlement)} />
          <button type="submit" disabled={pending || settlementQueued || Boolean(chapterSettlement) || !draft.trim()} aria-label="发送">↑</button>
        </form>

        {!pending && !settlementQueued && !chapterSettlement && choices.length > 0 && (
          <div className={`xx-choice-wheel-shell ${choiceWheelOpen ? "is-open" : ""} ${choiceWheelSelection !== null ? `is-selecting-${choiceWheelSelection}` : ""}`}>
            <div className="xx-choice-wheel-popover" id="xianxia-choice-wheel" aria-hidden={!choiceWheelOpen && choiceWheelSelection === null}>
              <small>你准备怎么做？</small>
              {choices.map((choice, index) => (
                <button
                  type="button"
                  className={choiceWheelSelection === index ? "is-selected" : ""}
                  key={`${choice.text}-${index}`}
                  onClick={() => void send(choice.text, choice.kind, true)}
                >
                  <span>{choice.text}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="xx-choice-wheel"
              aria-label="剧情转盘：点击展开，上下拖动并松手直接发送"
              aria-expanded={choiceWheelOpen}
              aria-controls="xianxia-choice-wheel"
              onPointerDown={beginWheelDrag}
              onPointerMove={moveWheelDrag}
              onPointerUp={endWheelDrag}
              onPointerCancel={cancelWheelDrag}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setChoiceWheelOpen((open) => !open);
                }
              }}
            >
              <span aria-hidden="true">Ⅰ</span><b>选择</b><span aria-hidden="true">Ⅱ</span>
            </button>
          </div>
        )}
      </section>

      {activeCharacter && (
        <CharacterSheet character={activeCharacter} onClose={() => setActiveCharacter(null)} />
      )}
    </main>
  );
}

export function XianxiaMaterialPreview({ story }: { story: PublicXianxiaStory }) {
  const firstBackground = story.chapterBackgrounds?.[story.chapters[0]?.id ?? "ch01"];

  return (
    <main className={`xx-material-preview xx-story-${story.id}`} style={{ "--xx-accent": story.accent } as React.CSSProperties}>
      <header className="xx-material-preview-bar">
        <a href="/xianxia?story=steady-dao">← 返回故事</a>
        <div><small>QUICK MATERIAL VIEW</small><strong>素材快览</strong></div>
        <span>5 章</span>
      </header>

      <section className="xx-material-paper-demo">
        {firstBackground?.video && (
          <video
            src={firstBackground.video}
            poster={firstBackground.poster}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        )}
        <article>
          <small>聊天纸张 · 粉白宣纸</small>
          <h1>小琼峰的风，先把花香送进了院子。</h1>
          <p>外层保留淡蓝与薄粉的晨雾色，正文落在更暖、更亮的粉白纸面上。纸张和背景靠柔光与阴影分层，不再用竖线或硬边拼接。</p>
          {story.initialHud && <MediaCueCard cue={story.initialHud} />}
        </article>
      </section>

      <section className="xx-material-chapters" aria-label="五章素材预览">
        {story.chapters.map((chapter, index) => {
          const background = story.chapterBackgrounds?.[chapter.id];
          const ending = story.chapterEndPreviews?.find((item) => item.chapterId === chapter.id);
          return (
            <article className="xx-material-chapter" key={chapter.id}>
              <header>
                <small>CHAPTER {String(index + 1).padStart(2, "0")}</small>
                <h2>{chapter.title}</h2>
                <p>{chapter.summary}</p>
              </header>
              {background?.video ? (
                <figure className="xx-material-motion">
                  <video src={background.video} poster={background.poster} autoPlay loop muted playsInline preload="metadata" />
                  <figcaption>动态背景 · {background.label}</figcaption>
                </figure>
              ) : background?.image ? (
                <figure className="xx-material-motion">
                  <img src={background.image} alt={background.label} />
                  <figcaption>章节背景 · {background.label}</figcaption>
                </figure>
              ) : null}
              {ending && (
                <article className="xx-preview-settlement xx-material-settlement" aria-label={`第${ending.chapterNumber}章完成预览`}>
                  <header>
                    <small>CHAPTER {String(ending.chapterNumber).padStart(2, "0")} COMPLETE</small>
                    <span>第{ending.chapterNumber}章 · 完成</span>
                    <h1>{ending.title}</h1>
                    <p>{ending.summary}</p>
                    {ending.nextObjective && (
                      <div className="xx-preview-next-objective">
                        <small>下一章目标</small>
                        <strong>{ending.nextObjective}</strong>
                      </div>
                    )}
                  </header>
                  <section className="xx-preview-content">
                    {ending.content.map((cue) => <MediaCueCard cue={cue} key={cue.id} />)}
                  </section>
                  <footer className="xx-preview-actions">
                    <button type="button" disabled>继续进入下一章 →</button>
                  </footer>
                </article>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}

function MediaCueCard({ cue }: { cue: XianxiaMediaCue }) {
  if (cue.kind === "image") {
    return (
      <figure className="xx-story-illustration xx-triggered-media">
        <img src={cue.src} alt={cue.alt} />
        <figcaption>{cue.caption}</figcaption>
      </figure>
    );
  }
  return (
    <aside className={`xx-hud-card${cue.compact ? " xx-turn-hud" : ""}`} aria-label={cue.title}>
      <small>{cue.eyebrow}</small>
      <h3>{cue.title}</h3>
      <dl>
        {cue.rows.map((row) => (
          <div className={row.tone === "warning" ? "is-warning" : ""} key={row.label}>
            <dt>{row.label}</dt><dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {cue.note && <p>{cue.note}</p>}
    </aside>
  );
}

function CharacterSheet({ character, onClose }: { character: PublicCharacter; onClose: () => void }) {
  return (
    <div className="xx-modal" role="presentation" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={`${character.name}角色卡`} onClick={(event) => event.stopPropagation()}>
        <button className="xx-modal-close" onClick={onClose} aria-label="关闭">×</button>
        <div className="xx-modal-portrait"><CharacterPortrait character={character} /></div>
        <small>{character.role}</small>
        <h2>{character.name}</h2>
        <p>{character.shortBio}</p>
      </section>
    </div>
  );
}
