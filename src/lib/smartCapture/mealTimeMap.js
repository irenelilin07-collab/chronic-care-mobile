export const MEAL_TIME_MAP = {
  早饭前: { mealHint: "before_breakfast", time: "07:30", label: "早饭前" },
  早餐前: { mealHint: "before_breakfast", time: "07:30", label: "早餐前" },
  早饭后: { mealHint: "after_breakfast", time: "08:30", label: "早饭后" },
  早餐后: { mealHint: "after_breakfast", time: "08:30", label: "早餐后" },
  午饭前: { mealHint: "before_lunch", time: "11:30", label: "午饭前" },
  午餐前: { mealHint: "before_lunch", time: "11:30", label: "午餐前" },
  午饭后: { mealHint: "after_lunch", time: "12:30", label: "午饭后" },
  午餐后: { mealHint: "after_lunch", time: "12:30", label: "午餐后" },
  晚饭前: { mealHint: "before_dinner", time: "17:30", label: "晚饭前" },
  晚餐前: { mealHint: "before_dinner", time: "17:30", label: "晚餐前" },
  晚饭后: { mealHint: "after_dinner", time: "18:30", label: "晚饭后" },
  晚餐后: { mealHint: "after_dinner", time: "18:30", label: "晚餐后" },
  睡前: { mealHint: "before_sleep", time: "21:00", label: "睡前" },
  早上: { mealHint: "after_breakfast", time: "08:30", label: "早上" },
  中午: { mealHint: "after_lunch", time: "12:30", label: "中午" },
  晚上: { mealHint: "after_dinner", time: "18:30", label: "晚上" },
};

export const MEAL_KEYWORDS = Object.keys(MEAL_TIME_MAP).sort((a, b) => b.length - a.length);

export function mealInfoFromText(text) {
  for (const keyword of MEAL_KEYWORDS) {
    if (text.includes(keyword)) {
      return { keyword, ...MEAL_TIME_MAP[keyword] };
    }
  }
  return null;
}

export function labelFromMealHint(hint) {
  const entry = Object.values(MEAL_TIME_MAP).find((item) => item.mealHint === hint);
  return entry?.label || hint;
}

export function buildTimeLabel({ frequency, times, mealHints = [] }) {
  const timeText = (times || []).join("、") || "未设时间";
  if (frequency === "weekly") {
    return `每周 · ${timeText}`;
  }
  if (frequency === "interval") {
    return `间隔服药 · ${timeText}`;
  }
  if (mealHints.length > 0) {
    const labels = [...new Set(mealHints.map(labelFromMealHint))].filter(Boolean);
    if (labels.length > 0) {
      return `每天${labels.join("、")}（约 ${timeText}）`;
    }
  }
  return `每天 · ${timeText}`;
}
