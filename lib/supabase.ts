import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

let browserClient: SupabaseClient<Database> | null = null;

function getSupabaseEnvironment() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      [
        "Supabase 环境变量缺失。",
        "请在 Vercel Project Settings -> Environment Variables 中配置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
        "配置或修改环境变量后必须重新部署，线上页面才会拿到新的值。"
      ].join(" ")
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 不是有效 URL。请在 Vercel 环境变量中填写 Supabase Project URL。"
    );
  }

  if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname)) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 不能使用 localhost、127.0.0.1 或 0.0.0.0。线上部署必须填写 Supabase 云端 Project URL。"
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey
  };
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function getSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvironment();

  if (!browserClient) {
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
  }

  return browserClient;
}
