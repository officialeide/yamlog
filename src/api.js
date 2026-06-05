/* ─────────────────────────────────────────────────────
   API.JS — Supabase 클라이언트, 커스텀 훅, CRUD 함수
───────────────────────────────────────────────────── */
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase 클라이언트 ─────────────────────────────
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── 이벤트 목록 훅 ─────────────────────────────────
// filterSub 제거: sub_category 필터는 뷰에서 클라이언트 사이드 처리
export function useEvents(filterCat) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("events")
        .select("*")
        .order("date", { ascending: false })
        .order("hour");
      if (filterCat && filterCat !== "all") q = q.eq("category", filterCat);
      const { data, error } = await q;
      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      console.error("events 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, [filterCat]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  return { events, loading, refetch: fetchEvents };
}

// ── 체중 기록 훅 (90일) ─────────────────────────────
export function useWeightLogs() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const from = new Date();
      from.setDate(from.getDate() - 89);
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .gte("date", from.toISOString().slice(0, 10))
        .order("date");
      if (error) throw error;
      setLogs(data || []);
    } catch (e) {
      console.error("weight 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  return { logs, loading, refetch: fetchLogs };
}

// ── CRUD 함수들 ────────────────────────────────────
export async function addEvent(data) {
  const { error } = await supabase.from("events").insert([data]);
  if (error) throw error;
}

export async function updateEvent(id, data) {
  const { error } = await supabase.from("events").update(data).eq("id", id);
  if (error) throw error;
}

export async function deleteEvent(id) {
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertWeight(date, weight, memo = "") {
  const { error } = await supabase
    .from("weight_logs")
    .upsert([{ date, weight, memo }], { onConflict: "date" });
  if (error) throw error;
}
