import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, database } from "./firebase"

export type TravelerPreference = {
  label: string
  priority: "important" | "critical"
}

export type TravelerProfile = {
  name: string
  adults: number
  childAges: number[]
  travelsWithPets: boolean
  preferences: TravelerPreference[]
  updatedAt: string
}

function completionKey(uid: string) {
  return `fitstay.onboarding-complete.${uid}`
}

function profileKey(uid: string) {
  return `fitstay.traveler-profile.${uid}`
}

function validTravelerProfile(value: unknown): value is TravelerProfile {
  if (!value || typeof value !== "object") return false
  const profile = value as Partial<TravelerProfile>
  return (
    typeof profile.name === "string" &&
    Number.isFinite(profile.adults) &&
    Array.isArray(profile.childAges) &&
    typeof profile.travelsWithPets === "boolean" &&
    Array.isArray(profile.preferences) &&
    typeof profile.updatedAt === "string"
  )
}

function readLocalTravelerProfile(uid: string): TravelerProfile | null {
  try {
    const stored = window.localStorage.getItem(profileKey(uid))
    if (!stored) return null
    const profile: unknown = JSON.parse(stored)
    return validTravelerProfile(profile) ? profile : null
  } catch {
    return null
  }
}

export async function loadTravelerProfile(uid: string) {
  const localProfile = readLocalTravelerProfile(uid)
  try {
    const snapshot = await getDoc(doc(database, "users", uid))
    const remoteProfile: unknown = snapshot.data()?.travelerProfile
    if (validTravelerProfile(remoteProfile)) {
      window.localStorage.setItem(
        profileKey(uid),
        JSON.stringify(remoteProfile),
      )
      return remoteProfile
    }
    return localProfile
  } catch (error) {
    console.warn("Traveler profile could not be loaded from Firestore", error)
    return localProfile
  }
}

export async function loadOnboardingCompleted(uid: string) {
  try {
    const snapshot = await getDoc(doc(database, "users", uid))
    if (snapshot.data()?.onboardingCompleted === true) {
      window.localStorage.setItem(completionKey(uid), "true")
      return true
    }

    window.localStorage.removeItem(completionKey(uid))
    return false
  } catch (error) {
    console.warn("Onboarding status could not be loaded from Firestore", error)
    return window.localStorage.getItem(completionKey(uid)) === "true"
  }
}

export async function completeOnboarding(profile: TravelerProfile) {
  const user = auth.currentUser
  if (!user)
    throw new Error("Authentication is required to complete onboarding")

  await setDoc(
    doc(database, "users", user.uid),
    {
      onboardingCompleted: true,
      onboardingCompletedAt: profile.updatedAt,
      travelerProfile: profile,
      updatedAt: profile.updatedAt,
    },
    { merge: true },
  )

  window.localStorage.setItem(profileKey(user.uid), JSON.stringify(profile))
  window.localStorage.setItem(completionKey(user.uid), "true")
}
