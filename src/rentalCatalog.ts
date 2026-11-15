const catalogGroups = [
  {
    category: "Цахилгаан багаж",
    dailyUsdRange: [10, 60],
    items: [
      ["Цахилгаан өрмийн машин", "Drill"],
      ["Цохилтот өрөм / перфоратор", "Hammer drill / Rotary hammer"],
      ["Алмаазан өрмийн машин", "Core drill"],
      ["Халдаг шураг чангалагч", "Cordless screwdriver / Impact driver"],
      ["Өнцөгт ган хөрөө / болгарка", "Angle grinder"],
      ["Цахилгаан хөрөө", "Circular saw"],
      ["Шүдтэй хөрөө", "Jigsaw"],
      ["Гинжит хөрөө", "Chainsaw"],
      ["Хавтгай үрэгч / зүлгүүрийн машин", "Sander"],
      ["Нураагч алх / цахилгаан сүх", "Demolition hammer / Jackhammer"],
      ["Цахилгаан гөлгөржүүлэгч", "Planer"],
      ["Хэв үүсгэгч / фрез", "Router"],
    ],
  },
  {
    category: "Гагнуур, дулаан",
    dailyUsdRange: [20, 120],
    items: [
      ["Гагнуурын аппарат", "Welding machine"],
      ["Хийн гагнуур", "Gas welder"],
      ["Барилгын фен", "Heat gun"],
      ["Дулааны буу / халаагуур", "Heater"],
    ],
  },
  {
    category: "Үүсгүүр, компрессор, насос",
    dailyUsdRange: [35, 300],
    items: [
      ["Цахилгаан үүсгүүр / генератор", "Generator"],
      ["Агаарын компрессор", "Air compressor"],
      ["Усны насос", "Water pump"],
      ["Даралтат угаагч", "Pressure washer"],
    ],
  },
  {
    category: "Барилгын тоног төхөөрөмж",
    dailyUsdRange: [10, 200],
    items: [
      ["Бетон холигч", "Concrete mixer"],
      ["Бетон чичиргээгч", "Concrete vibrator"],
      ["Шалны хавтан таслагч", "Tile cutter"],
      ["Шатлал / тулгуур", "Scaffolding"],
      ["Налуу шат", "Ladder"],
      ["Тэрэг / ачаа зөөгч", "Wheelbarrow / Hand truck"],
      ["Бетон хөрөө таслагч", "Floor saw"],
    ],
  },
  {
    category: "Хүнд даацын машин механизм",
    dailyUsdRange: [150, 1500],
    items: [
      ["Экскаватор", "Excavator"],
      ["Мини экскаватор", "Mini excavator"],
      ["Бульдозер", "Bulldozer"],
      ["Ачигч / погрузчик", "Loader"],
      ["Автокран", "Crane"],
      ["Самосвал", "Dump truck"],
      ["Бетон холигч машин", "Concrete mixer truck"],
      ["Грейдер", "Grader"],
      ["Каток", "Road roller"],
      ["Сэрээт ачигч / форклифт", "Forklift"],
    ],
  },
  {
    category: "Тээврийн хэрэгсэл",
    dailyUsdRange: [45, 450],
    items: [
      ["Суудлын машин", "Car"],
      ["Жийп / SUV", "SUV"],
      ["Ачааны машин", "Truck"],
      ["Пикап", "Pickup"],
      ["Микро автобус", "Minibus"],
      ["Трактор", "Tractor"],
      ["Чиргүүл", "Trailer"],
      ["Мотоцикл / ATV", "Motorcycle / ATV"],
    ],
  },
  {
    category: "Хөдөө аж ахуй, цэвэрлэгээ",
    dailyUsdRange: [20, 250],
    items: [
      ["Өвс хадагч", "Mower"],
      ["Цасны хусагч", "Snow blower"],
      ["Бутлуур", "Wood chipper"],
      ["Цэвэрлэгээний аппарат", "Industrial vacuum"],
      ["Шүршигч", "Sprayer"],
    ],
  },
  {
    category: "Хэмжих, шалгах",
    dailyUsdRange: [10, 100],
    items: [
      ["Лазер хэмжигч", "Laser measure"],
      ["Нивелир", "Level"],
      ["Мультиметр", "Multimeter"],
      ["Дулаан хэмжигч / тепловизор", "Thermal camera"],
      ["Гар хэмжүүр", "Caliper"],
    ],
  },
  {
    category: "Аюулгүй байдал, гэрэлтүүлэг",
    dailyUsdRange: [5, 80],
    items: [
      ["Прожектор / гэрэл", "Floodlight"],
      ["Хамгаалалтын малгай, нүдний шил", "PPE set"],
      ["Гал унтраагуур", "Fire extinguisher"],
      ["Хашаа / хамгаалалтын тор", "Safety barrier"],
    ],
  },
  {
    category: "Арга хэмжээ, хэрэглээ",
    dailyUsdRange: [10, 500],
    items: [
      ["Майхан", "Tent"],
      ["Сандал, ширээ", "Chairs / Tables"],
      ["Дуу чимээний систем", "Sound system"],
      ["Проектор", "Projector"],
    ],
  },
] as const

export const rentalCategories = catalogGroups.map((group) => group.category)

export const rentalCategoryIcons: Record<string, string> = {
  "Цахилгаан багаж": "🔧",
  "Гагнуур, дулаан": "🔥",
  "Үүсгүүр, компрессор, насос": "⚡",
  "Барилгын тоног төхөөрөмж": "🏗️",
  "Хүнд даацын машин механизм": "🚜",
  "Тээврийн хэрэгсэл": "🚚",
  "Хөдөө аж ахуй, цэвэрлэгээ": "🌾",
  "Хэмжих, шалгах": "📏",
  "Аюулгүй байдал, гэрэлтүүлэг": "🦺",
  "Арга хэмжээ, хэрэглээ": "🎪",
}

export const rentalCategoryImages: Record<string, string> = {
  "Цахилгаан багаж":
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=85",
  "Гагнуур, дулаан":
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=85",
  "Үүсгүүр, компрессор, насос":
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=85",
  "Барилгын тоног төхөөрөмж":
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
  "Хүнд даацын машин механизм":
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
  "Тээврийн хэрэгсэл":
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=85",
  "Хөдөө аж ахуй, цэвэрлэгээ":
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=85",
  "Хэмжих, шалгах":
    "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=900&q=85",
  "Аюулгүй байдал, гэрэлтүүлэг":
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=85",
  "Арга хэмжээ, хэрэглээ":
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85",
}

const equipmentVisuals: Record<string, string> = {
  Drill: "🛠️",
  "Hammer drill / Rotary hammer": "🔨",
  "Core drill": "💎",
  "Cordless screwdriver / Impact driver": "🪛",
  "Angle grinder": "⚙️",
  "Circular saw": "🪚",
  Jigsaw: "🪚",
  Chainsaw: "🪓",
  Sander: "🧽",
  "Demolition hammer / Jackhammer": "⚒️",
  Planer: "🪵",
  Router: "🔩",
  "Welding machine": "🔥",
  "Gas welder": "🔥",
  "Heat gun": "♨️",
  Heater: "🌡️",
  Generator: "⚡",
  "Air compressor": "🌀",
  "Water pump": "💧",
  "Pressure washer": "🚿",
  "Concrete mixer": "🏗️",
  "Concrete vibrator": "〰️",
  "Tile cutter": "🔪",
  Scaffolding: "🏗️",
  Ladder: "🪜",
  "Wheelbarrow / Hand truck": "🛒",
  "Floor saw": "🪚",
  Excavator: "🚜",
  "Mini excavator": "🚜",
  Bulldozer: "🚧",
  Loader: "🏗️",
  Crane: "🏗️",
  "Dump truck": "🚛",
  "Concrete mixer truck": "🚚",
  Grader: "🚜",
  "Road roller": "🛞",
  Forklift: "🏗️",
  Car: "🚗",
  SUV: "🚙",
  Truck: "🚚",
  Pickup: "🛻",
  Minibus: "🚐",
  Tractor: "🚜",
  Trailer: "🚛",
  "Motorcycle / ATV": "🏍️",
  Mower: "🌱",
  "Snow blower": "❄️",
  "Wood chipper": "🪵",
  "Industrial vacuum": "🧹",
  Sprayer: "💦",
  "Laser measure": "📏",
  Level: "📐",
  Multimeter: "🔌",
  "Thermal camera": "🌡️",
  Caliper: "📏",
  Floodlight: "💡",
  "PPE set": "⛑️",
  "Fire extinguisher": "🧯",
  "Safety barrier": "🚧",
  Tent: "⛺",
  "Chairs / Tables": "🪑",
  "Sound system": "🔊",
  Projector: "📽️",
}

const equipmentPhotos: Record<string, string> = {
  "Cordless screwdriver / Impact driver":
    "/assets/equipment-catalog/precision-screwdriver.png",
  Drill: "/assets/equipment-catalog/drill.png",
  "Hammer drill / Rotary hammer":
    "/assets/equipment-catalog/perforator.png",
  "Core drill": "/assets/equipment-catalog/diamond-drill-rig.png",
  "Angle grinder": "/assets/equipment-catalog/metal-bandsaw.png",
  "Circular saw": "/assets/equipment-catalog/electric-saw.png",
  Jigsaw: "/assets/equipment-catalog/hand-saw.png",
  Chainsaw: "/assets/equipment-catalog/chainsaw.png",
  Sander: "/assets/equipment-catalog/sander.png",
  "Demolition hammer / Jackhammer":
    "/assets/equipment-catalog/demolition-axe.png",
  Router: "/assets/equipment-catalog/milling-bits.png",
  Generator: "/assets/equipment-catalog/generator.png",
}

const artworkPalettes = [
  ["#d9f3ff", "#83c9e8", "#1677a8"],
  ["#fff0dd", "#f6b575", "#bd7111"],
  ["#e3f7ef", "#83d1b1", "#238a62"],
  ["#e9e9ff", "#aaa9ef", "#5554a3"],
  ["#fce8e7", "#efa09a", "#c53c36"],
] as const

const createEquipmentArtwork = (
  name: string,
  category: string,
  emoji: string,
  index: number,
) => {
  const [light, mid, accent] = artworkPalettes[index % artworkPalettes.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420"><title>${name}</title><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${light}"/><stop offset="1" stop-color="${mid}"/></linearGradient><pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#fff" stroke-opacity=".35"/></pattern></defs><rect width="900" height="420" rx="28" fill="url(#bg)"/><rect width="900" height="420" rx="28" fill="url(#grid)"/><circle cx="690" cy="72" r="152" fill="#fff" fill-opacity=".2"/><circle cx="155" cy="388" r="170" fill="${accent}" fill-opacity=".13"/><rect x="52" y="46" width="796" height="328" rx="24" fill="#fff" fill-opacity=".34" stroke="#fff" stroke-opacity=".65" stroke-width="2"/><circle cx="450" cy="175" r="94" fill="#fff" fill-opacity=".8"/><text x="450" y="215" text-anchor="middle" font-size="108" font-family="Arial,sans-serif">${emoji}</text><text x="450" y="300" text-anchor="middle" fill="#14212a" font-size="23" font-family="Arial,sans-serif" font-weight="700">${name}</text><text x="450" y="340" text-anchor="middle" fill="${accent}" font-size="19" font-family="Arial,sans-serif" font-weight="700">${category}</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const USD_TO_MNT_RATE = 3599.06
export const USD_TO_MNT_AS_OF = "2026-11-13"

export const rentalCatalog = catalogGroups.flatMap((group) =>
  group.items.map(([name, englishName], index) => {
    const emoji = equipmentVisuals[englishName] ?? "🧰"
    return {
      id: `${group.category}-${index}`,
      category: group.category,
      dailyUsdRange: group.dailyUsdRange,
      name,
      englishName,
      image:
        equipmentPhotos[englishName] ??
        createEquipmentArtwork(name, group.category, emoji, index),
    }
  }),
)
