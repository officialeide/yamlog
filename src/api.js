/* ─────────────────────────────────────────────────────
   API.JS — Supabase 클라이언트, 커스텀 훅, CRUD 함수
───────────────────────────────────────────────────── */
import { useState, useEffect, useCallback } from "react";
import { dateStr, WEIGHT_FETCH_DAYS } from "./constants.js";
import { createClient } from "@supabase/supabase-js";

// ── Supabase 클라이언트 ─────────────────────────────
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── 이벤트 목록 훅 ─────────────────────────────────
// dateRange: { from: "YYYY-MM-DD", to: "YYYY-MM-DD" } | null
// null이면 날짜 범위 제한 없이 전체 조회 (아카이브 뷰 등)
export function useEvents(filterCat, dateRange) {
  const [events,  setEvents]  = useState([]);
  const [loading, setLoading] = useState(true);

  const rangeKey = dateRange ? `${dateRange.from}|${dateRange.to}` : "all";

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("events")
        .select("*")
        .order("date", { ascending: false })
        .order("hour");
      if (filterCat && filterCat !== "all") q = q.eq("category", filterCat);
      if (dateRange) {
        q = q.gte("date", dateRange.from).lte("date", dateRange.to);
      }
      const { data, error } = await q;
      if (error) throw error;
      setEvents(data || []);
    } catch (e) {
      console.error("events 로드 실패:", e);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCat, rangeKey]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  return { events, loading, refetch: fetchEvents };
}

// ── 체중 기록 훅 (90일) ─────────────────────────────
export function useWeightLogs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      const from = new Date();
      from.setDate(from.getDate() - (WEIGHT_FETCH_DAYS - 1));
      const { data, error } = await supabase
        .from("weight_logs")
        .select("*")
        .gte("date", dateStr(from))   // KST 로컬 날짜 기준 (UTC 버그 수정)
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

export async function deleteWeight(date) {
  const { error } = await supabase
    .from("weight_logs")
    .delete()
    .eq("date", date);
  if (error) throw error;
}
