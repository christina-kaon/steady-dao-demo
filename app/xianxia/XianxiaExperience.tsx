"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { XianxiaChoice, XianxiaEvent, XianxiaMediaCue } from "./story-packages";

// narration 轻量富文本：**粗体** 与 \n 分行（开场分镜的场景标题/道具强调排版用；不引入完整 markdown）。
function renderRichText(text: string): ReactNode[] {
  return text.split("\n").flatMap((line, lineIndex, lines) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, partIndex) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong key={`${lineIndex}-${partIndex}`}>{part.slice(2, -2)}</strong>
        : <Fragment key={`${lineIndex}-${partIndex}`}>{part}</Fragment>
    );
    return lineIndex < lines.length - 1 ? [...parts, <br key={`br-${lineIndex}`} />] : parts;
  });
}

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
  chapterBackgrounds?: Record<string, { video?: string; image?: string; poster?: string; label: string; tone?: { top: string; middle: string; bottom: string } }>;
  chapterEndPreviews?: Array<{
    chapterId: string;
    chapterNumber: number;
    title: string;
    summary: string;
    nextObjective?: string;
    content: XianxiaMediaCue[];
  }>;
  backgroundMusic?: { src: string; title: string };
};

type TranscriptItem =
  | { id: string; kind: "player"; text: string }
  | ({ id: string; kind: "event" } & XianxiaEvent)
  | { id: string; kind: "media"; cue: XianxiaMediaCue };

type RuntimeState = {
  segmentIndex: number;
  materialIndex: number;
  turnsSinceMaterial: number;
};

const initialState: RuntimeState = {
  segmentIndex: 0,
  materialIndex: 1,
  turnsSinceMaterial: 0,
};

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
  const [runtime, setRuntime] = useState<RuntimeState>(initialState);
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
  const transcriptStartRef = useRef<HTMLElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const choiceWheelStartY = useRef<number | null>(null);
  const choiceWheelSelectionRef = useRef<number | null>(null);
  const chapterSettlementTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (chapterSettlementTimerRef.current !== null) window.clearTimeout(chapterSettlementTimerRef.current);
  }, []);

  const characterById = useMemo(
    () => new Map(story.characters.map((character) => [character.id, character])),
    [story.characters],
  );
  const displayedMessages = viewingChapterId ? (chapterArchives[viewingChapterId] ?? []) : messages;
  const firstPlayerIndex = displayedMessages.findIndex((item) => item.kind === "player");
  const firstResponseEventId = firstPlayerIndex < 0
    ? undefined
    : displayedMessages.slice(firstPlayerIndex + 1).find((item) => item.kind === "event")?.id;
  const displayedChapterId = viewingChapterId ?? currentChapterId;
  const activeBackground = story.chapterBackgrounds?.[displayedChapterId];
  const currentChapterIndex = story.chapters.findIndex((chapter) => chapter.id === currentChapterId);
  const previousChapterId = currentChapterIndex > 0 ? story.chapters[currentChapterIndex - 1]?.id : undefined;

  async function startMusic() {
    const audio = musicRef.current;
    if (!audio || !story.backgroundMusic) return;
    audio.volume = 0.1;
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

  function enterStory() {
    setMessages(story.opening.events.map((event, index) => ({
      ...event,
      id: `opening-${index}`,
      kind: "event" as const,
    })));
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
          stream: true,
          state: runtime,
          history: nextMessages.filter((item) => item.kind !== "media").map((item) => ({
            kind: item.kind,
            ...(item.kind === "event" ? { type: item.type, person: item.person } : {}),
            text: item.text,
          })),
        }),
      });
      type TurnPayload = {
        error?: string;
        events?: XianxiaEvent[];
        choices?: XianxiaChoice[];
        state?: RuntimeState;
        current?: { location?: string; chapterId?: string };
        mediaCues?: XianxiaMediaCue[];
        chapterComplete?: NonNullable<PublicXianxiaStory["chapterEndPreviews"]>[number];
        nextChapterId?: string;
      };
      let payload: TurnPayload;
      const streamedIds: string[] = [];
      const streamedEvents: XianxiaEvent[] = [];
      const contentType = response.headers.get("content-type") ?? "";
      if (response.ok && response.body && contentType.includes("x-ndjson")) {
        // V4.4 流式：event 帧到达即渲染，final 帧收尾对账
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalPayload: TurnPayload | null = null;
        let streamError: string | null = null;
        const handleFrame = (frame: { type?: string; event?: XianxiaEvent; payload?: TurnPayload; error?: string }) => {
          if (frame.type === "event" && frame.event && typeof frame.event.text === "string") {
            const id = makeId("event");
            streamedIds.push(id);
            streamedEvents.push(frame.event);
            setMessages((current) => [...current, { ...frame.event!, id, kind: "event" as const }]);
            window.setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 40);
          } else if (frame.type === "final" && frame.payload) {
            finalPayload = frame.payload;
          } else if (frame.type === "error") {
            streamError = frame.error ?? "这一轮暂时没有生成成功";
          }
        };
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try { handleFrame(JSON.parse(line)); } catch { /* 半帧，等下一块 */ }
          }
        }
        if (buffer.trim()) { try { handleFrame(JSON.parse(buffer)); } catch { /* 尾部半帧丢弃 */ } }
        if (streamError) throw new Error(streamError);
        if (!finalPayload) throw new Error("这一轮暂时没有生成成功");
        payload = finalPayload;
      } else {
        payload = await response.json() as TurnPayload;
      }
      if (!response.ok || !payload.events || !payload.choices || !payload.state) {
        throw new Error(payload.error || "这一轮暂时没有生成成功");
      }
      // 对账：一致则保留；不一致时只替换首个差异点之后的尾部（避免整卷闪换）
      let firstDiff = 0;
      const finalEvents = payload.events;
      while (firstDiff < streamedEvents.length && firstDiff < finalEvents.length
        && streamedEvents[firstDiff].text === finalEvents[firstDiff]?.text
        && streamedEvents[firstDiff].type === finalEvents[firstDiff]?.type) {
        firstDiff += 1;
      }
      const fullyMatches = firstDiff === streamedEvents.length && firstDiff === finalEvents.length;
      const staleIds = streamedIds.slice(firstDiff);
      setMessages((current) => {
        const base = streamedIds.length && !fullyMatches
          ? current.filter((item) => !staleIds.includes(item.id))
          : current;
        return [
          ...base,
          ...(streamedIds.length && fullyMatches
            ? []
            : finalEvents.slice(streamedIds.length ? firstDiff : 0).map((event) => ({ ...event, id: makeId("event"), kind: "event" as const }))),
          ...(payload.mediaCues ?? []).map((cue) => ({ id: makeId("media"), kind: "media" as const, cue })),
        ];
      });
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
        }, 7000);
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
    setRuntime(initialState);
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
      <main className="xx-shell" style={{ "--xx-accent": story.accent } as React.CSSProperties}>
        {story.backgroundMusic && <audio ref={musicRef} src={story.backgroundMusic.src} loop preload="metadata" />}
        <header className="xx-topbar">
          <a href="/xianxia" aria-label="返回选择故事">←</a>
          <span>仙途故事档案</span>
          <em>卷宗 0{story.id === "immortal-sister" ? 1 : 2}</em>
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
                  <h2>山门之外，天下已经变了</h2>
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
                  <h2>今夜，轮到你决定</h2>
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
                  <h2>危险警示：剑冢提前认出了你</h2>
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
              <button key={character.id} onClick={() => setActiveCharacter(character)}>
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
    <main className="xx-shell xx-play" style={{ "--xx-accent": story.accent } as React.CSSProperties}>
      {story.backgroundMusic && <audio ref={musicRef} src={story.backgroundMusic.src} loop preload="metadata" />}
      <header className="xx-playbar">
        <button onClick={restart}>从头开始</button>
        {story.id === "immortal-sister" ? (
          <nav className="xx-playbar-cast" aria-label="主要角色">
            {story.characters.filter((character) => character.featured !== false).map((character) => (
              <button key={character.id} onClick={() => setActiveCharacter(character)} aria-label={`查看${character.name}`}>
                <CharacterPortrait character={character} />
              </button>
            ))}
          </nav>
        ) : (
          <div><small>{story.subtitle}</small><strong>{story.title}</strong></div>
        )}
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

      {story.id === "immortal-sister" && activeBackground && (activeBackground.video || activeBackground.image) && (
        <section className="xx-scene-media" aria-label={activeBackground.label}>
          {activeBackground.video ? (
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
          ) : (
            <img key={activeBackground.image} src={activeBackground.image} alt={activeBackground.label} />
          )}
        </section>
      )}

      {story.id !== "immortal-sister" && (
        <nav className="xx-cast-strip" aria-label="在场人物">
          {story.characters.map((character) => (
            <button key={character.id} onClick={() => setActiveCharacter(character)}>
              <CharacterPortrait character={character} />
              <span>{character.name}</span>
            </button>
          ))}
        </nav>
      )}

      <section className="xx-transcript" ref={transcriptStartRef}>
        {displayedMessages.map((item) => {
          if (item.kind === "media") {
            return <MediaCueCard cue={item.cue} key={item.id} />;
          }
          if (item.kind === "player") {
            return <div className="xx-player-message" key={item.id}><small>你</small><p>{item.text}</p></div>;
          }
          const showFirstResponseIllustration = story.id === "immortal-sister"
            && displayedChapterId === "ch01"
            && item.id === firstResponseEventId;
          let eventContent;
          if (item.type === "system") {
            eventContent = <div className="xx-system-event">{item.text}</div>;
          } else if (item.type === "loot") {
            eventContent = (
              <div className="xx-loot-event">
                <p>{item.text}</p>
                {item.items && item.items.length > 0 && (
                  <ul>
                    {item.items.map((loot, lootIndex) => (
                      <li key={lootIndex}><strong>{loot.name}</strong> ×{loot.qty}{loot.note ? <span> —— {loot.note}</span> : null}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          } else if (item.type === "os" && item.person) {
            const osCharacter = characterById.get(item.person);
            eventContent = (
              <article className="xx-npc-event xx-dialogue">
                <button onClick={() => osCharacter && setActiveCharacter(osCharacter)}>{osCharacter ? <CharacterPortrait character={osCharacter} /> : "·"}</button>
                <div>
                  <header>{osCharacter?.name ?? "现场"}</header>
                  <p className="xx-os-inline">（os：{item.text}）</p>
                </div>
              </article>
            );
          } else if (item.type !== "dialogue" || !item.person) {
            eventContent = <p className="xx-narration">{renderRichText(item.text)}</p>;
          } else {
            const character = characterById.get(item.person);
            eventContent = (
              <article className={`xx-npc-event xx-${item.type}`}>
                <button onClick={() => character && setActiveCharacter(character)}>{character ? <CharacterPortrait character={character} /> : <i>{item.person.slice(0, 1)}</i>}</button>
                <div>
                  <header>{character?.name ?? item.person}</header>
                  <p>{item.text}</p>
                </div>
              </article>
            );
          }
          return (
            <Fragment key={item.id}>
              {eventContent}
              {showFirstResponseIllustration && (
                <figure className="xx-story-illustration">
                  <img src="/xianxia/immortal-sister/story/ch01-first-response-courtyard-v1.png" alt="白日院落里，闻照雪与桑迟俯身看向授剑录，裴行舟立在庭外" />
                  <figcaption>白庭日光 · 授剑录前</figcaption>
                </figure>
              )}
            </Fragment>
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
                    text: nextChapter?.entry ?? `第${nextChapterNumber}章 · ${nextChapter?.title ?? "新的旅程"}。${nextChapter?.summary ?? "眼前的局面已经改变。"}`,
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

function MediaCueCard({ cue }: { cue: XianxiaMediaCue }) {
  if (cue.kind === "image") {
    return (
      <figure className="xx-story-illustration xx-triggered-media">
        <img src={cue.src} alt={cue.alt} />
        <figcaption>{cue.caption}</figcaption>
      </figure>
    );
  }
  if (cue.kind === "video") {
    return (
      <figure className="xx-story-illustration xx-triggered-media">
        <video src={cue.src} poster={cue.poster} autoPlay muted loop playsInline controls aria-label={cue.alt} />
        <figcaption>{cue.caption}</figcaption>
      </figure>
    );
  }
  return (
    <aside className="xx-hud-card" aria-label={cue.title}>
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
