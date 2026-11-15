import type { DashboardResponse } from "../lib/api"

export type Screen = "login" | "home" | "profile" | "equipment" | "detail" | "calendar" | "map" | "scanner" | "checkout" | "checkin" | "telemetry" | "anomaly" | "support" | "notifications" | "security"

export const fallbackDashboard: DashboardResponse = {
  summary: {
    totalEquipment: 128,
    rentedToday: 6,
    alerts: 0,
    syncSecondsAgo: "8 сек өмнө",
    siteName: "Улаанбаатар төв",
  },
  equipment: [
    {
      id: "DRL-UB-0247",
      name: "Өрмийн машин D45",
      category: "Цахилгаан багаж",
      model: "Atlas Copco D45",
      status: "Түрээстэй",
      meta: "DRL-UB-0247",
      location: "Нарны зам · Блок B",
      assignee: "Б. Бат",
      tenant: "Хөх Тэнгэр ХХК",
      due: "10-р сарын 18",
      telemetry: { vibration: null, temperature: null, rpm: null },
      live: false,
    },
    {
      id: "GEN-0162",
      name: "Генератор 150 кВА",
      category: "Үүсгүүр, компрессор, насос",
      model: "Cummins 150 kVA",
      status: "Бэлэн",
      meta: "GEN-0162",
      location: "Зүүн талбай · Хашаа 2",
      assignee: "С. Уран",
      tenant: "Монкон ХХК",
      due: "10-р сарын 14",
      telemetry: { vibration: null, temperature: null, rpm: null },
      live: false,
    },
    {
      id: "MIX-4993",
      name: "Бетон зуурагч 8м³",
      category: "Барилгын тоног төхөөрөмж",
      model: "MIX-8 PRO",
      status: "Түрээстэй",
      meta: "MIX-4993",
      location: "Талбай 12 · Блок C",
      assignee: "Н. Баяр",
      tenant: "Улаанбаатар бетон",
      due: "10-р сарын 16",
      telemetry: { vibration: null, temperature: null, rpm: null },
      live: false,
    },
  ],
  alerts: [],
  notifications: [
    {
      id: "n-2",
      title: "Хугацаа 2 цагийн дараа дуусна",
      meta: "Өрмийн машин D45",
      type: "calendar",
      createdAt: "Өнөөдөр · 12:50",
    },
  ],
  supportTeam: [
    { name: "Д. Эрдэнэ", role: "Техникч · 7 мин" },
    { name: "С. Номин", role: "Менежер · ONLINE" },
  ],
}
