
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { PodcastScript } from '../types';
import { getImageUrl } from '../utils/imageUtils';

interface ScriptViewProps {
  script: PodcastScript | null;
  status: string;
  category?: string;
  customCoverUrl?: string;
  onBack?: () => void;
  onDownload?: () => void;
}

export const ScriptView: React.FC<ScriptViewProps> = ({ script, status, category, customCoverUrl, onBack, onDownload }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [displayCoverUrl, setDisplayCoverUrl] = useState<string>(getImageUrl(category));
  const [isImageLoading, setIsImageLoading] = useState(false);
  
  useEffect(() => {
      const targetUrl = customCoverUrl || getImageUrl(category);
      if (targetUrl !== displayCoverUrl) {
          setIsImageLoading(true);
          const img = new Image();
          img.src = targetUrl;
          img.onload = () => {
              setDisplayCoverUrl(targetUrl);
              setIsImageLoading(false);
          };
      }
  }, [customCoverUrl, category]);
  
  const estimatedDuration = useMemo(() => {
    if (!script) return 0;
    const wordCount = script.lines.reduce((acc, line) => acc + line.text.split(' ').length, 0);
    return Math.ceil(wordCount / 150);
  }, [script]);

  const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyToClipboard = () => {
      if (!script) return;
      const shareText = `Check out this AI-generated podcast about ${script.topic}: "${script.title}"\n\nSummary: ${script.summary}`;
      navigator.clipboard.writeText(shareText);
      setShowShareModal(false);
  };

  const shareViaEmail = () => {
      if (!script) return;
      const subject = encodeURIComponent(`Podcast: ${script.title}`);
      const body = encodeURIComponent(`Check out this AI-generated podcast about ${script.topic}: "${script.title}"\n\nSummary: ${script.summary}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
      setShowShareModal(false);
  };

  const shareViaTwitter = () => {
      if (!script) return;
      const text = encodeURIComponent(`Listening to a new AI-generated podcast about ${script.topic}: "${script.title}" 🎙️✨ #Nexus`);
      window.open(`https://twitter.com/intent/tweet?text=${text}`);
      setShowShareModal(false);
  };

  const renderDigestContent = (digest: string) => {
    const cleanDigest = digest.replace(/<\/?[^>]+(>|$)/g, "");

    return cleanDigest.split('\n').map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <br key={i}/>;

        if (trimmed.startsWith('# ')) {
             return <h2 key={i} className="text-2xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*20}ms`}}>{trimmed.substring(2)}</h2>;
        }
        if (trimmed.startsWith('## ')) {
             return <h3 key={i} className="text-xl font-bold text-indigo-400 mt-8 mb-3 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*20}ms`}}>{trimmed.substring(3)}</h3>;
        }
        if (trimmed.startsWith('### ')) {
             return <h4 key={i} className="text-lg font-bold text-purple-300 mt-6 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*20}ms`}}>{trimmed.substring(4)}</h4>;
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
             const content = trimmed.replace(/^[-•*]\s+/, '');
             return (
                <div key={i} className="flex gap-4 mb-3 ml-1 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*20}ms`}}>
                    <span className="text-indigo-500 font-bold mt-1.5">•</span>
                    <p className="text-slate-300 flex-1 leading-relaxed text-lg">{formatText(content)}</p>
                </div>
             );
        }
        if (/^\d+\.\s/.test(trimmed)) {
             return <p key={i} className="mb-3 text-slate-300 ml-4 font-medium text-lg animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*20}ms`}}>{formatText(trimmed)}</p>;
        }
        if (trimmed.length < 60 && !trimmed.endsWith('.') && !trimmed.endsWith(':')) {
           return <h3 key={i} className="text-xl font-bold text-white mt-8 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*20}ms`}}>{formatText(trimmed)}</h3>;
        }
        return <p key={i} className="mb-4 text-slate-300 leading-relaxed text-lg animate-in fade-in slide-in-from-bottom-2 duration-500" style={{animationDelay: `${i*20}ms`}}>{formatText(trimmed)}</p>;
    });
  };

  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 min-h-[400px]">
        <div className="w-20 h-20 mb-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8 text-white/20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
        </div>
        <p className="text-white/40 font-medium tracking-wide">Generating your content</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative animate-in fade-in duration-700">
      <div className="flex-1">
        
        <div className="relative h-96 w-full">
           <div className="absolute inset-0">
             <img src={displayCoverUrl} alt="Cover" className="w-full h-full object-cover opacity-60" />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black/90"></div>
           </div>
           
           <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-12 z-10">
               {onBack && (
                   <button onClick={onBack} className="absolute top-8 left-8 bg-black/40 hover:bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md border border-white/10 text-sm font-bold transition-all">
                       ← Back
                   </button>
               )}
               
               <div className="flex items-end gap-8">
                   <div className="hidden md:block w-48 h-48 rounded-2xl overflow-hidden shadow-2xl border border-white/20 shrink-0">
                       <img src={displayCoverUrl} className="w-full h-full object-cover" />
                   </div>
                   <div className="flex-1 pb-2">
                       <div className="flex items-center gap-3 mb-4">
                           <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                               {category || 'Podcast'}
                           </span>
                           <span className="text-white/40 text-sm font-medium">• {estimatedDuration} min read</span>
                       </div>
                       <h1 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-4 drop-shadow-xl">{script.title}</h1>
                       <p className="text-lg text-white/70 max-w-2xl leading-relaxed">{script.summary}</p>
                   </div>
               </div>
           </div>
        </div>

        <div className="px-8 md:px-12 py-6 bg-black/60 sticky top-0 z-20 border-b border-white/5 flex items-center justify-between backdrop-blur-xl">
             <div className="flex items-center gap-3">
                 <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>
                 <span className="text-sm font-bold text-white tracking-wide uppercase">Live Script</span>
             </div>
             <div className="flex gap-4">
                 <button onClick={handleShare} className="text-white/60 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" /></svg>
                 </button>
                 {onDownload && status === 'complete' && (
                     <button onClick={onDownload} className="text-white/60 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                     </button>
                 )}
             </div>
        </div>

        <div className="p-8 md:p-12 pb-32 max-w-4xl mx-auto">
             <div className="prose prose-invert prose-lg text-slate-300">
                {script.digest ? renderDigestContent(script.digest) : <p className="text-white/30 italic">No content available.</p>}
             </div>
             <div ref={bottomRef} />
        </div>
      </div>

      {showShareModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
             <button onClick={() => setShowShareModal(false)} className="absolute top-4 right-4 text-white/30 hover:text-white">✕</button>
             <h3 className="text-lg font-bold text-white mb-6">Share Episode</h3>
             <div className="space-y-3">
                <button onClick={copyToClipboard} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">📋</div>
                    <span className="font-bold text-white">Copy Link</span>
                </button>
                <button onClick={shareViaTwitter} className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">🐦</div>
                    <span className="font-bold text-white">Twitter / X</span>
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
