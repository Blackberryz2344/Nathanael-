/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  BookOpen, 
  MessageSquare, 
  ChevronLeft, 
  Sparkles, 
  GraduationCap,
  Volume2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Trophy,
  BarChart3,
  Settings,
  ArrowRight,
  History,
  Trash2,
  PenTool,
  Send,
  Languages
} from 'lucide-react';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { LESSONS, Lesson, LANGUAGES, Language, Level, UserProgress, LessonHistory, LessonType } from './constants';
import { useAudioProcessor } from './hooks/useAudioProcessor';
import { cn } from './lib/utils';

const STORAGE_KEY = 'linguist_ai_progress';

const LANGUAGE_CODES: Record<Language, string> = {
  'Inglês': 'en',
  'Espanhol': 'es',
  'Francês': 'fr',
  'Alemão': 'de',
  'Italiano': 'it',
  'Japonês': 'ja',
  'Russo': 'ru',
  'Vietnamita': 'vi',
  'Coreano': 'ko',
  'Português': 'pt',
  'Alto Valiriano': 'hv'
};

export default function App() {
  const [showSetup, setShowSetup] = useState(true);
  const [progress, setProgress] = useState<UserProgress>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      selectedLanguage: 'Inglês',
      level: 'Iniciante',
      completedLessons: [],
      totalConversations: 0,
      lastPerformanceScore: 0,
      history: []
    };
  });

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [activeTab, setActiveTab] = useState<'conversation' | 'writing' | 'history' | 'translator'>('conversation');
  const [viewingHistory, setViewingHistory] = useState<LessonHistory | null>(null);
  
  // Translator states
  const [translatorTargetLanguage, setTranslatorTargetLanguage] = useState<Language>('Inglês');
  const [isTranslatorMode, setIsTranslatorMode] = useState(false);
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [inputText, setInputText] = useState('');
  const [transcripts, setTranscripts] = useState<{ role: 'user' | 'model', text: string, translation?: string }[]>([]);
  const [translatorTranscripts, setTranslatorTranscripts] = useState<{ role: 'user' | 'model', text: string, translation?: string }[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { isRecording, startRecording, stopRecording, playAudioChunk, resetPlayback } = useAudioProcessor();
  const sessionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Create a single instance for translation to avoid overhead
  const translationAI = useMemo(() => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }), []);

  const translateText = async (text: string, toLang: string = 'Português', withExplanation: boolean = false) => {
    if (!text || text.trim().length < 2) return null;
    
    // If text looks like it's already in Portuguese, skip translation
    const commonPortugueseWords = ['o', 'a', 'e', 'do', 'da', 'em', 'um', 'para', 'com', 'não', 'mais'];
    const words = text.toLowerCase().split(/\s+/);
    const ptWordCount = words.filter(w => commonPortugueseWords.includes(w)).length;
    if (ptWordCount / words.length > 0.3 && words.length > 5) return null;

    try {
      const prompt = withExplanation 
        ? `Você é um professor de idiomas. Traduza o seguinte texto para ${toLang} e forneça uma breve explicação gramatical ou de vocabulário (máximo 2 sentenças). 
           Formato: [Tradução] - [Explicação].
           Texto: "${text}"`
        : `Você é um tradutor especializado. Traduza o seguinte texto para ${toLang}. 
           Se o texto já estiver em ${toLang} ou for uma correção gramatical clara em ${toLang}, retorne exatamente o mesmo texto.
           Retorne APENAS a tradução, sem explicações: "${text}"`;

      const response = await translationAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      const result = response.text?.trim();
      // Don't return translation if it's identical to original
      if (result?.toLowerCase() === text.toLowerCase()) return null;
      return result;
    } catch (err) {
      console.error('Translation error:', err);
      return null;
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const filteredLessons = useMemo(() => {
    return LESSONS.filter(l => l.level === progress.level && l.type === activeTab);
  }, [progress.level, activeTab]);

  const systemInstruction = useMemo(() => {
    if (!selectedLesson) return '';
    return `Você é uma professora de idiomas gentil, experiente e muito NATURAL chamada Sofia. 
    O aluno está estudando ${progress.selectedLanguage} no nível ${progress.level}.
    ${selectedLesson.baseInstruction}
    
    DIRETRIZES DE NATURALIDADE:
    - Fale como um falante nativo real: use contrações, expressões idiomáticas comuns e um tom amigável.
    - Evite soar como um livro didático ou robô. Use interjeições naturais (como "hum", "então", "olha") quando apropriado.
    - Mantenha a conversa fluida e reaja ao que o aluno diz com entusiasmo real.
    
    REGRAS DE IDIOMA:
    - Sua língua principal de instrução e conversa deve ser o PORTUGUÊS. Você é uma professora ensinando um aluno brasileiro.
    - Incentive e peça para o aluno responder e praticar no idioma ${progress.selectedLanguage}.
    - Use o idioma ${progress.selectedLanguage} para dar exemplos, ensinar palavras novas e frases, mas explique o significado e a gramática em PORTUGUÊS.
    - Corrija a pronúncia e a gramática do aluno de forma encorajadora em português.
    - Fale de forma adequada ao nível ${progress.level}.
    - No início da aula, apresente-se brevemente como Sofia e explique o que vão praticar hoje.`;
  }, [selectedLesson, progress.selectedLanguage, progress.level]);

  const translatorSystemInstruction = useMemo(() => {
    return `Você é um tradutor de voz em tempo real altamente eficiente.
    O usuário falará em PORTUGUÊS e você deve traduzir IMEDIATAMENTE para ${translatorTargetLanguage}.
    
    REGRAS:
    1. Responda APENAS com a tradução no idioma ${translatorTargetLanguage}.
    2. Não adicione explicações, saudações ou comentários, a menos que o usuário peça especificamente.
    3. Mantenha o tom e o contexto da fala original.
    4. Sua voz deve ser clara e natural no idioma ${translatorTargetLanguage}.
    5. Se o usuário falar em ${translatorTargetLanguage}, traduza para o PORTUGUÊS.`;
  }, [translatorTargetLanguage]);

  const connectToTeacher = async (lesson: Lesson | 'translator') => {
    setIsConnecting(true);
    setError(null);
    
    const isTranslator = lesson === 'translator';
    setIsTranslatorMode(isTranslator);
    
    if (!isTranslator) {
      setTranscripts([]);
    }
    
    resetPlayback();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: isTranslator ? translatorSystemInstruction : systemInstruction,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            // Send initial prompt to trigger introduction
            sessionPromise.then((session) => {
              if (!isTranslator) {
                session.sendRealtimeInput({
                  text: "Olá Sofia, por favor se apresente e inicie a aula de hoje."
                });
              }
            });

            startRecording((base64Data) => {
              if (sessionRef.current) {
                sessionRef.current.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              }
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Audio
            const base64Audio = message.serverContent?.modelTurn?.parts?.find(p => p.inlineData)?.inlineData?.data;
            if (base64Audio) {
              playAudioChunk(base64Audio);
            }

            // Handle Model Transcription
            const modelText = message.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;
            if (modelText) {
              const translation = await translateText(modelText, 'Português', true);
              const setter = isTranslator ? setTranslatorTranscripts : setTranscripts;
              setter(prev => {
                // Avoid duplicate messages if the same text arrives multiple times
                if (prev.length > 0 && prev[prev.length - 1].text === modelText && prev[prev.length - 1].role === 'model') {
                  return prev;
                }
                return [...prev, { role: 'model', text: modelText, translation: translation || undefined }];
              });
            }

            // Handle User Transcription
            const userText = (message as any).serverContent?.userTurn?.parts?.find((p: any) => p.text)?.text;
            if (userText) {
              const translation = await translateText(userText);
              const setter = isTranslator ? setTranslatorTranscripts : setTranscripts;
              setter(prev => {
                if (prev.length > 0 && prev[prev.length - 1].text === userText && prev[prev.length - 1].role === 'user') {
                  return prev;
                }
                return [...prev, { role: 'user', text: userText, translation: translation || undefined }];
              });
            }
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError("Erro na conexão. Tente novamente.");
            setIsConnecting(false);
            setIsConnected(false);
            stopRecording();
          },
          onclose: () => {
            setIsConnected(false);
            stopRecording();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error('Failed to connect:', err);
      setError("Não foi possível iniciar a aula.");
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    stopRecording();
    setIsConnected(false);
    setIsConnecting(false);
    setIsTranslatorMode(false);
    
    // Update progress when leaving a lesson
    if (selectedLesson && transcripts.length > 2 && !isTranslatorMode) {
      const newHistoryItem: LessonHistory = {
        id: crypto.randomUUID(),
        lessonId: selectedLesson.id,
        date: new Date().toISOString(),
        language: progress.selectedLanguage,
        level: progress.level,
        transcripts: [...transcripts]
      };

      setProgress(prev => ({
        ...prev,
        totalConversations: prev.totalConversations + 1,
        completedLessons: prev.completedLessons.includes(selectedLesson.id) 
          ? prev.completedLessons 
          : [...prev.completedLessons, selectedLesson.id],
        history: [newHistoryItem, ...prev.history].slice(0, 50) // Keep last 50 lessons
      }));
    }
    
    setSelectedLesson(null);
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Tem certeza que deseja excluir esta aula salva?')) {
      setProgress(prev => ({
        ...prev,
        history: prev.history.filter(h => h.id !== id)
      }));
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !sessionRef.current) return;

    const text = inputText.trim();
    setInputText('');
    
    // Send to Gemini Live API
    sessionRef.current.sendRealtimeInput({
      text: text
    });

    // We don't manually add to transcripts here because the Live API 
    // will echo back the user input in onmessage if inputAudioTranscription is enabled,
    // OR we can manually add it if we want immediate feedback.
    // Since we want to translate it too:
    const translation = await translateText(text);
    if (isTranslatorMode) {
      setTranslatorTranscripts(prev => [...prev, { role: 'user', text, translation: translation || undefined }]);
    } else {
      setTranscripts(prev => [...prev, { role: 'user', text, translation: translation || undefined }]);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-900/30">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => !isConnected && setShowSetup(true)}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
            {isTranslatorMode ? <Languages size={24} /> : <GraduationCap size={24} />}
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white">
              {isTranslatorMode ? "Tradutor Roald" : "Roald Idiomas"}
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">
              {isTranslatorMode ? `Português ↔ ${translatorTargetLanguage}` : `${progress.selectedLanguage} • ${progress.level}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isConnected && !showSetup && (
            <button 
              onClick={() => {
                if (viewingHistory) setViewingHistory(null);
                else if (selectedLesson) setSelectedLesson(null);
                else setShowSetup(true);
              }}
              className="p-2 text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium"
              title="Voltar"
            >
              <ChevronLeft size={20} />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}
          
          {isConnected ? (
            <button 
              onClick={disconnect}
              className="text-sm font-medium text-gray-500 hover:text-red-500 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={16} />
              Encerrar Aula
            </button>
          ) : (
            <button 
              onClick={() => setShowSetup(true)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Settings size={20} />
            </button>
          )}
        </div>
      </header>

      <main className={cn(
        "pt-24 pb-12 mx-auto transition-all duration-500",
        (selectedLesson || viewingHistory) ? "max-w-none h-[calc(100vh-5rem)] pt-16 pb-0 px-0" : "max-w-5xl px-6"
      )}>
        <AnimatePresence mode="wait">
          {viewingHistory ? (
            <motion.div 
              key="history-detail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col h-full bg-zinc-950 overflow-hidden"
            >
              <div className="bg-zinc-900 text-white px-4 py-3 flex items-center gap-3 shadow-md z-10 border-b border-white/10">
                <button onClick={() => setViewingHistory(null)} className="p-1 hover:bg-white/10 rounded-full">
                  <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                  <h3 className="font-bold text-base leading-tight">
                    Histórico: {LESSONS.find(l => l.id === viewingHistory.lessonId)?.title || 'Aula'}
                  </h3>
                  <p className="text-[11px] opacity-80">
                    {new Date(viewingHistory.date).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950">
                {viewingHistory.transcripts?.map((t, i) => (
                  <div 
                    key={i}
                    className={cn(
                      "flex flex-col max-w-[85%] relative",
                      t.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm leading-relaxed shadow-sm relative",
                      t.role === 'user' 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-zinc-800 text-white rounded-tl-none border border-white/5"
                    )}>
                      <div className={cn(
                        "absolute top-0 w-0 h-0 border-8",
                        t.role === 'user' 
                          ? "border-l-blue-600 border-t-blue-600 border-r-transparent border-b-transparent" 
                          : "border-r-zinc-800 border-t-zinc-800 border-l-transparent border-b-transparent"
                      )} />
                      <p className="text-[15px]">{t.text}</p>
                      {t.translation && (
                        <p className="mt-1 pt-1 border-t border-white/10 text-[12px] italic opacity-70">
                          {t.translation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : showSetup ? (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto space-y-12"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-serif italic text-white">Configure seu Perfil</h2>
                <p className="text-gray-400">Personalize sua experiência de aprendizado.</p>
              </div>

              <div className="bg-zinc-900 p-8 rounded-[32px] border border-white/10 shadow-sm space-y-8">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                    <Globe size={16} /> Idioma de Estudo
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang}
                        onClick={() => setProgress(prev => ({ ...prev, selectedLanguage: lang }))}
                        className={cn(
                          "py-3 px-4 rounded-2xl text-sm font-semibold transition-all border",
                          progress.selectedLanguage === lang 
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/20" 
                            : "bg-zinc-800 text-gray-400 border-transparent hover:border-white/20"
                        )}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-widest">
                    <BarChart3 size={16} /> Nível de Proficiência
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(['Iniciante', 'Intermediário', 'Avançado'] as Level[]).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setProgress(prev => ({ ...prev, level: lvl }))}
                        className={cn(
                          "py-3 px-4 rounded-2xl text-sm font-semibold transition-all border",
                          progress.level === lvl 
                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-900/20" 
                            : "bg-zinc-800 text-gray-400 border-transparent hover:border-white/20"
                        )}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleSetupComplete}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group"
                  >
                    Salvar e Continuar <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  {!showSetup && (
                    <button
                      onClick={() => setShowSetup(false)}
                      className="w-full py-3 text-gray-500 hover:text-white transition-colors text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  )}
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <p className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ou use como ferramenta rápida</p>
                  <button
                    onClick={() => {
                      setActiveTab('translator');
                      setTranslatorTargetLanguage(progress.selectedLanguage);
                      connectToTeacher('translator');
                    }}
                    className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-bold hover:bg-zinc-700 transition-all flex items-center justify-center gap-2 border border-white/5 shadow-lg"
                  >
                    <Languages size={20} className="text-blue-400" /> Tradutor de Voz em Tempo Real
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (!selectedLesson && !isTranslatorMode) ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Progress Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-900/20 text-blue-400 rounded-2xl flex items-center justify-center">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lições</p>
                    <p className="text-xl font-bold text-white">{progress.completedLessons.length}</p>
                  </div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-900/20 text-indigo-400 rounded-2xl flex items-center justify-center">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Conversas</p>
                    <p className="text-xl font-bold text-white">{progress.totalConversations}</p>
                  </div>
                </div>
                <div className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-900/20 text-purple-400 rounded-2xl flex items-center justify-center">
                    <BarChart3 size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Nível</p>
                    <p className="text-xl font-bold text-white">{progress.level}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-4xl md:text-5xl font-serif italic text-white">Aulas para {progress.level}s</h2>
                  <p className="text-gray-400 max-w-xl mx-auto">Pratique seu {progress.selectedLanguage} com situações do dia a dia.</p>
                </div>

                {/* Tabs */}
                <div className="flex justify-center gap-2 p-1 bg-zinc-900 rounded-2xl w-fit mx-auto border border-white/10">
                  <button
                    onClick={() => setActiveTab('conversation')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                      activeTab === 'conversation' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <MessageSquare size={18} /> Conversação
                  </button>
                  <button
                    onClick={() => setActiveTab('writing')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                      activeTab === 'writing' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <PenTool size={18} /> Escrita
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                      activeTab === 'history' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <History size={18} /> Histórico
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('translator');
                      setTranslatorTargetLanguage(progress.selectedLanguage);
                      connectToTeacher('translator');
                    }}
                    className={cn(
                      "px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2",
                      activeTab === 'translator' ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                    )}
                  >
                    <Languages size={18} /> Tradutor
                  </button>
                </div>
              </div>

              {activeTab === 'history' ? (
                <div className="grid grid-cols-1 gap-4">
                  {progress.history.length === 0 ? (
                    <div className="bg-zinc-900 p-12 rounded-[32px] border border-white/10 text-center space-y-4">
                      <div className="w-16 h-16 bg-zinc-800 text-gray-600 rounded-full flex items-center justify-center mx-auto">
                        <History size={32} />
                      </div>
                      <p className="text-gray-500">Você ainda não tem aulas salvas. Complete uma aula para vê-la aqui!</p>
                    </div>
                  ) : (
                    progress.history.map((item) => {
                      const lesson = LESSONS.find(l => l.id === item.lessonId);
                      return (
                        <div
                          key={item.id}
                          onClick={() => setViewingHistory(item)}
                          className="bg-zinc-900 p-6 rounded-3xl border border-white/10 shadow-sm hover:shadow-md hover:border-white/20 transition-all cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-900/20 text-2xl flex items-center justify-center rounded-2xl">
                              {lesson?.icon || '📚'}
                            </div>
                            <div>
                              <h4 className="font-bold text-white">{lesson?.title || 'Aula Removida'}</h4>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span>{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                <span>{item.language}</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                <span>{item.level}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">Ver Transcrição</span>
                            <button 
                              onClick={(e) => deleteHistoryItem(item.id, e)}
                              className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredLessons.map((lesson) => (
                    <motion.button
                      key={lesson.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedLesson(lesson)}
                      className="group relative bg-zinc-900 p-8 rounded-[32px] border border-white/10 shadow-sm hover:shadow-xl hover:shadow-blue-900/20 transition-all text-left overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <span className="text-6xl">{lesson.icon}</span>
                      </div>
                      
                      <div className="relative z-10 space-y-4">
                        <div className="flex items-center gap-3">
                          {progress.completedLessons.includes(lesson.id) && (
                            <span className="px-3 py-1 bg-blue-900/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
                              <CheckCircle2 size={10} /> Concluída
                            </span>
                          )}
                          <span className="text-xs text-gray-500 font-medium">{lesson.topic}</span>
                        </div>
                        
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-2">{lesson.title}</h3>
                          <p className="text-gray-400 text-sm leading-relaxed">{lesson.description}</p>
                        </div>

                        <div className="pt-4 flex items-center text-blue-400 font-semibold text-sm gap-2">
                          {activeTab === 'writing' ? 'Começar Prática' : 'Começar Aula'} <Sparkles size={16} />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="classroom"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col h-full bg-zinc-950 overflow-hidden"
            >
              {/* Chat Header (Mobile style) */}
              <div className="bg-zinc-900 text-white px-4 py-3 flex items-center gap-3 shadow-md z-10 border-b border-white/10">
                <button 
                  onClick={disconnect}
                  className="p-1 hover:bg-white/10 rounded-full"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="w-10 h-10 bg-blue-900/20 rounded-full flex items-center justify-center text-xl">
                  {isTranslatorMode ? <Languages size={24} className="text-blue-400" /> : selectedLesson?.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base leading-tight">
                    {isTranslatorMode ? `Tradutor: ${translatorTargetLanguage}` : selectedLesson?.title}
                  </h3>
                  <p className="text-[11px] opacity-80">
                    {isConnected ? 'Online' : isConnecting ? 'Conectando...' : isTranslatorMode ? 'Tradutor pronto' : 'Sofia está pronta'}
                  </p>
                </div>
                {!isConnected && !isConnecting && (
                  <button
                    onClick={() => connectToTeacher(isTranslatorMode ? 'translator' : selectedLesson!)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
                  >
                    Começar
                  </button>
                )}
              </div>

              {/* Chat Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth bg-zinc-950"
              >
                {(isTranslatorMode ? translatorTranscripts : transcripts).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-sm max-w-xs">
                      {isTranslatorMode ? (
                        <Languages size={40} className="mx-auto text-blue-400 mb-3" />
                      ) : (
                        <MessageSquare size={40} className="mx-auto text-blue-400 mb-3" />
                      )}
                      <p className="text-sm font-medium text-gray-400">
                        {isConnected 
                          ? (isTranslatorMode ? "Pode falar em Português para eu traduzir!" : "Diga 'Olá' para começar sua aula com a Sofia!")
                          : (isTranslatorMode ? "Clique em 'Começar' para ativar o tradutor de voz." : "Clique em 'Começar' para iniciar sua aula de conversação.")}
                      </p>
                    </div>
                  </div>
                ) : (
                  (isTranslatorMode ? translatorTranscripts : transcripts).map((t, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn(
                        "flex flex-col max-w-[85%] relative",
                        t.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className={cn(
                        "px-3 py-2 rounded-lg text-sm leading-relaxed shadow-sm relative",
                        t.role === 'user' 
                          ? "bg-blue-600 text-white rounded-tr-none" 
                          : "bg-zinc-800 text-white rounded-tl-none border border-white/5"
                      )}>
                        {/* Message Tail */}
                        <div className={cn(
                          "absolute top-0 w-0 h-0 border-8",
                          t.role === 'user' 
                            ? "right-[-8px] border-l-blue-600 border-t-blue-600 border-r-transparent border-b-transparent" 
                            : "left-[-8px] border-r-zinc-800 border-t-zinc-800 border-l-transparent border-b-transparent"
                        )} />

                        <p className="text-[15px]">{t.text}</p>
                        {t.translation && (
                          <p className={cn(
                            "mt-1 pt-1 border-t text-[12px] italic opacity-70",
                            t.role === 'user' ? "border-white/10" : "border-white/10"
                          )}>
                            {t.translation}
                          </p>
                        )}
                        <div className="text-[10px] text-gray-500 text-right mt-1">
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Controls / Input Area */}
              <div className="p-3 bg-zinc-900 flex items-center gap-3 border-t border-white/10">
                <div className="flex-1 bg-zinc-800 rounded-full px-4 py-1 flex items-center gap-2 shadow-sm border border-white/5">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isConnected ? "Digite uma mensagem..." : "Conecte-se para falar"}
                    disabled={!isConnected}
                    lang={LANGUAGE_CODES[progress.selectedLanguage]}
                    spellCheck={true}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 px-1 text-white placeholder:text-gray-500"
                  />
                  
                  {isConnected && isRecording && (
                    <div className="flex items-center gap-1 h-4 pr-2">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            height: [4, Math.random() * 12 + 4, 4]
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.5 + Math.random() * 0.5,
                            ease: "easeInOut"
                          }}
                          className="w-1 bg-blue-400 rounded-full"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {inputText.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center transition-all shadow-md shrink-0 hover:bg-blue-700"
                  >
                    <Send size={20} />
                  </button>
                ) : (
                  <button
                    disabled={!isConnected}
                    onClick={() => {/* Recording is handled by hook */}}
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md shrink-0",
                      !isConnected ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : 
                      isRecording ? "bg-red-500 text-white" : "bg-blue-600 text-white"
                    )}
                  >
                    {isRecording ? <Mic size={24} /> : <MicOff size={24} />}
                  </button>
                )}
              </div>

              {error && (
                <div className="absolute top-16 left-4 right-4 z-20 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-xs shadow-lg">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                  <button onClick={() => setError(null)} className="ml-auto font-bold">X</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Decoration */}
      <footer className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600" />
    </div>
  );
}
