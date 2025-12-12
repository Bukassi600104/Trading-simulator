"use client";

import { useCallback } from "react";

// Pre-loaded audio URLs (base64 or remote URLs)
const SOUNDS = {
  orderFill: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdG2PkIOBhYJ9c3R8gYaMjpCQjoqGgn99fH19gIKEhYaFg4F/fXt6enx+gIOFhoaFg4F/fXt6enx+gIOFhoaFg4F/fXt6enx+gIOFhoaFg4F/fXt6enx+gIOFhoaFg4F/fXt6enx+gIOFhoaFg4F/fXs=",
  profit: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAhIiMkJSYnKCkqKyws7a5vL/Cxsjq7u/w8fLz9PX29/j5+vv8/f7/AAEDBAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  loss: "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgIB/f39/f39/fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+",
  click: "data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ4AAACAgIB/gICAgIB/gICA",
};

type SoundType = keyof typeof SOUNDS;

// Define webkitAudioContext type for Safari support
interface WebkitWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private audioBuffers: Map<SoundType, AudioBuffer> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  private constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  public static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private async init() {
    try {
      const win = window as WebkitWindow;
      const AudioContextClass = window.AudioContext || win.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
      
      // Pre-load all sounds
      for (const [key, url] of Object.entries(SOUNDS)) {
        await this.loadSound(key as SoundType, url);
      }
    } catch (error) {
      console.warn("Sound manager initialization failed:", error);
    }
  }

  private async loadSound(name: SoundType, url: string) {
    if (!this.audioContext) return;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(name, audioBuffer);
    } catch (error) {
      console.warn(`Failed to load sound: ${name}`, error);
    }
  }

  public async play(sound: SoundType) {
    if (!this.enabled || !this.audioContext) return;

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const buffer = this.audioBuffers.get(sound);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = this.volume;
    
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }
}

// Export singleton
export const soundManager = typeof window !== "undefined" ? SoundManager.getInstance() : null;

// Hook for component use
export function useSound() {
  const play = useCallback((sound: SoundType) => {
    soundManager?.play(sound);
  }, []);

  const playOrderFill = useCallback(() => play("orderFill"), [play]);
  const playProfit = useCallback(() => play("profit"), [play]);
  const playLoss = useCallback(() => play("loss"), [play]);
  const playClick = useCallback(() => play("click"), [play]);

  const setEnabled = useCallback((enabled: boolean) => {
    soundManager?.setEnabled(enabled);
  }, []);

  const setVolume = useCallback((volume: number) => {
    soundManager?.setVolume(volume);
  }, []);

  return {
    play,
    playOrderFill,
    playProfit,
    playLoss,
    playClick,
    setEnabled,
    setVolume,
    isEnabled: soundManager?.isEnabled() ?? false,
    volume: soundManager?.getVolume() ?? 0.5,
  };
}

// Utility for playing sounds directly
export function playSound(sound: SoundType) {
  soundManager?.play(sound);
}
