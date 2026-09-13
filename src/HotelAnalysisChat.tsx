import { useEffect, useMemo, useState } from "react"
import { Check, ChevronDown, Sparkles } from "lucide-react"
import aiBlob from "@/imports/blob-animation__1_.gif"
import type { HotelAnalysisResult } from "./hotelAnalysis"
import type { HotelAnalysisProgress } from "./runHotelAnalysis"

const progressStages: Array<{
  id: HotelAnalysisProgress
  label: string
}> = [
  { id: "hotel_information", label: "Hotel information" },
  { id: "guest_feedback", label: "Guest feedback" },
  { id: "preference_matching", label: "Preference matching" },
  { id: "score_calculation", label: "Score calculation" },
  { id: "preparing_result", label: "Preparing your result" },
]

function sentence(value: string) {
  const trimmed = value.trim()
  return trimmed.replace(/[.]$/, "")
}

export function HotelAnalysisProcessing({
  hotelName,
  activeStage,
  error,
  onRetry,
}: {
  hotelName: string
  activeStage: HotelAnalysisProgress
  error?: string
  onRetry: () => void
}) {
  const activeIndex = Math.max(
    0,
    progressStages.findIndex((stage) => stage.id === activeStage),
  )
  return (
    <div className="motion-swap mt-7" aria-live="polite">
      <p className="text-[20px] font-semibold text-[#2f2b28]">{hotelName}</p>
      <p className="mt-1 text-[12px] text-[#8b847c]">AI hotel fit analysis</p>

      <div className="mt-6 flex items-center gap-3">
        <img src={aiBlob} alt="" className="size-12 shrink-0 object-contain" />
        <div className="min-w-0">
          <p className="text-[14px]">
            {error ? "Analysis paused" : "Analysis in progress"}
          </p>
          {!error && (
            <span
              className="analysis-dots mt-2 inline-flex gap-1"
              aria-label="Analysis in progress"
            >
              <i />
              <i />
              <i />
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-[20px] bg-[#fff3ed] p-4">
          <p className="text-[14px] text-[#9a4b40]">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full border border-[#d9d2ca] bg-white px-4 py-2 text-[12px] font-semibold"
          >
            Try again
          </button>
        </div>
      ) : (
        <p className="mt-6 text-[12px] text-[#817a73]">
          Checking available hotel information and recent guest feedback
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {["Hotel information", "Guest reviews", "Travel data"].map((item) => (
          <span
            key={item}
            className="rounded-full border border-[#e2ddd6] bg-[#faf9f7] px-3 py-2 text-[12px] text-[#6f6962]"
          >
            {item}
          </span>
        ))}
      </div>

      <details className="group mt-6 rounded-[20px] border border-[#e4dfd8] bg-[#faf9f7]">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-4 text-[12px] font-semibold">
          Analysis details
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#e8e3dc] px-4 py-4">
          <ol className="space-y-3">
            {progressStages.map((stage, index) => {
              const complete =
                index < activeIndex || (!error && activeIndex === 4)
              const current = index === activeIndex && !complete
              return (
                <li
                  key={stage.id}
                  className={`flex items-center gap-3 text-[12px] ${
                    complete || current ? "text-[#37322e]" : "text-[#aaa39b]"
                  }`}
                >
                  {complete ? (
                    <span className="grid size-5 place-items-center rounded-full bg-lime text-[#26311e]">
                      <Check className="size-3" strokeWidth={2.2} />
                    </span>
                  ) : current ? (
                    <span className="analysis-current-stage size-3 rounded-full bg-coral" />
                  ) : (
                    <span className="size-3 rounded-full bg-[#d9d4cd]" />
                  )}
                  {stage.label}
                </li>
              )
            })}
          </ol>
        </div>
      </details>
    </div>
  )
}

const statusScore = {
  strong_match: 100,
  match: 100,
  mixed: null,
  mismatch: 0,
  strong_mismatch: 0,
  insufficient_evidence: null,
} as const

type AnalysisPreference = HotelAnalysisResult["preferences"][number]
type CategoryId = "room" | "food" | "location" | "facilities"

const categoryDefinitions: Array<{ id: CategoryId label: string }> = [
  { id: "room", label: "Room & comfort" },
  { id: "food", label: "Food & service" },
  { id: "location", label: "Location & logistics" },
  { id: "facilities", label: "Facilities & experience" },
]

const categoryKeywords: Record<CategoryId, string[]> = {
  room: [
    "room",
    "quiet",
    "noise",
    "sleep",
    "bed",
    "clean",
    "floor",
    "view",
    "spacious",
    "air conditioning",
  ],
  food: [
    "breakfast",
    "food",
    "meal",
    "restaurant",
    "service",
    "staff",
    "housekeeping",
  ],
  location: [
    "location",
    "central",
    "parking",
    "airport",
    "transfer",
    "transport",
    "walk",
    "logistics",
  ],
  facilities: [
    "pool",
    "fitness",
    "gym",
    "spa",
    "beach",
    "pet",
    "family",
    "child",
    "access",
    "elevator",
    "bathroom",
  ],
}

function isEvaluated(preference: AnalysisPreference) {
  if (["mixed", "insufficient_evidence"].includes(preference.status))
    return false
  if (preference.confidence === "low") return false
  return preference.priority !== "critical" || preference.confidence === "high"
}

function primaryCategory(label: string): CategoryId {
  const normalized = label.toLocaleLowerCase()
  return (
    categoryDefinitions.find(({ id }) =>
      categoryKeywords[id].some((keyword) => normalized.includes(keyword)),
    )?.id || "facilities"
  )
}

function categoryBreakdown(
  result: HotelAnalysisResult,
  preferenceLabels: Record<string, string>,
) {
  const weights = { critical: 2, important: 2, nice_to_have: 1 }
  return categoryDefinitions.map((category) => {
    const preferences = result.preferences.filter(
      (preference) =>
        primaryCategory(
          preferenceLabels[preference.preferenceId] || preference.preferenceId,
        ) === category.id,
    )
    const evaluated = preferences.filter(isEvaluated)
    const totalWeight = preferences.reduce(
      (total, preference) => total + weights[preference.priority],
      0,
    )
    const evaluatedWeight = evaluated.reduce(
      (total, preference) => total + weights[preference.priority],
      0,
    )
    const criticalIssue = preferences.some(
      (preference) =>
        preference.priority === "critical" &&
        ["mismatch", "strong_mismatch"].includes(preference.status),
    )
    const needsVerification = preferences.some(
      (preference) =>
        preference.priority === "critical" && !isEvaluated(preference),
    )
    const eligibleForNumber =
      preferences.length > 0 &&
      evaluated.length >= 2 &&
      evaluatedWeight / totalWeight >= 0.5
    const weightedScore = evaluated.reduce((total, preference) => {
      const value = statusScore[preference.status]
      return total + (value === null ? 0 : value * weights[preference.priority])
    }, 0)
    const score =
      eligibleForNumber && evaluatedWeight
        ? Math.floor(weightedScore / evaluatedWeight + 0.5)
        : null
    return {
      ...category,
      score,
      checked: evaluated.length,
      total: preferences.length,
      state: criticalIssue
        ? "Critical issue"
        : needsVerification
          ? "Needs verification"
          : score === null
            ? "Not enough data"
            : null,
    }
  })
}

function verdictFor(result: HotelAnalysisResult) {
  const priorityWeight = { critical: 2, important: 2, nice_to_have: 1 }
  const evaluated = result.preferences.filter(isEvaluated)
  const availableWeight = result.preferences.reduce(
    (total, preference) => total + priorityWeight[preference.priority],
    0,
  )
  const evaluatedWeight = evaluated.reduce(
    (total, preference) => total + priorityWeight[preference.priority],
    0,
  )
  const coverage = availableWeight ? evaluatedWeight / availableWeight : 0
  const unresolvedCritical = result.preferences.some(
    (preference) =>
      preference.priority === "critical" && !isEvaluated(preference),
  )
  const fullResult =
    coverage >= 0.7 &&
    !unresolvedCritical &&
    evaluated.length >= Math.min(5, result.preferences.length) &&
    result.evidenceStats.independentSourceCount >= 2
  const preliminaryResult = coverage >= 0.5 && evaluated.length >= 3
  if (result.hasCriticalConflict)
    return {
      label: "Doesn’t fit",
      message: "I found a conflict with one of your critical preferences",
      displayScore: null,
    }
  if (result.matchScore === null || !preliminaryResult)
    return {
      label: "Not enough data",
      message: "There isn’t enough reliable evidence for a match score yet",
      displayScore: null,
    }
  if (!fullResult)
    return {
      label: "Preliminary result",
      message:
        "The available evidence is promising, but some details need verification",
      displayScore: result.matchScore,
    }
  if (result.matchScore >= 85)
    return {
      label: "Strong fit",
      message: "It looks like a strong match for your trip",
      displayScore: result.matchScore,
    }
  if (result.matchScore >= 70)
    return {
      label: "Fits",
      message: "It looks like a good match for your trip",
      displayScore: result.matchScore,
    }
  return {
    label: "Doesn’t fit",
    message: "This hotel may not be the right match for your trip",
    displayScore: result.matchScore,
  }
}

function RadialScore({
  result,
  preferenceLabels,
  score,
}: {
  result: HotelAnalysisResult
  preferenceLabels: Record<string, string>
  score: number | null
}) {
  const [active, setActive] = useState<number | null>(null)
  const [shownScore, setShownScore] = useState(0)
  const visiblePreferences = result.preferences.slice(0, 10)
  const circumference = 2 * Math.PI * 92
  const segment = circumference / Math.max(visiblePreferences.length, 1)
  const gap = Math.min(8, segment * 0.18)

  useEffect(() => {
    if (score === null) return
    let frame = 0
    const start = performance.now()
    const animate = (time: number) => {
      const progress = Math.min((time - start) / 900, 1)
      setShownScore(Math.round(score * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  const colors = ["#f75b56", "#f5a38f", "#e4fb62", "#c5dde2", "#f5c4c0"]

  return (
    <div className="relative mx-auto size-[250px] shrink-0">
      <svg
        viewBox="0 0 220 220"
        className="size-full -rotate-90"
        aria-label="Match score visualization"
      >
        <circle
          cx="110"
          cy="110"
          r="92"
          fill="none"
          stroke="#eee9e2"
          strokeWidth="13"
        />
        {visiblePreferences.map((preference, index) => {
          const value = statusScore[preference.status]
          const visibleLength =
            value === null ? segment - gap : (segment - gap) * (value / 100)
          return (
            <circle
              key={preference.preferenceId}
              cx="110"
              cy="110"
              r="92"
              fill="none"
              stroke={
                value === null ? "#d8d3cc" : colors[index % colors.length]
              }
              strokeWidth="13"
              strokeLinecap="round"
              strokeDasharray={`${Math.max(visibleLength, 0.01)} ${circumference - Math.max(visibleLength, 0.01)}`}
              strokeDashoffset={-index * segment}
              className="analysis-score-segment cursor-pointer"
              style={{ animationDelay: `${index * 70}ms` }}
              tabIndex={0}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(index)}
              onBlur={() => setActive(null)}
            />
          )
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <strong className="text-[44px] font-semibold tracking-[-.05em] text-[#2c2825]">
          {score === null ? "—" : `${shownScore}%`}
        </strong>
        <span className="mt-1 text-[12px] text-[#817a73]">Match score</span>
      </div>
      {active !== null && visiblePreferences[active] && (
        <div className="motion-swap absolute left-1/2 top-0 z-10 w-48 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#e2ddd6] bg-white p-3 text-[12px] shadow-[0_12px_30px_rgba(36,31,27,.12)]">
          <span className="block font-semibold">
            {preferenceLabels[visiblePreferences[active].preferenceId] ||
              visiblePreferences[active].preferenceId.replace(/[-_]/g, " ")}
          </span>
          <span className="mt-1 block text-[#817a73]">
            {visiblePreferences[active].status.replace(/_/g, " ")}
          </span>
        </div>
      )}
    </div>
  )
}

export function HotelAnalysisResultView({
  hotelName,
  result,
  preferenceLabels,
  saved,
  onSave,
  onCompare,
  onRetry,
}: {
  hotelName: string
  result: HotelAnalysisResult
  preferenceLabels: Record<string, string>
  saved: boolean
  onSave: () => void
  onCompare: () => void
  onRetry: () => void
}) {
  const verdict = verdictFor(result)
  const categories = categoryBreakdown(result, preferenceLabels)
  const positives = result.preferences.filter((item) =>
    ["strong_match", "match"].includes(item.status),
  )
  const risks = result.preferences.filter((item) =>
    ["mixed", "mismatch", "strong_mismatch"].includes(item.status),
  )
  const checked = result.preferences.filter(
    (item) => item.status !== "insufficient_evidence",
  ).length
  const analysisBatches = result.evidenceStats.analysisBatches ?? 1
  const explanation = useMemo(() => {
    const positive = positives.slice(0, 2).map((item) => sentence(item.summary))
    const uncertain = risks.slice(0, 1).map((item) => sentence(item.summary))
    return [...positive, ...uncertain].join(". ")
  }, [positives, risks])

  return (
    <div className="motion-swap mt-7 pb-2">
      <p className="text-[14px]">I’ve checked {hotelName} against your trip</p>
      <p className="mt-2 text-[14px] text-[#716b64]">{verdict.message}</p>

      <section className="mt-6 grid gap-6 rounded-[26px] border border-[#e2ddd6] bg-[linear-gradient(145deg,#fff,#fff7f1)] p-5 md:grid-cols-[270px_minmax(0,1fr)] md:items-center">
        <RadialScore
          result={result}
          preferenceLabels={preferenceLabels}
          score={verdict.displayScore}
        />
        <div>
          <span className="inline-flex rounded-full bg-[#fff0eb] px-3 py-2 text-[12px] font-semibold text-[#c94f45]">
            {verdict.label}
          </span>
          <p className="mt-4 text-[14px] text-[#716b64]">
            {verdict.displayScore === null
              ? "A percentage is hidden until enough reliable evidence is available"
              : "match with your preferences"}
          </p>
          <p className="mt-2 text-[12px] text-[#908980]">
            Checked {checked} of {result.preferences.length} ·{" "}
            {new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date())}
          </p>
        </div>
      </section>

      <section className="mt-4" aria-labelledby="category-breakdown-title">
        <h2 id="category-breakdown-title" className="text-[16px] font-semibold">
          Preference breakdown
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {categories.map((category) => (
            <article
              key={category.id}
              className="rounded-[20px] border border-[#e2ddd6] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[12px] font-semibold leading-relaxed">
                  {category.label}
                </h3>
                <span
                  className={`shrink-0 text-[14px] font-semibold ${
                    category.state === "Critical issue"
                      ? "text-[#b95c48]"
                      : category.state === "Needs verification"
                        ? "text-[#8a6a42]"
                        : "text-coral"
                  }`}
                >
                  {category.score === null
                    ? category.state
                    : `${category.score}%`}
                </span>
              </div>
              <p className="mt-2 text-[12px] text-[#8b847c]">
                Checked {category.checked} of {category.total}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="rounded-[22px] border border-[#e2ddd6] bg-white p-5">
          <h2 className="text-[16px] font-semibold">
            What you’ll probably like
          </h2>
          <ul className="mt-4 space-y-3">
            {positives.slice(0, 4).map((item) => (
              <li
                key={item.preferenceId}
                className="flex gap-3 text-[12px] leading-relaxed text-[#5f5953]"
              >
                <Sparkles className="mt-0.5 size-4 shrink-0 text-coral" />
                {sentence(item.summary)}
              </li>
            ))}
            {positives.length === 0 && (
              <li className="text-[12px] text-[#817a73]">
                No preference has enough positive evidence yet
              </li>
            )}
          </ul>
        </section>

        <section className="rounded-[22px] border border-[#eadfd5] bg-[#fff4ea] p-5">
          <h2 className="text-[16px] font-semibold">
            Potential risks to consider
          </h2>
          <ul className="mt-4 space-y-3">
            {risks.slice(0, 4).map((item) => (
              <li
                key={item.preferenceId}
                className="flex gap-3 text-[12px] leading-relaxed text-[#665b52]"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#e58a6e]" />
                {sentence(item.summary)}
              </li>
            ))}
            {risks.length === 0 && (
              <li className="text-[12px] text-[#817a73]">
                No material risks were found in the available evidence
              </li>
            )}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-[22px] border border-[#e2ddd6] bg-white p-5">
        <div className="flex gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#fff0eb] text-coral">
            <Sparkles className="size-4" />
          </span>
          <div className="max-w-[500px]">
            <h2 className="text-[16px] font-semibold">Why this score?</h2>
            <p className="mt-3 text-[12px] leading-relaxed text-[#716b64]">
              {explanation ||
                "The available evidence was assessed against each of your saved preferences"}
            </p>
          </div>
        </div>
      </section>

      <details className="group mt-4 rounded-[22px] border border-[#e2ddd6] bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[12px] font-semibold">
          See how we reached this conclusion
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-[#ebe7e1] p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            {result.preferences.map((item) => (
              <div
                key={item.preferenceId}
                className="rounded-2xl bg-[#f7f4ef] p-4"
              >
                <p className="text-[12px] font-semibold capitalize">
                  {preferenceLabels[item.preferenceId] ||
                    item.preferenceId.replace(/[-_]/g, " ")}
                </p>
                <p className="mt-2 text-[12px] text-[#817a73]">
                  {item.status.replace(/_/g, " ")} · {item.confidence}{" "}
                  confidence
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-[#625c56]">
                  {sentence(item.summary)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </details>

      <div className="mt-4 rounded-[20px] bg-[#f7f4ef] p-4">
        <p className="text-[12px] text-[#716b64]">
          Based on recent guest feedback and available hotel information
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-2 text-[12px]">
            {result.evidenceStats.totalEvidenceItems} items collected
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-[12px]">
            {result.evidenceStats.evidenceItemsAnalyzed} items analyzed
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-[12px]">
            {analysisBatches} analysis{" "}
            {analysisBatches === 1 ? "batch" : "batches"}
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-[12px]">
            {result.evidenceStats.independentSourceCount} sources checked
          </span>
          <span className="rounded-full bg-white px-3 py-2 text-[12px]">
            Updated recently
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {verdict.label === "Not enough data" ? (
          <button
            type="button"
            data-variant="primary"
            onClick={onRetry}
            className="rounded-full bg-coral px-6 py-3 text-[12px] font-semibold text-white"
          >
            Check again
          </button>
        ) : (
          <button
            type="button"
            data-variant="primary"
            onClick={onSave}
            disabled={saved}
            className="rounded-full bg-coral px-6 py-3 text-[12px] font-semibold text-white"
          >
            {saved ? "Saved" : "Save hotel"}
          </button>
        )}
        <button
          type="button"
          onClick={onCompare}
          className="rounded-full border border-[#d9d3cb] bg-white px-6 py-3 text-[12px] font-semibold"
        >
          Compare alternatives
        </button>
      </div>
    </div>
  )
}
