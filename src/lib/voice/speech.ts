// Client-side Web Speech API Wrapper for E-Waste Saathi
// Supports English (en-IN/en-US), Hindi (hi-IN) and Marathi (mr-IN) voices with graceful fallbacks

export type AppLanguage = "HI" | "MR" | "EN";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  if (cachedVoices.length > 0) return cachedVoices;
  cachedVoices = window.speechSynthesis.getVoices();
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

export function getBestVoice(lang: AppLanguage): SpeechSynthesisVoice | null {
  const voices = loadVoices();
  if (!voices || voices.length === 0) return null;

  if (lang === "EN") {
    // 1. Try Indian English voice first
    const inVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().replace("_", "-").startsWith("en-in") ||
        v.name.toLowerCase().includes("india") ||
        v.name.toLowerCase().includes("neerja") ||
        v.name.toLowerCase().includes("prabhat")
    );
    if (inVoice) return inVoice;

    // 2. Try any English voice
    const enVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith("en")
    );
    if (enVoice) return enVoice;
  }

  if (lang === "MR") {
    // 1. Try Marathi specific voice
    const mrVoice = voices.find(
      (v) =>
        v.lang.toLowerCase().replace("_", "-").startsWith("mr") ||
        v.name.toLowerCase().includes("marathi")
    );
    if (mrVoice) return mrVoice;
  }

  // 2. Try Hindi voice (hi-IN or hi) - Devanagari TTS engines articulate Marathi clearly
  const hiVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith("hi") ||
      v.name.toLowerCase().includes("hindi") ||
      v.name.toLowerCase().includes("kalpana") ||
      v.name.toLowerCase().includes("swara") ||
      v.name.toLowerCase().includes("madhur")
  );
  if (hiVoice) return hiVoice;

  // 3. Try Indian English (en-IN)
  const inVoice = voices.find(
    (v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith("en-in") ||
      v.name.toLowerCase().includes("india") ||
      v.name.toLowerCase().includes("prabhat") ||
      v.name.toLowerCase().includes("neerja")
  );
  if (inVoice) return inVoice;

  // 4. Default to first available system voice
  return voices[0] || null;
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(
  text: string,
  lang: AppLanguage = "HI",
  options?: SpeakOptions
): void {
  if (!isSpeechSupported()) {
    console.warn("Web Speech API (speechSynthesis) is not supported in this browser.");
    options?.onEnd?.();
    return;
  }

  // Stop any currently playing audio
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  activeUtterance = utterance;

  utterance.lang = lang === "MR" ? "mr-IN" : lang === "EN" ? "en-IN" : "hi-IN";
  const voice = getBestVoice(lang);
  if (voice) {
    utterance.voice = voice;
  }

  // Measured, clear speech rate (0.9) optimized for low-literacy informal waste collectors
  utterance.rate = options?.rate ?? 0.92;
  utterance.pitch = options?.pitch ?? 1.0;

  utterance.onstart = () => {
    options?.onStart?.();
  };

  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    options?.onEnd?.();
  };

  utterance.onerror = (event) => {
    if (activeUtterance === utterance) {
      activeUtterance = null;
    }
    // "canceled" or "interrupted" are normal when user clicks stop or new voice
    if (event.error !== "canceled" && event.error !== "interrupted") {
      console.warn("SpeechSynthesis error:", event.error);
    }
    options?.onEnd?.();
    options?.onError?.(event);
  };

  try {
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Failed to execute speechSynthesis.speak:", err);
    options?.onEnd?.();
  }
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore cancel errors
    }
  }
  activeUtterance = null;
}

export function isSpeaking(): boolean {
  if (!isSpeechSupported()) return false;
  return window.speechSynthesis.speaking;
}
