import {
  defineConfig,
  loadEnv,
  type HtmlTagDescriptor,
  type Plugin,
} from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { sites } from "@openai/sites-vite-plugin"
import { copyFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import siteConfiguration from "./.figma/make/site.json"
import { handleTripadvisorHotelReviews } from "./server/tripadvisor.js"
import { handleGoogleHotelsReviews } from "./server/serpapi-google-hotels.js"
import { handleGooglePlacesHotelResolution } from "./server/google-places.js"
import { handleTavilyHotelEvidence } from "./server/tavily-evidence.js"
import { handleYouTubeHotelEvidence } from "./server/youtube-evidence.js"
import {
  handleGroqHotelAnalysis,
  MAX_GROQ_ANALYSIS_REQUEST_BYTES,
} from "./server/groq-analysis.js"

// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.
  const emitSourcemaps = mode === "development"
  const environment = loadEnv(mode, process.cwd(), "")

  return {
    base: process.env.FIGMA_PUBLIC_URL
      ? `${process.env.FIGMA_PUBLIC_URL}/`
      : "/",
    build: {
      outDir: "dist/client",
      sourcemap: emitSourcemaps ? "inline" : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      tailwindcss(),
      sites(),
      groqTranscriptionDev(environment.GROQ_API_KEY),
      tripadvisorReviewsDev(environment.TRIPADVISOR_API_KEY),
      googleHotelsReviewsDev(environment.SERPAPI_API_KEY),
      googlePlacesHotelResolutionDev(environment.GOOGLE_PLACES_API_KEY),
      tavilyEvidenceDev(environment.TAVILY_API_KEY),
      youtubeEvidenceDev(
        environment.YOUTUBE_API_KEY,
        environment.YOUTUBE_DAILY_REQUEST_LIMIT,
      ),
      groqHotelAnalysisDev({
        apiKey: environment.GROQ_API_KEY,
        model: environment.GROQ_MODEL,
        maxEvidenceItems: environment.GROQ_MAX_EVIDENCE_ITEMS,
        dailyAnalysisLimit: environment.GROQ_DAILY_ANALYSIS_LIMIT,
      }),
      sitesStaticWorker(),
      figmaSiteConfiguration(siteConfiguration),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: "/src/**/*.stories.{ts,tsx,js,jsx}" }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
      strictPort: true,
      watch: { ignored: ["**/.figma/**"] },
    },
    preview: {
      host: "0.0.0.0",
      port: parseInt(process.env.PORT || "8443"),
    },
  }
})

const GROQ_TRANSCRIPTION_ENDPOINT =
  "https://api.groq.com/openai/v1/audio/transcriptions"
const GROQ_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo"
const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const MAX_MULTIPART_BYTES = MAX_AUDIO_BYTES + 1024 * 1024

/** Proxies local transcription requests without exposing the Groq key to browser code. */
function groqTranscriptionDev(apiKey?: string): Plugin {
  return {
    name: "groq-transcription-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/transcribe", async (req, res) => {
        const sendJson = (status: number, payload: object) => {
          res.statusCode = status
          res.setHeader("Content-Type", "application/json; charset=utf-8")
          res.end(JSON.stringify(payload))
        }

        if (req.method !== "POST") {
          res.setHeader("Allow", "POST")
          sendJson(405, { error: "Method not allowed." })
          return
        }
        if (!apiKey) {
          sendJson(503, { error: "Voice transcription is not configured yet." })
          return
        }
        const contentType = req.headers["content-type"] || ""
        if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
          sendJson(400, { error: "A recorded audio file is required." })
          return
        }

        try {
          const chunks: Buffer[] = []
          let receivedBytes = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            receivedBytes += buffer.length
            if (receivedBytes > MAX_MULTIPART_BYTES) {
              sendJson(413, {
                error:
                  "The recording is too large. Please record a shorter message.",
              })
              return
            }
            chunks.push(buffer)
          }

          const incomingRequest = new Request(
            "http://localhost/api/transcribe",
            {
              method: "POST",
              headers: { "content-type": contentType },
              body: new Uint8Array(Buffer.concat(chunks)),
            },
          )
          const incomingForm = await incomingRequest.formData()
          const audio = incomingForm.get("file")
          if (!(audio instanceof Blob) || audio.size === 0) {
            sendJson(400, { error: "No audio was recorded. Please try again." })
            return
          }
          if (audio.size > MAX_AUDIO_BYTES) {
            sendJson(413, {
              error:
                "The recording is too large. Please record a shorter message.",
            })
            return
          }

          const groqForm = new FormData()
          const fileName =
            audio instanceof File && audio.name
              ? audio.name
              : "fitstay-recording.webm"
          groqForm.append("file", audio, fileName)
          groqForm.append("model", GROQ_TRANSCRIPTION_MODEL)
          groqForm.append("response_format", "json")

          const groqResponse = await fetch(GROQ_TRANSCRIPTION_ENDPOINT, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: groqForm,
          })
          if (!groqResponse.ok) {
            sendJson(502, {
              error: "We couldn’t transcribe the recording. Please try again.",
            })
            return
          }

          const payload = (await groqResponse.json()) as { text?: unknown }
          const text =
            typeof payload.text === "string" ? payload.text.trim() : ""
          if (!text) {
            sendJson(422, {
              error: "No speech was detected. Please try recording again.",
            })
            return
          }
          sendJson(200, { text })
        } catch {
          sendJson(502, {
            error:
              "A network error interrupted transcription. Please try again.",
          })
        }
      })
    },
  }
}

const MAX_TRIPADVISOR_REQUEST_BYTES = 16 * 1024

/** Proxies local Tripadvisor review requests without exposing the Terra key to browser code. */
function tripadvisorReviewsDev(apiKey?: string): Plugin {
  return {
    name: "tripadvisor-reviews-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/tripadvisor/reviews", async (req, res) => {
        const sendResponse = async (response: Response) => {
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        }

        try {
          const chunks: Buffer[] = []
          let receivedBytes = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            receivedBytes += buffer.length
            if (receivedBytes > MAX_TRIPADVISOR_REQUEST_BYTES) {
              await sendResponse(
                new Response(
                  JSON.stringify({
                    error: {
                      code: "request_too_large",
                      message: "Request is too large",
                    },
                  }),
                  {
                    status: 413,
                    headers: {
                      "Content-Type": "application/json; charset=utf-8",
                    },
                  },
                ),
              )
              return
            }
            chunks.push(buffer)
          }

          const request = new Request(
            "http://localhost/api/tripadvisor/reviews",
            {
              method: req.method,
              headers: {
                "content-type":
                  req.headers["content-type"] || "application/json",
              },
              body:
                req.method === "GET" || req.method === "HEAD"
                  ? undefined
                  : new Uint8Array(Buffer.concat(chunks)),
            },
          )
          await sendResponse(
            await handleTripadvisorHotelReviews(request, apiKey),
          )
        } catch {
          await sendResponse(
            new Response(
              JSON.stringify({
                error: {
                  code: "tripadvisor_unavailable",
                  message: "Tripadvisor reviews are temporarily unavailable",
                },
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              },
            ),
          )
        }
      })
    },
  }
}

const MAX_SERPAPI_REQUEST_BYTES = 16 * 1024

/** Proxies local Google Hotels review requests without exposing the SerpApi key to browser code. */
function googleHotelsReviewsDev(apiKey?: string): Plugin {
  return {
    name: "google-hotels-reviews-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/google-hotels/reviews", async (req, res) => {
        const sendResponse = async (response: Response) => {
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        }

        try {
          const chunks: Buffer[] = []
          let receivedBytes = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            receivedBytes += buffer.length
            if (receivedBytes > MAX_SERPAPI_REQUEST_BYTES) {
              await sendResponse(
                new Response(
                  JSON.stringify({
                    error: {
                      code: "request_too_large",
                      message: "Request is too large",
                    },
                  }),
                  {
                    status: 413,
                    headers: {
                      "Content-Type": "application/json; charset=utf-8",
                    },
                  },
                ),
              )
              return
            }
            chunks.push(buffer)
          }

          const request = new Request(
            "http://localhost/api/google-hotels/reviews",
            {
              method: req.method,
              headers: {
                "content-type":
                  req.headers["content-type"] || "application/json",
              },
              body:
                req.method === "GET" || req.method === "HEAD"
                  ? undefined
                  : new Uint8Array(Buffer.concat(chunks)),
            },
          )
          await sendResponse(await handleGoogleHotelsReviews(request, apiKey))
        } catch {
          await sendResponse(
            new Response(
              JSON.stringify({
                error: {
                  code: "serpapi_unavailable",
                  message: "Google Hotels reviews are temporarily unavailable",
                },
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              },
            ),
          )
        }
      })
    },
  }
}

const MAX_GOOGLE_PLACES_REQUEST_BYTES = 16 * 1024

/** Resolves canonical Google Place hotel identities without exposing the API key. */
function googlePlacesHotelResolutionDev(apiKey?: string): Plugin {
  return {
    name: "google-places-hotel-resolution-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/google-places/resolve", async (req, res) => {
        const sendResponse = async (response: Response) => {
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        }

        try {
          const chunks: Buffer[] = []
          let receivedBytes = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            receivedBytes += buffer.length
            if (receivedBytes > MAX_GOOGLE_PLACES_REQUEST_BYTES) {
              await sendResponse(
                new Response(
                  JSON.stringify({
                    error: {
                      code: "request_too_large",
                      message: "Request is too large",
                    },
                  }),
                  {
                    status: 413,
                    headers: {
                      "Content-Type": "application/json; charset=utf-8",
                    },
                  },
                ),
              )
              return
            }
            chunks.push(buffer)
          }

          const request = new Request(
            "http://localhost/api/google-places/resolve",
            {
              method: req.method,
              headers: {
                "content-type":
                  req.headers["content-type"] || "application/json",
              },
              body:
                req.method === "GET" || req.method === "HEAD"
                  ? undefined
                  : new Uint8Array(Buffer.concat(chunks)),
            },
          )
          await sendResponse(
            await handleGooglePlacesHotelResolution(request, apiKey),
          )
        } catch {
          await sendResponse(
            new Response(
              JSON.stringify({
                error: {
                  code: "google_places_unavailable",
                  message: "Google Places is temporarily unavailable",
                },
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              },
            ),
          )
        }
      })
    },
  }
}

const MAX_TAVILY_REQUEST_BYTES = 64 * 1024

/** Proxies explicit Tavily evidence requests without exposing the API key. */
function tavilyEvidenceDev(apiKey?: string): Plugin {
  return {
    name: "tavily-evidence-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/tavily/evidence", async (req, res) => {
        const sendResponse = async (response: Response) => {
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        }

        try {
          const chunks: Buffer[] = []
          let receivedBytes = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            receivedBytes += buffer.length
            if (receivedBytes > MAX_TAVILY_REQUEST_BYTES) {
              await sendResponse(
                new Response(
                  JSON.stringify({
                    error: {
                      code: "request_too_large",
                      message: "Request is too large",
                    },
                  }),
                  {
                    status: 413,
                    headers: {
                      "Content-Type": "application/json; charset=utf-8",
                    },
                  },
                ),
              )
              return
            }
            chunks.push(buffer)
          }

          const request = new Request("http://localhost/api/tavily/evidence", {
            method: req.method,
            headers: {
              "content-type": req.headers["content-type"] || "application/json",
            },
            body:
              req.method === "GET" || req.method === "HEAD"
                ? undefined
                : new Uint8Array(Buffer.concat(chunks)),
          })
          await sendResponse(await handleTavilyHotelEvidence(request, apiKey))
        } catch {
          await sendResponse(
            new Response(
              JSON.stringify({
                error: {
                  code: "tavily_unavailable",
                  message: "Tavily evidence search is temporarily unavailable",
                },
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              },
            ),
          )
        }
      })
    },
  }
}

const MAX_YOUTUBE_REQUEST_BYTES = 16 * 1024

/** Proxies explicit YouTube evidence requests without exposing the API key. */
function youtubeEvidenceDev(apiKey?: string, dailyLimit?: string): Plugin {
  return {
    name: "youtube-evidence-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/youtube/evidence", async (req, res) => {
        const sendResponse = async (response: Response) => {
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        }

        try {
          const chunks: Buffer[] = []
          let receivedBytes = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            receivedBytes += buffer.length
            if (receivedBytes > MAX_YOUTUBE_REQUEST_BYTES) {
              await sendResponse(
                new Response(
                  JSON.stringify({
                    error: {
                      code: "REQUEST_TOO_LARGE",
                      message: "Request is too large",
                    },
                  }),
                  {
                    status: 413,
                    headers: {
                      "Content-Type": "application/json; charset=utf-8",
                    },
                  },
                ),
              )
              return
            }
            chunks.push(buffer)
          }

          const request = new Request("http://localhost/api/youtube/evidence", {
            method: req.method,
            headers: {
              "content-type": req.headers["content-type"] || "application/json",
            },
            body:
              req.method === "GET" || req.method === "HEAD"
                ? undefined
                : new Uint8Array(Buffer.concat(chunks)),
          })
          await sendResponse(
            await handleYouTubeHotelEvidence(request, apiKey, { dailyLimit }),
          )
        } catch {
          await sendResponse(
            new Response(
              JSON.stringify({
                provider: "youtube",
                providerStatus: "error",
                error: {
                  code: "YOUTUBE_UNAVAILABLE",
                  message: "YouTube evidence is temporarily unavailable",
                },
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              },
            ),
          )
        }
      })
    },
  }
}

/** Runs explicit hotel evidence analysis without exposing Groq configuration. */
function groqHotelAnalysisDev(configuration: {
  apiKey?: string
  model?: string
  maxEvidenceItems?: string
  dailyAnalysisLimit?: string
}): Plugin {
  return {
    name: "groq-hotel-analysis-dev",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/hotel-analysis", async (req, res) => {
        const sendResponse = async (response: Response) => {
          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        }

        try {
          const chunks: Buffer[] = []
          let receivedBytes = 0
          for await (const chunk of req) {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            receivedBytes += buffer.length
            if (receivedBytes > MAX_GROQ_ANALYSIS_REQUEST_BYTES) {
              await sendResponse(
                new Response(
                  JSON.stringify({
                    status: "error",
                    error: {
                      code: "GROQ_INPUT_TOO_LARGE",
                      message: "The hotel evidence request is too large",
                    },
                  }),
                  {
                    status: 413,
                    headers: {
                      "Content-Type": "application/json; charset=utf-8",
                    },
                  },
                ),
              )
              return
            }
            chunks.push(buffer)
          }

          const request = new Request("http://localhost/api/hotel-analysis", {
            method: req.method,
            headers: {
              "content-type": req.headers["content-type"] || "application/json",
              "content-length": String(receivedBytes),
            },
            body:
              req.method === "GET" || req.method === "HEAD"
                ? undefined
                : new Uint8Array(Buffer.concat(chunks)),
          })
          await sendResponse(
            await handleGroqHotelAnalysis(request, configuration.apiKey, {
              model: configuration.model,
              maxEvidenceItems: configuration.maxEvidenceItems,
              dailyAnalysisLimit: configuration.dailyAnalysisLimit,
            }),
          )
        } catch {
          await sendResponse(
            new Response(
              JSON.stringify({
                status: "error",
                error: {
                  code: "GROQ_PROVIDER_ERROR",
                  message: "The hotel analysis could not be completed",
                },
              }),
              {
                status: 502,
                headers: { "Content-Type": "application/json; charset=utf-8" },
              },
            ),
          )
        }
      })
    },
  }
}

/** Emits the Cloudflare Worker entrypoint required by Sites, including private API proxies. */
function sitesStaticWorker(): Plugin {
  let root = process.cwd()

  return {
    name: "sites-static-worker",
    configResolved(config) {
      root = config.root
    },
    async closeBundle() {
      const workerSource = `import { handleTripadvisorHotelReviews } from './tripadvisor.js'
import { handleGoogleHotelsReviews } from './serpapi-google-hotels.js'
import { handleGooglePlacesHotelResolution } from './google-places.js'
import { handleTavilyHotelEvidence } from './tavily-evidence.js'
import { handleYouTubeHotelEvidence } from './youtube-evidence.js'
import { createD1YouTubeUsageStore } from './youtube-usage-store.js'
import { handleGroqHotelAnalysis } from './groq-analysis.js'
import { createD1ProviderUsageStore } from './provider-usage-store.js'

const GROQ_TRANSCRIPTION_ENDPOINT = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo'
const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const TAVILY_CACHE_SECONDS = 7 * 24 * 60 * 60
const YOUTUBE_CACHE_SECONDS = 7 * 24 * 60 * 60
const GROQ_ANALYSIS_CACHE_SECONDS = 7 * 24 * 60 * 60
let youtubeUsageStore
let groqAnalysisUsageStore

function createWorkerCache(namespace, maxAgeSeconds) {
  const memory = new Map()

  async function cacheRequest(key) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key))
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    return new Request('https://fitstay.internal/cache/' + namespace + '/' + hash)
  }

  return {
    async get(key) {
      const runtimeCache = globalThis.caches?.default
      if (!runtimeCache) return memory.get(key) || null
      try {
        const response = await runtimeCache.match(await cacheRequest(key))
        return response ? response.json() : memory.get(key) || null
      } catch {
        return memory.get(key) || null
      }
    },
    async set(key, value) {
      memory.set(key, value)
      const runtimeCache = globalThis.caches?.default
      if (!runtimeCache) return
      try {
        await runtimeCache.put(
          await cacheRequest(key),
          new Response(JSON.stringify(value), {
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=' + maxAgeSeconds,
            },
          }),
        )
      } catch {
        // The in-memory entry still prevents duplicate calls while this isolate is active.
      }
    },
    async delete(key) {
      memory.delete(key)
      const runtimeCache = globalThis.caches?.default
      if (!runtimeCache) return false
      try {
        return runtimeCache.delete(await cacheRequest(key))
      } catch {
        return false
      }
    },
  }
}

const tavilyAnalysisCache = createWorkerCache('tavily', TAVILY_CACHE_SECONDS)
const youtubeEvidenceCache = createWorkerCache('youtube', YOUTUBE_CACHE_SECONDS)
const groqAnalysisCache = createWorkerCache('groq-analysis', GROQ_ANALYSIS_CACHE_SECONDS)

function json(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  })
}

async function transcribe(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, { Allow: 'POST' })
  }
  if (!env.GROQ_API_KEY) {
    return json({ error: 'Voice transcription is not configured yet.' }, 503)
  }

  try {
    const incomingForm = await request.formData()
    const audio = incomingForm.get('file')
    if (!(audio instanceof File) || audio.size === 0) {
      return json({ error: 'No audio was recorded. Please try again.' }, 400)
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return json({ error: 'The recording is too large. Please record a shorter message.' }, 413)
    }

    const groqForm = new FormData()
    groqForm.append('file', audio, audio.name || 'fitstay-recording.webm')
    groqForm.append('model', GROQ_TRANSCRIPTION_MODEL)
    groqForm.append('response_format', 'json')

    const groqResponse = await fetch(GROQ_TRANSCRIPTION_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.GROQ_API_KEY },
      body: groqForm,
    })
    if (!groqResponse.ok) {
      return json({ error: 'We couldn’t transcribe the recording. Please try again.' }, 502)
    }

    const payload = await groqResponse.json()
    const text = typeof payload.text === 'string' ? payload.text.trim() : ''
    if (!text) {
      return json({ error: 'No speech was detected. Please try recording again.' }, 422)
    }
    return json({ text })
  } catch {
    return json({ error: 'A network error interrupted transcription. Please try again.' }, 502)
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api/transcribe') return transcribe(request, env)
    if (url.pathname === '/api/tripadvisor/reviews') {
      return handleTripadvisorHotelReviews(request, env.TRIPADVISOR_API_KEY)
    }
    if (url.pathname === '/api/google-hotels/reviews') {
      return handleGoogleHotelsReviews(request, env.SERPAPI_API_KEY)
    }
    if (url.pathname === '/api/google-places/resolve') {
      return handleGooglePlacesHotelResolution(request, env.GOOGLE_PLACES_API_KEY)
    }
    if (url.pathname === '/api/tavily/evidence') {
      return handleTavilyHotelEvidence(request, env.TAVILY_API_KEY, {
        analysisCache: tavilyAnalysisCache,
      })
    }
    if (url.pathname === '/api/youtube/evidence') {
      youtubeUsageStore ||= createD1YouTubeUsageStore(env.DB)
      return handleYouTubeHotelEvidence(request, env.YOUTUBE_API_KEY, {
        dailyLimit: env.YOUTUBE_DAILY_REQUEST_LIMIT,
        cache: youtubeEvidenceCache,
        usageStore: youtubeUsageStore,
      })
    }
    if (url.pathname === '/api/hotel-analysis') {
      groqAnalysisUsageStore ||= createD1ProviderUsageStore(env.DB, 'groq_analysis')
      return handleGroqHotelAnalysis(request, env.GROQ_API_KEY, {
        model: env.GROQ_MODEL,
        maxEvidenceItems: env.GROQ_MAX_EVIDENCE_ITEMS,
        dailyAnalysisLimit: env.GROQ_DAILY_ANALYSIS_LIMIT,
        cache: groqAnalysisCache,
        usageStore: groqAnalysisUsageStore,
      })
    }
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404) return response
    return env.ASSETS.fetch(new Request(new URL('/', request.url), request))
  },
}\n`
      const workerDirectory = path.resolve(root, "dist/server")
      await mkdir(workerDirectory, { recursive: true })
      await writeFile(
        path.resolve(workerDirectory, "index.js"),
        workerSource,
        "utf8",
      )
      await copyFile(
        path.resolve(root, "server/tripadvisor.js"),
        path.resolve(workerDirectory, "tripadvisor.js"),
      )
      await copyFile(
        path.resolve(root, "server/serpapi-google-hotels.js"),
        path.resolve(workerDirectory, "serpapi-google-hotels.js"),
      )
      await copyFile(
        path.resolve(root, "server/google-places.js"),
        path.resolve(workerDirectory, "google-places.js"),
      )
      await copyFile(
        path.resolve(root, "server/google-places-service.js"),
        path.resolve(workerDirectory, "google-places-service.js"),
      )
      await copyFile(
        path.resolve(root, "server/tavily-evidence.js"),
        path.resolve(workerDirectory, "tavily-evidence.js"),
      )
      await copyFile(
        path.resolve(root, "server/tavily-evidence-service.js"),
        path.resolve(workerDirectory, "tavily-evidence-service.js"),
      )
      await copyFile(
        path.resolve(root, "server/youtube-evidence.js"),
        path.resolve(workerDirectory, "youtube-evidence.js"),
      )
      await copyFile(
        path.resolve(root, "server/youtube-evidence-service.js"),
        path.resolve(workerDirectory, "youtube-evidence-service.js"),
      )
      await copyFile(
        path.resolve(root, "server/youtube-usage-store.js"),
        path.resolve(workerDirectory, "youtube-usage-store.js"),
      )
      await copyFile(
        path.resolve(root, "server/provider-usage-store.js"),
        path.resolve(workerDirectory, "provider-usage-store.js"),
      )
      await copyFile(
        path.resolve(root, "server/groq-analysis.js"),
        path.resolve(workerDirectory, "groq-analysis.js"),
      )
      await copyFile(
        path.resolve(root, "server/groq-analysis-service.js"),
        path.resolve(workerDirectory, "groq-analysis-service.js"),
      )
    },
  }
}

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */
function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, "") || ""
  }
  function escapeHtmlText(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  }
  function replaceHtmlCommentSlot(
    html: string,
    slotName: string,
    content: string,
  ): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "Figma Make App"
  const description = config.description ?? ""
  const favicon = config.icons?.icon ?? ""
  const socialImage = config.openGraph?.image ?? ""
  const language = sanitizeHtmlValue(config.language) || "en"
  const googleAnalyticsId = sanitizeHtmlValue(
    config.analytics?.googleAnalyticsId,
  )
  const headStart = config.customScripts?.headStart ?? ""
  const headEnd = config.customScripts?.headEnd ?? ""
  const bodyStart = config.customScripts?.bodyStart ?? ""
  const bodyEnd = config.customScripts?.bodyEnd ?? ""
  const robotsTxt =
    config.robots?.index === false ? "User-agent: *\nDisallow: /\n" : ""

  return {
    name: "figma-site-configuration",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split("?")[0] !== "/robots.txt")
          return next()

        res.setHeader("Content-Type", "text/plain; charset=utf-8")
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: "asset",
        fileName: "robots.txt",
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, "figma:lang", language)
        result = replaceHtmlCommentSlot(
          result,
          "figma:title",
          escapeHtmlText(title),
        )
        result = replaceHtmlCommentSlot(result, "figma:head-start", headStart)
        result = replaceHtmlCommentSlot(result, "figma:head-end", headEnd)
        result = replaceHtmlCommentSlot(result, "figma:body-start", bodyStart)
        result = replaceHtmlCommentSlot(result, "figma:body-end", bodyEnd)

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({
            tag: "meta",
            attrs: { name: "description", content: description },
            injectTo: "head",
          })
        }
        if (config.robots?.index === false) {
          tags.push({
            tag: "meta",
            attrs: { name: "robots", content: "noindex, nofollow" },
            injectTo: "head",
          })
        }
        if (favicon) {
          tags.push({
            tag: "link",
            attrs: { rel: "icon", href: favicon },
            injectTo: "head",
          })
        }
        if (title) {
          tags.push({
            tag: "meta",
            attrs: { property: "og:title", content: title },
            injectTo: "head",
          })
        }
        if (description) {
          tags.push({
            tag: "meta",
            attrs: { property: "og:description", content: description },
            injectTo: "head",
          })
        }
        if (socialImage) {
          tags.push(
            {
              tag: "meta",
              attrs: { property: "og:image", content: socialImage },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: { name: "twitter:card", content: "summary_large_image" },
              injectTo: "head",
            },
            {
              tag: "meta",
              attrs: { name: "twitter:image", content: socialImage },
              injectTo: "head",
            },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: "script",
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: "head",
            },
            {
              tag: "script",
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: "head",
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: "style",
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: "head",
            },
            {
              tag: "a",
              attrs: { class: "figma-bypass-link", href: "#root" },
              children: "Skip to content",
              injectTo: "body-prepend",
            },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */
function figmaErrorOverlayReplay(): Plugin {
  return {
    name: "figma-error-overlay-replay",
    apply: "serve",
    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (
        ...args: any[]
      ) => void
      server.ws.send = (((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === "object" && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === "error") {
            lastError = (payload as object)
          } else if (type === "update" || type === "full-reload") {
            lastError = null
          }
        }
        return origSend(...args)
      }) as typeof server.ws.send)

      server.ws.on("connection", (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: "figma-react-refresh-boundary-fallback",
    apply: "serve",
    enforce: "post",
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: "full-reload", path: "*" })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes("/node_modules/"))
        return null

      const moduleId = id.split("?")[0] ?? id
      const hasRefreshBoundary = code.includes("registerExportsForReactRefresh")
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */
function figmaMakeKitPlugin(options: {
  storiesGlob: string | string[]
}): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob)
    ? options.storiesGlob
    : [options.storiesGlob]
  const ROUTE = "/.figma/make/kit.html"
  const VIRTUAL_ID = "virtual:figma-stories"
  const RESOLVED_ID = "\0" + VIRTUAL_ID
  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: "figma-make-kit",
    apply: "serve",
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return STORIES_MODULE
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ""
        if (url.split("?")[0] !== ROUTE) return next()

        try {
          res.setHeader("Content-Type", "text/html")
          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}
