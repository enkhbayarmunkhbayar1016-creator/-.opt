import type { DashboardResponse } from "../../lib/api"
import type { Screen } from "../data"
import { Card, Header, MobilePage, StatusPill } from "../ui"

export function TelemetryScreen({
  dashboard,
  onNavigate,
}: {
  dashboard: DashboardResponse
  onNavigate: (screen: Screen) => void
}) {
  const readings = dashboard.equipment.flatMap((equipment) =>
    Object.entries(equipment.telemetry)
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([metric, value]) => ({ equipment, metric, value })),
  )

  return (
    <MobilePage current="telemetry" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("detail")}
        subtitle="Бодит төхөөрөмжийн уншилт"
        title="Телеметр"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        {readings.length ? (
          readings.map(({ equipment, metric, value }) => (
            <Card className="flex items-center justify-between p-3" key={`${equipment.id}-${metric}`}>
              <div>
                <p className="font-['Inter:Bold'] text-[10px] font-bold">
                  {equipment.name}
                </p>
                <p className="mt-1 text-[9px] text-[#71808a]">{metric}</p>
              </div>
              <p className="font-['Roboto_Mono:Bold'] text-[14px] font-bold text-[#1677a8]">
                {value}
              </p>
            </Card>
          ))
        ) : (
          <Card className="p-4">
            <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
              Мэдрэгчийн өгөгдөл алга
            </h2>
            <p className="mt-2 text-[10px] leading-5 text-[#6c7c87]">
              Төхөөрөмжөөс бодит уншилт ирээгүй тул температур, эргэлт болон
              чичиргээний утга харуулахгүй.
            </p>
          </Card>
        )}
      </div>
    </MobilePage>
  )
}

export function AnomalyScreen({
  dashboard,
  onNavigate,
}: {
  dashboard: DashboardResponse
  onNavigate: (screen: Screen) => void
}) {
  const alert = dashboard.alerts[0]

  return (
    <MobilePage current="anomaly" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("home")}
        subtitle={alert ? `${alert.equipmentId} · ${alert.location}` : "Бодит мэдэгдэл"}
        title="Анхааруулга"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        {alert ? (
          <Card className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
                  {alert.title}
                </h2>
                <p className="mt-2 text-[10px] text-[#6c7c87]">
                  {alert.description}
                </p>
              </div>
              <StatusPill tone={alert.severity === "high" ? "orange" : "blue"}>
                {alert.risk}
              </StatusPill>
            </div>
          </Card>
        ) : (
          <Card className="p-4">
            <h2 className="font-['Inter:Bold'] text-[12px] font-bold">
              Одоогоор бодит анхааруулга алга
            </h2>
            <p className="mt-2 text-[10px] leading-5 text-[#6c7c87]">
              Мэдрэгчийн уншилт ирээгүй тул температурын эрсдэл үүсгэж
              харуулахгүй.
            </p>
          </Card>
        )}
        <button
          className="mt-auto h-[44px] rounded-lg bg-[#1677a8] font-['Inter:Bold'] text-[10px] font-bold text-white"
          onClick={() => onNavigate("home")}
          type="button"
        >
          Нүүр хуудас руу буцах
        </button>
      </div>
    </MobilePage>
  )
}
