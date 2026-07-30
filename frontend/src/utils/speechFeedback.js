const VOICE_COOLDOWN_MS = 3000;
let lastSpeakTime = 0;

export function speak(text, force = false) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    if (!force && now - lastSpeakTime < VOICE_COOLDOWN_MS) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
    lastSpeakTime = now;
}
