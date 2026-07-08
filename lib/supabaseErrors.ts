export function formatSupabaseError(error: unknown) {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const parts = [
      record.message,
      record.details,
      record.hint,
      record.code ? `code: ${record.code}` : null
    ].filter((part): part is string => typeof part === "string" && part.length > 0);

    if (parts.length > 0) return parts.join(" | ");

    try {
      return JSON.stringify(record);
    } catch {
      return String(error);
    }
  }

  return String(error || "");
}

export function getSupabaseErrorDebugPayload(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const cause = record.cause;
    const causeRecord =
      cause && typeof cause === "object" ? (cause as Record<string, unknown>) : null;

    return {
      message: record.message ?? causeRecord?.message ?? formatSupabaseError(error),
      code: record.code ?? causeRecord?.code,
      details: record.details ?? causeRecord?.details,
      hint: record.hint ?? causeRecord?.hint,
      raw: error
    };
  }

  return {
    message: formatSupabaseError(error),
    code: undefined,
    details: undefined,
    hint: undefined,
    raw: error
  };
}

export function getReadableSupabaseError(error: unknown, fallback: string) {
  const message = formatSupabaseError(error);
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("swipes_choice_check") ||
    lowerMessage.includes("rooms_status_check")
  ) {
    return "Supabase 数据库约束还是旧版本。请在 Supabase SQL Editor 执行最新的 supabase/schema.sql，或更新 swipes.choice 支持 pass、rooms.status 支持 decided。";
  }

  if (
    lowerMessage.includes("could not find") ||
    lowerMessage.includes("column") ||
    lowerMessage.includes("schema cache") ||
    lowerMessage.includes("relation") ||
    lowerMessage.includes("does not exist")
  ) {
    if (
      lowerMessage.includes("feedback") ||
      lowerMessage.includes("events") ||
      lowerMessage.includes("restaurant_source") ||
      lowerMessage.includes("restaurant_cache") ||
      lowerMessage.includes("room_restaurants")
    ) {
      return "Supabase 表结构还没有更新到 V2.4/V3 预留版本。请在 Supabase SQL Editor 执行 supabase/migrate-v24-feedback-events.sql、supabase/migrate-v30-restaurant-source.sql；如需真实 API 缓存预留，再执行 supabase/migrate-v30-restaurant-cache.sql。";
    }

    return "Supabase 表结构还没有更新。请在 Supabase SQL Editor 执行项目里的 supabase/schema.sql；如果之前执行过旧版本 schema，需要先迁移或重建 rooms、room_members、swipes 三张表。";
  }

  if (
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("permission denied") ||
    lowerMessage.includes("violates row-level security")
  ) {
    return "Supabase RLS 策略阻止了这次写入。请确认 supabase/schema.sql 里的 Demo RLS 策略已经执行。";
  }

  if (
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch")
  ) {
    return "无法连接 Supabase。请确认 Vercel 环境变量或本地 .env.local 中的 Supabase URL 和 anon key 正确，修改后已重新部署，并且网络可访问。";
  }

  return message || fallback;
}
