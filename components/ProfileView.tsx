
import React, { useMemo } from 'react';
import { PodcastEpisode } from '../types';
import { DEFAULT_TOPICS } from '../utils/rssUtils';

interface ProfileViewProps {
  episodes: PodcastEpisode[];
  onSelectTopic: (topicId: string) => void;
}

// Helper to map categories to colors consistent with NewsSelector
const getCategoryColor = (category: string) => {
    const normalized = category.toLowerCase();
    switch(normalized) {
        case 'finance': return '#10b981'; // emerald-500
        case 'medicine': return '#f43f5e'; // rose-500
        case 'space': return '#6366f1'; // indigo-500
        case 'sciences': return '#f59e0b'; // amber-500
        case 'politics': return '#ef4444'; // red-500
        case 'sports': return '#3b82f6'; // blue-500
        case 'custom': return '#a855f7'; // purple-500
        default: return '#64748b'; // slate-500
    }
};

const getCategoryTailwindColor = (category: string) => {
    const normalized = category.toLowerCase();
    switch(normalized) {
        case 'finance': return 'bg-emerald-500';
        case 'medicine': return 'bg-rose-500';
        case 'space': return 'bg-indigo-500';
        case 'sciences': return 'bg-amber-500';
        case 'politics': return 'bg-red-500';
        case 'sports': return 'bg-blue-500';
        case 'custom': return 'bg-purple-500';
        default: return 'bg-slate-500';
    }
};

export const ProfileView: React.FC<ProfileViewProps> = ({ episodes, onSelectTopic }) => {
  
  // Calculate Stats (All Time)
  const stats = useMemo(() => {
    const categoryStats: Record<string, number> = {};
    let totalMinutes = 0;

    episodes.forEach(ep => {
      // Estimate duration: word count / 150 wpm
      const wordCount = ep.script.lines.reduce((acc, line) => acc + line.text.split(' ').length, 0);
      const minutes = Math.ceil(wordCount / 150);
      
      totalMinutes += minutes;
      
      const cat = ep.category || 'Custom';
      categoryStats[cat] = (categoryStats[cat] || 0) + minutes;
    });

    return { totalMinutes, categoryStats, episodeCount: episodes.length };
  }, [episodes]);

  // Prepare Chart Data
  const chartData = useMemo(() => {
      const total = stats.totalMinutes || 1; // Avoid divide by zero
      let cumulativePercent = 0;

      const segments = (Object.entries(stats.categoryStats) as [string, number][])
        .sort(([, a], [, b]) => b - a) // Sort largest first
        .map(([label, value]) => {
            const percent = value / total;
            const start = cumulativePercent;
            cumulativePercent += percent;
            return {
                label,
                value,
                percent,
                start,
                color: getCategoryColor(label),
                twColor: getCategoryTailwindColor(label)
            };
        });

      return segments;
  }, [stats]);

  // Calculate Awareness Gaps (Topics with 0 or low listening time)
  const awarenessGaps = useMemo(() => {
    const listenedCategories = Object.keys(stats.categoryStats).map(k => k.toLowerCase());
    
    // Find default topics that haven't been listened to
    const gaps = DEFAULT_TOPICS.filter(t => !listenedCategories.includes(t.name.toLowerCase()));
    
    // If user has listened to everything, return items with lowest minutes
    if (gaps.length === 0) {
        return DEFAULT_TOPICS
            .map(t => ({
                topic: t,
                minutes: stats.categoryStats[t.name] || 0
            }))
            .sort((a, b) => a.minutes - b.minutes)
            .slice(0, 3)
            .map(item => item.topic);
    }
    
    return gaps.slice(0, 4); // Return top 4 gaps
  }, [stats]);


  // SVG Donut Logic
  const size = 160;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="h-full p-8 overflow-y-auto">
      
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 mb-12 pb-10 border-b border-white/10">
        <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                     <span className="text-3xl font-bold text-white">GU</span>
                </div>
            </div>
            <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-4 border-black rounded-full"></div>
        </div>
        <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold text-white mb-1">Guest User</h1>
            <p className="text-white/40 text-sm">Member since {new Date().getFullYear()}</p>
            <div className="flex gap-2 mt-3 justify-center md:justify-start">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Free Plan
                </span>
                <span className="bg-white/5 text-white/60 border border-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    {stats.episodeCount > 5 ? 'Power Listener' : 'Explorer'}
                </span>
            </div>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
         <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center gap-6 backdrop-blur-sm">
             <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
             </div>
             <div>
                 <div className="text-3xl font-bold text-white">{stats.totalMinutes}</div>
                 <div className="text-xs font-bold uppercase tracking-wider text-white/40">Total Minutes</div>
             </div>
         </div>

         <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex items-center gap-6 backdrop-blur-sm">
             <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                 </svg>
             </div>
             <div>
                 <div className="text-3xl font-bold text-white">{stats.episodeCount}</div>
                 <div className="text-xs font-bold uppercase tracking-wider text-white/40">Episodes Played</div>
             </div>
         </div>
      </div>

      {/* Analytics Section */}
      <h2 className="text-xl font-bold text-white mb-6">Knowledge Profile</h2>
      <div className="bg-black/20 rounded-2xl border border-white/10 p-8 grid grid-cols-1 lg:grid-cols-2 gap-12 backdrop-blur-sm">
         
         {/* Left: Circular Graph (Interest Repartition) */}
         <div className="flex flex-col items-center">
             <div className="relative mb-6">
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
                    {/* Background Circle */}
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.1)" 
                        strokeWidth={strokeWidth}
                    />
                    
                    {/* Data Segments */}
                    {chartData.length > 0 ? (
                        chartData.map((seg, i) => {
                            const dashArray = `${seg.percent * circumference} ${circumference}`;
                            const dashOffset = -seg.start * circumference;
                            return (
                                <circle
                                    key={i}
                                    cx={size / 2}
                                    cy={size / 2}
                                    r={radius}
                                    fill="none"
                                    stroke={seg.color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="round" // Optional: makes segment ends round
                                    className="transition-all duration-1000 ease-out animate-in fade-in"
                                />
                            );
                        })
                    ) : (
                        // Empty State Ring
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth={strokeWidth}
                            strokeDasharray="4 8"
                            className="opacity-50"
                        />
                    )}
                </svg>
                
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold text-white">{stats.totalMinutes}</span>
                    <span className="text-[10px] uppercase text-white/40 font-bold tracking-widest">Mins</span>
                </div>
             </div>

             {/* Legend */}
             <div className="w-full grid grid-cols-2 gap-3">
                 {chartData.length > 0 ? chartData.map(seg => (
                     <div key={seg.label} className="flex items-center gap-2">
                         <span className={`w-3 h-3 rounded-full ${seg.twColor}`}></span>
                         <span className="text-sm text-white/80 font-medium">{seg.label}</span>
                         <span className="text-xs text-white/40 ml-auto">{Math.round(seg.percent * 100)}%</span>
                     </div>
                 )) : (
                     <p className="col-span-2 text-center text-white/40 text-sm italic">No data yet. Listen to episodes to see your breakdown.</p>
                 )}
             </div>
         </div>

         {/* Right: Maximize Awareness (Gap Analysis) */}
         <div className="flex flex-col border-t lg:border-t-0 lg:border-l border-white/10 pt-8 lg:pt-0 lg:pl-12">
             <div className="mb-4">
                 <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400">
                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                    </svg>
                    Maximize Awareness
                 </h3>
                 <p className="text-sm text-white/40">
                    Expand your horizons. You have blind spots in these areas. Listen to an episode to fill your knowledge gaps.
                 </p>
             </div>

             <div className="space-y-3 flex-1">
                 {awarenessGaps.map(topic => (
                     <div key={topic.id} className="group flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                         <div className="flex items-center gap-3">
                             <div className={`w-2 h-10 rounded-full ${topic.color ? `bg-${topic.color}-600` : 'bg-white/40'}`}></div>
                             <div>
                                 <div className="font-bold text-white/90">{topic.name}</div>
                                 <div className="text-xs text-white/40">Unexplored Territory</div>
                             </div>
                         </div>
                         <button
                            onClick={() => onSelectTopic(topic.id)}
                            className="bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                         >
                            Listen
                         </button>
                     </div>
                 ))}
                 {awarenessGaps.length === 0 && (
                     <div className="text-center p-4 border border-dashed border-white/20 rounded-xl">
                         <p className="text-emerald-400 text-sm font-bold">You are a polymath!</p>
                         <p className="text-white/40 text-xs">Your listening history is perfectly balanced.</p>
                     </div>
                 )}
             </div>
         </div>
      </div>
    </div>
  );
};
