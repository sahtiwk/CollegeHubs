import { db } from '../db';
import { roadmapSourceCache, contentItem, skillNode } from '../db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

import * as cheerio from 'cheerio';

export interface ContentItemInsert {
  id: string;
  source: 'roadmap_sh' | 'wikipedia' | 'youtube' | 'manual';
  title: string;
  url: string;
  description: string;
  domain: 'backend' | 'frontend' | 'data_science' | 'dsa' | 'devops';
  topicTags: string[];
}

export class RoadmapAdapter {
  /**
   * Scrapes roadmap.sh HTML to extract valid external learning links
   */
  private static async scrapeRoadmap(slug: string): Promise<Partial<ContentItemInsert>[]> {
    const url = `https://roadmap.sh/${slug}`;
    console.log(`Scraping live roadmap: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch roadmap.sh: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const items: Partial<ContentItemInsert>[] = [];

    // Extract links
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      
      if (href && href.startsWith('http') && !href.includes('roadmap.sh') && title) {
        // Filter out header social links
        const isSocial = href.includes('github.com/kamranahmedse') || 
                         href.includes('twitter.com') || 
                         href.includes('x.com') || 
                         href.includes('youtube.com') ||
                         href.includes('github.com/search');
                         
        if (!isSocial) {
          items.push({
            title,
            url: href,
            description: `Extracted from ${slug} roadmap`,
          });
        }
      }
    });

    return items;
  }

  /**
   * Fallback: Queries Wikipedia for broad domain topics
   */
  private static async fetchFromWikipediaFallback(slug: string): Promise<Partial<ContentItemInsert>[]> {
    console.log(`Using Wikipedia API fallback for ${slug}...`);
    
    // First try a specific query
    let searchQuery = slug.replace('_', ' ') + ' development';
    let url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=10&namespace=0&format=json`;
    
    let response = await fetch(url);
    if (!response.ok) throw new Error('Wikipedia API failed');
    let data = await response.json();
    
    // If no results, fallback to a broader generic query
    if (!data[1] || data[1].length === 0) {
      console.log(`No Wikipedia results for ${searchQuery}, falling back to broader term...`);
      searchQuery = 'Web development';
      url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=10&namespace=0&format=json`;
      response = await fetch(url);
      if (!response.ok) throw new Error('Wikipedia API failed');
      data = await response.json();
    }

    // data format: [ "Search Term", ["Title 1", "Title 2"], ["Desc 1", "Desc 2"], ["Link 1", "Link 2"] ]
    const titles = data[1] || [];
    const descriptions = data[2] || [];
    const links = data[3] || [];

    const items: Partial<ContentItemInsert>[] = [];
    for (let i = 0; i < titles.length; i++) {
      items.push({
        title: titles[i],
        description: descriptions[i] || `Wikipedia article about ${titles[i]}`,
        url: links[i],
      });
    }

    return items;
  }

  private static normalizeItems(slug: string, rawItems: Partial<ContentItemInsert>[], source: 'roadmap_sh' | 'wikipedia' | 'youtube'): ContentItemInsert[] {
    const items: ContentItemInsert[] = [];
    const domainMap: Record<string, 'frontend' | 'backend' | 'data_science' | 'dsa' | 'devops'> = {
      'frontend': 'frontend',
      'backend': 'backend',
      'devops': 'devops'
    };
    
    const domain = domainMap[slug] || 'frontend'; // Fallback to frontend
    
    for (const raw of rawItems) {
      if (raw.title && raw.url) {
        items.push({
          id: crypto.randomUUID(),
          source: source,
          title: raw.title,
          url: raw.url,
          description: raw.description || '',
          domain: domain,
          topicTags: [slug, raw.title.toLowerCase()]
        });
      }
    }

    return items;
  }

  private static deduplicateResources(items: ContentItemInsert[]): ContentItemInsert[] {
    const seenUrls = new Set<string>();
    const deduplicated: ContentItemInsert[] = [];
    
    for (const item of items) {
      if (!seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        deduplicated.push(item);
      }
    }
    
    return deduplicated;
  }

  public static async getTrajectory(slug: string) {
    // 1. Check cache
    const existingCache = await db.select().from(roadmapSourceCache).where(eq(roadmapSourceCache.trajectorySlug, slug)).limit(1);
    
    if (existingCache.length > 0) {
      console.log(`Cache hit for ${slug}`);
      return { success: true, cached: true };
    }

    // 2. Cache miss -> Scrape or Fallback
    console.log(`Cache miss for ${slug}, fetching...`);
    let rawItems: Partial<ContentItemInsert>[] = [];
    let sourceUsed: 'roadmap_sh' | 'wikipedia' = 'roadmap_sh';

    try {
      rawItems = await this.scrapeRoadmap(slug);
      if (rawItems.length === 0) throw new Error("No external links found in HTML.");
    } catch (e: any) {
      console.warn(`Scraping roadmap failed: ${e.message}. Falling back to Wikipedia.`);
      rawItems = await this.fetchFromWikipediaFallback(slug);
      sourceUsed = 'wikipedia';
    }

    const parsedItems = this.normalizeItems(slug, rawItems, sourceUsed);
    const uniqueItems = this.deduplicateResources(parsedItems);

    if (uniqueItems.length === 0) {
      throw new Error("No valid content items found from any source.");
    }

    // 3. Save to DB (Transaction)
    await db.transaction(async (tx) => {
      // Insert into cache
      await tx.insert(roadmapSourceCache).values({
        trajectorySlug: slug,
        rawTopicTree: { source: sourceUsed, items: rawItems.length },
        matchedRoadmapIds: [slug],
      });

      // Insert items
      await tx.insert(contentItem).values(uniqueItems.map(item => ({
        id: item.id,
        source: item.source,
        title: item.title,
        url: item.url,
        description: item.description,
        domain: item.domain,
        topicTags: item.topicTags,
      })));
    });

    console.log(`Successfully ingested ${uniqueItems.length} items for ${slug}`);
    return { success: true, cached: false, itemsIngested: uniqueItems.length };
  }

  /**
   * JIT (Just-in-Time) Fetching for custom LLM-generated nodes.
   * If a node lacks resources, this queries Wikipedia specifically for the node's topic.
   */
  public static async fetchResourcesForNode(topicLabel: string, domain: string): Promise<string[]> {
    console.log(`JIT Fetching resources for node: ${topicLabel} (Domain: ${domain})`);
    const items: Partial<ContentItemInsert>[] = [];
    const searchQuery = `${topicLabel} ${domain.replace('_', ' ')}`;
    let usedSource: 'wikipedia' | 'youtube' = 'youtube';

    const ytKey = process.env.YOUTUBE_API_KEY;
    let ytResultsFound = false;

    if (ytKey && ytKey.trim().length > 0) {
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&key=${ytKey}&maxResults=5`;
      try {
        const ytRes = await fetch(ytUrl);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          if (ytData.items && ytData.items.length > 0) {
            ytResultsFound = true;
            for (const item of ytData.items) {
              items.push({
                title: item.snippet.title,
                description: item.snippet.description || `YouTube video about ${item.snippet.title}`,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              });
            }
          }
        } else {
          console.warn(`YouTube API failed for node ${topicLabel}`);
        }
      } catch (err) {
        console.error('Error fetching from YouTube:', err);
      }
    }

    if (!ytResultsFound) {
      console.log('Falling back to Wikipedia for resources...');
      usedSource = 'wikipedia';
      let wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&utf8=&format=json&srlimit=5`;
      
      try {
        let response = await fetch(wikiUrl);
        let data = response.ok ? await response.json() : null;
        let searchResults = data?.query?.search || [];

        // Fallback if specific query yields nothing
        if (searchResults.length === 0) {
          const fallbackUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(topicLabel)}&utf8=&format=json&srlimit=5`;
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            const fbData = await fallbackRes.json();
            searchResults = fbData?.query?.search || [];
          }
        }

        for (const result of searchResults) {
          const cleanSnippet = result.snippet ? result.snippet.replace(/<[^>]*>?/gm, '') : `Wikipedia article about ${result.title}`;
          items.push({
            title: result.title,
            description: cleanSnippet,
            url: `https://en.wikipedia.org/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`,
          });
        }
      } catch (err) {
        console.error('Error fetching from Wikipedia:', err);
      }
    }

    const parsedItems = this.normalizeItems(domain, items, usedSource);
    const uniqueItems = this.deduplicateResources(parsedItems);

    if (uniqueItems.length === 0) {
      return [];
    }

    // Insert into contentItem table
    await db.insert(contentItem).values(uniqueItems.map(item => ({
      id: item.id,
      source: item.source,
      title: item.title,
      url: item.url,
      description: item.description,
      domain: item.domain,
      topicTags: item.topicTags,
    }))).onConflictDoNothing(); // Ignore if identical URLs were somehow generated with same ID

    return uniqueItems.map(item => item.id);
  }
}
