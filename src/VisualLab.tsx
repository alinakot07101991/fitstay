import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { onAuthStateChanged } from "firebase/auth"
import {
  Bookmark,
  ChevronRight,
  CircleHelp,
  Coffee,
  Dog,
  Heart,
  Hotel,
  Menu,
  Mic,
  LoaderCircle,
  PanelLeft,
  Plane,
  Plus,
  Search,
  Settings,
  Square,
  Sparkles,
  ArrowUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react"
import aiBlob from "@/imports/blob-animation.png"
import rhodesImage from "@/imports/destination-rhodes.png"
import baliImage from "@/imports/destination-bali.png"
import barcelonaImage from "@/imports/destination-barcelona.png"
import maldivesImage from "@/imports/destination-maldives.png"
import pragueImage from "@/imports/destination-prague.png"
import onboardingTravelersImage from "@/imports/onboarding-travelers-v1.png"
import onboardingPreferencesImage from "@/imports/onboarding-preferences-v1.png"
import onboardingPrioritiesImage from "@/imports/onboarding-priorities-v2.jpg"
import { auth } from "./firebase"
import { useVoiceTranscription } from "./useVoiceTranscription"
import { completeOnboarding } from "./onboardingStore"
import {
  createHotelCheckRecord,
  loadHotelChecks,
  markLatestDraftChecked,
  readLocalHotelChecks,
  saveHotelCheck,
  upsertLocalHotelCheck,
  type HotelCheckRecord,
} from "./hotelCheckStore"

type Viewport = "desktop" | "tablet" | "mobile"
type ScreenId = "signup" | "verify" | "onboarding" | "home" | "home-draft" | "home-history" | "identify" | "ambiguous" | "not-found" | "paywall" | "analysis" | "preliminary" | "result" | "no-data" | "failed" | "alternative" | "alternative-result" | "profile" | "saved" | "settings" | "help"
type HistoryState = "empty" | "draft" | "history" | "history-with-draft" | "active"
type HistoryEntry = [string, string, string, string, string?]
type Go = (id: ScreenId) => void
type HotelOption = {
  place: string
  hotel: string
  image?: string
  domains?: string[]
}

const defaultDraftHotel: HotelOption = {
  place: "Rhodes, Greece",
  hotel: "Gennadi Grand Resort",
  image: rhodesImage,
}

const DraftContext = createContext<{
  hasDraft: boolean
  draftHotel: HotelOption | null
  hotelChecks: HotelCheckRecord[]
  createDraft: (hotel: HotelOption) => void
  resolveDraft: () => void
}>({
  hasDraft: false,
  draftHotel: null,
  hotelChecks: [],
  createDraft: () => {},
  resolveDraft: () => {},
})

const destinationImages: Record<string, string> = {
  "Gennadi Grand Resort": rhodesImage,
  "The Apurva Kempinski Bali": baliImage,
  "Hotel Neri Relais & Châteaux": barcelonaImage,
  "Baros Maldives": maldivesImage,
  "Hotel Josef": pragueImage,
  "Mitsis Rinela Beach Resort & Spa": rhodesImage,
  "Hilton London Metropole": barcelonaImage,
  "Hilton Bali Resort": baliImage,
  "Hilton Hawaiian Village": maldivesImage,
  "Hilton Dubai Palm Jumeirah": rhodesImage,
  "Hilton Tokyo": pragueImage,
}

function historyEntryFromRecord(record: HotelCheckRecord): HistoryEntry {
  return [
    record.place,
    record.hotel,
    new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(record.updatedAt)),
    destinationImages[record.hotel] || rhodesImage,
    record.status === "draft" ? "Draft" : undefined,
  ]
}

function mergeHistoryEntries(...groups: HistoryEntry[][]): HistoryEntry[] {
  const seenHotels = new Set<string>()
  return groups.flat().filter((entry) => {
    const hotelKey = entry[1].trim().toLocaleLowerCase()
    if (seenHotels.has(hotelKey)) return false
    seenHotels.add(hotelKey)
    return true
  })
}

const groups: Array<{
  label: string
  items: Array<[ScreenId, string, string]>
}> = [
  {
    label: "Account",
    items: [
      ["signup", "Create account", "Authentication"],
      ["verify", "Check your email", "Passwordless link"],
      ["onboarding", "Onboarding", "Minimum profile"],
    ],
  },
  {
    label: "Core check",
    items: [
      ["home", "Home · first visit", "Empty history"],
      ["home-draft", "Home · draft", "Identified hotel"],
      ["home-history", "Home · history", "Completed checks"],
      ["identify", "Hotel identified", "Confirmation"],
      ["ambiguous", "Choose hotel", "Multiple matches"],
      ["not-found", "Hotel not found", "Recovery"],
      ["paywall", "Paywall", "No credits"],
      ["analysis", "Analysis", "Background progress"],
      ["preliminary", "Limited evidence", "User decision"],
      ["result", "Result", "Full result"],
      ["no-data", "Not enough data", "Credit returned"],
      ["failed", "Check failed", "Recovery"],
    ],
  },
  {
    label: "Follow-up",
    items: [
      ["alternative", "Find alternative", "Setup"],
      ["alternative-result", "Alternative result", "Verified match"],
      ["profile", "Profile", "Travel defaults"],
      ["saved", "Saved hotels", "Saved results"],
      ["settings", "Settings", "Account settings"],
      ["help", "Help & Support", "Support"],
    ],
  },
]
const widths: Record<Viewport, number> = {
  desktop: 1440,
  tablet: 768,
  mobile: 390,
}

function Brand() {
  return (
    <span className="text-[19px] font-bold tracking-[-.05em]">
      fitstay<span className="text-[#f06455]">.</span>
    </span>
  )
}
const icons: Record<string, LucideIcon> = {
  plus: Plus,
  arrow: ChevronRight,
  menu: Menu,
  spark: Sparkles,
  checkSpark: Sparkles,
  close: X,
  collapse: PanelLeft,
  expand: PanelLeft,
  heart: Heart,
  hotel: Hotel,
  settings: Settings,
  help: CircleHelp,
  search: Search,
  bookmark: Bookmark,
  microphone: Mic,
  loader: LoaderCircle,
  send: ArrowUp,
  stop: Square,
  users: Users,
  dog: Dog,
  cup: Coffee,
  plane: Plane,
}

function Icon({ name, size = 18 }: { name: string size?: number }) {
  const LucideGlyph = icons[name] || ChevronRight
  return <LucideGlyph size={size} strokeWidth={1.7} aria-hidden="true" />
}
function Button({
  children,
  onClick,
  primary = false,
  full = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  primary?: boolean
  full?: boolean
}) {
  return (
    <button
      onClick={onClick}
      data-variant={primary ? "primary" : "secondary"}
      className={`${
        full ? "w-full" : ""
      } inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[12px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50 ${
        primary
          ? "bg-[#f06455] text-white hover:bg-[#df5549]"
          : "border border-[#dedad4] bg-white hover:border-[#aaa39a]"
      }`}
    >
      {children}
    </button>
  )
}
function Card({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[30px] border border-[#e2ddd6] bg-white p-6 md:p-9 ${className}`}
    >
      {children}
    </section>
  )
}
function Field({ label, value }: { label: string value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-semibold">{label}</span>
      <span className="interactive-field flex min-h-12 items-center rounded-2xl border border-[#ddd8d1] px-4 text-[12px] text-[#777169]">
        {value}
      </span>
    </label>
  )
}

function Topbar({ mobile, go }: { mobile: boolean go: Go }) {
  return (
    <header className="flex h-[70px] items-center justify-between border-b border-[#e9e5df] px-6">
      <div className="flex items-center gap-3">
        {mobile && (
          <button className="grid size-11 place-items-center rounded-full border">
            <Icon name="menu" />
          </button>
        )}
        <button
          onClick={() => go("home")}
          aria-label="Start a new hotel check"
          className="-ml-1 rounded-lg px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
        >
          <Brand />
        </button>
      </div>
      <div className="flex items-center gap-3 text-[12px] text-[#756f68]">
        <button
          onClick={() => go("paywall")}
          className="min-h-10 rounded-full border border-transparent px-4 transition-colors hover:border-[#e2ded8] focus:outline-none focus-visible:border-[#e2ded8] focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          aria-label="View checks and buy more"
        >
          <b className="text-[#e85e51]">2</b> free checks left
        </button>
        <button
          data-preserve-fill
          onClick={() => go("settings")}
          className="grid size-10 place-items-center rounded-full bg-[#ed8b72] font-bold text-white transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          aria-label="Open user settings"
        >
          O
        </button>
      </div>
    </header>
  )
}
function EmptyHistory() {
  return (
    <div className="flex flex-1 flex-col items-center px-8 pt-14 text-center">
      <span className="relative grid size-24 place-items-center rounded-full bg-[#f3f0eb] text-[#2f2b28]">
        <Icon name="hotel" size={32} />
      </span>
      <h3 className="mt-5 text-[14px] font-semibold">
        Your hotel checks will appear here
      </h3>
      <p className="mt-2 max-w-[220px] text-[12px] leading-relaxed text-[#817a73]">
        Start a check or identify a hotel to keep it in your search history
      </p>
    </div>
  )
}

function SearchHistoryModal({
  state,
  items,
  go,
  onClose,
}: {
  state: HistoryState
  items: HistoryEntry[]
  go: Go
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches =
    state === "empty"
      ? []
      : items.filter(([place, hotel, date]) =>
          `${place} ${hotel} ${date}`
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        )

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", closeOnEscape)
    return () => window.removeEventListener("keydown", closeOnEscape)
  }, [onClose])

  const openEntry = (status?: string) => {
    onClose()
    go(status === "Draft" ? "identify" : "result")
  }

  return (
    <div
      className="motion-backdrop fixed inset-0 z-[60] grid place-items-center bg-[#211d1a]/20 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-history-title"
        className="motion-dialog w-full max-w-[680px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_70px_rgba(35,30,27,.22)] ring-1 ring-black/5"
      >
        <h2 id="search-history-title" className="sr-only">
          Search hotel checks
        </h2>
        <div className="interactive-field flex h-[68px] items-center gap-3 border-b border-[#ebe7e1] px-5">
          <span className="text-[#77716a]">
            <Icon name="search" />
          </span>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hotel checks"
            aria-label="Search hotel checks"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#aaa39b]"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="grid size-9 place-items-center rounded-lg text-[#393532] hover:bg-[#f3f0eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          >
            <Icon name="close" />
          </button>
        </div>

        {matches.length > 0 ? (
          <div className="max-h-[470px] overflow-y-auto p-3">
            {matches.map(([place, hotel, date, image, status]) => (
              <button
                key={`${place}-${status || "checked"}`}
                onClick={() => openEntry(status)}
                aria-label={`Open ${place} — ${hotel}`}
                className="flex w-full items-center gap-4 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[#f5f2ed] focus:outline-none focus-visible:bg-[#f5f2ed] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f06455]/50"
              >
                <img
                  src={image}
                  alt=""
                  className="size-12 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <b className="truncate text-[14px]">{place}</b>
                    {status && (
                      <span className="shrink-0 rounded-full bg-[#fff0eb] px-2 py-1 text-[12px] font-semibold text-[#d95448]">
                        {status}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-[#77716a]">
                    {hotel}
                  </span>
                </span>
                <time className="shrink-0 text-[12px] text-[#9b948c]">
                  {date}
                </time>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-8 pb-8 text-center">
            <span className="relative grid size-14 place-items-center rounded-full bg-[#f3f0eb] text-[#2f2b28]">
              <Icon name="search" />
            </span>
            <h3 className="mt-5 text-[14px] font-semibold">
              {state === "empty"
                ? "Nothing to search yet"
                : "No matching checks"}
            </h3>
            <p className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-[#817a73]">
              {state === "empty"
                ? "Your hotel checks will appear here after you start your first check"
                : "Try a different hotel name, destination, or date"}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function History({
  go,
  onCollapse,
  state,
}: {
  go: Go
  onCollapse: () => void
  state: HistoryState
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const { draftHotel, hotelChecks } = useContext(DraftContext)
  const history: HistoryEntry[] = [
    ["Rhodes, Greece", "Gennadi Grand Resort", "May 20, 2026", rhodesImage],
    ["Bali, Indonesia", "The Apurva Kempinski Bali", "May 18, 2026", baliImage],
    [
      "Barcelona, Spain",
      "Hotel Neri Relais & Châteaux",
      "May 15, 2026",
      barcelonaImage,
    ],
    ["Maldives", "Baros Maldives", "May 12, 2026", maldivesImage],
    ["Prague, Czechia", "Hotel Josef", "May 10, 2026", pragueImage],
  ]
  const currentDraft = draftHotel || defaultDraftHotel
  const savedDraftRecord = hotelChecks.find(
    (record) => record.status === "draft",
  )
  const draftEntry: HistoryEntry = savedDraftRecord
    ? historyEntryFromRecord(savedDraftRecord)
    : [
        currentDraft.place,
        currentDraft.hotel,
        "Sep 10, 2026",
        currentDraft.image || rhodesImage,
        "Draft",
      ]
  const activeEntry: HistoryEntry = [
    "Rhodes, Greece",
    "Gennadi Grand Resort",
    "Sep 10, 2026",
    rhodesImage,
  ]
  const storedHistory = hotelChecks.map(historyEntryFromRecord)
  const visibleHistory: HistoryEntry[] = (() => {
    if (state === "empty") return storedHistory
    if (state === "draft") {
      return mergeHistoryEntries([draftEntry], storedHistory)
    }
    if (state === "history-with-draft") {
      return storedHistory.length > 0
        ? mergeHistoryEntries([draftEntry], storedHistory)
        : mergeHistoryEntries([draftEntry], history)
    }
    if (state === "active") {
      return storedHistory.length > 0
        ? storedHistory
        : mergeHistoryEntries([activeEntry], history)
    }
    return storedHistory.length > 0 ? storedHistory : history
  })()
  return (
    <>
      <aside className="flex min-h-[calc(100vh-70px)] flex-col border-r border-[#e7e3dd] bg-white/80 backdrop-blur-md">
        <div className="flex h-16 items-center gap-1 px-6">
          <h2 className="flex-1 text-[14px] font-semibold">Search history</h2>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search history"
            className="grid size-9 place-items-center rounded-lg text-[#2f2b28] transition-colors hover:bg-[#f3f0eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          >
            <Icon name="search" />
          </button>
          <button
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="grid size-9 place-items-center rounded-lg text-[#2f2b28] transition-colors hover:bg-[#f3f0eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          >
            <Icon name="collapse" />
          </button>
        </div>
        <nav className="space-y-1 border-b border-[#e7e3dd] px-4 pb-5">
          <button
            onClick={() => go("home")}
            className="sidebar-action sidebar-action--check group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] font-semibold transition-colors duration-200 hover:bg-[#f3f0eb] focus:outline-none focus-visible:bg-[#f3f0eb] focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          >
            <span className="interactive-icon-surface sidebar-action-icon grid size-7 shrink-0 place-items-center rounded-full bg-[#f3f0eb] text-[#2f2b28]">
              <Icon name="checkSpark" size={14} />
            </span>
            Check hotel
          </button>
          <button
            onClick={() => go("saved")}
            className="sidebar-action sidebar-action--saved group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[12px] font-semibold transition-colors duration-200 hover:bg-[#f3f0eb] focus:outline-none focus-visible:bg-[#f3f0eb] focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          >
            <span className="interactive-icon-surface sidebar-action-icon grid size-7 shrink-0 place-items-center rounded-full bg-[#f3f0eb] text-[#2f2b28]">
              <Icon name="bookmark" size={14} />
            </span>
            Saved hotels
          </button>
        </nav>
        {visibleHistory.length === 0 ? (
          <EmptyHistory />
        ) : (
          <div className="space-y-1 px-4 pb-6 pt-5">
            {visibleHistory.map(([place, hotel, date, image, status]) => (
              <button
                key={`${place}-${status || "checked"}`}
                onClick={() => go(status === "Draft" ? "identify" : "result")}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-[#f3f0eb] focus:bg-[#f3f0eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f06455]/50"
              >
                <img
                  src={image}
                  alt=""
                  className="size-12 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <b className="min-w-0 truncate text-[12px]">{place}</b>
                    {status && (
                      <span className="shrink-0 rounded-full bg-[#fff0eb] px-2 py-1 text-[12px] font-semibold text-[#d95448]">
                        {status}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block truncate text-[12px] text-[#77716a]">
                    {hotel}
                  </span>
                  <span className="mt-1 block text-[12px] text-[#a09991]">
                    {date}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>
      {searchOpen && (
        <SearchHistoryModal
          state={
            visibleHistory.length === 0
              ? "empty"
              : state === "empty"
                ? "history"
                : state
          }
          items={visibleHistory}
          go={go}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  )
}
function Preferences({ go }: { go: Go }) {
  const rows = [
    ["users", "Travelers", "2 adults, 1 child"],
    ["dog", "Special conditions", "Traveling with a dog"],
    ["heart", "Travel preferences", "Beach, relaxation, great food"],
    ["cup", "Meal type", "Breakfast included"],
    ["plane", "Departure city", "Zurich (ZRH)"],
  ]
  return (
    <aside className="min-h-[calc(100vh-70px)] border-l border-[#e7e3dd] bg-white/80 p-7 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[21px] font-bold leading-tight">
          Preferences for this trip
        </h2>
        <Button onClick={() => go("profile")}>Edit</Button>
      </div>
      <p className="mt-5 text-[12px] leading-relaxed text-[#7e7770]">
        These preferences help us personalize your hotel match and
        recommendations
      </p>
      <div className="mt-5 divide-y divide-[#ebe7e1]">
        {rows.map(([icon, label, value]) => (
          <div className="flex items-start gap-3 py-4" key={label}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f3f0eb] text-[#2f2b28]">
              <Icon name={icon} />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] text-[#8f8880]">{label}</p>
              <p className="mt-1 text-[12px] font-semibold leading-snug">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-[22px] bg-[#f3f0eb] p-5">
        <b className="text-[12px]">We'll pay special attention to:</b>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            "Family facilities",
            "Pet policy",
            "Food options",
            "Quiet rooms",
            "Easy access",
          ].map((x) => (
            <span
              key={x}
              className="rounded-full bg-white px-3 py-2 text-[12px] text-[#746e67]"
            >
              {x}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => go("profile")}
        className="mt-5 text-[12px] font-semibold"
      >
        View full profile →
      </button>
    </aside>
  )
}
function Shell({
  viewport,
  go,
  children,
  historyState = "history",
}: {
  viewport: Viewport
  go: Go
  children: React.ReactNode
  historyState?: HistoryState
}) {
  const desktop = viewport === "desktop"
  const [collapsed, setCollapsed] = useState(false)
  const { hasDraft } = useContext(DraftContext)
  const visibleHistoryState: HistoryState = hasDraft
    ? historyState === "history" || historyState === "active"
      ? "history-with-draft"
      : historyState === "empty"
        ? "draft"
        : historyState
    : historyState
  return (
    <div className="product-ui min-h-[800px] bg-[#f7f6f4]">
      <Topbar mobile={viewport === "mobile"} go={go} />
      <div
        className={`relative grid min-h-[calc(100vh-70px)] ${
          desktop
            ? collapsed
              ? "grid-cols-[minmax(0,1fr)_310px]"
              : "grid-cols-[320px_minmax(0,1fr)_310px]"
            : "grid-cols-1"
        }`}
      >
        {desktop && !collapsed && (
          <History
            go={go}
            onCollapse={() => setCollapsed(true)}
            state={visibleHistoryState}
          />
        )}
        {desktop && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            aria-label="Expand sidebar"
            className="absolute left-5 top-5 z-20 grid size-12 place-items-center rounded-2xl bg-white text-[#393532] shadow-[0_4px_16px_rgba(28,25,23,.12)] transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
          >
            <Icon name="expand" />
          </button>
        )}
        <main
          className={`min-w-0 p-4 md:p-6 ${
            desktop && collapsed ? "pl-24" : ""
          }`}
        >
          {children}
        </main>
        {desktop && <Preferences go={go} />}
      </div>
    </div>
  )
}

type HotelLookup = { kind: "identified" hotel: HotelOption } | {
  kind: "matches"
  hotels: HotelOption[]
} | { kind: "clarify" } | { kind: "none" }

const hotelCatalog: HotelOption[] = [
  defaultDraftHotel,
  {
    place: "Lindos, Rhodes, Greece",
    hotel: "Lindos Grand Resort & Spa",
    image: rhodesImage,
    domains: ["lindosgrand.com"],
  },
  {
    place: "Bali, Indonesia",
    hotel: "The Apurva Kempinski Bali",
    image: baliImage,
  },
  {
    place: "Barcelona, Spain",
    hotel: "Hotel Neri Relais & Châteaux",
    image: barcelonaImage,
  },
  { place: "Maldives", hotel: "Baros Maldives", image: maldivesImage },
  { place: "Prague, Czechia", hotel: "Hotel Josef", image: pragueImage },
  {
    place: "Crete, Greece",
    hotel: "Mitsis Rinela Beach Resort & Spa",
    image: rhodesImage,
  },
  {
    place: "Crete, Greece",
    hotel: "Mitsis Selection Laguna",
    image: rhodesImage,
  },
  {
    place: "Kos, Greece",
    hotel: "Mitsis Selection Blue Domes",
    image: maldivesImage,
  },
  { place: "Kos, Greece", hotel: "Mitsis Norida", image: baliImage },
  {
    place: "Rhodes, Greece",
    hotel: "Mitsis Selection Alila",
    image: rhodesImage,
  },
  {
    place: "Rhodes, Greece",
    hotel: "Mitsis Rodos Village",
    image: barcelonaImage,
  },
  {
    place: "London, United Kingdom",
    hotel: "Hilton London Metropole",
    image: barcelonaImage,
  },
  { place: "Bali, Indonesia", hotel: "Hilton Bali Resort", image: baliImage },
  {
    place: "Honolulu, USA",
    hotel: "Hilton Hawaiian Village",
    image: maldivesImage,
  },
  {
    place: "Dubai, UAE",
    hotel: "Hilton Dubai Palm Jumeirah",
    image: rhodesImage,
  },
  { place: "Tokyo, Japan", hotel: "Hilton Tokyo", image: pragueImage },
]

function Home({
  viewport,
  go,
  historyState = "empty",
}: {
  viewport: Viewport
  go: Go
  historyState?: HistoryState
}) {
  const hotelInputRef = useRef<HTMLInputElement>(null)
  const composerInputRef = useRef<HTMLInputElement>(null)
  const { createDraft, resolveDraft, hotelChecks } = useContext(DraftContext)
  const [inputValue, setInputValue] = useState("")
  const [composerValue, setComposerValue] = useState("")
  const [chatMessages, setChatMessages] = useState<string[]>([])
  const [error, setError] = useState("")
  const [chatStage, setChatStage] =
    useState<"idle" | "processing" | "confirmation" | "matches" | "clarify" | "none" | "awaiting-input">(
      "idle",
    )
  const [pendingLookup, setPendingLookup] = useState<HotelLookup | null>(null)
  const [candidates, setCandidates] = useState<HotelOption[]>([])
  const [templateModal, setTemplateModal] = useState(false)
  const [identifiedHotel, setIdentifiedHotel] = useState<HotelOption | null>(
    null,
  )
  const insertTranscription = useCallback((text: string) => {
    setComposerValue((current) =>
      current.trim() ? `${current.trim()} ${text}` : text,
    )
    window.setTimeout(() => composerInputRef.current?.focus(), 0)
  }, [])
  const voiceInput = useVoiceTranscription(insertTranscription)

  const existingCheckFor = (hotel: HotelOption) => {
    const normalizedHotel = hotel.hotel.trim().toLocaleLowerCase()
    return hotelChecks.find(
      (record) => record.hotel.trim().toLocaleLowerCase() === normalizedHotel,
    )
  }

  const openExistingCheck = (hotel: HotelOption) => {
    const existingCheck = existingCheckFor(hotel)
    if (!existingCheck) return false

    setPendingLookup(null)
    setCandidates([])
    setIdentifiedHotel(hotel)
    if (existingCheck.status === "draft") {
      setChatMessages([])
      setChatStage("confirmation")
    } else {
      go("result")
    }
    return true
  }

  useEffect(() => {
    if (chatStage !== "processing" || !pendingLookup) return
    const timer = window.setTimeout(() => {
      if (pendingLookup.kind === "identified") {
        setIdentifiedHotel(pendingLookup.hotel)
        createDraft(pendingLookup.hotel)
        setChatStage("confirmation")
      } else if (pendingLookup.kind === "matches") {
        setCandidates(pendingLookup.hotels)
        setChatStage("matches")
      } else {
        setChatStage(pendingLookup.kind)
      }
      setPendingLookup(null)
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [chatStage, pendingLookup])

  const findHotels = (value: string): HotelLookup => {
    const normalized = value.trim().toLocaleLowerCase()
    const isLink = /^(https?:\/\/|www\.)\S+/i.test(value.trim())
    if (isLink) {
      const linkValue = /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`
      try {
        const url = new URL(linkValue)
        const host = url.hostname.toLocaleLowerCase().replace(/^www\./, "")
        const domainMatch = hotelCatalog.find((item) =>
          item.domains?.some(
            (domain) => host === domain || host.endsWith(`.${domain}`),
          ),
        )
        if (domainMatch) return { kind: "identified", hotel: domainMatch }

        const linkTerms = decodeURIComponent(`${url.hostname} ${url.pathname}`)
          .toLocaleLowerCase()
          .split(/[^\p{L}\p{N}]+/u)
          .filter((term) => term.length > 2)
        const pathMatches = hotelCatalog.filter((item) => {
          const hotelTerms = item.hotel
            .toLocaleLowerCase()
            .split(/[^\p{L}\p{N}]+/u)
            .filter(
              (term) => term.length > 3 && !["hotel", "resort"].includes(term),
            )
          return (
            hotelTerms.length > 0 &&
            hotelTerms.every((term) => linkTerms.includes(term))
          )
        })
        if (pathMatches.length === 1)
          return { kind: "identified", hotel: pathMatches[0] }
      } catch {
        return { kind: "none" }
      }
      return { kind: "none" }
    }

    const exact = hotelCatalog.find(
      (item) => item.hotel.toLocaleLowerCase() === normalized,
    )
    if (exact) return { kind: "identified", hotel: exact }

    const genericChain =
      /^(hilton|marriott|hyatt|mitsis|radisson|sheraton)(?: hotels?)?$/.test(
        normalized,
      )
    if (genericChain) return { kind: "clarify" }

    const genericWords = new Set([
      "hotel",
      "hotels",
      "resort",
      "resorts",
      "spa",
      "the",
    ])
    const terms = normalized
      .split(/\s+/)
      .filter((term) => term && !genericWords.has(term))
    if (terms.length === 0) return { kind: "none" }

    const matches = hotelCatalog.filter((item) => {
      const searchable = `${item.hotel} ${item.place}`.toLocaleLowerCase()
      return terms.every((term) => searchable.includes(term))
    })
    if (matches.length === 0) return { kind: "none" }
    if (matches.length === 1) return { kind: "identified", hotel: matches[0] }
    if (matches.length > 4) return { kind: "clarify" }
    return { kind: "matches", hotels: matches }
  }

  const runSearch = (value: string) => {
    const query = value.trim()
    if (!query) return
    const lookup = findHotels(query)
    if (lookup.kind === "identified" && openExistingCheck(lookup.hotel)) return
    setError("")
    setChatMessages((messages) => [...messages, query])
    setIdentifiedHotel(null)
    setCandidates([])
    setPendingLookup(lookup)
    setChatStage("processing")
  }

  const submitHotel = (event: React.FormEvent) => {
    event.preventDefault()
    if (!inputValue.trim()) {
      setError("Enter a hotel name, destination, or link.")
      return
    }
    runSearch(inputValue)
  }

  const submitChatMessage = (event: React.FormEvent) => {
    event.preventDefault()
    if (!composerValue.trim()) return
    runSearch(composerValue)
    setComposerValue("")
  }

  const chooseHotel = (hotel: HotelOption) => {
    if (openExistingCheck(hotel)) return
    setIdentifiedHotel(hotel)
    createDraft(hotel)
    setChatStage("confirmation")
  }

  const requestAnotherHotel = () => {
    setChatMessages((messages) => [...messages, "No, change hotel"])
    setIdentifiedHotel(null)
    setChatStage("awaiting-input")
    window.setTimeout(() => composerInputRef.current?.focus(), 0)
  }

  const effectiveHistoryState: HistoryState =
    chatStage === "confirmation"
      ? historyState === "history"
        ? "history-with-draft"
        : "draft"
      : historyState

  return (
    <Shell viewport={viewport} go={go} historyState={effectiveHistoryState}>
      <section
        className={`flex flex-col overflow-hidden rounded-[30px] border border-[#e2ddd6] bg-white p-6 md:p-9 ${
          chatStage === "idle" ? "" : "min-h-[calc(100vh-118px)]"
        }`}
      >
        {chatStage === "idle" ? (
          <div className="w-full">
            <div className="relative pr-20">
              <img
                src={aiBlob}
                alt=""
                className="absolute right-0 top-0 size-20 object-contain"
              />
              <h1 className="font-display text-[36px] font-medium tracking-[-.045em] md:text-[54px]">
                Good evening, Olivia
              </h1>
              <p className="mt-2 text-[14px] text-[#79736c]">
                See how well a hotel fits your trip and what to watch out for
              </p>
            </div>
            <form onSubmit={submitHotel} className="mt-10">
              <div
                className={`hotel-query-field interactive-field group flex min-h-16 w-full items-center gap-4 rounded-full bg-[#f3f0eb] px-6 text-left ${
                  error ? "ring-2 ring-[#d95448]/60" : ""
                }`}
              >
                <span className="text-[#8b847c]">
                  <Icon name="spark" />
                </span>
                <input
                  ref={hotelInputRef}
                  value={inputValue}
                  onChange={(event) => {
                    setInputValue(event.target.value)
                    if (error) setError("")
                  }}
                  aria-label="Hotel search"
                  placeholder="Enter a hotel, destination, or link…"
                  className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#8b847c]"
                />
                <button
                  type="submit"
                  data-variant="primary"
                  className="shrink-0 rounded-full bg-coral px-6 py-3 text-[12px] font-semibold text-white transition-colors hover:bg-[#e54d49] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
                >
                  Check hotel
                </button>
              </div>
              {error && (
                <p
                  role="alert"
                  className="mt-2 px-6 text-[12px] font-medium text-[#d95448]"
                >
                  {error}
                </p>
              )}
            </form>
            <div className="mt-8 border-t border-[#ebe7e1] pt-6 text-[12px]">
              <p className="text-[#817a73]">Your result will include</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                {[
                  "Personalized match score",
                  "What you'll probably like",
                  "Potential risks to consider",
                  "Why we reached this conclusion",
                ].map((x) => (
                  <span key={x}>
                    <b className="text-[#ed6558]">•</b> &nbsp;{x}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex min-h-0 w-full max-w-[720px] flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto pb-6">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message}-${index}`}
                  className={`${index === 0 ? "" : "mt-4"} flex justify-end`}
                >
                  <div className="max-w-[78%] overflow-hidden rounded-[22px] rounded-br-md bg-[#f3f0eb] px-5 py-3 text-[14px] leading-relaxed [overflow-wrap:anywhere]">
                    {message}
                  </div>
                </div>
              ))}

              {chatStage === "processing" && (
                <div className="mt-8" aria-live="polite">
                  <p className="text-[14px]">Finding matching hotels</p>
                  <p className="mt-2 text-[12px] text-[#817a73]">
                    Checking names, destinations, and hotel links…
                  </p>
                  <img
                    src={aiBlob}
                    alt=""
                    className="animate-thinking-blob mt-4 size-11 object-contain"
                  />
                </div>
              )}

              {chatStage === "matches" && (
                <div className="mt-7" aria-live="polite">
                  <p className="text-[14px]">Choose the hotel you mean</p>
                  <p className="mt-2 text-[12px] text-[#817a73]">
                    I found these matches across different destinations
                  </p>
                  <div className="mt-4 space-y-2">
                    {candidates.map((hotel) => (
                      <button
                        key={`${hotel.hotel}-${hotel.place}`}
                        onClick={() => chooseHotel(hotel)}
                        className="flex w-full items-center gap-4 rounded-[20px] border border-[#e2ddd6] bg-[#faf9f7] p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
                      >
                        {hotel.image ? (
                          <img
                            src={hotel.image}
                            alt=""
                            className="size-12 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#f3f0eb]">
                            <Icon name="hotel" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[14px]">
                            {hotel.hotel}
                          </b>
                          <span className="mt-1 block truncate text-[12px] text-[#817a73]">
                            {hotel.place}
                          </span>
                        </span>
                        <Icon name="arrow" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatStage === "clarify" && (
                <div className="mt-7" aria-live="polite">
                  <p className="text-[14px]">Please narrow down your search</p>
                  <p className="mt-2 max-w-[580px] text-[14px] leading-relaxed text-[#817a73]">
                    That hotel chain has many properties. Enter the full hotel
                    name, add a destination, or paste a hotel link.
                  </p>
                </div>
              )}

              {chatStage === "none" && (
                <div className="mt-7" aria-live="polite">
                  <p className="text-[14px]">No matching hotels found</p>
                  <p className="mt-2 text-[14px] text-[#817a73]">
                    Try another word, a destination, the full hotel name, or a
                    hotel link
                  </p>
                </div>
              )}

              {chatStage === "awaiting-input" && (
                <div className="mt-7" aria-live="polite">
                  <p className="text-[14px]">Enter another hotel</p>
                  <p className="mt-2 text-[14px] text-[#817a73]">
                    You can use a hotel name, destination, partial phrase, or
                    link
                  </p>
                </div>
              )}

              {chatStage === "confirmation" && identifiedHotel && (
                <div className="mt-7" aria-live="polite">
                  <p className="text-[14px]">
                    I found this hotel. Is this the one you meant?
                  </p>
                  <div className="mt-4 flex items-center gap-4 rounded-[22px] border border-[#e2ddd6] bg-[#faf9f7] p-4">
                    {identifiedHotel.image ? (
                      <img
                        src={identifiedHotel.image}
                        alt=""
                        className="size-16 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-[#f3f0eb] text-[#2f2b28]">
                        <Icon name="hotel" size={24} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <b className="block truncate text-[14px]">
                        {identifiedHotel.hotel}
                      </b>
                      <span className="mt-1 block truncate text-[12px] text-[#817a73]">
                        {identifiedHotel.place}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      primary
                      onClick={() => {
                        resolveDraft()
                        go("analysis")
                      }}
                    >
                      Yes, start check
                    </Button>
                    <Button onClick={requestAnotherHotel}>
                      No, change hotel
                    </Button>
                  </div>
                  <p className="mt-3 text-[12px] text-[#9b948c]">
                    A credit is used only after you confirm and start the check
                  </p>
                </div>
              )}
            </div>

            <form
              onSubmit={submitChatMessage}
              className="mt-auto border-t border-[#ebe7e1] pt-4"
            >
              <div
                className={`interactive-field flex min-h-14 items-center gap-3 rounded-[22px] bg-[#f3f0eb] px-3 pl-5 ${
                  voiceInput.status === "recording"
                    ? "ring-2 ring-[#f06455]/35"
                    : ""
                }`}
              >
                {voiceInput.status === "recording" ? (
                  <div
                    className="flex min-w-0 flex-1 items-center gap-3 text-[14px]"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="relative flex size-3">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#f06455] opacity-40" />
                      <span className="relative inline-flex size-3 rounded-full bg-[#f06455]" />
                    </span>
                    <span>Recording…</span>
                  </div>
                ) : voiceInput.status === "requesting" ? (
                  <div
                    className="flex min-w-0 flex-1 items-center gap-2 text-[14px] text-[#817a73]"
                    role="status"
                    aria-live="polite"
                  >
                    <span>Connecting to microphone…</span>
                  </div>
                ) : voiceInput.status === "transcribing" ? (
                  <div
                    className="flex min-w-0 flex-1 items-center gap-2 text-[14px] text-[#817a73]"
                    role="status"
                    aria-live="polite"
                  >
                    <span>Transcribing…</span>
                  </div>
                ) : (
                  <input
                    ref={composerInputRef}
                    value={composerValue}
                    onChange={(event) => {
                      setComposerValue(event.target.value)
                      if (voiceInput.message) voiceInput.clearMessage()
                    }}
                    aria-label="Continue chat"
                    placeholder="Enter a hotel, destination, or message…"
                    className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#8b847c]"
                  />
                )}
                {voiceInput.status === "recording" ? (
                  <>
                    <button
                      type="button"
                      onClick={voiceInput.cancelRecording}
                      aria-label="Cancel recording"
                      className="grid size-10 shrink-0 place-items-center rounded-full text-[#514b45] hover:bg-[#e7e1da] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
                    >
                      <Icon name="close" />
                    </button>
                    <button
                      type="button"
                      onClick={voiceInput.stopRecording}
                      aria-label="Stop recording and transcribe"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-[#f06455] text-white hover:bg-[#df5549] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
                    >
                      <Icon name="stop" size={15} />
                    </button>
                  </>
                ) : voiceInput.status === "requesting" ||
                  voiceInput.status === "transcribing" ? (
                  <span
                    className="grid size-10 shrink-0 place-items-center text-[#817a73]"
                    aria-hidden="true"
                  >
                    <span className="animate-spin">
                      <Icon name="loader" />
                    </span>
                  </span>
                ) : composerValue.trim() ? (
                  <button
                    type="submit"
                    data-variant="primary"
                    aria-label="Send message"
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-[#1c1917] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
                  >
                    <Icon name="send" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={voiceInput.startRecording}
                    aria-label="Start voice input"
                    className="grid size-10 shrink-0 place-items-center rounded-full text-[#514b45] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
                  >
                    <Icon name="microphone" />
                  </button>
                )}
              </div>
              {voiceInput.message && (
                <p
                  role="alert"
                  className="mt-2 px-3 text-[12px] text-[#b2473e]"
                >
                  {voiceInput.message}
                </p>
              )}
            </form>
          </div>
        )}
      </section>
      {chatStage === "idle" && (
        <Card className="mt-6">
          <div className="flex justify-between gap-4">
            <h2 className="text-[23px] font-bold">
              Start with a quick template
            </h2>
            <span className="text-[12px] text-[#817a73]">
              View all templates →
            </span>
          </div>
          <div
            className={`mt-6 grid gap-4 ${
              viewport === "mobile" ? "grid-cols-1" : "grid-cols-[1.4fr_.7fr]"
            }`}
          >
            <button
              onClick={() => hotelInputRef.current?.focus()}
              className="flex min-h-60 flex-col justify-end rounded-[26px] bg-[linear-gradient(135deg,#faf4ee,#f6e2d9)] p-7 text-left"
            >
              <b className="text-[18px]">Check how a hotel fits you</b>
              <span className="mt-3 text-[12px] font-semibold text-[#e55e51]">
                Start checking →
              </span>
            </button>
            <div className="grid gap-4">
              <button
                onClick={() => go("alternative")}
                className="rounded-[24px] bg-[#f3f0eb] p-6 text-left"
              >
                <b>Find better-fit alternative</b>
                <span className="mt-3 block text-[12px] text-[#817a73]">
                  Explore alternatives →
                </span>
              </button>
              <button
                onClick={() => setTemplateModal(true)}
                className="rounded-[24px] bg-[#f3f0eb] p-6 text-left"
              >
                <b>Compare hotels</b>
                <span className="mt-3 block text-[12px] text-[#817a73]">
                  Learn more →
                </span>
              </button>
            </div>
          </div>
        </Card>
      )}
      {templateModal && (
        <div className="motion-backdrop fixed inset-0 z-50 grid place-items-center bg-black/25 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-hotels-title"
            className="motion-dialog w-full max-w-md rounded-[28px] bg-white p-7"
          >
            <button
              onClick={() => setTemplateModal(false)}
              aria-label="Close dialog"
              className="float-right grid size-11 place-items-center rounded-full border border-[#e2ddd6]"
            >
              <Icon name="close" />
            </button>
            <h2
              id="compare-hotels-title"
              className="pr-12 text-[24px] font-bold"
            >
              Compare hotels is coming soon
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#756f68]">
              You’ll soon be able to compare hotels side by side and see which
              one fits your preferences better
            </p>
            <div className="mt-7">
              <Button primary onClick={() => setTemplateModal(false)}>
                Got it
              </Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

function Centered({
  viewport,
  children,
}: {
  viewport: Viewport
  children: React.ReactNode
}) {
  return (
    <div className="product-ui grid min-h-[800px] place-items-center bg-[#f5f2ed] p-4">
      <div
        className={`w-full ${
          viewport === "mobile" ? "max-w-[360px]" : "max-w-[520px]"
        }`}
      >
        {children}
      </div>
    </div>
  )
}

type PreferencePriority = "important" | "critical"

const onboardingPreferenceOptions = [
  "Quiet room",
  "High floor",
  "Good breakfast",
  "Pool access",
  "Easy access",
  "Free parking",
  "Fitness center",
  "Pet-friendly",
  "Family-friendly facilities",
  "Beach access",
  "Central location",
  "Air conditioning",
  "Spacious room",
  "Sea view",
  "Excellent cleanliness",
  "Accessible bathroom",
  "Airport transfer",
  "Late check-out",
]

function StepperButton({
  label,
  onClick,
  disabled = false,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      data-preserve-fill
      className="grid size-10 shrink-0 place-items-center rounded-full border border-[#d8d3cc] bg-white text-[20px] leading-none text-[#1c1917] transition hover:border-[#aaa39a] disabled:cursor-not-allowed disabled:opacity-35"
    >
      {label.startsWith("Decrease") ? "−" : "+"}
    </button>
  )
}

function OnboardingFlow({ viewport, go }: { viewport: Viewport go: Go }) {
  const [step, setStep] = useState(1)
  const [adults, setAdults] = useState(1)
  const [children, setChildren] = useState<number[]>([])
  const [travelsWithPets, setTravelsWithPets] = useState(false)
  const [selectedPreferences, setSelectedPreferences] = useState<string[]>([])
  const [customPreferences, setCustomPreferences] = useState<string[]>([])
  const [customPreference, setCustomPreference] = useState("")
  const [priorities, setPriorities] =
    useState<Record<string, PreferencePriority>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const allPreferences = [...onboardingPreferenceOptions, ...customPreferences]
  const hasMinimumPreferences = selectedPreferences.length >= 3
  const allPrioritiesAssigned =
    selectedPreferences.length >= 3 &&
    selectedPreferences.every((preference) => Boolean(priorities[preference]))

  const togglePreference = (preference: string) => {
    setSelectedPreferences((current) => {
      if (current.includes(preference)) {
        setPriorities((currentPriorities) => {
          const next = { ...currentPriorities }
          delete next[preference]
          return next
        })
        return current.filter((item) => item !== preference)
      }
      return [...current, preference]
    })
  }

  const addCustomPreference = () => {
    const normalized = customPreference.trim().replace(/\s+/g, " ")
    if (!normalized) return
    const existing = allPreferences.find(
      (preference) =>
        preference.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
    )
    const preference = existing || normalized
    if (!existing) setCustomPreferences((current) => [...current, preference])
    setSelectedPreferences((current) =>
      current.includes(preference) ? current : [...current, preference],
    )
    setCustomPreference("")
  }

  const finishOnboarding = async () => {
    if (!allPrioritiesAssigned || isSaving) return
    setIsSaving(true)
    setSaveError("")
    try {
      await completeOnboarding({
        name: auth.currentUser?.displayName || "",
        adults,
        childAges: children,
        travelsWithPets,
        preferences: selectedPreferences.map((label) => ({
          label,
          priority: priorities[label],
        })),
        updatedAt: new Date().toISOString(),
      })
      go("home")
    } catch (error) {
      console.warn("Onboarding could not be saved", error)
      setSaveError(
        "We couldn’t save your profile. Check your connection and try again",
      )
    } finally {
      setIsSaving(false)
    }
  }

  const isMobile = viewport === "mobile"
  const stepMeta = [
    ["WHO'S TRAVELING", "Who usually travels with you?"],
    ["PREFERENCES", "What matters to you?"],
    ["PRIORITIES", "Set your priorities"],
  ] as const
  const stepImages = [
    onboardingTravelersImage,
    onboardingPreferencesImage,
    onboardingPrioritiesImage,
  ]

  return (
    <main className="product-ui min-h-screen bg-[#f5f2ed] p-5 text-[#1c1917]">
      <div className="grid min-h-[calc(100vh-40px)] w-full gap-5 lg:grid-cols-[minmax(560px,46%)_minmax(0,1fr)]">
        <section className="flex min-h-[calc(100vh-40px)] min-w-0 items-center py-10 pl-20 pr-10 max-lg:min-h-0 max-lg:px-5 max-lg:py-6">
          <div className="w-full max-w-[480px] text-left">
            <div
              className="grid grid-cols-3 gap-3"
              aria-label={`Step ${step} of 3`}
            >
              {[1, 2, 3].map((segment) => (
                <span
                  key={segment}
                  className={`h-1.5 rounded-full transition-colors duration-300 ${
                    segment <= step ? "bg-[#f75b56]" : "bg-[#dedbd4]"
                  }`}
                />
              ))}
            </div>

            <div key={`onboarding-heading-${step}`} className="motion-swap">
              <p className="mt-8 text-[12px] font-medium tracking-[.18em] text-[#aaa59f]">
                STEP {step} OF 3 · {stepMeta[step - 1][0]}
              </p>
              <h1 className="font-display mt-3 text-[32px] font-normal italic leading-[1.12] tracking-[-.035em]">
                {stepMeta[step - 1][1]}
              </h1>
            </div>

            {step === 1 && (
              <div className="motion-swap mt-8 space-y-4">
                <section className="flex min-h-24 items-center justify-between gap-4 rounded-[24px] bg-white p-5">
                  <div>
                    <h2 className="text-[14px] font-semibold">Adults</h2>
                    <p className="mt-1 text-[12px] text-[#aaa59f]">Age 18+</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StepperButton
                      label="Decrease"
                      disabled={adults <= 1}
                      onClick={() =>
                        setAdults((value) => Math.max(1, value - 1))
                      }
                    />
                    <span className="min-w-5 text-center text-[14px] font-medium">
                      {adults}
                    </span>
                    <StepperButton
                      label="Increase"
                      onClick={() => setAdults((value) => value + 1)}
                    />
                  </div>
                </section>

                <section className="rounded-[24px] bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-[14px] font-semibold">Children</h2>
                      <p className="mt-1 text-[12px] text-[#aaa59f]">
                        Under 18
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChildren((current) => [...current, 0])}
                      className="min-h-10 rounded-full px-3 text-[14px] font-semibold text-[#f75b56]"
                    >
                      + Add child
                    </button>
                  </div>
                  {children.length > 0 && (
                    <div className="mt-5 space-y-4 border-t border-[#eee9e2] pt-5">
                      {children.map((age, index) => (
                        <div
                          key={index}
                          className="flex flex-wrap items-center justify-between gap-4"
                        >
                          <span className="min-w-16 text-[14px] text-[#777169]">
                            Child {index + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <StepperButton
                              label={`Decrease age for child ${index + 1}`}
                              disabled={age <= 0}
                              onClick={() =>
                                setChildren((current) =>
                                  current.map((value, childIndex) =>
                                    childIndex === index
                                      ? Math.max(0, value - 1)
                                      : value,
                                  ),
                                )
                              }
                            />
                            <span className="w-24 shrink-0 whitespace-nowrap text-center text-[14px] tabular-nums">
                              {age === 0
                                ? "Under 1 year"
                                : `${age} ${age === 1 ? "year" : "years"}`}
                            </span>
                            <StepperButton
                              label={`Increase age for child ${index + 1}`}
                              disabled={age >= 17}
                              onClick={() =>
                                setChildren((current) =>
                                  current.map((value, childIndex) =>
                                    childIndex === index
                                      ? Math.min(17, value + 1)
                                      : value,
                                  ),
                                )
                              }
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setChildren((current) =>
                                current.filter(
                                  (_, childIndex) => childIndex !== index,
                                ),
                              )
                            }
                            className="min-h-11 rounded-full px-3 text-[14px] text-[#8f8982]"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="flex min-h-24 items-center justify-between gap-4 rounded-[24px] bg-white p-5">
                  <div>
                    <h2 className="text-[14px] font-semibold">
                      Traveling with pets
                    </h2>
                    <p className="mt-1 text-[12px] text-[#aaa59f]">
                      Pet policy will be checked
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={travelsWithPets}
                    aria-label="Traveling with pets"
                    onClick={() => setTravelsWithPets((value) => !value)}
                    data-preserve-fill
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                      travelsWithPets ? "bg-[#f75b56]" : "bg-[#d8d6d2]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-0 size-5 rounded-full bg-white shadow-sm transition-transform ${
                        travelsWithPets ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </section>
              </div>
            )}

            {step === 2 && (
              <div className="motion-swap mt-3">
                <p className="text-[14px] text-[#918b84]">
                  Select at least 3 preferences
                </p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {allPreferences.map((preference) => {
                    const selected = selectedPreferences.includes(preference)
                    return (
                      <button
                        key={preference}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => togglePreference(preference)}
                        data-preserve-fill
                        className={`min-h-11 rounded-full border px-4 text-[14px] transition ${
                          selected
                            ? "border-[#f75b56] bg-[#f75b56] text-white"
                            : "border-[#d9d5cf] bg-white text-[#625e59] hover:border-[#aaa39a]"
                        }`}
                      >
                        {preference}
                      </button>
                    )
                  })}
                </div>
                <form
                  className="mt-5 flex gap-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    addCustomPreference()
                  }}
                >
                  <input
                    value={customPreference}
                    onChange={(event) =>
                      setCustomPreference(event.target.value)
                    }
                    placeholder="Add your own preference"
                    aria-label="Add your own preference"
                    className="interactive-field min-h-12 min-w-0 flex-1 rounded-full border border-[#d9d5cf] bg-white px-4 text-[14px] outline-none placeholder:text-[#aaa59f]"
                  />
                  <button
                    type="submit"
                    disabled={!customPreference.trim()}
                    data-preserve-fill
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-[#1c1917] text-white transition hover:bg-[#3b3632] disabled:cursor-not-allowed disabled:opacity-35"
                    aria-label="Add preference"
                  >
                    <Plus size={22} strokeWidth={1.8} />
                  </button>
                </form>
                <p className="mt-4 text-[14px] text-[#777169]">
                  {selectedPreferences.length} selected ·{" "}
                  {hasMinimumPreferences
                    ? "Ready to continue"
                    : `${3 - selectedPreferences.length} more required`}
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="motion-swap mt-3">
                <p className="text-[14px] leading-relaxed text-[#918b84]">
                  Mark every preference as important or critical
                </p>
                <div className="mt-5 space-y-3">
                  {selectedPreferences.map((preference) => (
                    <section
                      key={preference}
                      className="flex flex-col gap-4 rounded-[20px] bg-white p-5 md:flex-row md:items-center md:justify-between"
                    >
                      <h2 className="text-[14px]">{preference}</h2>
                      <div className="flex flex-wrap gap-3">
                        {(["important", "critical"] as const).map(
                          (priority) => {
                            const selected = priorities[preference] === priority
                            return (
                              <button
                                key={priority}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                  setPriorities((current) => ({
                                    ...current,
                                    [preference]: priority,
                                  }))
                                }
                                data-preserve-fill
                                className={`min-h-10 rounded-full border px-4 text-[14px] font-semibold capitalize transition ${
                                  selected
                                    ? "border-[#f75b56] bg-[#f75b56] text-white"
                                    : "border-[#d9d5cf] bg-white text-[#8f8982] hover:border-[#aaa39a]"
                                }`}
                              >
                                {priority}
                              </button>
                            )
                          },
                        )}
                      </div>
                    </section>
                  ))}
                </div>
                {!allPrioritiesAssigned && (
                  <p className="mt-4 text-[14px] text-[#777169]">
                    Choose a priority for every preference
                  </p>
                )}
                {saveError && (
                  <p
                    role="alert"
                    className="mt-4 rounded-2xl bg-[#fff0eb] px-5 py-4 text-[14px] text-[#b4493e]"
                  >
                    {saveError}
                  </p>
                )}
              </div>
            )}

            <div
              className={`mt-8 flex gap-3 ${
                isMobile ? "flex-col-reverse" : "items-center"
              }`}
            >
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(1, current - 1))}
                  className={`${
                    isMobile ? "w-full" : "w-32"
                  } min-h-12 rounded-full border border-[#d4cfc7] bg-transparent px-5 text-[14px] font-semibold`}
                >
                  Back
                </button>
              )}
              <button
                type="button"
                data-variant="primary"
                disabled={
                  isSaving ||
                  (step === 2 && !hasMinimumPreferences) ||
                  (step === 3 && !allPrioritiesAssigned)
                }
                onClick={() => {
                  if (step === 1) setStep(2)
                  else if (step === 2 && hasMinimumPreferences) setStep(3)
                  else if (step === 3) void finishOnboarding()
                }}
                className="min-h-12 flex-1 rounded-full bg-[#f75b56] px-6 text-[14px] font-semibold text-white transition hover:bg-[#e6534f] disabled:cursor-not-allowed disabled:bg-[#d7d2cb] disabled:text-[#9a948c]"
              >
                {isSaving
                  ? "Saving…"
                  : step === 3
                    ? "Start using fitstay"
                    : "Continue"}
              </button>
            </div>
          </div>
        </section>

        <div className="sticky top-5 h-[calc(100vh-40px)] min-h-[680px] overflow-hidden rounded-[32px] max-lg:static max-lg:h-[420px] max-lg:min-h-0">
          <img
            key={step}
            src={stepImages[step - 1]}
            alt=""
            aria-hidden="true"
            className="motion-media h-full w-full object-cover"
          />
        </div>
      </div>
    </main>
  )
}

function Account({
  screen,
  viewport,
  go,
}: {
  screen: ScreenId
  viewport: Viewport
  go: Go
}) {
  if (screen === "verify")
    return (
      <Centered viewport={viewport}>
        <Card>
          <Brand />
          <h1 className="mt-8 text-[29px] font-bold">Check your email</h1>
          <p className="mt-3 text-[14px] text-[#777169]">
            We sent a magic sign-in link to olivia@example.com
          </p>
          <div className="mt-7">
            <Button primary full onClick={() => go("onboarding")}>
              Resend email
            </Button>
          </div>
          <button className="mt-3 min-h-11 w-full text-[12px] font-semibold text-[#777169]">
            Change email
          </button>
        </Card>
      </Centered>
    )
  if (screen === "onboarding")
    return <OnboardingFlow viewport={viewport} go={go} />
  return (
    <Centered viewport={viewport}>
      <Card>
        <Brand />
        <h1 className="mt-8 text-[30px] font-bold">Create your account</h1>
        <p className="mt-2 text-[12px] text-[#7b756e]">
          Start with 2 free hotel checks
        </p>
        <div className="mt-7 space-y-3">
          <Button full>Continue with Google</Button>
          <Button full>Continue with Facebook</Button>
          <Field label="Email" value="you@example.com" />
        </div>
        <label className="mt-5 flex gap-3 text-[12px]">
          <input type="checkbox" /> I confirm that I am 18 or older.
        </label>
        <div className="mt-6">
          <Button primary full onClick={() => go("verify")}>
            Continue
          </Button>
        </div>
      </Card>
    </Centered>
  )
}

const states: Partial<Record<ScreenId, [string, string, string]>> = {
  identify: [
    "Hotel identified",
    "Gennadi Grand Resort",
    "Gennadi, Rhodes, Greece · Confirm the property before analysis starts",
  ],
  ambiguous: [
    "We found a few matches",
    "Which hotel do you mean?",
    "Choose the exact property before we start your check",
  ],
  "not-found": [
    "Hotel not found",
    "We couldn’t identify this hotel",
    "Add a city, country or hotel link and try again. No credit has been reserved.",
  ],
  preliminary: [
    "Limited evidence",
    "A preliminary result is available",
    "Some preferences could not be confirmed. Viewing this result will use one check; stopping will return it.",
  ],
  "no-data": [
    "Not enough data",
    "We can’t form a reliable result",
    "There isn’t enough current evidence even for a preliminary result. Your credit has been returned.",
  ],
  failed: [
    "Check failed",
    "We couldn’t complete this check",
    "A source could not be reached. Your request is saved and your credit has been returned.",
  ],
}
function State({
  screen,
  viewport,
  go,
}: {
  screen: ScreenId
  viewport: Viewport
  go: Go
}) {
  const c = states[screen]!
  const stateHistory: HistoryState =
    screen === "identify"
      ? "draft"
      : ["preliminary", "no-data", "failed"].includes(screen)
        ? "active"
        : "empty"
  return (
    <Shell viewport={viewport} go={go} historyState={stateHistory}>
      <div className="mx-auto max-w-[720px]">
        <Card>
          <p className="text-[12px] font-semibold text-[#e55e51]">{c[0]}</p>
          <h1 className="mt-3 text-[29px] font-bold">{c[1]}</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[#787169]">
            {c[2]}
          </p>
          {screen === "ambiguous" && (
            <div className="mt-6 space-y-3">
              {[
                "Gennadi Grand Resort · Gennadi",
                "Gennadi Gardens Apartments · Gennadi",
                "Lindos Grand Resort · Lindos",
              ].map((x, i) => (
                <button
                  onClick={() => i === 0 && go("identify")}
                  key={x}
                  className="flex min-h-16 w-full items-center justify-between rounded-2xl border px-5 text-left text-[12px] font-semibold"
                >
                  {x}
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
          )}
          {screen === "not-found" && (
            <div className="mt-6">
              <Field label="Hotel name or link" value="Grand Resort" />
            </div>
          )}
          <div className="mt-7 flex flex-wrap gap-2">
            {screen === "identify" && (
              <>
                <Button primary onClick={() => go("analysis")}>
                  Confirm and check
                </Button>
                <Button onClick={() => go("ambiguous")}>Choose another</Button>
              </>
            )}
            {screen === "not-found" && (
              <Button primary onClick={() => go("identify")}>
                Try again
              </Button>
            )}
            {screen === "preliminary" && (
              <>
                <Button primary onClick={() => go("result")}>
                  View preliminary result
                </Button>
                <Button onClick={() => go("home")}>Stop check</Button>
              </>
            )}
            {["no-data", "failed"].includes(screen) && (
              <Button primary onClick={() => go("analysis")}>
                Try again
              </Button>
            )}
          </div>
        </Card>
      </div>
    </Shell>
  )
}

function Paywall({ viewport, go }: { viewport: Viewport go: Go }) {
  return (
    <Shell viewport={viewport} go={go}>
      <div className="mx-auto max-w-[760px]">
        <Card>
          <p className="text-[12px] font-semibold text-[#e55e51]">
            No checks left
          </p>
          <h1 className="mt-3 text-[31px] font-bold">Choose a check package</h1>
          <p className="mt-3 text-[14px] text-[#777169]">
            Your hotel and trip preferences are saved. Buying credits won’t
            start the check automatically.
          </p>
          <div
            className={`mt-7 grid gap-3 ${
              viewport === "mobile" ? "grid-cols-1" : "grid-cols-3"
            }`}
          >
            {[
              ["5 checks", "€9"],
              ["10 checks", "€15"],
              ["20 checks", "€20"],
            ].map(([a, b]) => (
              <button key={a} className="rounded-[22px] border p-5 text-left">
                <b>{a}</b>
                <strong className="mt-4 block text-[28px]">{b}</strong>
              </button>
            ))}
          </div>
          <div className="mt-7">
            <Button primary onClick={() => go("identify")}>
              Add credits
            </Button>
          </div>
        </Card>
      </div>
    </Shell>
  )
}
function Analysis({ viewport, go }: { viewport: Viewport go: Go }) {
  const [open, setOpen] = useState(true)
  return (
    <Shell viewport={viewport} go={go} historyState="active">
      <div className="mx-auto max-w-[720px]">
        <h1 className="mb-6 text-[28px] font-bold">
          Checking how this hotel fits you
        </h1>
        <section className="overflow-hidden rounded-[25px] border bg-white">
          <button
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="flex min-h-20 w-full items-center gap-4 px-6 text-left"
          >
            <span className="interactive-icon-surface grid size-10 place-items-center rounded-full bg-[#fff0eb] text-[#e55e51]">
              <Icon name="spark" />
            </span>
            <span className="flex-1">
              <b>Analysis in progress</b>
              <small className="mt-1 block text-[12px] text-[#837c74]">
                Reviewing current evidence and checking conflicts
              </small>
            </span>
            <Icon name="arrow" />
          </button>
          {open && (
            <div className="motion-swap border-t p-6 text-[12px]">
              ✓ Hotel identity confirmed
              <br />
              <br />✓ Official information checked
              <br />
              <br />○ Independent sources in progress
              <br />
              <br />○ Personalized match pending
            </div>
          )}
        </section>
        <div className="mt-5 flex gap-2">
          <Button onClick={() => go("preliminary")}>Limited-data state</Button>
          <Button onClick={() => go("result")}>Complete check</Button>
        </div>
      </div>
    </Shell>
  )
}
function Result({ viewport, go }: { viewport: Viewport go: Go }) {
  const cats = [
    ["Room & comfort", "88", "Checked 3 of 3"],
    ["Food & service", "91", "Checked 2 of 2"],
    ["Location & logistics", "76", "Checked 2 of 3"],
    ["Facilities & experience", "72", "Checked 2 of 3"],
  ]
  return (
    <Shell viewport={viewport} go={go} historyState="active">
      <div className="mx-auto max-w-[820px]">
        <h1 className="text-[31px] font-bold">Your hotel match</h1>
        <section
          className={`mt-5 grid overflow-hidden rounded-[30px] border bg-white ${
            viewport === "mobile" ? "grid-cols-1" : "grid-cols-[.85fr_1.15fr]"
          }`}
        >
          <div className="flex min-h-64 flex-col justify-between bg-[#fff1eb] p-7">
            <span className="w-fit rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#477555]">
              ✓ Fits
            </span>
            <div>
              <strong className="text-[70px] text-[#e85e51]">82%</strong>
              <p className="text-[12px]">Checked 9 of 11 · Sep 9, 2026</p>
            </div>
          </div>
          <div className="p-7">
            <h2 className="text-[21px] font-bold">
              A strong match for a relaxed family stay
            </h2>
            <p className="mt-3 text-[12px] leading-relaxed text-[#7c756d]">
              The hotel meets your most important requirements. Two location
              details need attention.
            </p>
            <p className="mt-6 text-[12px] text-[#477555]">
              ✓ Quiet rooms are supported by repeated recent signals
            </p>
            <p className="mt-3 text-[12px] text-[#a3682e]">
              ! Airport transfer time may be longer than expected
            </p>
          </div>
        </section>
        <div
          className={`mt-4 grid gap-3 ${
            viewport === "mobile" ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {cats.map(([a, b, c]) => (
            <button
              key={a}
              className="rounded-[22px] border bg-white p-5 text-left"
            >
              <span className="float-right text-[26px] font-bold">{b}</span>
              <b className="text-[12px]">{a}</b>
              <small className="mt-2 block text-[12px] text-[#8d867f]">
                {c}
              </small>
            </button>
          ))}
        </div>
        <details className="mt-4 rounded-[22px] border bg-white p-5">
          <summary className="text-[12px] font-semibold">
            Why we reached this conclusion
          </summary>
          <p className="mt-4 text-[12px] text-[#7c756d]">
            Evidence is grouped by criterion with source, date, status and
            original quote
          </p>
        </details>
        <div className="mt-5">
          <Button primary onClick={() => go("alternative")}>
            Find alternative
          </Button>
        </div>
        <div className="mt-5 rounded-[22px] bg-white p-5 text-[12px]">
          <b>Did this check help your decision?</b>
          <div className="mt-3 flex gap-2">
            <Button>Yes</Button>
            <Button>Partly</Button>
            <Button>No</Button>
          </div>
        </div>
      </div>
    </Shell>
  )
}
function Alternative({
  viewport,
  go,
  result = false,
}: {
  viewport: Viewport
  go: Go
  result?: boolean
}) {
  return (
    <Shell viewport={viewport} go={go}>
      <div className="mx-auto max-w-[760px]">
        <Card>
          {result ? (
            <>
              <p className="text-[12px] font-semibold text-[#477555]">
                ✓ Verified alternative
              </p>
              <h1 className="mt-3 text-[30px] font-bold">
                Princess Andriana Resort & Spa
              </h1>
              <p className="mt-2 text-[12px] text-[#7b756e]">
                Kiotari, Rhodes · 1 family room
              </p>
              <div className="mt-7 rounded-[24px] bg-[#f3f0eb] p-6">
                <small className="text-[12px]">Average price per night</small>
                <strong className="mt-2 block text-[32px]">€238</strong>
                <p className="text-[12px]">
                  €1,666 total · known mandatory fees included
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-[12px] font-semibold text-[#e55e51]">
                Find alternative
              </p>
              <h1 className="mt-3 text-[30px] font-bold">
                Set the search boundaries
              </h1>
              <div className="mt-7 space-y-4">
                <Field label="Starting hotel" value="Gennadi Grand Resort" />
                <Field
                  label="Where to search"
                  value="Same city or resort area · Gennadi"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Maximum price per night" value="€250" />
                  <Field label="Stay dates" value="Oct 12–19" />
                </div>
                <Field
                  label="Travelers"
                  value="2 adults, 1 child · one accommodation"
                />
                <Field
                  label="Criteria"
                  value="Quiet room · Family facilities · Dog policy"
                />
              </div>
              <div className="mt-7">
                <Button primary onClick={() => go("alternative-result")}>
                  Find one alternative
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </Shell>
  )
}
function Profile({ viewport, go }: { viewport: Viewport go: Go }) {
  return (
    <Shell viewport={viewport} go={go}>
      <div className="mx-auto max-w-[800px]">
        <h1 className="text-[30px] font-bold">Your travel defaults</h1>
        <div
          className={`mt-6 grid gap-4 ${
            viewport === "mobile" ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          <Card>
            <h2 className="font-bold">Usual travelers</h2>
            <div className="mt-5 space-y-4">
              <Field label="Adults" value="2" />
              <Field label="Children" value="1 · age 7" />
              <Field label="Pets" value="Dog" />
            </div>
          </Card>
          <Card>
            <h2 className="font-bold">Preferences</h2>
            <div className="mt-5 space-y-3">
              {[
                ["Quiet room", "Important"],
                ["Excellent breakfast", "Normal"],
                ["Traveling with dog", "Critical"],
              ].map(([a, b]) => (
                <div
                  key={a}
                  className="flex justify-between rounded-2xl border p-4 text-[12px]"
                >
                  <b>{a}</b>
                  <span>{b}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="mt-5">
          <Button primary onClick={() => go("home")}>
            Save profile
          </Button>
        </div>
      </div>
    </Shell>
  )
}

function UtilityPage({
  screen,
  viewport,
  go,
}: {
  screen: "saved" | "settings" | "help"
  viewport: Viewport
  go: Go
}) {
  if (screen === "saved")
    return (
      <Shell viewport={viewport} go={go}>
        <div className="mx-auto max-w-[820px]">
          <h1 className="text-[30px] font-bold">Saved hotels</h1>
          <p className="mt-2 text-[12px] text-[#7b756e]">
            Hotels saved with a specific result version
          </p>
          <div className="mt-6 grid gap-4">
            {[
              [
                "Gennadi Grand Resort",
                "Rhodes, Greece",
                "82% Match",
                rhodesImage,
              ],
              ["Baros Maldives", "Maldives", "Saved result", maldivesImage],
            ].map(([hotel, place, status, image]) => (
              <button
                key={hotel}
                onClick={() => go("result")}
                className="flex items-center gap-4 rounded-[24px] border border-[#e2ddd6] bg-white p-4 text-left hover:border-[#bcb5ad] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
              >
                <img
                  src={image}
                  alt=""
                  className="size-16 rounded-2xl object-cover"
                />
                <span className="flex-1">
                  <b className="block text-[14px]">{hotel}</b>
                  <span className="mt-1 block text-[12px] text-[#7b756e]">
                    {place}
                  </span>
                </span>
                <span className="text-[12px] font-semibold text-[#477555]">
                  {status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Shell>
    )
  if (screen === "settings")
    return (
      <Shell viewport={viewport} go={go}>
        <div className="mx-auto max-w-[760px]">
          <h1 className="text-[30px] font-bold">Settings</h1>
          <div className="mt-6 space-y-4">
            <Card>
              <h2 className="font-bold">Account</h2>
              <div className="mt-5 space-y-4">
                <Field label="Name" value="Olivia" />
                <Field label="Email" value="olivia@example.com" />
                <Field label="Sign-in method" value="Email magic link" />
              </div>
            </Card>
            <Card>
              <h2 className="font-bold">Notifications</h2>
              <label className="mt-5 flex items-center justify-between text-[12px]">
                <span>In-app check updates</span>
                <input type="checkbox" defaultChecked />
              </label>
              <label className="mt-4 flex items-center justify-between text-[12px]">
                <span>Email check updates</span>
                <input type="checkbox" />
              </label>
            </Card>
          </div>
        </div>
      </Shell>
    )
  return (
    <Shell viewport={viewport} go={go}>
      <div className="mx-auto max-w-[760px]">
        <h1 className="text-[30px] font-bold">Help & Support</h1>
        <p className="mt-2 text-[12px] text-[#7b756e]">
          Find answers or contact support about a specific check
        </p>
        <div className="mt-6 space-y-4">
          <Card>
            <h2 className="font-bold">How can we help?</h2>
            <div className="mt-5 space-y-2">
              {[
                "Understanding your result",
                "Credits and payments",
                "Report incorrect information",
                "Account access",
              ].map((item) => (
                <button
                  key={item}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl border border-[#e2ddd6] px-4 text-left text-[12px] font-semibold hover:bg-[#f7f4ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f06455]/50"
                >
                  {item}
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
            <div className="mt-6">
              <Button primary>Contact support</Button>
            </div>
          </Card>
        </div>
      </div>
    </Shell>
  )
}

function Preview({
  screen,
  viewport,
  go,
}: {
  screen: ScreenId
  viewport: Viewport
  go: Go
}) {
  if (["signup", "verify", "onboarding"].includes(screen))
    return <Account screen={screen} viewport={viewport} go={go} />
  if (screen === "home")
    return <Home viewport={viewport} go={go} historyState="empty" />
  if (screen === "home-draft")
    return <Home viewport={viewport} go={go} historyState="draft" />
  if (screen === "home-history")
    return <Home viewport={viewport} go={go} historyState="history" />
  if (states[screen])
    return <State screen={screen} viewport={viewport} go={go} />
  if (screen === "paywall") return <Paywall viewport={viewport} go={go} />
  if (screen === "analysis") return <Analysis viewport={viewport} go={go} />
  if (screen === "result") return <Result viewport={viewport} go={go} />
  if (screen === "alternative")
    return <Alternative viewport={viewport} go={go} />
  if (screen === "alternative-result")
    return <Alternative viewport={viewport} go={go} result />
  if (screen === "saved" || screen === "settings" || screen === "help")
    return <UtilityPage screen={screen} viewport={viewport} go={go} />
  return <Profile viewport={viewport} go={go} />
}
export default function VisualLab() {
  const params = new URLSearchParams(window.location.search)
  const requestedScreen = params.get("preview") as ScreenId | null
  const cleanPreview = Boolean(
    requestedScreen &&
      groups
        .flatMap((group) => group.items)
        .some(([id]) => id === requestedScreen),
  )
  const viewportForWidth = (width: number): Viewport =>
    width < 600 ? "mobile" : width < 1024 ? "tablet" : "desktop"
  const [screen, setScreen] = useState<ScreenId>(requestedScreen || "home")
  const [viewport, setViewport] = useState<Viewport>(() =>
    cleanPreview ? viewportForWidth(window.innerWidth) : "desktop",
  )
  const [hotelChecks, setHotelChecks] =
    useState<HotelCheckRecord[]>(readLocalHotelChecks)
  const [draftHotel, setDraftHotel] = useState<HotelOption | null>(() => {
    if (requestedScreen === "home-draft") return defaultDraftHotel
    const storedDraft = hotelChecks.find((record) => record.status === "draft")
    return storedDraft
      ? {
          place: storedDraft.place,
          hotel: storedDraft.hotel,
          image: destinationImages[storedDraft.hotel],
        }
      : null
  })
  const [homeInstance, setHomeInstance] = useState(0)

  const navigate: Go = (id) => {
    if (id === "home") setHomeInstance((current) => current + 1)
    setScreen(id)
  }

  const createDraft = (hotel: HotelOption) => {
    const record = createHotelCheckRecord(hotel)
    setDraftHotel(hotel)
    setHotelChecks(upsertLocalHotelCheck(record))
    void saveHotelCheck(record)
  }

  const resolveDraft = () => {
    const result = markLatestDraftChecked(hotelChecks)
    setHotelChecks(result.records)
    setDraftHotel(null)
    if (result.updatedRecord) void saveHotelCheck(result.updatedRecord)
  }

  const preview = (
    <DraftContext.Provider
      value={{
        hasDraft: Boolean(draftHotel),
        draftHotel,
        hotelChecks,
        createDraft,
        resolveDraft,
      }}
    >
      <div
        key={`${screen}-${screen === "home" ? homeInstance : 0}`}
        className="motion-page"
      >
        <Preview screen={screen} viewport={viewport} go={navigate} />
      </div>
    </DraftContext.Provider>
  )

  useEffect(() => {
    if (!cleanPreview) return
    const updateViewport = () =>
      setViewport(viewportForWidth(window.innerWidth))
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [cleanPreview])

  useEffect(() => {
    let active = true
    const unsubscribe = onAuthStateChanged(auth, () => {
      void loadHotelChecks().then((records) => {
        if (!active) return
        setHotelChecks(records)
        const storedDraft = records.find((record) => record.status === "draft")
        setDraftHotel(
          storedDraft
            ? {
                place: storedDraft.place,
                hotel: storedDraft.hotel,
                image: destinationImages[storedDraft.hotel],
              }
            : null,
        )
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (cleanPreview) {
    return (
      <div className="min-h-screen bg-[#f7f6f4] font-sans text-[#1c1917]">
        {preview}
      </div>
    )
  }

  const item = groups.flatMap((x) => x.items).find((x) => x[0] === screen)!
  return (
    <div className="min-h-screen bg-[#e9e6e1] font-sans text-[#1c1917]">
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b bg-[#f7f5f2]/95 px-4">
        <div className="flex items-center gap-3">
          <a href="/">
            <Brand />
          </a>
          <span className="hidden text-[12px] sm:block">Visual workshop</span>
        </div>
        <div className="flex rounded-full border bg-white p-1">
          {(["desktop", "tablet", "mobile"] as Viewport[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewport(v)}
              aria-pressed={viewport === v}
              className={`min-h-9 rounded-full px-3 text-[10px] capitalize ${
                viewport === v ? "bg-[#1c1917] text-white" : ""
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>
      <div className="grid min-h-[calc(100vh-64px)] grid-cols-1 xl:grid-cols-[230px_minmax(0,1fr)_240px]">
        <aside className="max-h-[calc(100vh-64px)] overflow-auto border-r bg-[#f7f5f2] p-4">
          <div className="flex gap-3 overflow-x-auto xl:block">
            {groups.map((g) => (
              <div key={g.label} className="min-w-max xl:mb-6">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-[#99928a]">
                  {g.label}
                </p>
                {g.items.map(([id, name, detail]) => (
                  <button
                    key={id}
                    onClick={() => setScreen(id)}
                    aria-current={screen === id ? "page" : undefined}
                    className={`mb-1 block min-w-40 rounded-xl p-2.5 text-left xl:w-full ${
                      screen === id ? "bg-white ring-1 ring-black/10" : ""
                    }`}
                  >
                    <b className="block text-[12px]">{name}</b>
                    <small className="text-[#99928a]">{detail}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>
        <main className="min-w-0 overflow-hidden p-3 sm:p-5">
          <div className="mb-3">
            <b className="text-[14px]">{item[1]}</b>
            <p className="text-[10px] text-[#888179]">
              {widths[viewport]}px canvas · clickable flow
            </p>
          </div>
          <div className="h-[calc(100vh-124px)] overflow-auto rounded-[22px] bg-[#d5d1cb] p-3">
            <div
              className="mx-auto overflow-hidden rounded-[18px] bg-white ring-1 ring-black/10"
              style={{ width: widths[viewport], minHeight: 800 }}
            >
              <div className="flex h-8 items-center gap-1.5 border-b bg-[#faf9f7] px-3">
                <i className="size-2 rounded-full bg-[#e7a39f]" />
                <i className="size-2 rounded-full bg-[#e8d69b]" />
                <i className="size-2 rounded-full bg-[#bcd4c3]" />
                <span className="mx-auto text-[8px] text-[#aaa39b]">
                  fitstay / {screen}
                </span>
              </div>
              {preview}
            </div>
          </div>
        </main>
        <aside className="hidden border-l bg-[#f7f5f2] p-5 xl:block">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#99928a]">
            Flow notes
          </p>
          <div className="mt-4 rounded-2xl bg-white p-4">
            <b className="text-[12px]">{item[1]}</b>
            <p className="mt-2 text-[10px] text-[#817a72]">
              {item[2]}. Controls inside the canvas connect agreed flow states.
            </p>
          </div>
          <div className="mt-3 rounded-2xl border p-4 text-[10px] text-[#817a72]">
            Home follows the approved reference while excluding budget and
            custom templates from MVP.
          </div>
        </aside>
      </div>
    </div>
  )
}
