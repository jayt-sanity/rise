import { createClient } from "@supabase/supabase-js";

export type JournalRecord = {
  mood: string;
  draft: string;
  created_at?: string;
};

export type QuoteRecord = {
  text: string;
  source: string;
  created_at?: string;
};

export const DEMO_USER_ID = "demo-user";

const STORAGE_KEYS = {
  journal: "rise:prototype:journal",
  quotes: "rise:prototype:quotes",
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const hasSupabase = Boolean(supabase);

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

export async function loadPersistedJournal(): Promise<JournalRecord | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("mood,draft,created_at")
      .eq("user_id", DEMO_USER_ID)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        mood: data.mood ?? "good",
        draft: data.draft ?? "",
        created_at: data.created_at ?? undefined,
      };
    }
  }

  return readStorage<JournalRecord | null>(STORAGE_KEYS.journal, null);
}

export async function savePersistedJournal(entry: JournalRecord) {
  const payload = {
    user_id: DEMO_USER_ID,
    mood: entry.mood,
    draft: entry.draft,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from("journal_entries").insert(payload);
    if (!error) {
      return { source: "supabase" as const };
    }
  }

  writeStorage(STORAGE_KEYS.journal, entry);
  return { source: "local" as const };
}

export async function loadPersistedQuotes(): Promise<QuoteRecord[]> {
  if (supabase) {
    const { data, error } = await supabase
      .from("saved_quotes")
      .select("quote_text,quote_source,created_at")
      .eq("user_id", DEMO_USER_ID)
      .order("created_at", { ascending: false });

    if (!error && data) {
      return data.map((item) => ({
        text: item.quote_text ?? "",
        source: item.quote_source ?? "Personal quote",
        created_at: item.created_at ?? undefined,
      }));
    }
  }

  return readStorage<QuoteRecord[]>(STORAGE_KEYS.quotes, []);
}

export async function savePersistedQuote(entry: QuoteRecord) {
  const payload = {
    user_id: DEMO_USER_ID,
    quote_text: entry.text,
    quote_source: entry.source,
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from("saved_quotes").insert(payload);
    if (!error) {
      return { source: "supabase" as const };
    }
  }

  const next = [entry, ...readStorage<QuoteRecord[]>(STORAGE_KEYS.quotes, [])];
  writeStorage(STORAGE_KEYS.quotes, next);
  return { source: "local" as const };
}
