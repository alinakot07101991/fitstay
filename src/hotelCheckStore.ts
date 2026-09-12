import { collection, doc, getDocs, setDoc } from "firebase/firestore"
import { auth, database } from "./firebase"

export type HotelCheckRecord = {
  id: string
  place: string
  hotel: string
  status: "draft" | "checked"
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
    typeof record.place === "string" &&
    typeof record.hotel === "string" &&
    (record.status === "draft" || record.status === "checked") &&
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
    return Array.isArray(records) ? sortNewestFirst(records.filter(isHotelCheckRecord)) : []
  } catch {
    return []
  }
}

function writeLocalHotelChecks(records: HotelCheckRecord[]) {
  window.localStorage.setItem(localRecordsKey(), JSON.stringify(sortNewestFirst(records)))
}

export function createHotelCheckRecord(
  hotel: Pick<HotelCheckRecord, "place" | "hotel">,
): HotelCheckRecord {
  const normalizedHotel = hotel.hotel
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return {
    id: normalizedHotel || crypto.randomUUID(),
    place: hotel.place,
    hotel: hotel.hotel,
    status: "draft",
    updatedAt: new Date().toISOString(),
  }
}

export function upsertLocalHotelCheck(record: HotelCheckRecord) {
  const records = readLocalHotelChecks()
  const nextRecords = [record, ...records.filter((item) => item.id !== record.id)]
  writeLocalHotelChecks(nextRecords)
  return sortNewestFirst(nextRecords)
}

export async function saveHotelCheck(record: HotelCheckRecord) {
  upsertLocalHotelCheck(record)
  const userRecords = recordsCollection()
  if (!userRecords) return
  try {
    await setDoc(doc(userRecords, record.id), record, { merge: true })
  } catch (error) {
    console.warn("Firestore is unavailable; the hotel check remains saved locally.", error)
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
      if (!current || record.updatedAt > current.updatedAt) merged.set(record.id, record)
    }
    const records = sortNewestFirst([...merged.values()])
    writeLocalHotelChecks(records)
    return records
  } catch (error) {
    console.warn("Firestore is unavailable; loading locally saved hotel checks.", error)
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
