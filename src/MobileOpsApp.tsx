import { useEffect, useState, type ReactNode } from "react"
import {
  api,
  type Booking,
  type BookingInput,
  type DashboardResponse,
  type User,
  type UserRole,
} from "./lib/api"
import MobileLogin from "./MobileLogin"
import { fallbackDashboard, type Screen } from "./mobile/data"
import {
  DetailScreen,
  EquipmentScreen,
  HomeScreen,
  ProfileScreen,
} from "./mobile/screens/core"
import { CalendarScreen } from "./mobile/screens/calendar"
import { EquipmentMapScreen } from "./mobile/screens/map"
import {
  CheckinScreen,
  CheckoutScreen,
  ScannerScreen,
} from "./mobile/screens/rental"
import { AnomalyScreen, TelemetryScreen } from "./mobile/screens/monitoring"
import { SupportScreen } from "./mobile/screens/support"
import { NotificationsScreen } from "./mobile/screens/notifications"
import NpmSecurityGuide from "./NpmSecurityGuide"

const screenIds: Screen[] = [
  "login",
  "home",
  "profile",
  "equipment",
  "detail",
  "calendar",
  "map",
  "scanner",
  "checkout",
  "checkin",
  "telemetry",
  "anomaly",
  "support",
  "notifications",
  "security",
]

const unauthenticatedUser: User = {
  id: "",
  name: "",
  company: "",
  phone: "",
  role: "renter",
}

function getScreenFromHash(): Screen {
  const hash = window.location.hash.replace(/^#\/?/, "") as Screen
  return screenIds.includes(hash) ? hash : "login"
}

export default function MobileOpsApp({
  onBackToWebsite,
  startBookingFlow = false,
}: {
  onBackToWebsite?: () => void
  startBookingFlow?: boolean
} = {}) {
  const [screen, setScreen] = useState<Screen>(() =>
    startBookingFlow ? "login" : getScreenFromHash(),
  )
  const [session, setSession] = useState<{
    message: string
    user: User
    session: {
      token: string
      role: UserRole
      expiresAt: string
    }
  } | null>(null)
  const [dashboard, setDashboard] =
    useState<DashboardResponse>(fallbackDashboard)
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string>()
  const [submittedBooking, setSubmittedBooking] = useState<Booking>()

  useEffect(() => {
    const handleHashChange = () => setScreen(getScreenFromHash())

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  useEffect(() => {
    if (!session) {
      return
    }

    let isMounted = true

    api
      .getDashboard()
      .then((data) => {
        if (isMounted) {
          setDashboard(data)
        }
      })
      .catch(() => {
        if (isMounted) {
          setDashboard(fallbackDashboard)
        }
      })

    return () => {
      isMounted = false
    }
  }, [session])

  const navigate = (nextScreen: Screen) => {
    if (nextScreen === screen) {
      return
    }

    window.location.hash = nextScreen
    setScreen(nextScreen)
  }

  const handleLogin = (result: {
    message: string
    user: User
    session: {
      token: string
      role: UserRole
      expiresAt: string
    }
  }) => {
    setSession(result)
    if (
      result.user.role === "renter" ||
      result.user.role === "tenant" ||
      result.user.role === "employee"
    ) {
      if (startBookingFlow) {
        navigate("calendar")
        return
      }

      void api
        .getWorksiteLocation(result.session.token)
        .then(({ location }) => {
          navigate(location ? "home" : "map")
        })
        .catch(() => {
          navigate("map")
        })
      return
    }
    navigate(startBookingFlow ? "calendar" : "home")
  }

  const handleSignOut = () => {
    setSession(null)
    setSelectedEquipmentId(undefined)
    setDashboard(fallbackDashboard)
    window.location.hash = "login"
    setScreen("login")
  }

  const handleEquipmentPhotoUpload = async (
    equipmentId: string,
    file: File,
  ) => {
    if (!session) {
      throw new Error("Зураг оруулахын тулд нэвтэрнэ үү.")
    }

    const result = await api.uploadEquipmentPhoto(
      equipmentId,
      file,
      session.session.token,
    )
    setDashboard((current) => ({
      ...current,
      equipment: current.equipment.map((item) =>
        item.id === equipmentId ? { ...item, photoUrl: result.photoUrl } : item,
      ),
    }))
  }

  const handleCreateBooking = async (payload: BookingInput) => {
    if (!session) {
      throw new Error("Захиалга илгээхийн тулд эхлээд нэвтэрнэ үү.")
    }

    const result = await api.createBooking(payload, session.session.token)
    setSubmittedBooking(result.booking)
    navigate("checkout")
  }

  if (screen === "login") {
    return (
      <MobileLogin onBackToWebsite={onBackToWebsite} onLogin={handleLogin} />
    )
  }

  if (screen === "security") {
    if (session?.user.role !== "manager" && session?.user.role !== "fixer") {
      return (
        <HomeScreen
          dashboard={dashboard}
          onBackToWebsite={onBackToWebsite}
          onNavigate={navigate}
          onSignOut={handleSignOut}
          role={session?.user.role ?? "renter"}
          user={session?.user ?? unauthenticatedUser}
        />
      )
    }

    return <NpmSecurityGuide onBack={() => navigate("home")} />
  }

  const screens: Record<Exclude<Screen, "login">, ReactNode> = {
    home: (
      <HomeScreen
        dashboard={dashboard}
        onBackToWebsite={onBackToWebsite}
        onNavigate={navigate}
        onSignOut={handleSignOut}
        role={session?.user.role ?? "manager"}
        user={session?.user ?? unauthenticatedUser}
      />
    ),
    profile: session ? (
      <ProfileScreen
        onNavigate={navigate}
        sessionToken={session.session.token}
        user={session.user}
      />
    ) : (
      <MobileLogin onBackToWebsite={onBackToWebsite} onLogin={handleLogin} />
    ),
    equipment: (
      <EquipmentScreen
        dashboard={dashboard}
        onNavigate={navigate}
        onSelectEquipment={setSelectedEquipmentId}
        userToken={session?.session.token}
      />
    ),
    detail: (
      <DetailScreen
        dashboard={dashboard}
        equipmentId={selectedEquipmentId}
        onNavigate={navigate}
        onUploadPhoto={handleEquipmentPhotoUpload}
      />
    ),
    calendar: (
      <CalendarScreen
        equipmentId={
          selectedEquipmentId ??
          (dashboard.equipment ?? fallbackDashboard.equipment)[0]?.id
        }
        onCreateBooking={handleCreateBooking}
        onNavigate={navigate}
        sessionToken={session?.session.token}
      />
    ),
    map: session ? (
      <EquipmentMapScreen
        equipment={dashboard.equipment}
        onNavigate={navigate}
        role={session.user.role}
        sessionToken={session.session.token}
      />
    ) : (
      <MobileLogin onBackToWebsite={onBackToWebsite} onLogin={handleLogin} />
    ),
    scanner: <ScannerScreen onNavigate={navigate} />,
    checkout: (
      <CheckoutScreen booking={submittedBooking} onNavigate={navigate} />
    ),
    checkin: <CheckinScreen onNavigate={navigate} />,
    telemetry: <TelemetryScreen dashboard={dashboard} onNavigate={navigate} />,
    anomaly: <AnomalyScreen dashboard={dashboard} onNavigate={navigate} />,
    support: <SupportScreen dashboard={dashboard} onNavigate={navigate} />,
    notifications: (
      <NotificationsScreen dashboard={dashboard} onNavigate={navigate} />
    ),
    security: null,
  }

  return screens[screen]
}
