import { collection, doc, getDocs, setDoc } from "firebase/firestore"
import { auth, database } from "./firebase"
import type { HotelAnalysisResult } from "./hotelAnalysis"
import type { HotelAnalysisProgress } from "./runHotelAnalysis"

export type StoredHotelAnalysisStatus = "queued" | "processing" | "completed" | "failed"

export type HotelCheckRecord = {
  id: string
  placeId?: string
  city?: string
  country?: string
  place: string
  hotel: string
  status: "draft" | "checked"
  analysisJobId?: string
  analysisStatus?: StoredHotelAnalysisStatus
  analysisStage?: HotelAnalysisProgress
  analysisResult?: HotelAnalysisResult
  analysisError?: string
  analysisErrorCode?: string
  analysisPreferenceLabels?: Record<string, string>
  updatedAt: string
}

const legacyLocalRecordsKey = "fitstay.hotel-checks.v1"

function recordsCollection() {
  const user = auth.currentUser
  return user ? collection(database, "users", user.uid, "hotelChecks") : null
}

function localRecordsKey() {
  return auth.currentUser
    ? `${legacyLocalRecordsKey}.${auth.currentUser.uid}`
    : legacyLocalRecordsKey
}

function isHotelCheckRecord(value: unknown): value is HotelCheckRecord {
  if (!value || typeof value !== "object") return false
  const record = value as Partial<HotelCheckRecord>
  return (
    typeof record.id === "string" &&
    (record.placeId === undefined || typeof record.placeId === "string") &&
    (record.city === undefined || typeof record.city === "string") &&
    (record.country === undefined || typeof record.country === "string") &&
    typeof record.place === "string" &&
    typeof record.hotel === "string" &&
    (record.status === "draft" || record.status === "checked") &&
    (record.analysisJobId === undefined ||
      typeof record.analysisJobId === "string") &&
    (record.analysisStatus === undefined ||
      ["queued", "processing", "completed", "failed"].includes(
        record.analysisStatus,
      )) &&
    typeof record.updatedAt === "string"
  )
}

function sortNewestFirst(records: HotelCheckRecord[]) {
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function readLocalHotelChecks(): HotelCheckRecord[] {
  try {
    const rawRecords = window.localStorage.getItem(localRecordsKey())
    if (!rawRecords) return []
    const records: unknown = JSON.parse(rawRecords)
    return Array.isArray(records)
      ? sortNewestFirst(records.filter(isHotelCheckRecord))
      : []
  } catch {
    return []
  }
}

function writeLocalHotelChecks(records: HotelCheckRecord[]) {
  window.localStorage.setItem(
    localRecordsKey(),
    JSON.stringify(sortNewestFirst(records)),
  )
}

export function createHotelCheckRecord(
  hotel: Pick<HotelCheckRecord, "place" | "hotel" | "placeId" | "city" | "country">,
): HotelCheckRecord {
  const normalizedHotel = hotel.hotel
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return {
    id: normalizedHotel || crypto.randomUUID(),
    placeId: hotel.placeId,
    city: hotel.city,
    country: hotel.country,
    place: hotel.place,
    hotel: hotel.hotel,
    status: "draft",
    updatedAt: new Date().toISOString(),
  }
}

export function upsertLocalHotelCheck(record: HotelCheckRecord) {
  const records = readLocalHotelChecks()
  const nextRecords = [
    record,
    ...records.filter((item) => item.id !== record.id),
  ]
  writeLocalHotelChecks(nextRecords)
  return sortNewestFirst(nextRecords)
}

export async function saveHotelCheck(record: HotelCheckRecord) {
  upsertLocalHotelCheck(record)
  const userRecords = recordsCollection()
  if (!userRecords) return
  try {
    const firestoreRecord = JSON.parse(
      JSON.stringify(record),
    ) as HotelCheckRecord
    await setDoc(doc(userRecords, record.id), firestoreRecord, { merge: true })
  } catch (error) {
    console.warn(
      "Firestore is unavailable; the hotel check remains saved locally.",
      error,
    )
  }
}

export function updateHotelCheckRecord(
  records: HotelCheckRecord[],
  id: string,
  changes: Partial<HotelCheckRecord>,
) {
  const current = records.find((record) => record.id === id)
  if (!current) return { records, updatedRecord: null }
  const updatedRecord: HotelCheckRecord = {
    ...current,
    ...changes,
    id: current.id,
    updatedAt: new Date().toISOString(),
  }
  return {
    records: upsertLocalHotelCheck(updatedRecord),
    updatedRecord,
  }
}

export async function loadHotelChecks() {
  const localRecords = readLocalHotelChecks()
  const userRecords = recordsCollection()
  if (!userRecords) return localRecords
  try {
    const snapshot = await getDocs(userRecords)
    const remoteRecords = snapshot.docs
      .map((item) => item.data())
      .filter(isHotelCheckRecord)
    const merged = new Map<string, HotelCheckRecord>()
    for (const record of [...localRecords, ...remoteRecords]) {
      const current = merged.get(record.id)
      if (!current || record.updatedAt > current.updatedAt)
        merged.set(record.id, record)
    }
    const records = sortNewestFirst([...merged.values()])
    writeLocalHotelChecks(records)
    return records
  } catch (error) {
    console.warn(
      "Firestore is unavailable; loading locally saved hotel checks.",
      error,
    )
    return localRecords
  }
}

export function markLatestDraftChecked(
  records: HotelCheckRecord[],
  hotelName?: string,
) {
  const normalizedHotelName = hotelName?.trim().toLocaleLowerCase()
  const latestDraft = records.find(
    (record) =>
      record.status === "draft" &&
      (!normalizedHotelName ||
        record.hotel.trim().toLocaleLowerCase() === normalizedHotelName),
  )
  if (!latestDraft) return { records, updatedRecord: null }

  const updatedRecord: HotelCheckRecord = {
    ...latestDraft,
    status: "checked",
    updatedAt: new Date().toISOString(),
  }
  return {
    records: upsertLocalHotelCheck(updatedRecord),
    updatedRecord,
  }
}
