import type { PriorityLevel } from "@prisma/client";
export function calculatePriority(v: { severity: number; safetyRisk: number; affectedPeople: number; durationDays: number }): { score: number; level: PriorityLevel } {
  // Skala 1–5, bobot eksplisit: keselamatan 35%, keparahan 30%, terdampak 20%, durasi 15%.
  const duration = v.durationDays >= 30 ? 5 : v.durationDays >= 14 ? 4 : v.durationDays >= 7 ? 3 : v.durationDays >= 2 ? 2 : 1;
  const score = Math.round((v.severity * .30 + v.safetyRisk * .35 + v.affectedPeople * .20 + duration * .15) * 100) / 100;
  return { score, level: score >= 4.25 ? "CRITICAL" : score >= 3.5 ? "HIGH" : score >= 2.5 ? "MEDIUM" : "LOW" };
}
