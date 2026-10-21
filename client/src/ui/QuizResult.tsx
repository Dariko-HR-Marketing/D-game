import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Banner } from "./kit";
import { uz } from "../i18n/uz";
import type { RoomView } from "../net/connection";

/** Viktorina natijasi (faqat javob bergan o'yinchiga, qisqa muddat): to'g'ri/noto'g'ri va to'g'ri javob harfi. Yangi natija `lastQuiz.n` bo'yicha aniqlanadi. */
export function QuizResult({ room, userId }: { room: RoomView; userId: string }) {
  const q = (room.state as any)?.lastQuiz as { playerId: string; choice: string | null; correct: boolean; answer: string; n: number } | null | undefined;
  const seen = useRef<number | null | undefined>(undefined); const [show, setShow] = useState<typeof q>(null);
  useEffect(() => {
    if (seen.current === undefined) { seen.current = q?.n ?? 0; return; } // sahifa ochilganda mavjud (eski) natija ko'rsatilmaydi
    if (!q || q.n === seen.current) return; seen.current = q.n; if (q.playerId !== userId) return;
    setShow(q); const h = setTimeout(() => setShow(null), 9000); return () => clearTimeout(h);
  }, [q?.n]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null; const T = uz.ops.quiz;
  const text = show.correct ? T.right : show.choice === null ? T.late.replace("{a}", show.answer) : T.wrong.replace("{a}", show.answer);
  return <View testID="quiz-result" role="status" aria-live="polite"><Banner kind={show.correct ? "good" : "warn"}>{text}</Banner></View>;
}
