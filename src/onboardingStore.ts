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
  if (!user) throw new Error("Authentication is required to complete onboarding")

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
