
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GenerationStatus, SourceFile } from '../types';

interface InputSectionProps {
  textValue: string;
  fileValue: SourceFile | null;
  onTextChange: (val: string) => void;
  onFileChange: (file: SourceFile | null) => void;
  onGenerate: (options: { 
      duration: number; 
      expertise: number; 
      format: string;
      language: string;
      tone: string;
  }) => void;
  onStop: () => void;
  status: GenerationStatus;
  isSplitView: boolean;
  audioSegmentCount?: number;
}

const LANGUAGES = [
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Spanish' },
    { value: 'French', label: 'French' },
    { value: 'German', label: 'German' },
    { value: 'Japanese', label: 'Japanese' },
    { value: 'Portuguese', label: 'Portuguese' },
    { value: 'Hindi', label: 'Hindi' },
];

const FORMATS = [
    { id: 'conversational', label: 'Chat', icon: '💬' },
    { id: 'debate', label: 'Debate', icon: '⚖️' },
    { id: 'interview', label: 'Interview', icon: '🎤' },
    { id: 'storytelling', label: 'Story', icon: '📚' },
];

const TONES = [
    { id: 'serious', label: 'Serious' },
    { id: 'relaxed', label: 'Relaxed' },
    { id: 'humorous', label: 'Humorous' },
    { id: 'dramatic', label: 'Dramatic' },
];

export const InputSection: React.FC<InputSectionProps> = ({ 
  textValue, 
  fileValue, 
  onTextChange, 
  onFileChange, 
  onGenerate, 
  onStop,
  status,
  isSplitView,
  audioSegmentCount = 0
}) => {
  const isGenerating = status === 'scripting' || status === 'synthesizing';
  const canGenerate = !isGenerating && (!!fileValue || textValue.trim().length >= 10);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [duration, setDuration] = useState(50);
  const [expertise, setExpertise] = useState(50);
  const [format, setFormat] = useState('conversational');
  const [language, setLanguage] = useState('English');
  const [tone, setTone] = useState('relaxed');

  const [showPartInfo, setShowPartInfo] = useState(false);
  
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isGenerating) {
        interval = setInterval(() => {
            setShowPartInfo(prev => !prev);
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);


  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isGenerating) setIsDragging(true);
  }, [isGenerating]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
      alert('Only PDF and Text files are supported currently.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64Data = result.split(',')[1];
      onFileChange({
        name: file.name,
        data: base64Data,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isGenerating) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, [isGenerating, onFileChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const removeFile = () => {
    onFileChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateClick = () => {
      onGenerate({ duration, expertise, format, language, tone });
  };

  const renderSourceArea = () => (
      <div 
        className={`
          flex-1 w-full relative rounded-xl border transition-all duration-500 overflow-hidden mb-6 lg:mb-0 min-h-[400px]
          ${isDragging 
            ? 'border-indigo-500 border-dashed bg-indigo-500/10' 
            : 'border-white/10 bg-black/20 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20'
          }
        `}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {fileValue ? (
          <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-white/5 text-red-400 rounded-xl flex items-center justify-center mb-3 border border-white/10">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white break-all line-clamp-2 mb-1">{fileValue.name}</h3>
            <p className="text-xs text-white/50 mb-4">PDF Document Ready</p>
            <button 
              onClick={removeFile}
              disabled={isGenerating}
              className="text-sm text-red-400 hover:text-red-300 font-medium px-4 py-2 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
            >
              Remove File
            </button>
          </div>
        ) : (
          <>
            <textarea
              className="w-full h-full p-4 bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-white/90 placeholder:text-white/30 font-mono text-sm leading-relaxed z-0"
              placeholder={isDragging ? "Drop file here..." : "Paste your text here, or drag and drop a PDF file..."}
              value={textValue}
              onChange={(e) => onTextChange(e.target.value)}
              disabled={isGenerating}
            />
            {!isDragging && textValue.length === 0 && (
               <div className="absolute bottom-4 right-4 pointer-events-none">
                  <span className="text-xs text-white/40 bg-black/40 px-2 py-1 rounded border border-white/10">Drag & Drop PDF supported</span>
               </div>
            )}
          </>
        )}
      </div>
  );

  const renderSettings = () => (
      <div className="space-y-6">
         {/* Format & Language Row */}
         <div className="space-y-4">
             {/* Format Selection */}
             <div>
                 <label className="text-xs font-bold text-white/40 block mb-2 uppercase tracking-wide">Podcast Format</label>
                 <div className="grid grid-cols-4 gap-2">
                    {FORMATS.map(fmt => (
                        <button
                            key={fmt.id}
                            onClick={() => setFormat(fmt.id)}
                            disabled={isGenerating}
                            className={`
                                flex flex-col items-center justify-center p-2 rounded-lg border transition-all
                                ${format === fmt.id 
                                    ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-lg' 
                                    : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10 hover:border-white/10 hover:text-white'
                                }
                            `}
                        >
                            <span className="text-lg mb-1 grayscale opacity-80">{fmt.icon}</span>
                            <span className="text-[10px] font-bold">{fmt.label}</span>
                        </button>
                    ))}
                 </div>
             </div>

             {/* Output Language */}
             <div>
                 <label className="text-xs font-bold text-white/40 block mb-2 uppercase tracking-wide">Output Language</label>
                 <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isGenerating}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                 >
                     {LANGUAGES.map(lang => (
                         <option key={lang.value} value={lang.value} className="bg-slate-900">{lang.label}</option>
                     ))}
                 </select>
             </div>
         </div>

         <div>
             <label className="text-xs font-bold text-white/40 block mb-2 uppercase tracking-wide">Tone & Vibe</label>
             <div className="flex bg-black/20 p-1 rounded-lg border border-white/10">
                 {TONES.map(t => (
                     <button
                        key={t.id}
                        onClick={() => setTone(t.id)}
                        disabled={isGenerating}
                        className={`
                            flex-1 py-1.5 text-xs font-bold rounded-md transition-all
                            ${tone === t.id 
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                                : 'text-white/40 hover:text-white'
                            }
                        `}
                     >
                         {t.label}
                     </button>
                 ))}
             </div>
         </div>

         {/* Sliders Stack (Vertical) */}
         <div className="space-y-6 pt-2">
             {/* Duration Slider */}
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider">
                   <span>Length</span>
                   <span className="text-indigo-400">
                     {duration < 33 ? 'Short' : duration > 66 ? 'Deep Dive' : 'Standard'}
                   </span>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full">
                   <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={duration} 
                      onChange={(e) => setDuration(Number(e.target.value))}
                      disabled={isGenerating}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   />
                   <div 
                      className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${duration}%` }}
                   ></div>
                   <div 
                      className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-lg transition-all pointer-events-none"
                      style={{ left: `calc(${duration}% - 6px)` }}
                   ></div>
                </div>
             </div>

             {/* Expertise Slider */}
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider">
                   <span>Audience</span>
                   <span className="text-purple-400">
                     {expertise < 33 ? 'Newbie' : expertise > 66 ? 'Pro' : 'General'}
                   </span>
                </div>
                <div className="relative h-2 bg-white/10 rounded-full">
                   <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={expertise} 
                      onChange={(e) => setExpertise(Number(e.target.value))}
                      disabled={isGenerating}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                   />
                   <div 
                      className="absolute top-0 left-0 h-full bg-purple-500 rounded-full transition-all"
                      style={{ width: `${expertise}%` }}
                   ></div>
                   <div 
                      className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full shadow-lg transition-all pointer-events-none"
                      style={{ left: `calc(${expertise}% - 6px)` }}
                   ></div>
                </div>
             </div>
         </div>
      </div>
  );

  return (
    <div className="flex flex-col p-6 bg-glass backdrop-blur-xl rounded-3xl border border-glass-border shadow-2xl relative transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]">
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="application/pdf,text/plain"
        className="hidden"
      />

       {isGenerating && (
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 rounded-3xl animate-in fade-in duration-500">
             <div className="w-full flex flex-col items-center justify-center max-w-sm">
                
                <div className="relative flex h-16 w-16 flex-shrink-0 mb-8">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-50"></span>
                    <span className="relative inline-flex rounded-full h-16 w-16 bg-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.6)]"></span>
                </div>
                
                <div className="w-full flex flex-col items-center gap-4 mb-8">
                     <div className="relative w-full h-8 flex items-center justify-center overflow-hidden">
                        <p 
                            className={`
                                text-2xl text-white font-bold absolute transition-all duration-700 w-full text-center
                                ${showPartInfo ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}
                            `}
                        >
                            Generating Script & Audio...
                        </p>
                        <p 
                            className={`
                                text-2xl text-white font-bold absolute transition-all duration-700 w-full text-center
                                ${showPartInfo ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}
                            `}
                        >
                            Processing Part {audioSegmentCount + 1}...
                        </p>
                     </div>
                     <p className="text-sm text-white/50 font-medium">Analyzing your content and creating dialogue</p>
                </div>

                <button 
                    onClick={onStop}
                    className="px-8 py-2.5 rounded-full bg-black/50 border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all text-sm font-bold shadow-lg uppercase tracking-wide"
                >
                    Stop Generation
                </button>
             </div>
          </div>
       )}

      <div className={`flex flex-col lg:flex-row gap-8 min-h-0 ${isGenerating ? 'opacity-20 pointer-events-none filter blur-sm' : ''} transition-all duration-700`}>
        
        <div className="flex flex-col flex-1 h-full">
           <div className="mb-4 flex-shrink-0">
                <h2 className="text-xl font-bold text-white mb-1">Source Material</h2>
                <p className="text-sm text-white/50">
                Paste text or drop a PDF file to convert into a podcast.
                </p>
            </div>
            {renderSourceArea()}
        </div>

        <div className="flex flex-col lg:w-[320px] flex-shrink-0 border-t lg:border-t-0 lg:border-l border-white/10 pt-6 lg:pt-0 lg:pl-8 transition-all duration-700">
             <div className="flex-1 pr-2">
                 <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider mb-4 sticky top-0 bg-transparent z-10 py-1">
                     Config
                 </h3>
                 {renderSettings()}
             </div>

            <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
                 <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isGenerating || !!fileValue}
                    className="text-sm text-white/60 hover:text-white font-bold transition-colors flex items-center justify-center gap-2 px-2 py-3 rounded-xl hover:bg-white/5 disabled:opacity-50 disabled:pointer-events-none w-full border border-white/10 hover:border-white/20"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                    Attach File
                </button>

                <button
                    onClick={isGenerating ? onStop : handleGenerateClick}
                    disabled={!canGenerate && !isGenerating}
                    className={`
                        w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border border-transparent
                        ${isGenerating
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : !canGenerate 
                            ? 'bg-white/5 text-white/30 cursor-not-allowed border-white/5' 
                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0'
                        }
                    `}
                >
                {isGenerating ? (
                    <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Stop Generation</span>
                    </>
                ) : (
                    <>
                    <span>Generate Podcast</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                    </>
                )}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
