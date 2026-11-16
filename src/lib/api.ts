export type UserRole = "manager" | "fixer" | "renter" | "employee" | "tenant"

export type Session = {
  token: string
  role: UserRole
  expiresAt: string
}

export type User = {
  id: string
  role: UserRole
  phone: string
  email?: string
  name: string
  company: string
}

export type EquipmentItem = {
  id: string
  name: string
  category?: string
  model: string
  status: string
  meta: string
  location: string
  assignee: string
  tenant: string
  due: string
  photoUrl?: string | null
  telemetry: {
    vibration: string | null
    temperature: string | null
    rpm: string | null
  }
  live: boolean
}

export type Coordinates = {
  latitude: number
  longitude: number
}

type HealthResponse = {
  status: string
  service: string
  time: string
}

type AuthResponse = {
  message: string
  user: User
  session: Session
}

type VerificationCodeResponse = {
  message: string
  developmentCode?: string
}

type RegistrationCodeInput = {
  email: string
  code: string
}

type LoginInput = {
  role: UserRole
  email: string
  password: string
}

type ResetPasswordInput = {
  email: string
  code: string
  password: string
}

type SupportRequestInput = {
  message: string
  team: string
}

type SupportTeamMember = {
  name: string
  role: string
}

export type AlertItem = {
  id: string
  title: string
  equipmentId: string
  risk: string
  location: string
  severity: "high" | "warning"
  description: string
}

export type NotificationItem = {
  id: string
  title: string
  meta: string
  type: "alert" | "calendar" | "success" | "warning"
  createdAt: string
}

export type SearchHistoryItem = {
  query: string
  searchedAt: string
}

export type BookingInput = {
  equipmentId: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  rentalDays: number
  worksiteAddress: string
  coordinates: Coordinates
  notes: string
}

export type Booking = BookingInput & {
  id: string
  status: "requested" | "approved" | "rejected" | "completed"
  createdAt: string
}

export type WorksiteLocation = {
  address: string
  coordinates: Coordinates
  updatedAt?: string
}

export type EquipmentMapLocation = {
  equipmentId: string
  address: string
  coordinates: Coordinates
  updatedAt?: string
}

export type DashboardResponse = {
  summary: {
    totalEquipment: number
    rentedToday: number
    alerts: number
    syncSecondsAgo: string
    siteName: string
  }
  equipment: EquipmentItem[]
  alerts: AlertItem[]
  notifications: NotificationItem[]
  supportTeam: SupportTeamMember[]
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || "Request failed")
  }

  return response.json() as Promise<T>
}

export const api = {
  health: () => request<HealthResponse>("/health"),
  register: (payload: {
    name: string
    company: string
    phone: string
    email: string
    password: string
  }) =>
    request<VerificationCodeResponse>("/auth/register/request-code", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  verifyRegistrationCode: (payload: RegistrationCodeInput) =>
    request<AuthResponse>("/auth/register/verify-code", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginInput) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  forgotPassword: (payload: { email: string }) =>
    request<VerificationCodeResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  resetPassword: (payload: ResetPasswordInput) =>
    request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getDashboard: () => request<DashboardResponse>("/dashboard"),
  getEquipment: () => request<EquipmentItem[]>("/equipment"),
  getEquipmentById: (id: string) => request<EquipmentItem>(`/equipment/${id}`),
  getSearchHistory: (token: string) =>
    request<{ items: SearchHistoryItem[] }>("/search-history", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  saveSearchHistory: (query: string, token: string) =>
    request<{ items: SearchHistoryItem[] }>("/search-history", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query }),
    }),
  clearSearchHistory: (token: string) =>
    request<{ ok: boolean }>("/search-history", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  createBooking: (payload: BookingInput, token: string) =>
    request<{ booking: Booking }>("/bookings", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  getBookings: (token: string) =>
    request<{ items: Booking[] }>("/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  getWorksiteLocation: (token: string) =>
    request<{ location: WorksiteLocation | null }>("/worksite-location", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  saveWorksiteLocation: (payload: WorksiteLocation, token: string) =>
    request<{ location: WorksiteLocation }>("/worksite-location", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  getEquipmentMapLocations: (token: string) =>
    request<{ locations: EquipmentMapLocation[] }>("/equipment-locations", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  saveEquipmentMapLocation: (
    equipmentId: string,
    payload: Omit<EquipmentMapLocation, "equipmentId" | "updatedAt">,
    token: string,
  ) =>
    request<{ location: EquipmentMapLocation }>(
      `/equipment/${encodeURIComponent(equipmentId)}/location`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      },
    ),
  uploadEquipmentPhoto: async (id: string, file: File, token: string) => {
    const response = await fetch(
      `/api/equipment/${encodeURIComponent(id)}/photo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type,
        },
        body: file,
      },
    )

    if (!response.ok) {
      const payload = (await response.json()) as { message?: unknown }
      throw new Error(
        typeof payload.message === "string"
          ? payload.message
          : "Зураг хадгалж чадсангүй.",
      )
    }

    return response.json() as Promise<{
      ok: boolean
      equipmentId: string
      photoUrl: string
    }>
  },
  getNotifications: () => request<NotificationItem[]>("/notifications"),
  getAlerts: () => request<AlertItem[]>("/alerts"),
  sendSupportRequest: (payload: SupportRequestInput) =>
    request<{
      ok: boolean
      message: string
      team: string
      ticketId: string
      updatedAt: string
    }>("/support", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
}
