import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { hasSupabase, loadPersistedJournal, loadPersistedQuotes, savePersistedJournal, savePersistedQuote } from "./lib/supabase";
import {
  BarChartIcon,
  CalendarIcon,
  CheckCircledIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross2Icon,
  GearIcon,
  HomeIcon,
  DesktopIcon,
  DotsHorizontalIcon,
  MagnifyingGlassIcon,
  Pencil2Icon,
  PlusIcon,
  ReaderIcon,
  MoonIcon,
  SunIcon,
} from "@radix-ui/react-icons";

type Tab = "today" | "calendar" | "journal" | "reflections" | "track" | "settings";
type Mood = "great" | "good" | "meh" | "low" | "sad";

const moodMeta: Record<Mood, { label: string; face: string; tone: string }> = {
  great: { label: "Great", face: "◡", tone: "gold" },
  good: { label: "Good", face: "⌣", tone: "mint" },
  meh: { label: "Meh", face: "—", tone: "lilac" },
  low: { label: "Low", face: "︵", tone: "blue" },
  sad: { label: "Sad", face: "︵", tone: "coral" },
};

const initialEntries: Record<number, Mood> = {
  1: "good", 3: "meh", 5: "great", 7: "sad", 9: "good", 12: "meh", 13: "good", 18: "great", 21: "sad", 24: "good",
};

const navItems: { id: Tab; label: string; icon: typeof HomeIcon }[] = [
  { id: "today", label: "Today", icon: HomeIcon },
  { id: "calendar", label: "Focus", icon: SunIcon },
  { id: "track", label: "Plan", icon: BarChartIcon },
  { id: "journal", label: "Journal", icon: ReaderIcon },
  { id: "reflections", label: "Progress", icon: CheckCircledIcon },
];

const defaultDraft = "Today felt quieter than usual. I gave myself room to pause, and that helped me notice what I actually needed.";

export default function Prototype() {
  const [tab, setTab] = useState<Tab>("today");
  const [mood, setMood] = useState<Mood>("good");
  const [entries, setEntries] = useState(initialEntries);
  const [calendarMode, setCalendarMode] = useState<"activity" | "mood">("mood");
  const [editing, setEditing] = useState(false);
  const [detail, setDetail] = useState(false);
  const [draft, setDraft] = useState(defaultDraft);
  const [saved, setSaved] = useState(false);
  const keyboard = { hide: () => undefined };

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const savedJournal = await loadPersistedJournal();
      if (!isMounted || !savedJournal) return;

      if (savedJournal.mood in moodMeta) {
        setMood(savedJournal.mood as Mood);
      }
      if (savedJournal.draft) {
        setDraft(savedJournal.draft);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const navigate = (next: Tab) => {
    keyboard.hide();
    setEditing(false);
    setDetail(false);
    setSaved(false);
    setTab(next);
  };

  const openEditor = () => {
    setDetail(false);
    setEditing(true);
  };

  const saveEntry = async () => {
    keyboard.hide();
    setEntries((current) => ({ ...current, 13: mood }));
    await savePersistedJournal({ mood, draft });
    setEditing(false);
    setSaved(true);
    setTab("calendar");
    window.setTimeout(() => setSaved(false), 2600);
  };

  return (
    <div className="constellation-app">
      <div className="app-screen constellation-scroll web-scroll">
        <main className="screen-content" aria-live="polite">
          {editing ? (
            <Editor mood={mood} draft={draft} setDraft={setDraft} onClose={() => { keyboard.hide(); setEditing(false); }} onSave={saveEntry} />
          ) : detail ? (
            <EntryDetail mood={mood} draft={draft} onClose={() => setDetail(false)} onEdit={openEditor} />
          ) : tab === "calendar" ? (
            <FocusAreasScreen />
          ) : tab === "today" ? (
            <TodayScreen mood={mood} setMood={setMood} onWrite={openEditor} onPlan={() => setTab("track")} />
          ) : tab === "journal" ? (
            <JournalScreen mood={mood} draft={draft} onOpen={() => setDetail(true)} />
          ) : tab === "reflections" ? (
            <ReflectionsScreen entries={entries} mode={calendarMode} setMode={setCalendarMode} mood={mood} onView={() => setDetail(true)} />
          ) : tab === "track" ? (
            <TrackScreen onSettings={() => setTab("settings")} />
          ) : (
            <SettingsScreen />
          )}
        </main>
      </div>

      {!editing && !detail && (
        <nav className="bottom-nav" aria-label="Main navigation">
          <div className="nav-brand"><strong>RISE</strong><span>Train like I’ve never won.<br />Compete like I’ve never lost.</span></div>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => navigate(id)} aria-label={label}>
              <Icon width="22" height="22" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}
      {saved && <div className="toast">Your thoughts are safely saved.</div>}
    </div>
  );
}

function HeaderArt({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`hero-art ${compact ? "compact" : ""}`}>
      <img src="/assets/twilight-header.png" alt="Moonlit mountains beneath a starry sky" />
      <div className="hero-copy">
        <span className="sparkle">✦</span>
        <h1>RISE</h1>
        <p>Train like I’ve never won.<br />Compete like I’ve never lost.</p>
      </div>
      <p className="moon-note">My biggest<br />project is me.</p>
    </header>
  );
}

function CalendarScreen({ entries, mode, setMode, mood, onView }: { entries: Record<number, Mood>; mode: "activity" | "mood"; setMode: (m: "activity" | "mood") => void; mood: Mood; onView: () => void }) {
  const days = useMemo(() => Array.from({ length: 35 }, (_, i) => i < 2 || i > 31 ? null : i - 1), []);
  return (
    <section className="calendar-screen page-with-nav">
      <HeaderArt />
      <div className="month-row">
        <button aria-label="Previous month"><ChevronLeftIcon /></button>
        <h2>September 2026</h2>
        <button aria-label="Next month"><ChevronRightIcon /></button>
      </div>
      <div className="segmented" role="tablist">
        <button className={mode === "activity" ? "selected" : ""} onClick={() => setMode("activity")}>Writing activity</button>
        <button className={mode === "mood" ? "selected" : ""} onClick={() => setMode("mood")}>Mood view</button>
      </div>
      <div className="weekdays">{["SUN","MON","TUE","WED","THU","FRI","SAT"].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="calendar-grid">
        {days.map((day, index) => {
          const dayMood = day ? entries[day] : undefined;
          return <button key={index} className={`day ${day === 13 ? "today" : ""}`} disabled={!day} aria-label={day ? `September ${day}${dayMood ? `, ${moodMeta[dayMood].label}` : ""}` : ""}>
            {day && <><span className="day-number">{day}</span>{dayMood && (mode === "mood" ? <MoodFace mood={dayMood} small /> : <span className={`activity-dot ${moodMeta[dayMood].tone}`} />)}</>}
          </button>;
        })}
      </div>
      <div className="entry-preview">
        <div className="preview-heading"><h3>Sunday, September 13, 2026</h3><button onClick={onView}>View entry <ChevronRightIcon /></button></div>
        <div className="mood-summary"><MoodFace mood={mood} /><div><span>Today’s mood</span><strong>{mood === "good" ? "Calm" : moodMeta[mood].label}</strong><p>A quieter mind is still a meaningful day.</p></div></div>
      </div>
      <div className="insight">
        <span className="insight-stars">✦<b>✦</b></span>
        <div><span>Monthly insight</span><strong>You made space for yourself on {Object.keys(entries).length} days this month.</strong><p>Small moments add up.</p></div>
      </div>
    </section>
  );
}

function TodayScreen({ mood, setMood, onWrite, onPlan }: { mood: Mood; setMood: (m: Mood) => void; onWrite: () => void; onPlan: () => void }) {
  const [feelings, setFeelings] = useState(["Strong", "Calm"]);
  const [intention, setIntention] = useState("Move through today with calm focus");
  const [intentionSet, setIntentionSet] = useState(true);
  const options = ["Strong", "Calm", "Curious", "Confident", "Energised", "Beautiful", "Focused", "Rested"];
  return <section className="today-screen page-with-nav">
    <HeaderArt compact />
    <div className="today-content">
      <div className="journey-status"><div><span>Day 13 of 90 · RETURN</span><strong>14%</strong></div><i><b /></i><p>77 days remaining · Come back to myself</p></div>
      <div className="today-checkin">
        <p className="eyebrow">Sunday · September 13</p>
        <h2>What am I doing for myself today?</h2>
        <p className="supporting">How do I feel right now?</p>
        <div className="mood-picker">
          {(Object.keys(moodMeta) as Mood[]).map((key) => <button key={key} className={mood === key ? "chosen" : ""} onClick={() => setMood(key)}><MoodFace mood={key} /><span>{moodMeta[key].label}</span></button>)}
        </div>
      </div>
      <div className="today-actions">
        <div className="feelings"><span>Today I want to feel</span><div>{options.map((item) => <button key={item} className={feelings.includes(item) ? "selected" : ""} onClick={() => setFeelings((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{item}</button>)}</div></div>
        <div className={`daily-intention ${intentionSet ? "set" : ""}`}><div className="intention-heading"><span><SunIcon /> Morning intention</span>{intentionSet && <small>Set for today</small>}</div><p>What would make today feel meaningful?</p><input aria-label="Today's intention" value={intention} onChange={(event) => { setIntention(event.target.value); setIntentionSet(false); }} placeholder="Write a gentle intention…" /><button onClick={() => setIntentionSet(true)}>{intentionSet ? "Update intention" : "Set today’s intention"}<ChevronRightIcon /></button></div>
        <div className="priority-block"><span>Today’s 3 priorities</span><ol><li>Move my body</li><li>Finish one meaningful task</li><li>Do something just for me</li></ol></div>
        <button className="primary" onClick={onWrite}><Pencil2Icon /> Journal today <ChevronRightIcon /></button>
        <button className="today-plan-link" onClick={onPlan}><CheckCircledIcon /><span><strong>Today’s plan</strong><small>3 of 8 complete</small></span><ChevronRightIcon /></button>
        <p className="identity-line">I can love deeply without abandoning myself.</p>
      </div>
    </div>
  </section>;
}

function FocusAreasScreen() {
  const areas = [
    ["Body & Fitness", "Strength, fitness, energy", "3/4 workouts", "mint"], ["Mind & Learning", "Give my brain better things", "95/150 min", "lilac"], ["Reading", "Rebuild concentration", "74 pages", "gold"], ["Beauty & Self-care", "Take pleasure in caring for myself", "4 moments", "coral"], ["Emotional Health", "Feel everything. Investigate less.", "42 min recovery", "blue"], ["Relationships", "Quality connection", "1 meaningful", "mint"], ["Career & Growth", "One move future me benefits from", "2/13 moves", "purple"], ["Life & Experiences", "Make my own life interesting", "2 experiences", "gold"],
  ];
  const [selected, setSelected] = useState<string | null>("Body & Fitness");
  return <section className="focus-screen page-with-nav simple-page"><p className="eyebrow">Project Me · 8 dimensions</p><h1>My focus</h1><p className="focus-intro">Build a stronger, richer life—without making it another job.</p><div className="focus-list">{areas.map(([name, goal, stat, tone]) => <button key={name} className={selected === name ? "open" : ""} onClick={() => setSelected(selected === name ? null : name)}><span className={`focus-dot ${tone}`} /><div><strong>{name}</strong><small>{goal}</small>{selected === name && <p>{name === "Body & Fitness" ? "This week: exercise 4× · mobility 4–5× · move daily · regular sleep" : name === "Mind & Learning" ? "Economics · Finance · AI · Technology · Psychology · Current affairs" : name === "Emotional Health" ? "Track facts, feelings, stories, actions, and what helped you regulate." : `Current 90-day progress: ${stat}`}</p>}</div><span>{stat}</span></button>)}</div></section>;
}

function Editor({ mood, draft, setDraft, onClose, onSave }: { mood: Mood; draft: string; setDraft: (v: string) => void; onClose: () => void; onSave: () => void }) {
  return <section className="editor-screen full-page">
    <div className="editor-toolbar"><button onClick={onClose} aria-label="Close"><Cross2Icon /></button><span>Sunday, September 13</span><button className="save" onClick={onSave}>Save</button></div>
    <div className="editor-body">
      <MoodFace mood={mood} />
      <p className="eyebrow">Today’s reflection</p>
      <h2>What’s on your mind?</h2>
      <textarea aria-label="Journal entry" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Start wherever you are…" autoFocus />
      <div className="tags"><button>Mind</button><button>Personal Growth</button><button>+ Add tag</button></div>
    </div>
  </section>;
}

function EntryDetail({ mood, draft, onClose, onEdit }: { mood: Mood; draft: string; onClose: () => void; onEdit: () => void }) {
  return <section className="detail-screen full-page">
    <div className="editor-toolbar"><button onClick={onClose} aria-label="Back"><ChevronLeftIcon /></button><span>Journal entry</span><button className="icon-action" onClick={onEdit}><Pencil2Icon /></button></div>
    <article className="entry-article"><p className="eyebrow">Sunday · September 13, 2026</p><div className="entry-title"><MoodFace mood={mood} /><h2>A quieter kind of day</h2></div><p>{draft}</p><p>I want to remember that not every meaningful day has to be loud. Sometimes making a little room is enough.</p><div className="tags"><button>Mind</button><button>Personal Growth</button><button>confidence</button></div></article>
  </section>;
}

function JournalScreen({ mood, draft, onOpen }: { mood: Mood; draft: string; onOpen: () => void }) {
  const [view, setView] = useState<"entries" | "tags" | "quotes">("entries");
  const [query, setQuery] = useState("");
  const [quotes, setQuotes] = useState([
    { text: "Train like I’ve never won. Compete like I’ve never lost.", source: "My RISE philosophy" },
    { text: "My attention is valuable.", source: "A reminder to myself" },
    { text: "I can love deeply without abandoning myself.", source: "Project Me" },
  ]);
  const [addingQuote, setAddingQuote] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quoteSource, setQuoteSource] = useState("");
  const keyboard = { hide: () => undefined };

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const savedQuotes = await loadPersistedQuotes();
      if (!isMounted || !savedQuotes.length) return;
      setQuotes(savedQuotes.map((quote) => ({ text: quote.text, source: quote.source })));
    })();

    return () => {
      isMounted = false;
    };
  }, []);
  const tagData = [
    { name: "confidence", count: 12, trend: "+4", weeks: [1, 2, 1, 3, 2, 4], tone: "purple" },
    { name: "rest", count: 9, trend: "+2", weeks: [1, 1, 2, 1, 2, 3], tone: "mint" },
    { name: "family", count: 7, trend: "steady", weeks: [2, 1, 1, 1, 1, 1], tone: "gold" },
    { name: "anxiety", count: 6, trend: "−2", weeks: [2, 2, 1, 2, 1, 0], tone: "coral" },
    { name: "exercise", count: 5, trend: "+1", weeks: [0, 1, 1, 0, 1, 2], tone: "blue" },
    { name: "gratitude", count: 4, trend: "+1", weeks: [0, 1, 0, 1, 1, 1], tone: "lilac" },
  ];
  const filteredTags = tagData.filter((tag) => tag.name.includes(query.trim().toLowerCase()));
  const changeView = (next: "entries" | "tags" | "quotes") => { keyboard.hide(); setView(next); setQuery(""); setAddingQuote(false); };
  const addQuote = async () => {
    if (!quoteText.trim()) return;
    const nextQuote = { text: quoteText.trim(), source: quoteSource.trim() || "Personal quote" };
    setQuotes((current) => [nextQuote, ...current]);
    await savePersistedQuote(nextQuote);
    setQuoteText(""); setQuoteSource(""); setAddingQuote(false); keyboard.hide();
  };

  return <section className="library-screen page-with-nav simple-page">
    <p className="eyebrow">Your private archive</p><h1>Journal</h1>
    <div className="journal-tabs" role="tablist">
      <button className={view === "entries" ? "active" : ""} onClick={() => changeView("entries")}>Entries</button>
      <button className={view === "tags" ? "active" : ""} onClick={() => changeView("tags")}>Tags</button>
      <button className={view === "quotes" ? "active" : ""} onClick={() => changeView("quotes")}>Quotes</button>
    </div>
    {view === "entries" ? <>
      <button className="search"><MagnifyingGlassIcon /> Search entries</button>
      <h3>September</h3>
      <button className="journal-row" onClick={onOpen}><MoodFace mood={mood} /><div><span>September 13 · Today</span><strong>A quieter kind of day</strong><p>{draft.slice(0, 68)}…</p></div><ChevronRightIcon /></button>
      <button className="journal-row"><MoodFace mood="meh" /><div><span>September 12</span><strong>Learning to leave space</strong><p>I noticed how much better the afternoon felt when I slowed down…</p></div><ChevronRightIcon /></button>
    </> : view === "tags" ? <>
      <label className="tag-search"><MagnifyingGlassIcon /><input aria-label="Search your tags" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your tags" />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><Cross2Icon /></button>}</label>
      <div className="tag-summary">
        <div><span>Most present lately</span><strong>confidence</strong><p>Appeared in 4 of your last 6 weeks</p></div>
        <div className="summary-chart" aria-label="Tag activity by week">
          {[3, 5, 4, 7, 6, 9].map((height, i) => <span key={i} style={{ height: `${height * 4}px` }}><i>W{i + 1}</i></span>)}
        </div>
      </div>
      <div className="tag-list-heading"><h3>Your tags</h3><span>{filteredTags.length} tags</span></div>
      <div className="tag-list">
        {filteredTags.map((tag) => <button className="tag-row" key={tag.name}>
          <span className={`tag-orbit ${tag.tone}`}>#</span>
          <div className="tag-info"><strong>#{tag.name}</strong><span>{tag.count} entries · {tag.trend} recently</span><div className="tag-spark" aria-label={`${tag.name} use over six weeks`}>{tag.weeks.map((week, i) => <i key={i} style={{ height: `${Math.max(3, week * 5)}px` }} />)}</div></div>
          <strong className="tag-count">{tag.count}</strong>
        </button>)}
        {!filteredTags.length && <div className="no-tags"><span>✦</span><strong>No matching tags</strong><p>Try a different word.</p></div>}
      </div>
    </> : <>
      <div className="quotes-heading"><div><span>Your words to return to</span><strong>{quotes.length} saved quotes</strong></div><button onClick={() => setAddingQuote(true)}><PlusIcon /> Add quote</button></div>
      {addingQuote && <div className="quote-form"><textarea aria-label="Quote text" autoFocus value={quoteText} onChange={(event) => setQuoteText(event.target.value)} placeholder="Type or paste a quote…" /><input aria-label="Author or source" value={quoteSource} onChange={(event) => setQuoteSource(event.target.value)} placeholder="Author or source (optional)" /><div><button onClick={() => { keyboard.hide(); setAddingQuote(false); }}>Cancel</button><button className="quote-save" onClick={addQuote}>Save quote</button></div></div>}
      <div className="quotes-list">{quotes.map((quote, index) => <article key={`${quote.text}-${index}`}><span>“</span><blockquote>{quote.text}</blockquote><cite>— {quote.source}</cite></article>)}</div>
    </>}
  </section>;
}

function ReflectionsScreen({ entries, mode, setMode, mood, onView }: { entries: Record<number, Mood>; mode: "activity" | "mood"; setMode: (m: "activity" | "mood") => void; mood: Mood; onView: () => void }) {
  const [view, setView] = useState<"journey" | "review" | "wins" | "calendar">("journey");
  return <section className="reflections-screen page-with-nav simple-page"><p className="eyebrow">Day 13 of 90</p><h1>My progress</h1><div className="progress-nav">{(["journey","review","wins","calendar"] as const).map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div>
    {view === "journey" && <><div className="phase-card"><span>Days 1–30 · RETURN</span><h2>Come back to myself</h2><p>Exercise · Sleep · Reading · Learning · Journaling · Emotional regulation</p><strong>“I can miss someone and continue my day.”</strong></div><div className="metric-grid"><div><span>Learning</span><strong>4.8h</strong><small>of 32h target</small></div><div><span>Reading</span><strong>186</strong><small>pages</small></div><div><span>Career moves</span><strong>2</strong><small>of 13</small></div><div><span>New experiences</span><strong>3</strong><small>so far</small></div></div><h3>My attention this week</h3><div className="attention-bars">{[["Myself",28],["Health",18],["Career",17],["Learning",14],["Relationships",13],["Worry",10]].map(([label,value]) => <div key={label}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><strong>{value}%</strong></div>)}</div></>}
    {view === "review" && <><div className="reflection-hero"><span>Sunday review</span><h2>How much did I live my own life this week?</h2><div className="score-line">{[1,2,3,4,5,6,7,8,9,10].map((n) => <button className={n === 7 ? "selected" : ""} key={n}>{n}</button>)}</div><p>Relationship uncertainty controlled less of your attention this week, while time invested in yourself increased.</p></div><h3>13-week direction</h3><div className="trend-pair"><div><span>Lived my own life</span><strong>5 → 7</strong></div><div><span>Uncertainty controlled me</span><strong>8 → 5</strong></div></div></>}
    {view === "wins" && <><div className="reflection-hero"><span>Proof I’m changing</span><h2>Small evidence. Real change.</h2><button><PlusIcon /> Add a personal win</button></div><div className="wins-list">{["Went to the gym even though I felt down","Missed someone and continued my day","Finished a book","Tried something alone"].map((win,i) => <div key={win}><span>SEP {13-i*2}</span><p>{win}</p></div>)}</div></>}
    {view === "calendar" && <div className="embedded-calendar"><CalendarScreen entries={entries} mode={mode} setMode={setMode} mood={mood} onView={onView} /></div>}
  </section>;
}

function SettingsScreen() {
  return <section className="settings-screen page-with-nav simple-page"><p className="eyebrow">Your space, your rules</p><h1>Settings</h1><div className="settings-list"><button><span><strong>Journal reminder</strong><small>Every day at 9:00 PM</small></span><ChevronRightIcon /></button><button><span><strong>Privacy lock</strong><small>Face ID is on</small></span><ChevronRightIcon /></button><button><span><strong>Reflection summaries</strong><small>Weekly and monthly</small></span><ChevronRightIcon /></button><button><span><strong>Export your journal</strong><small>PDF or text</small></span><ChevronRightIcon /></button></div></section>;
}

type Habit = { id: number; name: string; detail: string; tone: string };

function TrackScreen({ onSettings }: { onSettings: () => void }) {
  const [habits, setHabits] = useState<Habit[]>([
    { id: 1, name: "Moved my body", detail: "Strength, run, walk or HYROX", tone: "blue" },
    { id: 2, name: "Learned something", detail: "Give my brain better things", tone: "coral" },
    { id: 3, name: "Read", detail: "10 pages", tone: "gold" },
    { id: 4, name: "Ate well", detail: "Nourish myself", tone: "mint" },
    { id: 5, name: "Stretched", detail: "Mobility and posture", tone: "purple" },
    { id: 6, name: "Did something enjoyable", detail: "Make my life interesting", tone: "lilac" },
    { id: 7, name: "Connected with someone", detail: "Quality, not quantity", tone: "mint" },
    { id: 8, name: "Did something for future me", detail: "One useful move", tone: "gold" },
  ]);
  const [completed, setCompleted] = useState(() => new Set([1, 3, 6]));
  const [planView, setPlanView] = useState<"schedule" | "checklist" | "progress">("schedule");
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [adding, setAdding] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [scheduleDone, setScheduleDone] = useState(() => new Set(["stretch", "work"]));
  const [extraActivities, setExtraActivities] = useState<Record<string, string[]>>({ morning: [], focus: [], evening: [] });
  const [addingTo, setAddingTo] = useState<"morning" | "focus" | "evening" | null>(null);
  const [newActivity, setNewActivity] = useState("");
  const keyboard = { hide: () => undefined };
  const toggleHabit = (id: number) => setCompleted((current) => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const addHabit = () => {
    if (!newHabit.trim()) return;
    setHabits((current) => [...current, { id: Date.now(), name: newHabit.trim(), detail: "Daily", tone: "purple" }]);
    setNewHabit(""); keyboard.hide(); setAdding(false);
  };
  const toggleSchedule = (id: string) => setScheduleDone((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const addActivity = () => {
    if (!addingTo || !newActivity.trim()) return;
    setExtraActivities((current) => ({ ...current, [addingTo]: [...current[addingTo], newActivity.trim()] }));
    setNewActivity(""); setAddingTo(null); keyboard.hide();
  };
  const chartValues = period === "week" ? [57, 71, 43, 86, 64, 78, Math.round(completed.size / habits.length * 100)] : [58, 64, 69, 74];
  const chartLabels = period === "week" ? ["M","T","W","T","F","S","S"] : ["W1","W2","W3","W4"];
  const rate = Math.round(completed.size / habits.length * 100);

  const chapters = [
    { id: "morning" as const, name: "Morning", caption: "A calm and present start.", icon: SunIcon, tone: "lilac", items: [{ id: "stretch", name: "Stretch", time: "7:00 AM" }, { id: "meditate", name: "Meditate", time: "7:30 AM" }, { id: "journal", name: "Journal", time: "8:00 AM" }] },
    { id: "focus" as const, name: "Focus", caption: "Meaningful work, steady progress.", icon: DesktopIcon, tone: "mint", items: [{ id: "work", name: "Focused work", time: "9:00 AM" }, { id: "lunch", name: "Lunch & walk", time: "12:00 PM" }] },
    { id: "evening" as const, name: "Evening", caption: "Unwind and reconnect.", icon: MoonIcon, tone: "gold", items: [{ id: "hobby", name: "Hobby or learning", time: "6:00 PM" }, { id: "myself", name: "Time for myself", time: "7:30 PM" }, { id: "reflect", name: "Evening reflection", time: "9:00 PM" }] },
  ];

  return <section className="track-screen page-with-nav simple-page">
    <div className="track-title-row"><div><p className="eyebrow">Day chapters</p><h1>My day</h1><p className="plan-date">Sunday, September 13, 2026</p></div><button className="settings-shortcut" onClick={onSettings} aria-label="Open settings"><GearIcon /></button></div>
    <div className="plan-tabs" role="tablist"><button className={planView === "schedule" ? "active" : ""} onClick={() => setPlanView("schedule")}>Schedule</button><button className={planView === "checklist" ? "active" : ""} onClick={() => setPlanView("checklist")}>Checklist</button><button className={planView === "progress" ? "active" : ""} onClick={() => setPlanView("progress")}>Progress</button></div>
    {planView === "schedule" && <div className="schedule-view">
      <p className="schedule-intro">Plan and complete a balanced day without rigid scheduling.</p>
      {chapters.map(({ id, name, caption, icon: Icon, tone, items }) => <section className="day-chapter" key={id}>
        <div className="chapter-heading"><span className={`chapter-icon ${tone}`}><Icon /></span><div><h2>{name}</h2><p>{caption}</p></div></div>
        {[...items, ...extraActivities[id].map((name, index) => ({ id: `${id}-${index}`, name, time: "Anytime" }))].map((item) => <button className={`schedule-row ${scheduleDone.has(item.id) ? "done" : ""}`} key={item.id} onClick={() => toggleSchedule(item.id)}><span className="schedule-check">{scheduleDone.has(item.id) && "✓"}</span><strong>{item.name}</strong><small>{item.time}</small><DotsHorizontalIcon /></button>)}
        {addingTo === id ? <div className="add-habit chapter-add"><input autoFocus aria-label={`Add to ${name}`} value={newActivity} onChange={(event) => setNewActivity(event.target.value)} placeholder={`Add to ${name.toLowerCase()}`} /><button onClick={addActivity}>Add</button><button onClick={() => { keyboard.hide(); setAddingTo(null); }}><Cross2Icon /></button></div> : <button className="add-to-chapter" onClick={() => setAddingTo(id)}><PlusIcon /> Add to this part</button>}
      </section>)}
      <button className="schedule-total" onClick={() => setPlanView("checklist")}><span>{scheduleDone.size} of {8 + Object.values(extraActivities).flat().length} complete</span><i><b style={{ width: `${scheduleDone.size / (8 + Object.values(extraActivities).flat().length) * 100}%` }} /></i><strong>{Math.round(scheduleDone.size / (8 + Object.values(extraActivities).flat().length) * 100)}%</strong></button>
    </div>}
    {planView === "checklist" && <div className="checklist-view">
      <div className="day-progress"><div><span>Today · September 13</span><strong>{completed.size} of {habits.length} complete</strong></div><div className="progress-ring" style={{ "--pct": `${rate}%` } as CSSProperties}><span>{rate}%</span></div></div>
      <div className="checklist-heading"><h3>Today’s checklist</h3><button onClick={() => setAdding(true)}><PlusIcon /> Add</button></div>
      {adding && <div className="add-habit"><input aria-label="New daily habit" autoFocus value={newHabit} onChange={(event) => setNewHabit(event.target.value)} placeholder="What would you like to do?" /><button onClick={addHabit}>Add</button><button onClick={() => { keyboard.hide(); setAdding(false); setNewHabit(""); }} aria-label="Cancel"><Cross2Icon /></button></div>}
      <div className="habit-list">{habits.map((habit) => <button key={habit.id} className={`habit-row ${completed.has(habit.id) ? "done" : ""}`} onClick={() => toggleHabit(habit.id)}><span className={`habit-check ${habit.tone}`}>{completed.has(habit.id) && "✓"}</span><span><strong>{habit.name}</strong><small>{habit.detail}</small></span></button>)}</div>
    </div>}
    {planView === "progress" && <div className="progress-section standalone">
      <div className="progress-heading"><div><p className="eyebrow">Your rhythm</p><h2>Progress summary</h2></div><BarChartIcon /></div>
      <div className="period-tabs"><button className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>This week</button><button className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>This month</button></div>
      <div className="completion-chart" aria-label={`${period} completion chart`}>
        {chartValues.map((value, i) => <div key={i}><span className="bar-value">{value}%</span><i style={{ height: `${Math.max(12, value * .72)}px` }} /><b>{chartLabels[i]}</b></div>)}
      </div>
      <div className="comparison-row"><div><span>{period === "week" ? "Weekly average" : "Monthly average"}</span><strong>{period === "week" ? "68%" : "66%"}</strong></div><div><span>vs last {period}</span><strong className="positive">{period === "week" ? "+9%" : "+6%"}</strong></div></div>
      <p className="progress-note">{period === "week" ? "You’re most consistent with reading and meditation. Water is the gentlest place to focus next." : "Your routines became steadier each week, especially learning and time for yourself."}</p>
    </div>}
  </section>;
}

function MoodFace({ mood, small = false }: { mood: Mood; small?: boolean }) {
  const meta = moodMeta[mood];
  return <span className={`mood-face ${meta.tone} ${small ? "small" : ""}`} aria-label={meta.label}><i>••</i><b>{meta.face}</b></span>;
}
