
import React, { useEffect, useState, useMemo } from 'react';
import { UpcomingEvent, NewsTopic } from '../types';

interface EventsViewProps {
  events: UpcomingEvent[];
  topics: NewsTopic[];
  onGenerateEvents: () => Promise<void>;
  isLoading?: boolean;
}

export const EventsView: React.FC<EventsViewProps> = ({ events, topics, onGenerateEvents, isLoading = false }) => {
  const [localLoading, setLocalLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  useEffect(() => {
    // Only auto-fetch if we have no events AND the parent app isn't already loading them in background.
    // This prevents double-fetching when user navigates to this tab.
    if (events.length === 0 && topics.length > 0 && !isLoading) {
      handleRefresh();
    }
  }, []);

  const handleRefresh = async () => {
    setLocalLoading(true);
    await onGenerateEvents();
    setLocalLoading(false);
  };

  // Combine parent loading state with local loading state
  const isBusy = isLoading || localLoading;

  const toggleFilter = (topicName: string) => {
    setActiveFilters(prev => 
        prev.includes(topicName) 
        ? prev.filter(t => t !== topicName) 
        : [...prev, topicName]
    );
  };

  const filteredEvents = useMemo(() => {
      if (activeFilters.length === 0) return events;
      return events.filter(event => {
          // Case-insensitive check to be safe
          return activeFilters.some(filter => event.topic.toLowerCase() === filter.toLowerCase());
      });
  }, [events, activeFilters]);

  const getTopicColorClass = (topicName: string) => {
     const topic = topics.find(t => t.name === topicName);
     if (topic?.color) {
         return `bg-${topic.color}-500`;
     }
     // Fallback
     return 'bg-indigo-500';
  };

  const getTopicBorderClass = (topicName: string) => {
      const topic = topics.find(t => t.name === topicName);
      if (topic?.color) {
          return `border-${topic.color}-500`;
      }
      return 'border-indigo-500';
   };

  return (
    <div className="h-full p-8 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2">Upcoming Events</h2>
            <p className="text-white/50">Major events happening in your interest areas over the next 30 days.</p>
        </div>
        <button 
            onClick={handleRefresh}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg transition-colors border border-white/10 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isBusy ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            )}
            Refresh Events
        </button>
      </div>

      {/* Topic Filters */}
      <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-white/10">
        <button
            onClick={() => setActiveFilters([])}
            className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                ${activeFilters.length === 0 
                    ? 'bg-white text-black border-white' 
                    : 'bg-black/40 text-white/50 border-white/10 hover:border-white/20'
                }
            `}
        >
            All Topics
        </button>
        {topics.map(topic => {
            const isActive = activeFilters.includes(topic.name);
            const activeClass = topic.color 
                ? `bg-${topic.color}-600 text-white border-${topic.color}-500`
                : 'bg-indigo-600 text-white border-indigo-500';

            return (
                <button
                    key={topic.id}
                    onClick={() => toggleFilter(topic.name)}
                    className={`
                        px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                        ${isActive
                            ? activeClass
                            : 'bg-black/40 text-white/50 border-white/10 hover:border-white/20'
                        }
                    `}
                >
                    {topic.name}
                </button>
            );
        })}
      </div>

      {isBusy && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-pulse flex flex-col items-center gap-4 w-full max-w-lg">
                  <div className="h-24 w-full bg-white/5 rounded-xl"></div>
                  <div className="h-24 w-full bg-white/5 rounded-xl"></div>
                  <div className="h-24 w-full bg-white/5 rounded-xl"></div>
              </div>
              <p className="text-white/40 mt-4 text-sm font-medium">Gathering upcoming events with Gemini...</p>
          </div>
      ) : (
          <div className="relative border-l border-white/10 ml-3 space-y-8 pb-10">
              {filteredEvents.length > 0 ? (
                  filteredEvents.map((event, index) => (
                      <div key={index} className="ml-8 relative group animate-in slide-in-from-left-4 fade-in duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                          {/* Timeline Dot */}
                          <span className={`
                            absolute -left-[41px] top-1 h-5 w-5 rounded-full border-4 border-black 
                            ${getTopicColorClass(event.topic)} group-hover:scale-125 transition-transform
                          `}></span>
                          
                          <div className={`bg-black/30 p-6 rounded-xl border border-white/10 hover:${getTopicBorderClass(event.topic)}/50 transition-colors shadow-lg backdrop-blur-sm`}>
                              <div className="flex items-center gap-3 mb-2">
                                  <span className="text-sm font-mono text-indigo-400 font-bold flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                    </svg>
                                    {event.date}
                                  </span>
                                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded text-white ${getTopicColorClass(event.topic)} bg-opacity-80`}>
                                      {event.topic}
                                  </span>
                              </div>
                              <h3 className="text-xl font-bold text-white mb-2">{event.title}</h3>
                              <p className="text-white/60 text-sm leading-relaxed">{event.description}</p>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="ml-8 p-8 border border-dashed border-white/10 rounded-xl text-center">
                     <p className="text-white/50 mb-2">No events found matching your selected filters.</p>
                     <button 
                        onClick={() => setActiveFilters([])}
                        className="text-indigo-400 hover:text-white text-sm font-bold"
                     >
                        Clear Filters
                     </button>
                  </div>
              )}
          </div>
      )}
      
      {!isBusy && events.length === 0 && (
          <div className="text-center py-10 text-white/40">
              No events found. Try refreshing to generate a list.
          </div>
      )}
    </div>
  );
};
