
import React from 'react';

export enum Speaker {
  Host1 = 'Alex',
  Host2 = 'Jamie'
}

export interface ScriptLine {
  speaker: string;
  text: string;
}

export interface PodcastScript {
  title: string;
  topic: string;
  summary: string;
  digest: string; // Detailed article/summary of the content
  lines: ScriptLine[];
}

export interface SourceFile {
  name: string;
  data: string; // Base64 string without prefix
  mimeType: string;
}

export interface PodcastEpisode {
  id: string;
  script: PodcastScript;
  audioSegments: string[]; // Changed from single URL to array of segments
  createdAt: Date;
  category: string;
  customImage?: string; // Optional custom cover image (base64)
}

export interface NewsTopic {
  id: string;
  name: string;
  description?: string;
  rssUrls: string[];
  isCustom: boolean;
  icon?: React.ReactNode; // Optional custom icon, otherwise default
  isLoading?: boolean; // Track if background RSS discovery is in progress
  color?: string; // Optional theme color for the card
  customImage?: string; // Optional custom generated image for the topic
}

export interface UpcomingEvent {
  date: string;
  title: string;
  topic: string;
  description: string;
}

export type GenerationStatus = 'idle' | 'scripting' | 'synthesizing' | 'complete' | 'error';
export type AppView = 'custom' | 'news' | 'library' | 'details' | 'profile' | 'events';

export interface AppState {
  view: AppView;
  previousView: AppView | null; // Track history for back button
  inputText: string;
  sourceFile: SourceFile | null;
  script: PodcastScript | null;
  audioSegments: string[]; // Queue of audio URLs
  isGeneratingAudio: boolean; // Track if background generation is active
  status: GenerationStatus;
  error: string | null;
  notification: string | null; // Notification/Toast message
  currentEpisodeId: string | null;
  activeCategory: string | null; // Explicitly track the active category for UI display
  customCoverUrl?: string; // Track custom generated cover for current playback
  library: PodcastEpisode[];
  topics: NewsTopic[]; // List of available news topics
  upcomingEvents: UpcomingEvent[]; // Cache for the events tab
  isEventsLoading: boolean; // Track if events are currently being fetched
}
