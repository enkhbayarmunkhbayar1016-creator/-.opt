import type { Screen } from "../data"
import type { Booking } from "../../lib/api"
import {
  Card,
  Header,
  Icon,
  MobilePage,
  StatusPill,
  equipmentPhoto,
  equipmentRearPhoto,
  icons,
} from "../ui"

export function ScannerScreen({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void
}) {
  return (
    <MobilePage current="scanner" onNavigate={onNavigate}>
      <div className="relative flex min-h-[calc(100dvh-66px)] flex-1 flex-col overflow-hidden bg-[#0d1820] text-white">
        <Header
          action={
            <span className="text-[10px] text-[#9aabb4]">DRL-UB-0247</span>
          }
          onBack={() => onNavigate("home")}
          subtitle="Төхөөрөмжийн шошгыг хүрээнд тааруулна уу"
          title="QR код уншуулах"
        />
        <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#17252d]">
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
            src={equipmentRearPhoto}
          />
          <div className="relative flex aspect-square w-[58%] items-center justify-center rounded-[22px] border-2 border-white">
            <span className="h-px w-[80%] bg-[#1677a8] shadow-[0_0_14px_#3fc5ff]" />
            <span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-[8px]">
              QR кодыг хүрээнд оруулна уу
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-[#0d1820] p-3">
          <button
            className="h-[44px] rounded-lg bg-white text-[10px] font-bold text-[#1677a8]"
            onClick={() => onNavigate("checkout")}
            type="button"
          >
            Зураг сонгох
          </button>
          <button
            className="h-[44px] rounded-lg bg-white text-[10px] font-bold text-[#1677a8]"
            onClick={() => onNavigate("detail")}
            type="button"
          >
            ID оруулах
          </button>
        </div>
      </div>
    </MobilePage>
  )
}

type ChecklistProps = {
  title: string
  items: string[]
}

function Checklist({ title, items }: ChecklistProps) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-[#e4eaed] p-3">
        <h2 className="font-['Inter:Bold'] text-[11px] font-bold">{title}</h2>
        <span className="text-[8px] text-[#7b8992]">
          {items.length}/{items.length}
        </span>
      </div>
      <div className="p-3">
        {items.map((item) => (
          <div className="flex items-center gap-2 py-1.5" key={item}>
            <span className="flex size-5 items-center justify-center rounded bg-[#dff3e9]">
              <Icon className="size-3" src={icons.check} />
            </span>
            <span className="flex-1 text-[10px]">{item}</span>
            <span className="text-[8px] text-[#29906b]">Хэвийн</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function CheckoutScreen({
  onNavigate,
  booking,
}: {
  onNavigate: (screen: Screen) => void
  booking?: Booking
}) {
  return (
    <MobilePage current="checkout" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("calendar")}
        subtitle="GEN-0162 · Генератор 150 кВА"
        title="Check-out · Олголт"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        {booking && (
          <Card className="space-y-2 border border-[#b8dfc7] bg-[#f0faf4] p-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-bold text-[#19724b]">
                Захиалгын хүсэлт хадгалагдлаа
              </h2>
              <StatusPill tone="green">ХҮСЭЛТ</StatusPill>
            </div>
            <p className="break-all text-[8px] text-[#5d6e79]">
              Захиалгын дугаар: {booking.id}
            </p>
            <p className="text-[9px]">Төхөөрөмж: {booking.equipmentId}</p>
            <p className="text-[9px]">Байршил: {booking.worksiteAddress}</p>
            <p className="text-[8px] text-[#5d6e79]">
              Координат: {booking.coordinates.latitude.toFixed(6)},{" "}
              {booking.coordinates.longitude.toFixed(6)} · {booking.startDate} –{" "}
              {booking.endDate}
            </p>
            {booking.notes && (
              <p className="text-[9px]">Тайлбар: {booking.notes}</p>
            )}
            <a
              className="inline-block text-[9px] font-bold text-[#1677a8] underline"
              href={`https://maps.google.com/?q=${booking.coordinates.latitude},${booking.coordinates.longitude}`}
              rel="noreferrer"
              target="_blank"
            >
              Захиалгын pin-ийг Google Maps дээр нээх
            </a>
          </Card>
        )}
        <Card className="flex items-center gap-3 p-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-[#e2f1f7]">
            <Icon className="size-5" src={icons.truck} />
          </span>
          <div className="flex-1">
            <p className="font-['Inter:Bold'] text-[11px] font-bold">
              Генератор 150 кВА
            </p>
            <p className="mt-1 text-[8px] text-[#7b8992]">GEN-0162</p>
          </div>
          <StatusPill tone="green">QR OK</StatusPill>
        </Card>
        <Checklist
          items={[
            "Гадна их бие, будгийн",
            "Хамгаалалтын хаалт",
            "Тос, түлшний түвшин",
            "Кабель, залгуурын бүрдэл",
          ]}
          title="Төхөөрөмжийн байдлыг шалгах"
        />
        <Card className="p-3">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
            Олголтын зураг
          </h2>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[equipmentPhoto, equipmentRearPhoto, equipmentPhoto].map(
              (photo, index) => (
                <img
                  alt=""
                  className="aspect-square rounded-lg object-cover"
                  key={index}
                  src={photo}
                />
              ),
            )}
            <button
              className="aspect-square rounded-lg border border-dashed border-[#1677a8] bg-[#edf7fa] text-xl text-[#1677a8]"
              type="button"
            >
              +
            </button>
          </div>
        </Card>
        <Card className="p-3">
          <label className="flex items-center gap-2">
            <input className="accent-[#1677a8]" type="checkbox" />
            <span className="text-[9px]">
              Хүлээн авагчид нөхцөл, зааврыг танилцуулсан
            </span>
          </label>
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#1677a8] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("detail")}
          type="button"
        >
          Check-out баталгаажуулах
        </button>
      </div>
    </MobilePage>
  )
}

export function CheckinScreen({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void
}) {
  return (
    <MobilePage current="checkin" onNavigate={onNavigate}>
      <Header
        onBack={() => onNavigate("detail")}
        subtitle="DRL-UB-0247 · Өрмийн машин D45"
        title="Check-in · Буцаалт"
      />
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="rounded-lg border border-[#f0cf94] bg-[#fff4df] p-3">
          <div className="flex items-center justify-between">
            <p className="font-['Inter:Bold'] text-[11px] font-bold">
              Буцаалт 18 мин хоцорсон
            </p>
            <StatusPill tone="orange">ШАЛГАХ</StatusPill>
          </div>
        </div>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
              Зургийн харьцуулалт
            </h2>
            <span className="text-[8px] text-[#7b8992]">AI 96%</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <img
                alt=""
                className="aspect-[4/3] w-full rounded-lg object-cover"
                src={equipmentPhoto}
              />
              <p className="mt-1 text-[8px]">Олголтын зураг</p>
            </div>
            <div>
              <img
                alt=""
                className="aspect-[4/3] w-full rounded-lg border-2 border-[#e0a137] object-cover"
                src={equipmentRearPhoto}
              />
              <p className="mt-1 text-[8px] text-[#c27a19]">Одоогийн зураг</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-[#fff4df] p-2 text-[9px] text-[#a36518]">
            Шинэ өөрчлөлт илэрсэн · баруун хэсэгт зураас
          </div>
        </Card>
        <Card className="p-3">
          <h2 className="font-['Inter:Bold'] text-[11px] font-bold">
            Эвдрэл, дутагдал
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {["Эвдрэлгүй", "Зураас", "Бусад"].map((item, index) => (
              <button
                className={`rounded-lg border p-3 text-[9px] ${
                  index === 1
                    ? "border-[#df4a43] bg-[#fff1f0] text-[#c53c36]"
                    : "border-[#dce4e8]"
                }`}
                key={item}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
          <textarea
            className="mt-3 min-h-[58px] w-full rounded-lg border border-[#dce4e8] p-3 text-[9px] outline-none"
            placeholder="Тайлбар нэмэх..."
          />
        </Card>
        <button
          className="mt-auto h-[48px] rounded-[9px] bg-[#d8463e] font-['Inter:Bold'] text-[12px] font-bold text-white"
          onClick={() => onNavigate("equipment")}
          type="button"
        >
          Буцаалт нээж, акт үүсгэх
        </button>
      </div>
    </MobilePage>
  )
}
