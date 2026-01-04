import React from 'react';
import { PodcastEpisode } from '../types';
import { getImageUrl } from '../utils/imageUtils';

interface LibraryViewProps {
  episodes: PodcastEpisode[];
  onSelectEpisode: (episode: PodcastEpisode) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ episodes, onSelectEpisode }) => {
  if (episodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 py-20">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white/20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Library is Empty</h2>
        <p className="text-white/40 max-w-md">
          Generated podcasts will appear here. Start by creating a custom podcast or selecting a news topic.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white">Your Episodes</h2>
        <span className="text-sm text-white/40">{episodes.length} episodes</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {episodes.map((episode) => (
          <div 
            key={episode.id}
            onClick={() => onSelectEpisode(episode)}
            className="group bg-black/20 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all cursor-pointer hover:bg-white/5"
          >
            <div className="aspect-video relative overflow-hidden">
                <img 
                    src={episode.customImage || getImageUrl(episode.category)} 
                    alt={episode.script.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                    <span className="px-2 py-1 rounded bg-indigo-500/80 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
                        {episode.category || 'Custom'}
                    </span>
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-0.5">
                            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
            
            <div className="p-5">
                <div className="text-xs text-white/40 mb-2 font-mono">
                    {new Date(episode.createdAt).toLocaleDateString()}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-indigo-300 transition-colors">
                    {episode.script.title}
                </h3>
                <p className="text-sm text-white/50 line-clamp-2 mb-4 leading-relaxed">
                    {episode.script.summary}
                </p>
                <div className="flex items-center gap-2 text-xs font-medium text-white/40">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{Math.ceil(episode.script.lines.reduce((acc, l) => acc + l.text.split(' ').length, 0) / 150)} min listen</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};