// ... (App.tsx 关键修改预览)
  const speak = useCallback((text: string) => {
    // 1. iOS 必须的“唤醒”操作
    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
    // 2. 停止之前的发音
    window.speechSynthesis.cancel();

    // 3. 关键：延迟 50ms 执行，防止 iOS 吞掉指令
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.lang = 'de-DE'; // 默认保底

        // 4. 获取语音列表 (iOS 上可能需要多次获取)
        const voices = window.speechSynthesis.getVoices();
        
        // 5. 暴力匹配所有可能的德语发音人
        const targetVoice = 
            // iOS 高质量语音名
            voices.find(v => v.name === 'Anna') || 
            voices.find(v => v.name.includes('Anna')) ||
            voices.find(v => v.name === 'Petra') || 
            voices.find(v => v.name.includes('Petra')) ||
            voices.find(v => v.name.includes('Markus')) ||
            voices.find(v => v.name.includes('Yannick')) ||
            voices.find(v => v.name.includes('Helena')) ||
            voices.find(v => v.name.includes('Martin')) ||
            // Google / 其他
            voices.find(v => v.name.includes('Google Deutsch')) ||
            // 任意标准德语
            voices.find(v => v.lang === 'de-DE') || 
            voices.find(v => v.lang === 'de_DE') ||
            // 任意德语方言 (保底)
            voices.find(v => v.lang.startsWith('de'));

        if (targetVoice) {
            utterance.voice = targetVoice;
            console.log("Selected Voice:", targetVoice.name); // Debug log
        }

        window.speechSynthesis.speak(utterance);
    }, 50);
  }, []);
// ...
