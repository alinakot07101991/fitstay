import {
  analyzeHotel,
  type HotelAnalysisEvidence,
  type HotelAnalysisPreference,
  type HotelAnalysisResult,
} from "./hotelAnalysis"
import { fetchGoogleHotelsReviews } from "./googleHotelsReviews"
import { fetchTavilyEvidence } from "./tavilyEvidence"
import { fetchTripadvisorHotelReviews } from "./tripadvisorReviews"
import { fetchYouTubeEvidence } from "./youtubeEvidence"

export type CanonicalHotelForAnalysis = {
  source: "google_places"
  placeId: string | null
  name: string
  city: string
  country: string
}

export type HotelAnalysisProgress = "hotel_information" | "guest_feedback" | "preference_matching" | "score_calculation" | "preparing_result"

export type CompletedHotelAnalysis = {
  result: HotelAnalysisResult
  providerErrors: Array<{ provider: string code: string message: string }>
}

function providerError(provider: string, error: unknown) {
  const value = error as { code?: string message?: string }
  return {
    provider,
    code: value?.code || `${provider}_unavailable`,
    message: value?.message || `${provider} evidence is unavailable`,
  }
}

export async function runHotelAnalysis(input: {
  hotel: CanonicalHotelForAnalysis
  preferences: HotelAnalysisPreference[]
  onProgress?: (stage: HotelAnalysisProgress) => void
  signal?: AbortSignal
}): Promise<CompletedHotelAnalysis> {
  const { hotel, preferences, signal } = input
  const providerErrors: CompletedHotelAnalysis["providerErrors"] = []
  const evidence: HotelAnalysisEvidence[] = []

  const advance = async (stage: HotelAnalysisProgress) => {
    input.onProgress?.(stage)
    await new Promise((resolve) => window.setTimeout(resolve, 420))
  }

  await advance("hotel_information")
  evidence.push({
    evidenceId: `google-place:${hotel.placeId || hotel.name}`,
    source: "google_places",
    type: "hotel_information",
    sourceId: hotel.placeId,
    title: hotel.name,
    text: `${hotel.name}, ${hotel.city}, ${hotel.country}`,
  })

  await advance("guest_feedback")
  const reviewResults = await Promise.allSettled([
    fetchGoogleHotelsReviews({
      hotelName: hotel.name,
      city: hotel.city,
      country: hotel.country,
      signal,
    }),
    fetchTripadvisorHotelReviews({
      hotelName: hotel.name,
      city: hotel.city,
      country: hotel.country,
      signal,
    }),
  ])

  const googleReviews = reviewResults[0]
  if (googleReviews.status === "fulfilled") {
    evidence.push(
      ...googleReviews.value.reviews.map((review, index) => ({
        evidenceId: review.sourceId || `google-hotels:${index}`,
        source: review.source,
        type: "review",
        sourceId: review.sourceId,
        title: review.title,
        text: review.text,
        author: review.author,
        publishedAt: review.publishedAt,
        sourceUrl: review.sourceUrl,
        metadata: {
          rating: review.rating,
          tripType: review.tripType,
          subratings: review.subratings,
        },
      })),
    )
  } else {
    providerErrors.push(providerError("google_hotels", googleReviews.reason))
  }

  const tripadvisorReviews = reviewResults[1]
  if (tripadvisorReviews.status === "fulfilled") {
    evidence.push(
      ...tripadvisorReviews.value.reviews.map((review) => ({
        evidenceId: `tripadvisor:${review.sourceId}`,
        source: review.source,
        type: "review",
        sourceId: review.sourceId,
        title: review.title,
        text: review.text,
        publishedAt: review.publishedAt,
        sourceUrl: review.sourceUrl,
        metadata: {
          rating: review.rating,
          tripType: review.tripType,
          subratings: review.subratings,
        },
      })),
    )
  } else {
    providerErrors.push(providerError("tripadvisor", tripadvisorReviews.reason))
  }

  await advance("preference_matching")
  const discoveryResults = await Promise.allSettled([
    fetchYouTubeEvidence({ hotel, signal }),
    fetchTavilyEvidence({
      hotel,
      preferences: preferences.map((preference) => ({
        name: preference.label,
        priority: preference.priority,
      })),
      signal,
    }),
  ])

  const youtube = discoveryResults[0]
  if (youtube.status === "fulfilled") {
    evidence.push(...youtube.value.evidence)
    if (youtube.value.providerError) {
      providerErrors.push({
        provider: "youtube",
        ...youtube.value.providerError,
      })
    }
  } else {
    providerErrors.push(providerError("youtube", youtube.reason))
  }

  const tavily = discoveryResults[1]
  if (tavily.status === "fulfilled") {
    evidence.push(
      ...tavily.value.evidence.map((item, index) => ({
        evidenceId: `web:${item.domain}:${index}`,
        source: item.source,
        provider: item.provider,
        type: "web",
        title: item.title,
        text: item.text,
        sourceUrl: item.sourceUrl,
        publishedAt: item.retrievedAt,
        domain: item.domain,
        metadata: { relevanceScore: item.relevanceScore },
      })),
    )
  } else {
    providerErrors.push(providerError("web", tavily.reason))
  }

  await advance("score_calculation")
  const result = await analyzeHotel({
    hotel,
    preferences,
    evidence,
    providerErrors,
    signal,
  })
  await advance("preparing_result")
  return { result, providerErrors }
}
