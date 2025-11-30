// ... existing code ...
  // --- TTS Helper ---
  const speak = useCallback((text: string, lang = 'de-DE') => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;

    // FIX: Explicitly find and assign a German voice object.
    // Browsers often default to English if only .lang is set without a specific .voice object.
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        // Priority: 
        // 1. Exact match for 'de-DE' (Google Deutsch, Microsoft Stefan, etc.)
        // 2. Any voice starting with 'de'
        const germanVoice = voices.find(v => v.lang === lang || v.lang === 'de_DE') 
                         || voices.find(v => v.lang.startsWith('de'));
        
        if (germanVoice) {
            utterance.voice = germanVoice;
        }
    }

    window.speechSynthesis.speak(utterance);
  }, []);
// ... existing code ...
