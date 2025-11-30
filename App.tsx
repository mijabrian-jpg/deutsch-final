// ... existing code ...
  const handleManualAdd = async (word: string) => {
    if (!word.trim()) return;
    setLoading(true);
    setLoadingMessage(`Creating liquid magic for "${word}"...`);
    try {
      const detail = await geminiService.enrichWord(word);
      
      setWords(prev => {
        const newWords = [...prev, detail];
        return newWords;
      });

      // Use the length of the OLD array as the new index, because the new item is at the end
      setCurrentWordIndex(words.length);
      setQuizPhase(QuizPhase.Result); 
      setAppState(AppState.Learning);
      
      setLoading(false);
    } catch (e) {
      console.error(e);
      // DEBUG: Show the actual error message to the user
      const errorMessage = e instanceof Error ? e.message : String(e);
      alert(`Error: ${errorMessage}\n\nPlease check your API Key configuration.`);
      setLoading(false);
    }
  };
// ... existing code ...
