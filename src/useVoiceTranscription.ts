import { useCallback, useEffect, useRef, useState } from "react"

export type VoiceInputStatus = "idle" | "requesting" | "recording" | "transcribing"

const MAX_AUDIO_BYTES = 25 * 1024 * 1024

function recordingExtension(mimeType: string) {
  if (mimeType.includes("ogg")) return "ogg"
  if (mimeType.includes("mp4")) return "m4a"
  if (mimeType.includes("mpeg")) return "mp3"
  if (mimeType.includes("wav")) return "wav"
  return "webm"
}

function microphoneErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Microphone permission was denied. Allow access in your browser settings and try again."
    }
    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      return "No microphone is available on this device."
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "The microphone is being used by another application."
    }
  }
  return "The microphone could not be started. Please try again."
}

export function useVoiceTranscription(onTranscription: (text: string) => void) {
  const [status, setStatus] = useState<VoiceInputStatus>("idle")
  const [message, setMessage] = useState("")
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelledRef = useRef(false)
  const microphoneRequestInFlightRef = useRef(false)
  const transcriptionInFlightRef = useRef(false)
  const transcriptionAbortRef = useRef<AbortController | null>(null)

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const transcribe = useCallback(async (audio: Blob) => {
    if (transcriptionInFlightRef.current) return
    if (audio.size === 0) {
      setStatus("idle")
      setMessage("No audio was recorded. Please try again.")
      return
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      setStatus("idle")
      setMessage("The recording is too long. Please record a shorter message.")
      return
    }

    transcriptionInFlightRef.current = true
    setStatus("transcribing")
    setMessage("")
    const controller = new AbortController()
    transcriptionAbortRef.current = controller

    try {
      const formData = new FormData()
      const extension = recordingExtension(audio.type)
      formData.append("file", audio, `fitstay-recording.${extension}`)
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })
      const payload = await response.json().catch(() => null) as { text?: string; error?: string } | null
      if (!response.ok) {
        throw new Error(payload?.error || "We couldn’t transcribe the recording. Please try again.")
      }

      const text = payload?.text?.trim() || ""
      if (!text) {
        throw new Error("No speech was detected. Please try recording again.")
      }
      onTranscription(text)
      setStatus("idle")
      setMessage("")
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setStatus("idle")
      setMessage(
        error instanceof TypeError
          ? "A network error interrupted transcription. Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "We couldn’t transcribe the recording. Please try again.",
      )
    } finally {
      transcriptionInFlightRef.current = false
      transcriptionAbortRef.current = null
    }
  }, [onTranscription])

  const startRecording = useCallback(async () => {
    if (
      status !== "idle"
      || microphoneRequestInFlightRef.current
      || transcriptionInFlightRef.current
      || recorderRef.current
    ) return
    setMessage("")

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Voice input isn’t supported by this browser.")
      return
    }

    setStatus("requesting")
    microphoneRequestInFlightRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop())
        setStatus("idle")
        setMessage("No microphone is available on this device.")
        return
      }

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/mp4;codecs=mp4a.40.2",
        "audio/ogg;codecs=opus",
        "audio/webm",
      ]
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)

      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []
      cancelledRef.current = false

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        cancelledRef.current = true
        releaseMicrophone()
        setStatus("idle")
        setMessage("Recording failed. Please try again.")
      }
      recorder.onstop = () => {
        const wasCancelled = cancelledRef.current
        const audio = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        })
        chunksRef.current = []
        releaseMicrophone()
        if (wasCancelled) {
          setStatus("idle")
          setMessage("Recording cancelled.")
          return
        }
        void transcribe(audio)
      }

      recorder.start(250)
      setStatus("recording")
    } catch (error) {
      releaseMicrophone()
      setStatus("idle")
      setMessage(microphoneErrorMessage(error))
    } finally {
      microphoneRequestInFlightRef.current = false
    }
  }, [releaseMicrophone, status, transcribe])

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") return
    recorder.stop()
  }, [])

  const cancelRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") return
    cancelledRef.current = true
    recorder.stop()
  }, [])

  useEffect(() => () => {
    cancelledRef.current = true
    transcriptionAbortRef.current?.abort()
    const recorder = recorderRef.current
    if (recorder && recorder.state !== "inactive") recorder.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  return {
    status,
    message,
    startRecording,
    stopRecording,
    cancelRecording,
    clearMessage: () => setMessage(""),
  }
}
