import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InstagramPost {
  id: string;
  post_id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  published_at: string;
  likes: number;
  comments: number;
  reach: number;
  saves: number;
  shares: number;
  caption: string | null;
  permalink: string | null;
}

export interface DayOfWeekStat {
  day: string;       // "Dom", "Seg", ...
  dayIndex: number;  // 0=Dom, 1=Seg, ...
  posts: number;
  avgLikes: number;
  avgComments: number;
  avgEngagement: number;
}

export interface MediaTypeStat {
  type: string;
  posts: number;
  avgLikes: number;
  avgComments: number;
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function useInstagramPosts() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("instagram_posts")
        .select("*")
        .order("published_at", { ascending: false });

      if (!error && data) {
        setPosts(data as unknown as InstagramPost[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const dayOfWeekStats: DayOfWeekStat[] = DAY_LABELS.map((day, idx) => {
    const dayPosts = posts.filter(p => new Date(p.published_at).getDay() === idx);
    const avgLikes = dayPosts.length > 0
      ? Math.round(dayPosts.reduce((s, p) => s + p.likes, 0) / dayPosts.length)
      : 0;
    const avgComments = dayPosts.length > 0
      ? Math.round(dayPosts.reduce((s, p) => s + p.comments, 0) / dayPosts.length)
      : 0;
    return {
      day,
      dayIndex: idx,
      posts: dayPosts.length,
      avgLikes,
      avgComments,
      avgEngagement: avgLikes + avgComments,
    };
  });

  const mediaTypeStats: MediaTypeStat[] = ["IMAGE", "VIDEO", "CAROUSEL_ALBUM"].map(type => {
    const typePosts = posts.filter(p => p.media_type === type);
    const label = type === "CAROUSEL_ALBUM" ? "Carrossel" : type === "VIDEO" ? "Vídeo" : "Imagem";
    return {
      type: label,
      posts: typePosts.length,
      avgLikes: typePosts.length > 0
        ? Math.round(typePosts.reduce((s, p) => s + p.likes, 0) / typePosts.length)
        : 0,
      avgComments: typePosts.length > 0
        ? Math.round(typePosts.reduce((s, p) => s + p.comments, 0) / typePosts.length)
        : 0,
    };
  }).filter(s => s.posts > 0);

  const bestDayToPost = dayOfWeekStats.reduce(
    (best, d) => d.avgEngagement > best.avgEngagement && d.posts >= 2 ? d : best,
    dayOfWeekStats[0]
  );

  return { posts, loading, dayOfWeekStats, mediaTypeStats, bestDayToPost };
}