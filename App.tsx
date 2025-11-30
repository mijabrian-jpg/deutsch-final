import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, BookOpen, ChevronRight, Volume2, ArrowLeft, Check, PenTool, FileText, X, Plus, ScanLine, Notebook, Save, Lightbulb, Eraser, Sparkles, GraduationCap, PenLine } from 'lucide-react';
import { geminiService } from './services/geminiService';
import { AppState, WordDetail, QuizPhase } from './types';
import { GlassCard, PrimaryButton, SecondaryButton, GlassInput, GlassTextArea, LoadingSpinner } from './components/GlassUI';

// --- Sound Effects Helper (Web Audio API) ---
const playDing = () => {
  try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // OPTIMIZED: Crisper "Ding" sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1500, ctx.currentTime);  // Higher pitch start
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.8); // Faster decay
      
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8); // Fade out faster
      
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
  } catch (e) {
      console.error("Audio error", e);
  }
};

let lastOut = 0;
const playApplause = () => {
  try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const bufferSize = ctx.sampleRate * 1.5; // 1.5 seconds
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate Pink Noise (sounds like clapping/cheering)
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5; // Gain compensation
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      // Filter to make it sound warmer (like a crowd)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      const gain = ctx.createGain();
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      // Envelope: Swell in and fade out
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      
      noise.start();
  } catch (e) {
      console.error("Audio error", e);
  }
};

// --- Drawing Pad Component (New) ---

const DrawingPad: React.FC<{ onClose: () => void; onRecognize: (text: string) => void }> = ({ onClose, onRecognize }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [recognizing, setRecognizing] = useState(false);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // High DPI setup
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // White chalk-like
            ctx.lineWidth = 4;
            contextRef.current = ctx;
        }
    }, []);

    const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX, clientY;
        if ('touches' in event) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = (event as React.MouseEvent).clientX;
            clientY = (event as React.MouseEvent).clientY;
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault(); // Prevent scrolling on touch
        const { x, y } = getCoordinates(e);
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(x, y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e);
        contextRef.current?.lineTo(x, y);
        contextRef.current?.stroke();
    };

    const stopDrawing = () => {
        contextRef.current?.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas && contextRef.current) {
            contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    const handleMagicRecognize = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        setRecognizing(true);
        try {
            // Get base64 image (PNG)
            const dataUrl = canvas.toDataURL('image/png');
            const base64 = dataUrl.split(',')[1];
            
            // Call AI
            const text = await geminiService.recognizeHandwriting(base64);
            
            if (text) {
                onRecognize(text);
                clearCanvas(); // Optional: clear after recognition
                // We keep the pad open so user can write more or verify
            } else {
                alert("Could not recognize text. Please try writing clearly.");
            }
        } catch (e) {
            console.error("Recognition failed", e);
            alert("Recognition failed.");
        } finally {
            setRecognizing(false);
        }
    };

    return (
        <div className="w-full animate-fade-in-up mt-4">
            <div className="flex justify-between items-center mb-2 px-2">
                <span className="text-xs uppercase tracking-widest text-white/40">Handwriting Practice</span>
                <div className="flex space-x-2">
                    <button 
                        onClick={handleMagicRecognize} 
                        disabled={recognizing}
                        className={`p-2 rounded-full flex items-center space-x-2 transition-all ${recognizing ? 'bg-purple-500/50 cursor-wait' : 'bg-purple-500/20 hover:bg-purple-500/40 text-purple-200'}`}
                        title="Recognize Text"
                    >
                        {recognizing ? <LoadingSpinner /> : <Sparkles size={14} />}
                        <span className="text-xs font-bold">{recognizing ? "Scanning..." : "Auto-Fill"}</span>
                    </button>
                    <button onClick={clearCanvas} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70" title="Clear">
                        <Eraser size={14} />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/70" title="Close">
                        <X size={14} />
                    </button>
                </div>
            </div>
            <div className="relative w-full h-48 bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-crosshair touch-none">
                 {/* Grid lines for writing aid */}
                 <div className="absolute inset-0 pointer-events-none opacity-20" 
                      style={{ 
                          backgroundImage: 'linear-gradient(to bottom, transparent 49%, white 50%, transparent 51%)', 
                          backgroundSize: '100% 33%' 
                      }} 
                 />
                <canvas
                    ref={canvasRef}
                    className="w-full h-full touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ touchAction: 'none' }} 
                />
            </div>
        </div>
    );
};

// --- Smart Image Component (Bing) ---
const SmartImage: React.FC<{ keyword: string; text: string }> = ({ keyword, text }) => {
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    // Bing Image Thumbnail API (Fast & Global)
    // q: query, w: width, h: height, c: 7 (smart crop)
    const src = `https://tse1.mm.bing.net/th?q=${encodeURIComponent(keyword)}&w=400&h=300&c=7`;

    if (error) {
        // Fallback: Gradient Card with Text
        return (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                <span className="text-4xl font-bold text-white/20 uppercase">{text.charAt(0)}</span>
            </div>
        );
    }

    return (
        <div className="w-full h-full relative bg-white/5">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <LoadingSpinner />
                </div>
            )}
            <img 
                src={src} 
                alt={text}
                className={`w-full h-full object-cover transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-80 group-hover:opacity-100'}`}
                onLoad={() => setLoading(false)}
                onError={() => setError(true)}
            />
        </div>
    );
};

// --- Sub-components ---

interface QuizSessionProps {
  word: WordDetail;
  phase: QuizPhase;
  onOptionSelect: (isCorrect: boolean) => void;
  onSpeak: (text: string) => void;
  onNext: () => void;
  isLastWord: boolean;
  onFinish: () => void;
  onEnterDictation: () => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

const QuizSession: React.FC<QuizSessionProps> = ({ 
  word, 
  phase, 
  onOptionSelect, 
  onSpeak, 
  onNext, 
  isLastWord, 
  onFinish, 
  onEnterDictation,
  onUpdateNotes
}) => {
  // Shuffle options (1 correct + 3 distractors)
  const [stableOptions, setStableOptions] = useState<any[]>([]);
  // Notebook state
  const [noteContent, setNoteContent] = useState(word.userNotes || "");
  const [isSavingNote, setIsSavingNote] = useState(false);

  useEffect(() => {
    if (!word) return;
    const opts = [
        { isCorrect: true, text: word.chineseMeaning, imgSeed: word.correctImageSeed },
        ...word.distractors.map(d => ({ isCorrect: false, text: d.chinese, imgSeed: d.imageUrlSeed }))
    ].sort(() => Math.random() - 0.5);
    setStableOptions(opts);
    
    // Reset note content when word changes
    setNoteContent(word.userNotes || "");
    setIsSavingNote(false);
  }, [word]);

  const handleSaveNote = () => {
      setIsSavingNote(true);
      onUpdateNotes(word.id, noteContent);
      setTimeout(() => setIsSavingNote(false), 1000);
  };

  const getGenderColor = (gender?: string) => {
      if (!gender) return 'bg-white/10 text-white/60 border-white/10';
      const g = gender.toLowerCase().trim();
      // Masculine -> Blue
      if (g === 'der' || g === 'm' || g.includes('der')) return 'bg-blue-500/20 text-blue-200 border-blue-500/30';
      // Feminine -> Red
      if (g === 'die' || g === 'f' || g.includes('die')) return 'bg-red-500/20 text-red-200 border-red-500/30';
      // Neuter -> Green
      if (g === 'das' || g === 'n' || g.includes('das')) return 'bg-green-500/20 text-green-200 border-green-500/30';
      
      return 'bg-white/10 text-white/60 border-white/10';
  };

  if (phase === QuizPhase.Question) {
    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[80vh] p-4 animate-fade-in">
            <div className="mb-12 relative group">
                <button 
                    onClick={() => onSpeak(word.lemma)}
                    className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                    <Volume2 size={32} />
                </button>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Play Sound
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-8 w-full">
                {stableOptions.map((opt, idx) => (
                    <div 
                        key={idx}
                        onClick={() => onOptionSelect(opt.isCorrect)}
                        className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group border border-white/10 shadow-2xl hover:border-white/40 transition-all duration-300 transform hover:-translate-y-1"
                    >
                        {/* CHANGED: Using SmartImage (Bing) for instant loading */}
                        <SmartImage keyword={opt.imgSeed} text={opt.text} />
                        
                        <div className="absolute bottom-0 left-0 w-full bg-black/60 backdrop-blur-md p-3 text-center">
                            <span className="text-white font-medium text-lg">{opt.text}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  }

  // Result Phase (Detail View)
  const isVerb = word.partOfSpeech.toLowerCase().includes('verb');

  return (
    <div className="w-full max-w-3xl mx-auto p-4 pt-10 pb-24">
        <GlassCard className="animate-fade-in mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-white/10 pb-6">
                <div>
                    <div className="flex items-baseline space-x-3 mb-2">
                         <h2 className="text-4xl md:text-5xl font-bold">{word.lemma}</h2>
                         <span className="text-xl text-white/50 italic">{word.partOfSpeech}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {word.gender && (
                            <span className={`inline-block px-3 py-1 text-sm font-bold rounded-full border ${getGenderColor(word.gender)}`}>
                                {word.gender}
                            </span>
                        )}
                        {word.plural && (
                            <span className="inline-block px-3 py-1 bg-white/5 text-white/70 text-xs rounded-full border border-white/10">
                                Pl: {word.plural}
                            </span>
                        )}
                    </div>
                </div>
                <button onClick={() => onSpeak(word.lemma)} className="mt-4 md:mt-0 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <Volume2 size={24} />
                </button>
            </div>

            <div className="space-y-8">
                {/* Meaning */}
                <div>
                     <h3 className="text-sm uppercase tracking-widest text-white/40 mb-2">Bedeutung</h3>
                     <p className="text-2xl font-light">{word.chineseMeaning}</p>
                </div>

                {/* Examples */}
                {word.examples && word.examples.length > 0 && (
                    <div>
                         <h3 className="text-sm uppercase tracking-widest text-white/40 mb-3">Beispiele</h3>
                         <div className="space-y-4">
                            {word.examples.map((ex, i) => (
                                <div key={i} className="pl-4 border-l-2 border-white/20 hover:border-white/60 transition-colors">
                                    <p className="text-lg mb-1">{ex.german} <Volume2 size={14} className="inline cursor-pointer opacity-50 hover:opacity-100" onClick={() => onSpeak(ex.german)} /></p>
                                    <p className="text-white/50 text-sm mb-1">{ex.chinese}</p>
                                    
                                    {/* Grammar Analysis Block */}
                                    {ex.grammarAnalysis && (
                                        <div className="mt-2 text-xs text-indigo-200/70 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 inline-block">
                                            <GraduationCap size={12} className="inline mr-2 mb-0.5" />
                                            {ex.grammarAnalysis}
                                        </div>
                                    )}
                                </div>
                            ))}
                         </div>
                    </div>
                )}

                {/* Conjugations/Declensions - VERB SPECIAL LAYOUT */}
                {isVerb && word.conjugations && word.conjugations.length >= 4 && (
                     <div className="bg-white/5 rounded-2xl p-4">
                         <h3 className="text-sm uppercase tracking-widest text-white/40 mb-3">Stammformen & Modi</h3>
                         <div className="grid grid-cols-2 gap-3">
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-white/40 uppercase mb-1">Präsens</div>
                                 <div className="font-mono text-yellow-200/90 text-lg">{word.conjugations[0].form}</div>
                                 <div className="text-[10px] text-white/50 truncate mt-1">{word.conjugations[0].context}</div>
                             </div>
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-white/40 uppercase mb-1">Präteritum</div>
                                 <div className="font-mono text-yellow-200/90 text-lg">{word.conjugations[1].form}</div>
                                 <div className="text-[10px] text-white/50 truncate mt-1">{word.conjugations[1].context}</div>
                             </div>
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-white/40 uppercase mb-1">Perfekt</div>
                                 <div className="font-mono text-yellow-200/90 text-lg">{word.conjugations[2].form}</div>
                                 <div className="text-[10px] text-white/50 truncate mt-1">{word.conjugations[2].context}</div>
                             </div>
                             <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                 <div className="text-[10px] text-white/40 uppercase mb-1">Konjunktiv II</div>
                                 <div className="font-mono text-yellow-200/90 text-lg">{word.conjugations[3].form}</div>
                                 <div className="text-[10px] text-white/50 truncate mt-1">{word.conjugations[3].context}</div>
                             </div>
                         </div>
                    </div>
                )}

                {/* Normal Conjugations (Non-Verb or Fallback) */}
                {(!isVerb || (word.conjugations && word.conjugations.length < 4)) && word.conjugations && word.conjugations.length > 0 && (
                    <div className="bg-white/5 rounded-2xl p-4">
                         <h3 className="text-sm uppercase tracking-widest text-white/40 mb-3">Formen & Kontext</h3>
                         <div className="grid grid-cols-1 gap-3">
                            {word.conjugations.map((c, i) => (
                                <div key={i} className="flex justify-between items-center text-sm">
                                    <span className="font-mono text-yellow-200/80">{c.form}</span>
                                    <span className="text-white/60 text-right italic truncate ml-4">{c.context}</span>
                                </div>
                            ))}
                         </div>
                    </div>
                )}

                {/* Grammar/Tips */}
                {word.grammarTips && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3">
                        <span className="text-xl">💡</span>
                        <p className="text-sm text-red-100/80 leading-relaxed">{word.grammarTips}</p>
                    </div>
                )}

                {/* NOTEBOOK SECTION */}
                <div className="pt-4 border-t border-white/10">
                     <div className="flex items-center space-x-2 mb-3">
                        <Notebook size={16} className="text-white/60"/>
                        <h3 className="text-sm uppercase tracking-widest text-white/40">Mein Notizbuch</h3>
                     </div>
                     <div className="bg-black/20 rounded-xl p-1">
                        <GlassTextArea 
                            value={noteContent}
                            onChange={(e) => setNoteContent(e.target.value)}
                            placeholder="Add your own notes, memory hooks, or other parts of speech here..."
                            className="bg-transparent border-none focus:bg-transparent min-h-[100px] text-sm md:text-base"
                        />
                        <div className="flex justify-end p-2 border-t border-white/5">
                            <button 
                                onClick={handleSaveNote}
                                className={`
                                    flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                                    ${isSavingNote ? 'bg-green-500/20 text-green-300' : 'bg-white/10 hover:bg-white/20 text-white'}
                                `}
                            >
                                <Save size={14} />
                                <span>{isSavingNote ? 'Saved' : 'Save Note'}</span>
                            </button>
                        </div>
                     </div>
                </div>
            </div>
        </GlassCard>

        {/* Sticky Action Bar */}
        <div className="fixed bottom-6 left-0 w-full flex justify-center space-x-4 px-4 z-50">
             <SecondaryButton onClick={onEnterDictation}>
                <PenTool size={20} className="mr-2 inline" />
                Spelling
             </SecondaryButton>
             
             {/* Navigation Buttons */}
             {!isLastWord ? (
                 <PrimaryButton onClick={onNext} className="bg-white text-black shadow-white/20">
                    Next Word <ChevronRight size={20} className="inline ml-1" />
                 </PrimaryButton>
             ) : (
                <PrimaryButton onClick={onFinish} className="bg-white text-black shadow-white/20">
                    Finish / Library
                </PrimaryButton>
             )}
        </div>
    </div>
  );
};

// --- Import Modal Component ---

const ImportModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onProcess: (file: File) => void;
    isLoading: boolean 
}> = ({ isOpen, onClose, onProcess, isLoading }) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragActive, setDragActive] = useState(false);

    if (!isOpen) return null;

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onProcess(e.dataTransfer.files[0]);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg animate-fade-in-up">
                <GlassCard className="relative overflow-hidden">
                    <button onClick={onClose} className="absolute top-4 right-4 text-white/50 hover:text-white p-2">
                        <X size={20} />
                    </button>
                    
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">Import Dictionary</h2>
                        <p className="text-white/50 text-sm">PDF, TXT, EPUB, CSV, or Markdown.</p>
                    </div>

                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center">
                            <LoadingSpinner />
                            <p className="mt-4 text-white/60 animate-pulse">Analyzing document structure...</p>
                        </div>
                    ) : (
                        <div 
                            className={`
                                border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                                ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}
                            `}
                            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                            onDragLeave={() => setDragActive(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                ref={fileRef} 
                                className="hidden" 
                                accept=".pdf,.txt,.csv,.md,.json,.epub" 
                                onChange={(e) => e.target.files && onProcess(e.target.files[0])}
                            />
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-white/80">
                                <FileText size={32} />
                            </div>
                            <p className="font-medium mb-1">Click to upload or drag and drop</p>
                            <p className="text-xs text-white/40">PDF, EPUB, TXT up to 10MB</p>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
};

// --- Main App Component ---

// CHANGED: Export const App (Named Export) to match index.tsx import { App }
export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.Home);
  
  // Initialize words using lazy initializer to avoid race conditions with LocalStorage
  const [words, setWords] = useState<WordDetail[]>(() => {
    try {
      if (typeof window === 'undefined') return [];
      const stored = localStorage.getItem('deutschGlanzWords');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load words from storage", e);
      return [];
    }
  });

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [quizPhase, setQuizPhase] = useState<QuizPhase>(QuizPhase.Question);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // Scanning/Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  // Dictation State
  const [dictationInput, setDictationInput] = useState("");
  const [dictationFeedback, setDictationFeedback] = useState<"neutral" | "correct" | "incorrect">("neutral");
  const [showHint, setShowHint] = useState(false);
  const [showDrawingPad, setShowDrawingPad] = useState(false);

  // Save words whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('deutschGlanzWords', JSON.stringify(words));
    }
  }, [words]);

  // --- TTS Helper ---
  const speak = useCallback((text: string) => {
    // 1. 立即停止当前发音 (同步)
    window.speechSynthesis.cancel();
    
    // 2. 强制唤醒引擎 (针对 iOS 16+)
    if (!window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.lang = 'de-DE'; // 基础保底

    // 3. 同步获取语音列表 (不要用 setTimeout!)
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

  // Use Effect to force load voices on startup (helps some browsers)
  useEffect(() => {
      // Warm up TTS engine
      window.speechSynthesis.getVoices();
  }, []);

  // --- Actions ---

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

      // Use the length of the OLD array as the new index
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

  const processEnrichmentQueue = async (lemmas: string[]) => {
      setLoading(true);
      setLoadingMessage(`Found ${lemmas.length} words. enriching...`);
      setShowImportModal(false);

      const newWords: WordDetail[] = [];
      const total = lemmas.length;
      const BATCH_SIZE = 3;

      for (let i = 0; i < total; i += BATCH_SIZE) {
         const batch = lemmas.slice(i, i + BATCH_SIZE);
         
         setLoadingMessage(`Enriching... (${Math.min(i + batch.length, total)}/${total})`);
         
         try {
             const promises = batch.map(lemma => 
                geminiService.enrichWord(lemma).catch(err => {
                    console.error(`Failed ${lemma}`, err);
                    return null;
                })
             );
             
             const results = await Promise.all(promises);
             results.forEach(res => {
                 if (res) newWords.push(res);
             });

         } catch (err) {
             console.error("Batch error", err);
         }
      }

      setWords(prev => [...prev, ...newWords]);
      setLoading(false);
      setAppState(AppState.Review);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingMessage("Scanning neural patterns in image...");

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        // 1. Extract
        setLoadingMessage("Identifying vocabulary...");
        const lemmas = await geminiService.extractWordsFromImage(base64);
        
        if (lemmas.length === 0) {
            alert("No words found.");
            setLoading(false);
            return;
        }

        // 2. Enrich
        await processEnrichmentQueue(lemmas);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      setLoading(false);
      alert("Error processing image.");
    }
  };

  const handleDocumentUpload = async (file: File) => {
      setImportLoading(true);
      try {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64 = (reader.result as string).split(',')[1];
              // Detect MIME type
              let mimeType = file.type;
              if (!mimeType) {
                  if (file.name.toLowerCase().endsWith('.epub')) mimeType = "application/epub+zip";
                  else mimeType = "text/plain";
              }
              if (file.name.toLowerCase().endsWith('.epub')) mimeType = "application/epub+zip";

              try {
                  const lemmas = await geminiService.extractWordsFromFile(base64, mimeType);
                  if (lemmas.length === 0) {
                      alert("No words could be identified in this file.");
                      setImportLoading(false);
                      return;
                  }
                  setImportLoading(false);
                  await processEnrichmentQueue(lemmas);
              } catch (e) {
                  console.error(e);
                  alert("Failed to analyze file. It might be too large or encrypted.");
                  setImportLoading(false);
              }
          };
          reader.readAsDataURL(file);
      } catch (e) {
          console.error(e);
          setImportLoading(false);
          alert("File read error.");
      }
  };

  const handleUpdateNotes = (id: string, notes: string) => {
      setWords(prev => prev.map(w => {
          if (w.id === id) {
              return { ...w, userNotes: notes };
          }
          return w;
      }));
  };

  const startQuiz = () => {
    if (words.length === 0) return;
    setCurrentWordIndex(0);
    setQuizPhase(QuizPhase.Question);
    setAppState(AppState.Learning);
    // Auto speak first word after a short delay
    setTimeout(() => speak(words[0].lemma), 500);
  };

  const handleOptionSelect = (isCorrect: boolean) => {
    if (isCorrect) {
      playApplause(); // Correct Sound (Applause as requested)
      // Delay prompt slightly to let sound finish (800ms)
      setTimeout(() => {
          speak(words[currentWordIndex].lemma);
          setQuizPhase(QuizPhase.Result);
      }, 800);
    } else {
      const w = words[currentWordIndex];
      speak(`Falsch. Das ist ${w.lemma}.`);
    }
  };

  const nextWord = () => {
    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      setQuizPhase(QuizPhase.Question);
      setTimeout(() => speak(words[currentWordIndex + 1].lemma), 500);
    } else {
      setAppState(AppState.Home); // Finish
    }
  };

  const checkDictation = () => {
    const target = words[currentWordIndex].lemma.toLowerCase();
    const input = dictationInput.trim().toLowerCase();
    
    if (input === target) {
      setDictationFeedback("correct");
      playApplause(); // Celebration Sound
      
      // Auto advance logic
      setTimeout(() => {
          setDictationInput("");
          setDictationFeedback("neutral");
          setShowDrawingPad(false);
          
          if (currentWordIndex < words.length - 1) {
              // Next word
              setCurrentWordIndex(prev => prev + 1);
              setQuizPhase(QuizPhase.Question);
              setAppState(AppState.Learning);
              setTimeout(() => speak(words[currentWordIndex + 1].lemma), 500);
          } else {
              // Finish
              setAppState(AppState.Home);
          }
      }, 1500); // 1.5s delay to celebrate
      
    } else {
      setDictationFeedback("incorrect");
    }
  };

  // --- Render Helpers ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12 text-center px-4">
      <div className="space-y-4 animate-fade-in-up mt-12">
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/50 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          DeutschGlanz
        </h1>
        <p className="text-xl text-white/60 font-light tracking-widest uppercase">
          Liquid Learning
        </p>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl items-stretch h-full">
        
        {/* Left Col: Main Action */}
        <GlassCard className="hover:bg-white/10 cursor-pointer group transition-all duration-500 flex flex-col items-center justify-center min-h-[300px] border border-white/10 hover:border-white/30" >
            <div className="flex flex-col items-center space-y-6" onClick={startQuiz}>
                <div className="p-8 rounded-full bg-blue-500/20 text-blue-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all duration-500">
                    <BookOpen size={64} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-3xl font-bold">Start Learning</h3>
                    <p className="text-white/50">{words.length} words in library</p>
                </div>
            </div>
        </GlassCard>

        {/* Right Col: Tools */}
        <div className="flex flex-col gap-6">
            <GlassCard className="flex-1 hover:bg-white/10 cursor-pointer group transition-all flex flex-row items-center p-6 border border-white/10 hover:border-white/30 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ScanLine size={100} />
                 </div>
                 <div className="flex items-center space-x-6 w-full relative z-10" onClick={() => fileInputRef.current?.click()}>
                    <div className="p-4 rounded-full bg-purple-500/20 text-purple-300 group-hover:scale-110 transition-transform">
                        <Camera size={28} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-semibold">Scan Textbook</h3>
                        <p className="text-xs text-white/50 mt-1">AI Extraction from Photos</p>
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageUpload}
                    />
                 </div>
            </GlassCard>

            <GlassCard className="flex-1 hover:bg-white/10 cursor-pointer group transition-all flex flex-row items-center p-6 border border-white/10 hover:border-white/30 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FileText size={100} />
                 </div>
                 <div className="flex items-center space-x-6 w-full relative z-10" onClick={() => setShowImportModal(true)}>
                    <div className="p-4 rounded-full bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform">
                        <Upload size={28} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-lg font-semibold">Import File</h3>
                        <p className="text-xs text-white/50 mt-1">PDF, EPUB, TXT, CSV</p>
                    </div>
                 </div>
            </GlassCard>
        </div>
      </div>

      <div className="w-full max-w-md mt-4">
          <form 
            onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const input = form.elements.namedItem('manualWord') as HTMLInputElement;
                handleManualAdd(input.value);
                input.value = '';
            }}
            className="relative group"
          >
              <GlassInput name="manualWord" placeholder="Type a word to add manually..." className="pr-12 text-center placeholder-white/30 focus:placeholder-transparent" />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
                  <Plus size={24} />
              </button>
          </form>
      </div>
    </div>
  );

  const renderDictation = () => {
      const word = words[currentWordIndex];
      if (!word) return <div>Word not found</div>;
      
      const spellingHint = word.lemma.split('').map((char, index) => {
          if (index === 0) return char; // First letter visible
          if (char === ' ') return ' ';
          return '_';
      }).join(' ');

      return (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] space-y-8 p-4 animate-fade-in pb-32">
              <div className="text-center space-y-2">
                  <h2 className="text-xl text-white/60">Listen and Type</h2>
                  <div className="p-6 rounded-full bg-white/5 inline-block cursor-pointer hover:bg-white/10" onClick={() => speak(word.lemma)}>
                      <Volume2 size={48} />
                  </div>
                  <p className="text-sm text-white/30">(Click to play audio)</p>
              </div>

              {/* Lightbulb Hint Toggle */}
              <div className="flex justify-center">
                  <button 
                    onClick={() => setShowHint(!showHint)}
                    className={`flex items-center space-x-2 text-sm ${showHint ? 'text-yellow-300' : 'text-white/40 hover:text-white/80'} transition-colors`}
                  >
                      <Lightbulb size={16} />
                      <span>{showHint ? spellingHint : "Need a hint?"}</span>
                  </button>
              </div>

              {/* Scribble Pad Toggle */}
              <div className="flex justify-center">
                   <button 
                    onClick={() => setShowDrawingPad(!showDrawingPad)}
                    className={`flex items-center space-x-2 text-sm px-4 py-2 rounded-full border ${showDrawingPad ? 'bg-white/10 border-white/40 text-white' : 'border-white/10 text-white/40 hover:border-white/30'} transition-all`}
                   >
                       <PenLine size={16} />
                       <span>{showDrawingPad ? "Hide Scribble Pad" : "Open Scribble Pad"}</span>
                   </button>
              </div>

              {/* Handwriting Pad */}
              {showDrawingPad && (
                  <DrawingPad onClose={() => setShowDrawingPad(false)} onRecognize={(text) => setDictationInput(text)} />
              )}

              {/* Main Input */}
              <div className="w-full relative">
                  <GlassInput 
                      autoFocus
                      value={dictationInput}
                      onChange={(e) => {
                          setDictationInput(e.target.value);
                          setDictationFeedback("neutral");
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && checkDictation()}
                      placeholder="Type the word..."
                      className={`text-center text-2xl tracking-widest ${dictationFeedback === 'correct' ? 'border-green-500 text-green-300' : dictationFeedback === 'incorrect' ? 'border-red-500 text-red-300' : ''}`}
                  />
                  {dictationFeedback === 'correct' && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-400">
                          <Check />
                      </div>
                  )}
              </div>

              <div className="flex space-x-4">
                  <SecondaryButton onClick={() => {
                      setQuizPhase(QuizPhase.Result);
                      setAppState(AppState.Learning);
                  }}>
                      Back to Card
                  </SecondaryButton>
                  <PrimaryButton onClick={checkDictation}>Check</PrimaryButton>
              </div>
          </div>
      )
  };

  // --- Main Layout ---

  return (
    <>
      <div className="aurora-bg" />
      <div className="relative z-10 min-h-screen text-white font-sans selection:bg-purple-500/30">
        
        {/* Header / Nav */}
        <header className="p-6 flex justify-between items-center bg-transparent relative z-20">
          {appState !== AppState.Home && (
            <button 
                onClick={() => setAppState(AppState.Home)}
                className="flex items-center text-white/50 hover:text-white transition-colors"
            >
                <ArrowLeft size={20} className="mr-2" /> Home
            </button>
          )}
          <div className="ml-auto flex items-center space-x-4">
              <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
                  {words.length} Words
              </div>
          </div>
        </header>

        <main className="container mx-auto">
            {/* Modal Layer */}
            <ImportModal 
                isOpen={showImportModal} 
                onClose={() => setShowImportModal(false)} 
                onProcess={handleDocumentUpload}
                isLoading={importLoading}
            />

          {loading && (
             <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl transition-opacity">
                <LoadingSpinner />
                <p className="mt-6 text-xl font-light tracking-wide text-white/80 animate-pulse">{loadingMessage}</p>
             </div>
          )}

          {!loading && (
            <div className="transition-all duration-500">
                {appState === AppState.Home && renderHome()}
                
                {appState === AppState.Learning && words[currentWordIndex] && (
                    <QuizSession 
                        word={words[currentWordIndex]}
                        phase={quizPhase}
                        onOptionSelect={handleOptionSelect}
                        onSpeak={speak}
                        onNext={nextWord}
                        isLastWord={currentWordIndex >= words.length - 1}
                        onFinish={() => setAppState(AppState.Home)}
                        onEnterDictation={() => {
                            setDictationInput("");
                            setDictationFeedback("neutral");
                            setShowHint(false);
                            setShowDrawingPad(false);
                            setAppState(AppState.Dictation);
                        }}
                        onUpdateNotes={handleUpdateNotes}
                    />
                )}

                {appState === AppState.Dictation && renderDictation()}
                
                {appState === AppState.Review && (
                    <div className="max-w-4xl mx-auto p-4 animate-fade-in-up">
                        <h2 className="text-3xl font-bold mb-6">Library</h2>
                        <div className="grid gap-4">
                            {words.map((w, idx) => (
                                <GlassCard key={w.id} className="flex justify-between items-center cursor-pointer hover:bg-white/10 transition-colors" >
                                    <div onClick={() => { setCurrentWordIndex(idx); setAppState(AppState.Learning); setQuizPhase(QuizPhase.Result); }}>
                                        <h3 className="text-xl font-bold">{w.lemma}</h3>
                                        <p className="text-white/50">{w.chineseMeaning}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); speak(w.lemma); }} className="p-2 bg-white/5 rounded-full hover:bg-white/20"><Volume2 size={16} /></button>
                                </GlassCard>
                            ))}
                            {words.length === 0 && (
                                <div className="text-white/40 text-center py-12">No words yet. Scan a textbook or add one manually!</div>
                            )}
                        </div>
                        <div className="mt-8 text-center">
                            <PrimaryButton onClick={startQuiz} disabled={words.length === 0}>Start Quiz</PrimaryButton>
                        </div>
                    </div>
                )}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

// Inject Styles safely
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
      }
      .animate-fade-in {
        animation: opacity 0.5s ease-in forwards;
      }
      .cursor-wait {
          cursor: wait;
      }
    `;
    document.head.appendChild(style);
}
