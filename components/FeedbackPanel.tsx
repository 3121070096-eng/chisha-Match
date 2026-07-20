"use client";

import {
  feedbackImprovementAreas,
  submitFeedback,
  type FeedbackImprovementArea,
  type FeedbackRating
} from "@/lib/analytics";
import { getReadableSupabaseError } from "@/lib/supabaseErrors";
import { MessageCircleHeart, Send } from "lucide-react";
import { useState } from "react";

type FeedbackPanelProps = {
  roomId: string;
};

const ratingOptions: Array<{ value: FeedbackRating; label: string }> = [
  { value: "good", label: "很好用" },
  { value: "ok", label: "还可以" },
  { value: "bad", label: "有点麻烦" }
];

export function FeedbackPanel({ roomId }: FeedbackPanelProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [improvementArea, setImprovementArea] = useState<FeedbackImprovementArea | "">("");
  const [decisionSatisfaction, setDecisionSatisfaction] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!rating || submitting) return;

    setSubmitting(true);
    setError("");

    try {
      await submitFeedback({
        roomId,
        rating,
        comment,
        improvementArea: improvementArea || null,
        decisionSatisfaction
      });
      setSuccess(true);
    } catch (feedbackError) {
      console.error("[FeedbackPanel] submit failed", feedbackError);
      setError(getReadableSupabaseError(feedbackError, "反馈提交失败，请稍后再试。"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-lg bg-white/92 p-4 shadow-sm ring-1 ring-teal-900/5">
      <div className="flex items-center gap-2 text-sm font-black text-slate-950">
        <MessageCircleHeart size={18} className="text-teal-500" />
        这次选餐体验怎么样？
      </div>

      {success ? (
        <p className="mt-3 rounded-lg bg-teal-50 px-3 py-3 text-sm font-black leading-6 text-teal-700">
          谢谢反馈！这会帮助我继续优化吃啥 Match。
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {ratingOptions.map((option) => {
              const active = rating === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRating(option.value)}
                  className={`h-11 rounded-full text-sm font-black transition ${
                    active
                      ? "bg-teal-500 text-white shadow-md shadow-teal-500/20"
                      : "bg-slate-50 text-slate-600 ring-1 ring-slate-200/70"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <label className="mt-3 block text-xs font-black text-slate-700">
            你觉得哪一步最需要改进？<span className="ml-1 text-slate-400">可不填</span>
            <select
              value={improvementArea}
              onChange={(event) => setImprovementArea(event.target.value as FeedbackImprovementArea | "")}
              className="mt-2 h-11 w-full rounded-lg border border-teal-900/10 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
            >
              <option value="">暂不选择</option>
              {feedbackImprovementAreas.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="mt-3">
            <p className="text-xs font-black text-slate-700">
              你对最后选出的餐厅满意吗？<span className="ml-1 text-slate-400">可不填</span>
            </p>
            <div className="mt-2 flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDecisionSatisfaction(value)}
                  className={`grid size-9 place-items-center rounded-full text-sm font-black transition ${
                    decisionSatisfaction === value
                      ? "bg-amber-400 text-amber-950"
                      : "bg-slate-50 text-slate-500 ring-1 ring-slate-200/80"
                  }`}
                  aria-label={`${value} 分`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="哪里可以改进？可不填"
            className="mt-3 min-h-20 w-full resize-none rounded-lg border border-teal-900/10 bg-slate-50 px-3 py-3 text-sm font-bold leading-6 text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
          />
          {error ? (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-black text-rose-500">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!rating || submitting}
            onClick={() => void handleSubmit()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-black text-white shadow-sm transition enabled:active:scale-[0.98] disabled:bg-slate-300"
          >
            <Send size={16} />
            {submitting ? "提交中" : "提交反馈"}
          </button>
        </>
      )}
    </section>
  );
}
