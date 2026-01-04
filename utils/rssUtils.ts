
import { NewsTopic } from '../types';

export type NewsCategory = 'finance' | 'medicine' | 'space' | 'science' | 'politics' | 'sports';

/**
 * Utility to fetch and parse RSS feeds for the News feature.
 * Uses a CORS proxy to fetch feeds from the browser.
 */

interface RssItem {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
}

// Defined feeds for each category
export const DEFAULT_TOPICS: NewsTopic[] = [
  {
    id: 'finance',
    name: 'Finance',
    isCustom: false,
    color: 'emerald',
    rssUrls: [
      'https://finance.yahoo.com/news/rssindex',
      'https://www.investing.com/rss/news.rss',
      'https://feeds.content.dowjones.io/public/rss/mw_topstories'
    ]
  },
  {
    id: 'medicine',
    name: 'Medicine',
    isCustom: false,
    color: 'rose',
    rssUrls: [
      'https://www.sciencedaily.com/rss/health_medicine.xml',
      'https://www.medpagetoday.com/rss/headlines.xml'
    ]
  },
  {
    id: 'space',
    name: 'Space',
    isCustom: false,
    color: 'indigo',
    rssUrls: [
      'https://spacenews.com/feed/',
      'https://www.space.com/feeds/all'
    ]
  },
  {
    id: 'science',
    name: 'Sciences',
    isCustom: false,
    color: 'amber', 
    rssUrls: [
      'https://www.sciencedaily.com/rss/all.xml',
      'https://www.wired.com/feed/category/science/latest/rss',
      'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml'
    ]
  },
  {
    id: 'politics',
    name: 'Politics',
    isCustom: false,
    color: 'red',
    rssUrls: [
      'http://rss.cnn.com/rss/cnn_allpolitics.rss',
      'https://feeds.npr.org/1014/rss.xml',
      'https://www.diplomatie.gouv.fr/spip.php?page=backend-fd&lang=en'
    ]
  },
  {
    id: 'sports',
    name: 'Sports',
    isCustom: false,
    color: 'blue',
    rssUrls: [
      'https://www.espn.com/espn/rss/news',
      'https://sports.yahoo.com/rss/',
      'http://feeds.bbci.co.uk/sport/rss.xml'
    ]
  }
];

// Use allorigins to bypass CORS restrictions in the browser
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const parseDate = (dateStr: string): Date => {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? new Date() : date;
};

const fetchFeed = async (url: string): Promise<RssItem[]> => {
  try {
    const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
    if (!response.ok) throw new Error(`Failed to fetch ${url}`);
    
    const text = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    
    const items = Array.from(xml.querySelectorAll('item'));
    
    return items.map(item => ({
      title: item.querySelector('title')?.textContent || '',
      description: item.querySelector('description')?.textContent?.replace(/<[^>]*>/g, '') || '', // Strip HTML
      pubDate: parseDate(item.querySelector('pubDate')?.textContent || ''),
      link: item.querySelector('link')?.textContent || ''
    }));
  } catch (error) {
    console.warn(`Error fetching feed ${url}:`, error);
    return [];
  }
};

/**
 * Checks if a feed URL is accessible and returns valid content via the proxy.
 * Returns true if valid, false otherwise.
 */
const checkFeedHealth = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`);
        if (!response.ok) return false;
        
        const text = await response.text();
        const trimmedText = text.trim();
        const lowerText = trimmedText.toLowerCase();

        // Guard: explicitly reject standard HTML pages (landing pages, 404s)
        if (lowerText.startsWith('<!doctype html') || lowerText.startsWith('<html')) {
            return false;
        }

        // Basic check for XML content markers
        return lowerText.includes('<rss') || lowerText.includes('<feed') || lowerText.includes('<?xml');
    } catch (e) {
        return false;
    }
};

/**
 * Validates a list of candidate URLs and returns up to `limit` working ones.
 * Uses batch processing to validate efficiently.
 */
export const getValidFeeds = async (candidates: string[], limit: number = 3): Promise<string[]> => {
    const valid: string[] = [];
    const BATCH_SIZE = 5;
    
    // Process in batches to balance speed and concurrency limits
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
        if (valid.length >= limit) break; // Stop if we have enough

        const batch = candidates.slice(i, i + BATCH_SIZE);
        
        // Check current batch in parallel
        const results = await Promise.all(
            batch.map(async (url) => {
                const isHealthy = await checkFeedHealth(url);
                return { url, isHealthy };
            })
        );

        // Collect valid URLs from this batch
        for (const res of results) {
            if (res.isHealthy && !valid.includes(res.url)) {
                valid.push(res.url);
                if (valid.length >= limit) break;
            }
        }
    }
    
    return valid;
};

export const fetchNewsForTopic = async (urls: string[]): Promise<string> => {
  const allItems: RssItem[] = [];

  // Fetch all feeds in parallel
  const results = await Promise.all(urls.map(url => fetchFeed(url)));
  results.forEach(items => allItems.push(...items));

  // Filter for last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentItems = allItems.filter(item => item.pubDate >= sevenDaysAgo);

  // Sort by date (newest first)
  recentItems.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  // Deduplicate by title (simple check)
  const uniqueItems = recentItems.filter((item, index, self) => 
    index === self.findIndex((t) => t.title === item.title)
  );

  // OPTIMIZATION: Limit to top 12 items to save tokens while keeping diversity
  const topItems = uniqueItems.slice(0, 12);

  if (topItems.length === 0) {
    throw new Error("No recent news found for this topic in the last 7 days.");
  }

  // OPTIMIZATION: Use compact format to reduce input tokens
  // Format: [YYYY-MM-DD] TITLE: SUMMARY
  return topItems.map(item => {
    const dateStr = item.pubDate.toISOString().split('T')[0];
    const cleanTitle = item.title.trim();
    // OPTIMIZATION: Truncate summary to 180 chars
    const cleanSummary = item.description.slice(0, 180).trim().replace(/\s+/g, ' '); 
    return `[${dateStr}] ${cleanTitle}: ${cleanSummary}...`;
  }).join('\n');
};
