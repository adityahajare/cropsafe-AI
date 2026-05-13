export type VoiceLanguage = "english" | "hindi" | "marathi";

const languageCode: Record<VoiceLanguage, string> = {
  english: "en-IN",
  hindi: "hi-IN",
  marathi: "mr-IN",
};

export function getSpeechLang(language?: string) {
  if (language === "hindi") return languageCode.hindi;
  if (language === "marathi") return languageCode.marathi;
  return languageCode.english;
}

function waitForVoices() {
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const timer = window.setTimeout(() => resolve(window.speechSynthesis.getVoices()), 700);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function pickVoice(voices: SpeechSynthesisVoice[], lang: string) {
  const prefix = lang.split("-")[0];
  return (
    voices.find((voice) => voice.lang === lang) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
    voices.find((voice) => voice.lang === "en-IN") ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
    null
  );
}

export async function speakText(text: string, lang = "en-IN") {
  const message = String(text || "").trim();
  if (!message) return false;

  if (!("speechSynthesis" in window)) {
    alert("Voice reading is not supported in this browser.");
    return false;
  }

  const voices = await waitForVoices();
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  const voice = pickVoice(voices, lang);
  if (voice) utterance.voice = voice;

  window.speechSynthesis.cancel();
  window.setTimeout(() => window.speechSynthesis.speak(utterance), 80);
  return true;
}

export function isSpeechRecognitionSupported() {
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function startSpeechRecognition({
  lang = "en-IN",
  onResult,
  onStart,
  onEnd,
  onError,
}: {
  lang?: string;
  onResult: (text: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}) {
  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    onError?.("Voice input is not supported in this browser. Use Chrome or Edge.");
    return null;
  }

  const recognition = new SpeechRecognitionClass();
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => onStart?.();
  recognition.onend = () => onEnd?.();
  recognition.onerror = (event: any) => {
    const reason = event?.error ? `Voice input failed: ${event.error}` : "Voice input failed.";
    onError?.(reason);
    onEnd?.();
  };
  recognition.onresult = (event: any) => {
    const transcript = String(event.results?.[0]?.[0]?.transcript || "").trim();
    if (transcript) onResult(transcript);
  };

  recognition.start();
  return recognition;
}
