
import React, { useRef, useState, useEffect } from 'react';
import { PodcastScript } from '../types';
import { getImageUrl } from '../utils/imageUtils';

interface AudioPlayerProps {
  segments: string[];
  isGenerating?: boolean;
  script?: PodcastScript | null;
  category?: string;
  customCoverUrl?: string; // New prop for custom cover
  onViewDetails?: () => void;
  generationStatus?: string; // New prop for detailed status text
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ segments, isGenerating, script, category, customCoverUrl, onViewDetails, generationStatus }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Handle auto-play for the very first segment during generation
  useEffect(() => {
    if (segments.length === 1 && currentIndex === 0) {
        const playPromise = audioRef.current?.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Auto-play prevented:", error);
                // State update handled by onPause event
            });
        }
    }
  }, [segments.length]);

  // Handle bounds check
  useEffect(() => {
    if (segments.length > 0 && currentIndex >= segments.length) {
       setCurrentIndex(0);
    }
  }, [segments]);

  // Handle track changes
  useEffect(() => {
    if (audioRef.current && segments[currentIndex]) {
        const url = new URL(segments[currentIndex], window.location.href).href;
        if (audioRef.current.src !== url) {
            audioRef.current.src = segments[currentIndex];
            audioRef.current.load();
            // Attempt to keep playing if we were playing, or if it's a new track via user action
            // relying on autoPlay attribute or manual play
            const playPromise = audioRef.current.play();
            playPromise.catch(() => { /* handled by events */ });
        }
    }
  }, [currentIndex, segments]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const skipTime = (seconds: number) => {
      if (audioRef.current) {
          const newTime = Math.min(Math.max(audioRef.current.currentTime + seconds, 0), audioRef.current.duration || 0);
          audioRef.current.currentTime = newTime;
          setCurrentTime(newTime);
      }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const handleSegmentClick = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      if (index < segments.length) {
          setCurrentIndex(index);
          // Play will be triggered by useEffect when currentIndex changes
      }
  };

  const handleEnded = () => {
    if (currentIndex < segments.length - 1) {
        setCurrentIndex(prev => prev + 1);
    } else {
        if (!isGenerating) {
            // End of playlist
            // Audio will pause itself, event will fire setIsPlaying(false)
            setCurrentIndex(0);
            setCurrentTime(0);
        }
    }
  };

  const toggleExpand = () => {
      setIsExpanded(!isExpanded);
  };

  useEffect(() => {
      // If playing and generating, automatically move to next segment if previous ended
      // This is partly redundant with handleEnded but useful if state gets out of sync
      if (isPlaying && audioRef.current?.ended && currentIndex < segments.length - 1) {
          setCurrentIndex(prev => prev + 1);
      }
  }, [segments.length, isPlaying, currentIndex]);

  if (segments.length === 0) return null;

  const isBuffering = isGenerating && currentIndex === segments.length - 1 && audioRef.current?.ended;
  const coverUrl = customCoverUrl || getImageUrl(category);

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <div 
        className={`
            w-full bg-black/60 backdrop-blur-xl border-t border-white/10 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer group
            ${isExpanded ? 'h-[200px]' : 'h-24 hover:bg-black/70'}
        `}
        onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <audio
        ref={audioRef}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleTimeUpdate}
        autoPlay
      />
      
      <div className="max-w-5xl mx-auto px-6 h-full flex flex-col justify-center relative">
        
        <button 
            onClick={(e) => { e.stopPropagation(); toggleExpand(); }}
            className={`
                absolute right-6 transition-all duration-500 z-20 p-2 rounded-full hover:bg-white/10 text-white/40
                ${isExpanded ? 'top-4 rotate-180' : 'top-1/2 -translate-y-1/2'}
            `}
        >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
        </button>

        {isExpanded ? (
            /* COMPACT EXPANDED VIEW (HORIZONTAL) */
            <div className="flex flex-row items-center gap-6 h-full py-4 animate-in fade-in duration-300">
                {/* Square Cover */}
                <div className="relative w-40 h-40 flex-shrink-0 shadow-2xl rounded-lg overflow-hidden ring-1 ring-white/10 group-hover:ring-white/20 transition-all">
                    <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                    {onViewDetails && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                             onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                             <span className="text-[10px] font-bold text-white border border-white/50 px-3 py-1 rounded-full uppercase tracking-wider">
                                View Info
                             </span>
                        </div>
                    )}
                </div>

                {/* Details & Controls Column */}
                <div className="flex flex-col flex-1 h-full justify-center gap-4 min-w-0">
                    
                    {/* Header Info */}
                    <div className="flex justify-between items-start">
                         <div>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5 opacity-80 block">
                                {category || 'Now Playing'}
                            </span>
                            <h2 className="text-xl font-black text-white line-clamp-1 leading-tight mb-0.5" title={script?.title}>
                                {script?.title || 'Untitled Podcast'}
                            </h2>
                            <p className="text-white/40 text-xs line-clamp-1 opacity-80">
                                {script?.summary}
                            </p>
                         </div>
                         
                         {/* View Full Page Button */}
                         {onViewDetails && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                                className="text-[10px] font-bold text-white/40 hover:text-white border border-white/10 hover:border-white/30 px-3 py-1 rounded-full transition-all mr-8 whitespace-nowrap"
                            >
                                Full Episode
                            </button>
                         )}
                    </div>

                    {/* Timeline */}
                    <div className="w-full">
                        <div className="flex justify-between text-[10px] text-white/40 mb-1.5 font-mono">
                             <span>{formatTime(currentTime)}</span>
                             <span className={isGenerating ? 'text-indigo-400 animate-pulse font-bold' : ''}>
                                {isGenerating && generationStatus ? generationStatus : `Part ${currentIndex + 1}/${segments.length}`}
                             </span>
                             <span>-{formatTime(remainingTime)}</span>
                        </div>
                        
                        <div 
                            className="relative w-full h-1 bg-white/10 rounded-full mb-2 group/seeker cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                        >
                             <div 
                                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full" 
                                style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                             />
                             <input 
                                type="range" 
                                min="0" 
                                max={duration || 100} 
                                value={currentTime} 
                                onChange={handleSeek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                             />
                        </div>

                        {/* Segments Visualizer */}
                        <div className="w-full flex gap-0.5 h-1.5 cursor-pointer opacity-50 hover:opacity-100 transition-opacity">
                            {segments.map((_, idx) => (
                                <div 
                                    key={idx}
                                    onClick={(e) => handleSegmentClick(e, idx)}
                                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                        idx < currentIndex ? 'bg-indigo-600' :
                                        idx === currentIndex ? 'bg-indigo-400 animate-pulse' :
                                        'bg-white/10'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Main Controls */}
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(currentIndex > 0) setCurrentIndex(c => c - 1);
                            }}
                            className="text-white/40 hover:text-white transition-colors"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.87l3.195 1.841c1.25.714 2.805-.19 2.805-1.629v-8.31c0-1.44-1.554-2.343-2.805-1.629l-7.108 4.097c-1.26.726-1.26 2.591 0 3.317l4.113 2.37z" />
                                <path d="M6.75 6a.75.75 0 00-1.5 0v12a.75.75 0 001.5 0V6z" />
                            </svg>
                        </button>
                        
                        <button onClick={(e) => { e.stopPropagation(); skipTime(-10); }} className="text-white/40 hover:text-indigo-400">
                             <span className="text-[10px] font-bold">-10s</span>
                        </button>

                        <button
                            onClick={togglePlay}
                            className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/20"
                        >
                            {isPlaying && !isBuffering ? (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 ml-0.5">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>

                        <button onClick={(e) => { e.stopPropagation(); skipTime(10); }} className="text-white/40 hover:text-indigo-400">
                             <span className="text-[10px] font-bold">+10s</span>
                        </button>

                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                if(currentIndex < segments.length - 1) setCurrentIndex(c => c + 1);
                            }}
                            className="text-white/40 hover:text-white transition-colors"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                <path d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.554 2.342 2.805 1.628L12.05 14.42c1.254-.722 1.254-2.557 0-3.28L5.055 7.06zM17.25 19.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-1.5 0v13.5a.75.75 0 00.75.75z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        ) : (
            /* COLLAPSED VIEW */
            <div className="flex items-center gap-4 h-full">
                <div className="relative group/cover">
                    <img src={coverUrl} alt="Cover" className="h-12 w-12 rounded bg-white/10 object-cover shadow-md" />
                    {onViewDetails && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/cover:opacity-100 flex items-center justify-center rounded transition-opacity"
                            title="View Details"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                        </button>
                    )}
                </div>
                
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-500 text-white hover:bg-purple-600 transition-colors shadow-lg shadow-indigo-500/20 flex-shrink-0"
                >
                {isPlaying && !isBuffering ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
                    <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 ml-0.5">
                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                    </svg>
                )}
                </button>

                <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-white font-bold text-sm truncate cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); onViewDetails && onViewDetails(); }}>
                            {script?.title || 'Podcast'}
                        </span>
                        <span className="text-white/40 text-xs hidden sm:inline">
                             {isGenerating && generationStatus ? `• ${generationStatus}` : `• Part ${currentIndex + 1}`}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                         <span className="text-[10px] text-white/40 font-mono tabular-nums w-8 text-right">
                             {formatTime(currentTime)}
                         </span>
                         
                         <div 
                            className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden flex gap-0.5 cursor-pointer group/timeline"
                            onClick={(e) => e.stopPropagation()} 
                         >
                            {segments.map((_, idx) => (
                                <div 
                                    key={idx}
                                    onClick={(e) => handleSegmentClick(e, idx)}
                                    className={`h-full flex-1 transition-all duration-300 hover:opacity-80 ${
                                        idx < currentIndex ? 'bg-indigo-500' :
                                        idx === currentIndex ? 'bg-indigo-400 animate-pulse' :
                                        'bg-white/10'
                                    }`}
                                    title={`Jump to Part ${idx + 1}`}
                                />
                            ))}
                        </div>

                         <span className="text-[10px] text-white/40 font-mono tabular-nums w-8">
                             -{formatTime(remainingTime)}
                         </span>
                    </div>
                </div>
                
                <a 
                href={segments[currentIndex]} 
                download={`podcast_part_${currentIndex + 1}.wav`}
                className="text-white/40 hover:text-indigo-400 transition-colors p-2"
                onClick={(e) => e.stopPropagation()}
                title="Download Segment"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                </a>
            </div>
        )}
      </div>
    </div>
  );
};
