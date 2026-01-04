
import React, { useState, useEffect } from 'react';
import { NewsTopic } from '../types';
import { GenerationStatus } from '../types';

interface NewsSelectorProps {
  topics: NewsTopic[];
  onSelect: (topic: NewsTopic) => void;
  onAddTopic: (name: string, description: string, color?: string) => Promise<void>;
  onUpdateTopic: (id: string, newName: string, newRssUrls: string[], newColor?: string) => void;
  onDeleteTopic: (id: string) => void;
  onStop: () => void;
  status: GenerationStatus;
  isSplitView: boolean;
  activeCategory?: string | null;
  audioSegmentCount?: number;
}

const AVAILABLE_COLORS = ['slate', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
const PRIMARY_COLORS = ['slate', 'red', 'amber', 'emerald', 'blue', 'indigo', 'purple', 'rose'];

export const NewsSelector: React.FC<NewsSelectorProps> = ({ 
    topics, 
    onSelect, 
    onAddTopic, 
    onUpdateTopic, 
    onDeleteTopic, 
    onStop, 
    status,
    isSplitView,
    activeCategory,
    audioSegmentCount = 0
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTopic, setEditingTopic] = useState<NewsTopic | null>(null);
  
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newTopicColor, setNewTopicColor] = useState('slate');
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [showColorPickerAdd, setShowColorPickerAdd] = useState(false);

  const [editName, setEditName] = useState('');
  const [editRssUrls, setEditRssUrls] = useState<string[]>([]);
  const [editColor, setEditColor] = useState('slate');
  const [newRssInput, setNewRssInput] = useState('');
  const [showColorPickerEdit, setShowColorPickerEdit] = useState(false);

  const [showPartInfo, setShowPartInfo] = useState(false);
  const isProcessing = status === 'scripting' || status === 'synthesizing';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isProcessing) {
        interval = setInterval(() => {
            setShowPartInfo(prev => !prev);
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleGenerate = () => {
    if (selectedId) {
        const topic = topics.find(t => t.id === selectedId);
        if (topic) onSelect(topic);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim() || !newTopicDesc.trim()) return;

    setIsAddingTopic(true);
    try {
        await onAddTopic(newTopicName, newTopicDesc, newTopicColor);
        setShowAddModal(false);
        setNewTopicName('');
        setNewTopicDesc('');
        setNewTopicColor('slate');
        setShowColorPickerAdd(false);
    } catch (e) {
        alert("Failed to create topic. Please try again.");
    } finally {
        setIsAddingTopic(false);
    }
  };

  const openSettings = (e: React.MouseEvent, topic: NewsTopic) => {
    e.stopPropagation();
    setEditingTopic(topic);
    setEditName(topic.name);
    setEditRssUrls([...topic.rssUrls]);
    setEditColor(topic.color || 'slate');
    setNewRssInput('');
    setShowColorPickerEdit(false);
  };

  const handleUpdate = () => {
    if(editingTopic && editName.trim()) {
      onUpdateTopic(editingTopic.id, editName, editRssUrls, editColor);
      setEditingTopic(null);
    }
  };

  const handleDelete = () => {
    if(editingTopic) {
      if(selectedId === editingTopic.id) setSelectedId(null);
      onDeleteTopic(editingTopic.id);
      setEditingTopic(null);
    }
  };

  const removeRssUrl = (index: number) => {
      const newUrls = [...editRssUrls];
      newUrls.splice(index, 1);
      setEditRssUrls(newUrls);
  };

  const updateRssUrl = (index: number, val: string) => {
      const newUrls = [...editRssUrls];
      newUrls[index] = val;
      setEditRssUrls(newUrls);
  };

  const addRssUrl = () => {
      if (newRssInput.trim()) {
          setEditRssUrls([...editRssUrls, newRssInput.trim()]);
          setNewRssInput('');
      }
  };

  const getGradient = (color: string) => {
     switch(color) {
         case 'indigo': return 'from-indigo-600/40 to-blue-600/10 hover:border-indigo-500';
         case 'emerald': return 'from-emerald-600/40 to-teal-600/10 hover:border-emerald-500';
         case 'rose': return 'from-rose-600/40 to-pink-600/10 hover:border-rose-500';
         case 'amber': return 'from-amber-600/40 to-orange-600/10 hover:border-amber-500';
         case 'purple': return 'from-purple-600/40 to-fuchsia-600/10 hover:border-purple-500';
         case 'blue': return 'from-blue-600/40 to-cyan-600/10 hover:border-blue-500';
         case 'red': return 'from-red-600/40 to-orange-600/10 hover:border-red-500';
         default: return `from-${color}-600/40 to-${color}-600/5 hover:border-${color}-400`;
     }
  };

  const getSelectedStyle = (color: string) => {
      const rgbMap: Record<string, string> = {
          slate: '148,163,184',
          red: '239,68,68',
          orange: '249,115,22',
          amber: '245,158,11',
          yellow: '234,179,8',
          lime: '132,204,22',
          green: '34,197,94',
          emerald: '16,185,129',
          teal: '20,184,166',
          cyan: '6,182,212',
          sky: '14,165,233',
          blue: '59,130,246',
          indigo: '99,102,241',
          violet: '139,92,246',
          purple: '168,85,247',
          fuchsia: '217,70,239',
          pink: '236,72,153',
          rose: '244,63,94'
      };
      const rgb = rgbMap[color] || '148,163,184';
      return `border-${color}-400 ring-2 ring-${color}-500/30 bg-white/10 scale-[1.02] shadow-[0_0_40px_rgba(${rgb},0.3)] z-10`;
  };

  const getTopicIconSvg = (id: string) => {
    switch (id) {
        case 'finance':
            return <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />;
        case 'medicine':
            return <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />;
        case 'space':
            return <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />;
        case 'science':
            return <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />;
        case 'politics':
            return <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />;
        case 'sports':
            return <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />;
        default:
            return <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />;
    }
  };

  const getIcon = (topic: NewsTopic) => {
      if (topic.isLoading) {
          return (
             <svg className="animate-spin h-8 w-8 text-white/50" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
          );
      }
      return (
        <div className={`p-3 rounded-xl bg-white/5 border border-white/10 shadow-inner inline-block`}>
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                {getTopicIconSvg(topic.id)}
           </svg>
        </div>
      );
  };

  const renderColorOptions = (currentColor: string, onSelect: (c: string) => void, isOpen: boolean, setIsOpen: (v: boolean) => void) => {
    let visibleColors = isOpen ? AVAILABLE_COLORS : PRIMARY_COLORS;

    return (
        <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
            {visibleColors.map(c => (
                <button
                    key={c}
                    type="button"
                    onClick={() => onSelect(c)}
                    className={`w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110 ${currentColor === c ? 'ring-2 ring-white scale-110' : ''} bg-${c}-500`}
                    title={c}
                >
                </button>
            ))}
            {!isOpen && (
                <button
                    type="button"
                    onClick={() => setIsOpen(true)}
                    className="w-6 h-6 rounded-full border border-white/20 bg-white/10 text-white/50 hover:text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                    title="More Colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                    </svg>
                </button>
            )}
        </div>
    );
  };

  return (
    <div className={`
        flex flex-col transition-all duration-500
        ${!isSplitView ? 'max-w-6xl mx-auto w-full' : 'w-full'}
    `}>
      
      <div className="flex-1 bg-glass backdrop-blur-xl rounded-3xl border border-glass-border shadow-2xl relative p-5 flex flex-col min-h-0">
      
      {isProcessing && (
        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 transition-all rounded-3xl">
          <div className="w-full max-w-lg bg-black/80 backdrop-blur-md rounded-2xl border border-white/10 p-8 flex flex-col items-center">
            <div className="relative flex h-12 w-12 flex-shrink-0 mb-6">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-40"></span>
                <span className="relative inline-flex rounded-full h-12 w-12 bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"></span>
            </div>
            <div className="w-full flex flex-col items-center gap-3 mb-8">
                 <div className="relative w-full h-8 flex items-center justify-center">
                    <p className={`text-xl text-white font-bold absolute transition-all duration-700 w-full text-center ${showPartInfo ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                        {activeCategory ? `${activeCategory} Podcast Generating...` : 'Generating Podcast...'}
                    </p>
                    <p className={`text-xl text-white font-bold absolute transition-all duration-700 w-full text-center ${showPartInfo ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                        Processing Part {audioSegmentCount + 1}...
                    </p>
                 </div>
                 <p className="text-sm text-white/50 font-medium">Please wait while AI creates your content</p>
            </div>
            <button 
                onClick={onStop}
                className="px-8 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold uppercase tracking-wide"
            >
                Stop Generation
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 w-full">
        <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-2">Weekly Roundup</h2>
            <p className="text-sm text-white/50 max-w-lg">
            Select a topic to generate a comprehensive podcast covering news from the last 7 days.
            </p>
        </div>

        <div className={`grid gap-3 mb-4 ${isSplitView ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
            {topics.map((topic) => {
            const isSelected = selectedId === topic.id;
            const gradientClass = getGradient(topic.color || 'slate');
            
            return (
                <button
                key={topic.id}
                onClick={() => !isProcessing && setSelectedId(topic.id)}
                disabled={isProcessing}
                className={`
                    group relative p-4 rounded-2xl border text-left transition-all duration-300 bg-gradient-to-br h-full min-h-[115px] flex flex-col
                    ${gradientClass}
                    ${isSelected 
                        ? getSelectedStyle(topic.color || 'slate')
                        : 'border-white/5 bg-white/5 hover:bg-white/10 hover:shadow-xl'
                    }
                    ${isProcessing ? 'opacity-50 cursor-not-allowed grayscale' : ''}
                `}
                >
                <div className="mb-4 flex justify-between items-start">
                    {getIcon(topic)}
                    
                    <div className="flex items-center gap-2">
                        <div 
                            onClick={(e) => openSettings(e, topic)}
                            className={`p-2 rounded-full transition-all ${isSelected ? 'text-white/80 hover:text-white bg-black/20' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                            </svg>
                        </div>
                    </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{topic.name}</h3>
                <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">
                    {topic.isLoading ? 'Discovering sources...' : (topic.description || 'Latest updates')}
                </p>
                </button>
            );
            })}

            <button
                onClick={() => { setShowAddModal(true); setShowColorPickerAdd(false); }}
                disabled={isProcessing}
                className="group flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30 transition-all cursor-pointer h-full min-h-[70px]"
            >
                <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center mb-2 transition-colors border border-white/5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-white/50 group-hover:text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                </div>
                <span className="text-xs font-bold text-white/50 group-hover:text-white">New Topic</span>
            </button>
        </div>

        <div className="mt-auto flex justify-center pt-1">
            {!isProcessing && (
                <button
                    onClick={handleGenerate}
                    disabled={!selectedId}
                    className={`
                        w-full md:w-auto md:px-16 py-2.5 rounded-xl font-bold text-lg shadow-xl transition-all duration-300 flex items-center justify-center gap-2 border border-white/10
                        ${!selectedId 
                        ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:brightness-110 hover:-translate-y-0.5'
                        }
                    `}
                >
                    <span>Generate Podcast</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                </button>
            )}
        </div>
      </div>

      {showAddModal && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200 rounded-3xl">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
                  <h3 className="text-2xl font-bold text-white mb-6">Create Topic</h3>
                  <form onSubmit={handleCreateTopic} className="space-y-6">
                      <div>
                          <label className="block text-xs font-bold text-white/40 uppercase mb-2">Topic Name</label>
                          <input 
                              type="text" 
                              value={newTopicName}
                              onChange={(e) => setNewTopicName(e.target.value)}
                              placeholder="e.g. Artificial Intelligence"
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                              autoFocus
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-white/40 uppercase mb-2">Description</label>
                          <textarea 
                              value={newTopicDesc}
                              onChange={(e) => setNewTopicDesc(e.target.value)}
                              placeholder="Describe your interests..."
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none h-24"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-white/40 uppercase mb-3">Accent Color</label>
                          {renderColorOptions(newTopicColor, setNewTopicColor, showColorPickerAdd, setShowColorPickerAdd)}
                      </div>
                      <div className="flex gap-4 pt-2">
                          <button 
                              type="button"
                              onClick={() => setShowAddModal(false)}
                              className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm font-bold"
                          >
                              Cancel
                          </button>
                          <button 
                              type="submit"
                              disabled={isAddingTopic || !newTopicName.trim() || !newTopicDesc.trim()}
                              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-sm font-bold disabled:opacity-50"
                          >
                              Create
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {editingTopic && (
          <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200 rounded-3xl">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-lg p-8 shadow-2xl relative flex flex-col max-h-[90%]">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-white">Settings</h3>
                      <button onClick={() => setEditingTopic(null)} className="text-white/40 hover:text-white">✕</button>
                  </div>
                  
                  <div className="space-y-6 overflow-y-auto pr-2 scrollbar-thin flex-1">
                      <div>
                          <label className="block text-xs font-bold text-white/40 uppercase mb-2">Name</label>
                          <input 
                              type="text" 
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              disabled={!editingTopic.isCustom}
                              className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none transition-colors ${!editingTopic.isCustom ? 'opacity-50 cursor-not-allowed' : 'focus:border-indigo-500'}`}
                          />
                      </div>

                      {editingTopic.isCustom && (
                          <div>
                              <label className="block text-xs font-bold text-white/40 uppercase mb-3">Color</label>
                              {renderColorOptions(editColor, setEditColor, showColorPickerEdit, setShowColorPickerEdit)}
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-white/40 uppercase mb-2">RSS Feeds</label>
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-3">
                             {editingTopic.isLoading ? (
                                 <div className="text-center py-4 text-white/40 text-sm">Validating feeds...</div>
                             ) : editRssUrls.length > 0 ? (
                                editRssUrls.map((url, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-black/20 p-2 rounded-lg border border-white/5">
                                        <input 
                                          type="text"
                                          value={url}
                                          onChange={(e) => updateRssUrl(i, e.target.value)}
                                          className="flex-1 bg-transparent text-xs text-white/80 focus:outline-none"
                                        />
                                        <button onClick={() => removeRssUrl(i)} className="text-white/30 hover:text-red-400">✕</button>
                                    </div>
                                ))
                             ) : (
                                <div className="text-xs text-white/30 italic p-2 text-center">AI Fallback Enabled</div>
                             )}

                             <div className="flex gap-2 pt-2 border-t border-white/10">
                                <input 
                                  type="text"
                                  value={newRssInput}
                                  onChange={(e) => setNewRssInput(e.target.value)}
                                  placeholder="Add RSS URL..."
                                  className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                                  onKeyDown={(e) => e.key === 'Enter' && addRssUrl()}
                                />
                                <button onClick={addRssUrl} disabled={!newRssInput.trim()} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs transition-colors">Add</button>
                             </div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="flex gap-4 mt-8 pt-6 border-t border-white/10">
                      {editingTopic.isCustom && (
                        <button onClick={handleDelete} className="px-6 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors text-sm font-bold">Delete</button>
                      )}
                      <div className="flex-1"></div>
                      <button onClick={() => setEditingTopic(null)} className="px-6 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-colors text-sm font-bold">Cancel</button>
                      <button onClick={handleUpdate} className="px-8 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition-colors text-sm font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}
      </div>
    </div>
  );
};
