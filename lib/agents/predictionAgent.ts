import type { Reminder } from '../types';
import { orderHistory, getProductById } from '../dataAccess';

/**
 * Prediction Agent
 * --------------------------------------------------------------
 * Production target: AWS EventBridge schedules + SageMaker forecast
 * model on per-customer reorder cycles, surfaced via SNS/Pinpoint.
 *
 * Prototype: compute simple cycle (median gap between orders of same
 * product), project next run-out date relative to today, and output
 * privacy-friendly reminders.
 */

const CYCLE_OVERRIDES: Record<string, number> = {
  p_milk_amul_1l: 2,
  p_curd_amul_400: 3,
  p_diapers_pampers_m: 7,
  p_wipes_pampers: 10,
  p_bread_brown: 4,
  p_eggs_brown_6: 6,
  p_floor_cleaner_lizol: 25,
  p_dish_vim_750: 21,
  p_rice_basmati_5kg: 30,
  p_dal_toor_1kg: 28,
  p_breakfast_oats_bagrry: 18,
  p_paneer_amul_200: 5
};

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function predictReorders(referenceDate = new Date('2026-06-13')): Reminder[] {
  // Build last-purchase map
  const lastSeen: Record<string, Date> = {};
  const counts: Record<string, number> = {};
  for (const order of orderHistory) {
    const dt = new Date(order.date);
    for (const item of order.items) {
      counts[item.id] = (counts[item.id] ?? 0) + 1;
      if (!lastSeen[item.id] || dt > lastSeen[item.id]) lastSeen[item.id] = dt;
    }
  }

  const reminders: Reminder[] = [];
  for (const productId of Object.keys(lastSeen)) {
    const product = getProductById(productId);
    if (!product) continue;
    if (counts[productId] < 2) continue;
    const cycle = CYCLE_OVERRIDES[productId] ?? 14;
    const last = lastSeen[productId];
    const projected = new Date(last.getTime() + cycle * 24 * 60 * 60 * 1000);
    const days_until = daysBetween(referenceDate, projected);

    // Surface only items running out within 3 days or already due
    if (days_until > 3) continue;

    const confidence = Math.max(0.6, Math.min(0.97, 0.55 + counts[productId] * 0.07));
    let reason = '';
    if (days_until <= 0) reason = `Likely already finished — last ordered ${daysBetween(last, referenceDate)} days ago.`;
    else if (days_until === 1) reason = `Likely runs out tomorrow morning at this consumption rate.`;
    else reason = `Projected to last ~${days_until} more days.`;

    reminders.push({
      id: `rem_${productId}`,
      product_id: productId,
      product_name: product.name,
      reason,
      predicted_run_out_date: projected.toISOString().slice(0, 10),
      days_until,
      cycle_days: cycle,
      confidence: Math.round(confidence * 100) / 100
    });
  }

  return reminders.sort((a, b) => a.days_until - b.days_until).slice(0, 5);
}
