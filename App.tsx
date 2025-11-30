// ... (代码片段预览)
  // --- TTS Helper ---
  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 1. 基础设置
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;

    // 2. iOS 暴力匹配策略 (每次点击时实时查找)
    const voices = window.speechSynthesis.getVoices();
    
    // 优先匹配 iOS 系统自带的德语发音人名字
    const targetVoice = 
        voices.find(v => v.name.includes('Anna')) ||    // iOS Premium German
        voices.find(v => v.name.includes('Petra')) ||   // iOS German
        voices.find(v => v.name.includes('Markus')) ||  // iOS German
        voices.find(v => v.name.includes('Yannick')) || // iOS German
        voices.find(v => v.name.includes('Google Deutsch')) || 
        voices.find(v => v.lang === 'de-DE') || 
        voices.find(v => v.lang.startsWith('de'));

    if (targetVoice) {
        utterance.voice = targetVoice;
    }

    window.speechSynthesis.speak(utterance);
  }, []);
// ...
