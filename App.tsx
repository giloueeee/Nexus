
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { InputSection } from './components/InputSection';
import { ScriptView } from './components/ScriptView';
import { AudioPlayer } from './components/AudioPlayer';
import { NewsSelector } from './components/NewsSelector';
import { LibraryView } from './components/LibraryView';
import { ProfileView } from './components/ProfileView';
import { EventsView } from './components/EventsView';
import { AppState, PodcastEpisode, AppView, PodcastScript, NewsTopic } from './types';
import { generateAudio, generateScript, discoverRssFeeds, generateNewsFallback, generateCoverImage, generateUpcomingEvents, GenerationOptions } from './services/gemini';
import { fetchNewsForTopic, getValidFeeds, DEFAULT_TOPICS } from './utils/rssUtils';
import { chunkScript, mergeAudioSegments } from './utils/audioUtils';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'news', 
    previousView: null,
    inputText: '',
    sourceFile: null,
    script: null,
    audioSegments: [],
    isGeneratingAudio: false,
    status: 'idle',
    error: null,
    notification: null,
    currentEpisodeId: null,
    activeCategory: 'custom', 
    customCoverUrl: undefined,
    library: [],
    topics: DEFAULT_TOPICS,
    upcomingEvents: [],
    isEventsLoading: false
  });

  const [isScriptMinimized, setIsScriptMinimized] = useState(false);
  const generationIdRef = useRef(0);
  const hasLoadedEventsRef = useRef(false);

  useEffect(() => {
      if (state.notification) {
          const timer = setTimeout(() => {
              setState(prev => ({ ...prev, notification: null }));
          }, 3000);
          return () => clearTimeout(timer);
      }
  }, [state.notification]);

  useEffect(() => {
      const loadEventsBackground = async () => {
          if (hasLoadedEventsRef.current) return;
          hasLoadedEventsRef.current = true;
          await new Promise(r => setTimeout(r, 1000));

          if (state.upcomingEvents.length === 0 && state.topics.length > 0) {
              setState(prev => ({ ...prev, isEventsLoading: true }));
              try {
                  const topicNames = state.topics.map(t => t.name);
                  const events = await generateUpcomingEvents(topicNames);
                  setState(prev => ({ ...prev, upcomingEvents: events, isEventsLoading: false }));
              } catch (e) {
                  console.warn("Background event generation failed", e);
                  setState(prev => ({ ...prev, isEventsLoading: false }));
              }
          }
      };
      loadEventsBackground();
  }, []);

  const isGenerationActive = state.status === 'scripting' || state.status === 'synthesizing';
  const hasScript = !!state.script;
  
  // Ensure content only appears in the split view if it matches the current tab's context
  const isContentRelevant = useMemo(() => {
      if (state.view === 'custom') {
          return state.activeCategory === 'custom';
      }
      if (state.view === 'news') {
          return state.activeCategory !== 'custom' && state.activeCategory !== null;
      }
      return true;
  }, [state.view, state.activeCategory]);

  const hasContent = (hasScript || isGenerationActive) && isContentRelevant;
  
  // Child components should behave as if split view is OFF when content is minimized
  // This allows the Topics container to take back its initial dimensions
  const isChildSplitView = hasContent && !isScriptMinimized;

  const addToLibrary = (script: PodcastScript, audioSegments: string[], category: string, customImage?: string) => {
    const newEpisode: PodcastEpisode = {
        id: crypto.randomUUID(),
        script,
        audioSegments,
        createdAt: new Date(),
        category,
        customImage
    };
    
    setState(prev => ({
        ...prev,
        library: [newEpisode, ...prev.library],
        currentEpisodeId: newEpisode.id,
        activeCategory: category,
        customCoverUrl: customImage,
        notification: "Episode saved to Library"
    }));
  };

  const handleStopGeneration = () => {
    generationIdRef.current += 1;
    setState(prev => ({
        ...prev,
        status: 'idle',
        isGeneratingAudio: false,
        error: null 
    }));
  };

  const handleGenerationFlow = async (
      input: any, 
      type: 'standard' | 'news', 
      category: string, 
      customImage?: string,
      options?: GenerationOptions,
      shouldGenerateImage: boolean = true
  ) => {
    const currentGenId = generationIdRef.current + 1;
    generationIdRef.current = currentGenId;
    let finalCoverUrl = customImage;

    setIsScriptMinimized(false); // Ensure script view is visible when starting

    try {
        setState(prev => ({ 
            ...prev, 
            status: 'scripting', 
            error: null, 
            audioSegments: [], 
            script: null, 
            currentEpisodeId: null,
            activeCategory: category, 
            customCoverUrl: customImage,
            isGeneratingAudio: false,
        }));

        const script = await generateScript(input, type, options);
        if (generationIdRef.current !== currentGenId) return;

        const imageGenPromise = (async () => {
            if (shouldGenerateImage && !finalCoverUrl) {
                try {
                    const generatedUrl = await generateCoverImage(script.topic);
                    if (generationIdRef.current === currentGenId && generatedUrl) {
                        finalCoverUrl = generatedUrl;
                        setState(prev => ({ ...prev, customCoverUrl: generatedUrl }));
                    }
                } catch (imgError) {
                    console.warn("Background image generation failed", imgError);
                }
            }
        })();

        setState(prev => ({ ...prev, script, status: 'synthesizing', isGeneratingAudio: true }));

        const scriptChunks = chunkScript(script, 6);
        const audioUrls: string[] = [];
        
        if (scriptChunks.length > 0) {
            try {
                const firstAudio = await generateAudio(scriptChunks[0]);
                if (generationIdRef.current !== currentGenId) return;
                audioUrls.push(firstAudio);
                setState(prev => ({ ...prev, audioSegments: [...audioUrls] }));
            } catch (e) {
                console.error("Audio Generation Error (First Chunk)", e);
                setState(prev => ({ ...prev, isGeneratingAudio: false, status: 'error', error: "Failed to generate audio." }));
                return;
            }
        }

        (async () => {
            for (let i = 1; i < scriptChunks.length; i++) {
                if (generationIdRef.current !== currentGenId) break;
                try {
                    const audio = await generateAudio(scriptChunks[i]);
                    if (generationIdRef.current !== currentGenId) break;
                    audioUrls.push(audio);
                    setState(prev => ({ ...prev, audioSegments: [...prev.audioSegments, audio] }));
                } catch (e) {
                    console.warn(`Chunk ${i} failed`, e);
                }
            }
            await imageGenPromise;
            if (generationIdRef.current === currentGenId) {
                setState(prev => ({ ...prev, isGeneratingAudio: false, status: 'complete' }));
                addToLibrary(script, audioUrls, category, finalCoverUrl);
            }
        })();
    } catch (error) {
        console.error(error);
        if (generationIdRef.current === currentGenId) {
            setState(prev => ({ 
                ...prev, 
                status: 'error', 
                isGeneratingAudio: false,
                error: error instanceof Error ? error.message : "An unexpected error occurred." 
            }));
        }
    }
  };

  const handleGenerateCustom = async (options: GenerationOptions) => {
      const input = state.sourceFile || state.inputText;
      await handleGenerationFlow(input, 'standard', 'custom', undefined, options, true);
  };

  const handleGenerateNews = async (topic: NewsTopic) => {
      setState(prev => ({ 
          ...prev, 
          status: 'scripting', 
          error: null, 
          script: null, 
          audioSegments: [], 
          currentEpisodeId: null,
          activeCategory: topic.name,
          customCoverUrl: topic.customImage
      }));

      try {
          let newsSummary = '';
          try {
             if (topic.rssUrls.length > 0) {
                 newsSummary = await fetchNewsForTopic(topic.rssUrls);
             } else {
                 throw new Error("No RSS URLs available for this topic.");
             }
          } catch (rssError) {
             console.warn("RSS Fetch failed, attempting AI fallback...", rssError);
             newsSummary = await generateNewsFallback(topic.name, topic.description || topic.name);
          }

          if (newsSummary) {
              const contextPayload = `
STRICT INSTRUCTION: Generate a podcast ONLY about the specific focus described below. 
You must filter the provided news data. If a news item does not match the "SPECIFIC FOCUS", discard it.

TARGET TOPIC: ${topic.name}
SPECIFIC FOCUS: ${topic.description || topic.name}

AVAILABLE NEWS DATA (Select only what matches the focus):
${newsSummary}
              `;
              
              await handleGenerationFlow(contextPayload, 'news', topic.name, topic.customImage, undefined, topic.isCustom);
          } else {
             throw new Error("Could not gather news from RSS or AI Fallback.");
          }
      } catch (e) {
           console.error("News flow error:", e);
           if (state.status !== 'idle') {
               setState(prev => ({ 
                  ...prev, 
                  status: 'error', 
                  error: e instanceof Error ? e.message : "Failed to fetch news." 
              }));
           }
      }
  };

  const handleAddTopic = async (name: string, description: string, color?: string) => {
      const newTopicId = crypto.randomUUID();
      const newTopic: NewsTopic = {
          id: newTopicId,
          name: name,
          description: description,
          rssUrls: [],
          isCustom: true,
          isLoading: true,
          color: color || 'slate'
      };

      setState(prev => ({ ...prev, topics: [...prev.topics, newTopic] }));

      const rssPromise = discoverRssFeeds(description).then(async (candidates) => {
          return await getValidFeeds(candidates, 3);
      });

      const imagePromise = generateCoverImage(description);

      Promise.all([rssPromise, imagePromise]).then(([validUrls, generatedImage]) => {
          setState(prev => ({
              ...prev,
              topics: prev.topics.map(t => 
                  t.id === newTopicId 
                  ? { ...t, rssUrls: validUrls, customImage: generatedImage, isLoading: false }
                  : t
              )
          }));
      }).catch(e => {
          setState(prev => ({
              ...prev,
              topics: prev.topics.map(t => 
                  t.id === newTopicId 
                  ? { ...t, isLoading: false }
                  : t
              )
          }));
      });
  };

  const handleUpdateTopic = (id: string, newName: string, newRssUrls: string[], newColor?: string) => {
    setState(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === id ? { ...t, name: newName, rssUrls: newRssUrls, color: newColor } : t)
    }));
  };

  const handleDeleteTopic = (id: string) => {
    setState(prev => ({
      ...prev,
      topics: prev.topics.filter(t => t.id !== id)
    }));
  };

  const setView = (view: AppView) => {
    setState(prev => ({ ...prev, view, error: null }));
  };

  const handleBack = () => {
      if (state.previousView) {
          setState(prev => ({ ...prev, view: prev.previousView!, previousView: null }));
      } else {
          setState(prev => ({ ...prev, view: 'news' }));
      }
  };

  const handleSelectEpisode = (episode: PodcastEpisode) => {
      setIsScriptMinimized(false); // Reset view
      setState(prev => ({
          ...prev,
          script: episode.script,
          audioSegments: episode.audioSegments,
          currentEpisodeId: episode.id,
          activeCategory: episode.category,
          customCoverUrl: episode.customImage,
          status: 'complete',
          isGeneratingAudio: false,
          previousView: prev.view,
          view: 'details'
      }));
  };

  const handleDownloadEpisode = async () => {
    if (!state.script || state.audioSegments.length === 0) return;
    try {
        const blob = await mergeAudioSegments(state.audioSegments);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (e) {
        setState(s => ({ ...s, error: "Failed to download episode." }));
    }
  };

  const handleGenerateEvents = async () => {
      setState(prev => ({ ...prev, isEventsLoading: true }));
      try {
        const topicNames = state.topics.map(t => t.name);
        const events = await generateUpcomingEvents(topicNames);
        setState(prev => ({ ...prev, upcomingEvents: events, isEventsLoading: false }));
      } catch (e) {
        setState(prev => ({ ...prev, isEventsLoading: false }));
      }
  };

  const handleSelectRecommendation = (topicId: string) => {
      const topic = state.topics.find(t => t.id === topicId);
      if (topic) setState(s => ({ ...s, view: 'news' }));
  };

  const generationStatus = state.isGeneratingAudio 
    ? `Synthesizing Part ${state.audioSegments.length + 1}...` 
    : undefined;

  // --- Render Helpers ---

  const renderNavButtons = () => {
     const buttonClass = (view: AppView) => `
        flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300
        ${state.view === view 
            ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20' 
            : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'}
     `;

     return (
        <nav className="flex items-center p-1 rounded-full bg-black/20 border border-white/5 backdrop-blur-md">
            <button onClick={() => setView('news')} className={buttonClass('news')}>News</button>
            <button onClick={() => setView('custom')} className={buttonClass('custom')}>Custom</button>
            <button onClick={() => setView('library')} className={buttonClass('library')}>Library</button>
            <button onClick={() => setView('events')} className={buttonClass('events')}>Events</button>
        </nav>
     );
  };

  const renderMainContent = () => {
      const containerClass = "bg-glass backdrop-blur-xl rounded-3xl border border-glass-border relative shadow-2xl transition-all duration-500";

      if (state.view === 'library') return <div className={containerClass}><LibraryView episodes={state.library} onSelectEpisode={handleSelectEpisode} /></div>;
      if (state.view === 'profile') return <div className={containerClass}><ProfileView episodes={state.library} onSelectTopic={handleSelectRecommendation} /></div>;
      if (state.view === 'events') return <div className={containerClass}><EventsView events={state.upcomingEvents} topics={state.topics} onGenerateEvents={handleGenerateEvents} isLoading={state.isEventsLoading} /></div>;
      if (state.view === 'details') return <div className={containerClass}><ScriptView script={state.script} status={state.status} category={state.activeCategory || 'custom'} customCoverUrl={state.customCoverUrl} onBack={handleBack} onDownload={handleDownloadEpisode} /></div>;

      const inputComponent = state.view === 'custom' ? (
        <InputSection 
            textValue={state.inputText}
            fileValue={state.sourceFile}
            onTextChange={(val) => setState(s => ({ ...s, inputText: val }))}
            onFileChange={(file) => setState(s => ({ ...s, sourceFile: file }))}
            onGenerate={handleGenerateCustom}
            onStop={handleStopGeneration}
            status={state.status}
            isSplitView={isChildSplitView}
            audioSegmentCount={state.audioSegments.length}
        />
      ) : (
        <NewsSelector 
            topics={state.topics}
            onSelect={handleGenerateNews}
            onAddTopic={handleAddTopic}
            onUpdateTopic={handleUpdateTopic}
            onDeleteTopic={handleDeleteTopic}
            onStop={handleStopGeneration}
            status={state.status} 
            isSplitView={isChildSplitView}
            activeCategory={state.activeCategory}
            audioSegmentCount={state.audioSegments.length}
        />
      );

      // Width calculation based on minimized state
      const leftWidthClass = hasContent 
        ? (isScriptMinimized ? 'flex-1 min-w-0' : 'lg:w-1/3 w-full') 
        : 'w-full';
        
      const rightWidthClass = hasContent
        ? (isScriptMinimized ? 'w-20 cursor-pointer hover:bg-white/5' : 'flex-1 opacity-100 translate-x-0') 
        : 'w-0 opacity-0 translate-x-20 overflow-hidden hidden';

      return (
        <div className="flex flex-col w-full">
            {state.view === 'news' && (
                <div className="flex flex-col items-center justify-center mb-8 transition-all duration-700">
                     <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-tighter drop-shadow-sm select-none">
                        NEXUS
                     </h1>
                     <p className="text-xl font-medium text-indigo-200/80 tracking-[0.3em] uppercase mt-2">
                        learn faster, know deeper
                     </p>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 transition-all duration-500">
                <div className={`
                    flex flex-col transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]
                    ${leftWidthClass}
                `}>
                    {inputComponent}
                </div>
                
                <div 
                    className={`
                        flex flex-col relative transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] origin-right
                        ${rightWidthClass}
                    `}
                    onClick={() => isScriptMinimized && setIsScriptMinimized(false)}
                >
                     <div className={`${containerClass} h-full overflow-hidden`}>
                        {hasContent && (
                            <>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsScriptMinimized(!isScriptMinimized);
                                    }}
                                    className={`
                                        absolute top-4 z-50 p-2 rounded-full bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg backdrop-blur-md
                                        ${isScriptMinimized ? 'left-1/2 -translate-x-1/2 rotate-180' : 'left-4'}
                                    `}
                                    title={isScriptMinimized ? "Expand Podcast View" : "Minimize Podcast View"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                                    </svg>
                                </button>

                                {isScriptMinimized ? (
                                    <div className="h-full flex flex-col items-center pt-24 pb-8">
                                        <div className="flex-1 flex flex-col items-center gap-4">
                                             <div className="w-1 h-full max-h-40 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
                                             <span className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
                                                {state.script?.title || 'GENERATED CONTENT'}
                                             </span>
                                             <div className="w-1 h-full max-h-40 bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <ScriptView 
                                        script={state.script} 
                                        status={state.status} 
                                        category={state.activeCategory || 'custom'}
                                        customCoverUrl={state.customCoverUrl}
                                        onDownload={handleDownloadEpisode}
                                    />
                                )}
                            </>
                        )}
                     </div>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans text-white/90 bg-gradient-to-br from-slate-950 via-[#0B1120] to-[#1e1b4b] transition-colors duration-700 relative">
        
        {/* Animated Ambient Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-pink-500/20 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        {/* Header */}
        <header className="flex-shrink-0 h-20 flex items-center px-6 md:px-10 justify-between z-10 relative">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 select-none group">
                    <h1 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.2)] cursor-default">
                        NEXUS
                    </h1>
                </div>
                {renderNavButtons()}
            </div>
            
            <button onClick={() => setView('profile')} className="group relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 p-0.5 transition-transform group-hover:scale-105">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-xs text-white">GU</div>
                </div>
            </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 relative p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto w-full z-10">
            {renderMainContent()}
            <div className="h-[50px] w-full" aria-hidden="true" />
        </main>

        {state.error && (
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-500/10 border border-red-500/20 backdrop-blur-md text-red-200 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                <span>{state.error}</span>
                <button onClick={() => setState(s => ({...s, error: null}))} className="ml-2 hover:text-white">✕</button>
            </div>
        )}

        {state.notification && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-indigo-500 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-md font-bold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
                {state.notification}
            </div>
        )}

        {(state.audioSegments.length > 0) && (
            <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
                 <div className="max-w-4xl mx-auto">
                    <AudioPlayer 
                        segments={state.audioSegments} 
                        isGenerating={state.isGeneratingAudio} 
                        script={state.script}
                        category={state.activeCategory || 'custom'}
                        customCoverUrl={state.customCoverUrl}
                        generationStatus={generationStatus}
                        onViewDetails={() => {
                            setState(prev => ({
                                ...prev,
                                previousView: prev.view,
                                view: 'details'
                            }));
                        }}
                    />
                 </div>
            </div>
        )}
    </div>
  );
};

export default App;
