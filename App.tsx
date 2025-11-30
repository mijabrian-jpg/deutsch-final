// ... (代码逻辑预览)
  const speak = useCallback((text: string) => {
    // 1. 立即停止当前发音 (同步)
    window.speechSynthesis.cancel();
    
    // 2. 强制唤醒引擎 (针对 iOS 16+)
    // 这里的 resume 必须同步调用
    if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'de-DE'; // 基础保底

    // 3. 同步获取语音列表 (不要用 setTimeout!)
    // iOS Safari 第一次点击时列表可能是空的，但第二次点击通常就有了
    const voices = window.speechSynthesis.getVoices();
    
    // 4. 精确狙击 iOS 德语发音人
    const targetVoice = 
        voices.find(v => v.name === 'Anna') ||  // iOS 最佳德语
        voices.find(v => v.name === 'Petra') || // iOS 备选
        voices.find(v => v.name.includes('Anna')) ||
        voices.find(v => v.name.includes('Petra')) ||
        voices.find(v => v.name.includes('Markus')) ||
        voices.find(v => v.name.includes('Google Deutsch')) || 
        // 排除掉 Siri，因为 API 调用 Siri 经常没声音或回退
        voices.find(v => v.lang === 'de-DE' && !v.name.includes('Siri')) ||
        voices.find(v => v.lang.startsWith('de'));

    if (targetVoice) {
        utterance.voice = targetVoice;
    }

    // 5. 立即播放
    window.speechSynthesis.speak(utterance);
  }, []);
// ...
