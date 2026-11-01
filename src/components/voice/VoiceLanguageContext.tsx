"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type AppLanguage, speakText, stopSpeaking, isSpeechSupported } from "@/lib/voice/speech";
import { SCREEN_PROMPTS } from "@/lib/voice/prompts";
import { getTranslation } from "@/lib/i18n/translations";

export type TextLanguage = "EN" | "HI" | "MR";

interface VoiceContextType {
  // Voice Language: EN, HI, MR
  language: AppLanguage;
  voiceLanguage: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  setVoiceLanguage: (lang: AppLanguage) => void;

  // Text Display Language: EN, HI, MR
  textLanguage: TextLanguage;
  setTextLanguage: (lang: TextLanguage) => void;

  // Translation helper function
  t: (keyOrObj: string | { en: string; hi: string; mr?: string }) => string;

  speakingId: string | null;
  isSupported: boolean;
  speak: (text: string, id?: string, overrideLang?: AppLanguage) => void;
  speakPrompt: (screenKey: string) => void;
  stop: () => void;
}

const VoiceLanguageContext = createContext<VoiceContextType | undefined>(undefined);

export function VoiceLanguageProvider({ children }: { children: React.ReactNode }) {
  const [voiceLanguage, setVoiceLanguageState] = useState<AppLanguage>("HI");
  const [textLanguage, setTextLanguageState] = useState<TextLanguage>("HI");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  // Initialize language preferences from localStorage if available
  useEffect(() => {
    setIsSupported(isSpeechSupported());
    try {
      const savedVoice = localStorage.getItem("kabadi_voice_lang");
      if (savedVoice === "HI" || savedVoice === "MR" || savedVoice === "EN") {
        setVoiceLanguageState(savedVoice as AppLanguage);
      }
      const savedText = localStorage.getItem("kabadi_text_lang");
      if (savedText === "HI" || savedText === "EN" || savedText === "MR") {
        setTextLanguageState(savedText as TextLanguage);
      }
    } catch {
      // localStorage may fail in private mode
    }
  }, []);

  const setVoiceLanguage = useCallback((lang: AppLanguage) => {
    setVoiceLanguageState(lang);
    setTextLanguageState(lang);
    try {
      localStorage.setItem("kabadi_text_lang", lang);
    } catch {}
    stopSpeaking();
    setSpeakingId(null);
    try {
      localStorage.setItem("kabadi_voice_lang", lang);
    } catch {}
  }, []);

  const setTextLanguage = useCallback((lang: TextLanguage) => {
    setTextLanguageState(lang);
    setVoiceLanguageState(lang);
    stopSpeaking();
    setSpeakingId(null);
    try {
      localStorage.setItem("kabadi_text_lang", lang);
      localStorage.setItem("kabadi_voice_lang", lang);
    } catch {}
  }, []);

  const t = useCallback(
    (keyOrObj: string | { en: string; hi: string; mr?: string }): string => {
      if (typeof keyOrObj === "string") {
        return getTranslation(keyOrObj, textLanguage);
      }
      if (textLanguage === "EN") return keyOrObj.en;
      if (textLanguage === "MR") return keyOrObj.mr || keyOrObj.hi || keyOrObj.en;
      return keyOrObj.hi || keyOrObj.en;
    },
    [textLanguage]
  );

  const stop = useCallback(() => {
    stopSpeaking();
    setSpeakingId(null);
  }, []);

  const speak = useCallback(
    (text: string, id: string = "general", overrideLang?: AppLanguage) => {
      if (speakingId === id) {
        // Toggle off if already speaking this id
        stop();
        return;
      }

      setSpeakingId(id);
      const targetLang = overrideLang || voiceLanguage;

      speakText(text, targetLang, {
        onStart: () => setSpeakingId(id),
        onEnd: () => {
          setSpeakingId((current) => (current === id ? null : current));
        },
        onError: () => {
          setSpeakingId((current) => (current === id ? null : current));
        },
      });
    },
    [voiceLanguage, speakingId, stop]
  );

  const speakPrompt = useCallback(
    (screenKey: string) => {
      const prompt = SCREEN_PROMPTS[screenKey];
      if (!prompt) return;
      const text = voiceLanguage === "MR" ? prompt.mr : voiceLanguage === "EN" ? prompt.en : prompt.hi;
      speak(text, screenKey);
    },
    [voiceLanguage, speak]
  );

  // Stop speech when navigating away
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  return (
    <VoiceLanguageContext.Provider
      value={{
        language: voiceLanguage,
        voiceLanguage,
        setLanguage: setVoiceLanguage,
        setVoiceLanguage,
        textLanguage,
        setTextLanguage,
        t,
        speakingId,
        isSupported,
        speak,
        speakPrompt,
        stop,
      }}
    >
      {children}
    </VoiceLanguageContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceLanguageContext);
  if (!context) {
    // Graceful fallback for SSR or environments outside provider
    return {
      language: "HI" as AppLanguage,
      voiceLanguage: "HI" as AppLanguage,
      setLanguage: () => {},
      setVoiceLanguage: () => {},
      textLanguage: "HI" as TextLanguage,
      setTextLanguage: () => {},
      t: (keyOrObj: string | { en: string; hi: string; mr?: string }) => {
        if (typeof keyOrObj === "string") return keyOrObj;
        return keyOrObj.hi || keyOrObj.en;
      },
      speakingId: null,
      isSupported: false,
      speak: () => {},
      speakPrompt: () => {},
      stop: () => {},
    };
  }
  return context;
}
