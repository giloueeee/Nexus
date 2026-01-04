
import React, { useMemo } from 'react';
import { PodcastEpisode } from '../types';
import { DEFAULT_TOPICS } from '../utils/rssUtils';

interface InsightsViewProps {
  episodes: PodcastEpisode[];
  onSelectTopic: (topicId: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ episodes, onSelectTopic }) => {
  
  // Calculate Stats
  const stats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter episodes from the last week
    const recentEpisodes = episodes.filter(ep => ep.createdAt >= oneWeekAgo);
    
    const categoryStats: Record<string, number> = {};
    let totalMinutes = 0;

    recentEpisodes.forEach(ep => {
      // Estimate duration: word count / 150 wpm
      const wordCount = ep.script.lines.reduce((acc, line) => acc + line.text.split(' ').length, 0);
      const minutes = Math.ceil(wordCount / 150);
      
      totalMinutes += minutes;
      
      const cat = ep.category || 'Custom';
      categoryStats[cat] = (categoryStats[cat] || 0) + minutes;
    });

    return { totalMinutes, categoryStats, episodeCount: recentEpisodes.length };
  }, [episodes]);

  // Generate Recommendation
  const recommendation = useMemo(() => {
    // Find default topics that haven't been listened to much
    const listenedCategories = Object.keys(stats.categoryStats).map(k => k.toLowerCase());
    
    const neglectedTopic = DEFAULT_TOPICS.find(t => !listenedCategories.includes(t.name.toLowerCase()));
    
    if (neglectedTopic) {
        return {
            topic: neglectedTopic,
            reason: `You haven't listened to much ${neglectedTopic.name} lately. Diversify your knowledge!`
        };
    }
    
    // Fallback if they listened to everything
    return {
        topic: DEFAULT_TOPICS[0],
        reason: "Keep staying updated with the latest Finance news."
    };
  }, [stats]);

  const maxMinutes = Math.max(...(Object.values(stats.categoryStats) as number[]), 1);

  return (
    <div className="h-full bg-slate-900 rounded-2xl border border-slate-800 p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Weekly Insights</h2>
        <p className="text-slate-400">Track your learning journey over the last 7 days.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
         {/* Total Time Card */}
         <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 p-6 rounded-2xl">
             <div className="text-indigo-400 mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                 </svg>
             </div>
             <div className="text-4xl font-bold text-white mb-1">{stats.totalMinutes} <span className="text-lg font-medium text-slate-400">min</span></div>
             <div className="text-sm text-indigo-200/60">Total Listening Time</div>
         </div>

         {/* Episodes Count */}
         <div className="bg-gradient-to-br from-purple-900/40 to-slate-900 border border-purple-500/30 p-6 rounded-2xl">
             <div className="text-purple-400 mb-2">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                 </svg>
             </div>
             <div className="text-4xl font-bold text-white mb-1">{stats.episodeCount}</div>
             <div className="text-sm text-purple-200/60">Episodes Completed</div>
         </div>
         
         {/* Recommendation */}
         <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 p-6 rounded-2xl relative overflow-hidden">
             <div className="relative z-10">
                 <div className="text-emerald-400 mb-2 font-bold uppercase tracking-wider text-xs">Recommended for you</div>
                 <h3 className="text-xl font-bold text-white mb-2">{recommendation.topic.name}</h3>
                 <p className="text-sm text-slate-300 mb-4 line-clamp-2">{recommendation.reason}</p>
                 <button 
                    onClick={() => onSelectTopic(recommendation.topic.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                 >
                     Create Podcast
                 </button>
             </div>
         </div>
      </div>

      <div className="bg-slate-950/50 rounded-xl border border-slate-800 p-8">
         <h3 className="text-lg font-bold text-white mb-6">Listening Breakdown</h3>
         
         <div className="space-y-6">
             {Object.keys(stats.categoryStats).length === 0 ? (
                 <p className="text-slate-500 italic text-center py-4">No listening history this week.</p>
             ) : (
                 (Object.entries(stats.categoryStats) as [string, number][])
                 .sort(([, a], [, b]) => b - a)
                 .map(([category, minutes]) => (
                     <div key={category}>
                         <div className="flex justify-between text-sm mb-2">
                             <span className="font-medium text-slate-300 capitalize">{category}</span>
                             <span className="text-slate-500">{minutes} min</span>
                         </div>
                         <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
                             <div 
                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                style={{ width: `${(minutes / maxMinutes) * 100}%` }}
                             ></div>
                         </div>
                     </div>
                 ))
             )}
         </div>
      </div>
    </div>
  );
};
