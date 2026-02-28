import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ServerLink {
  title: string;
  url: string;
  serverNumber?: string;
}

interface ServerData {
  servers: ServerLink[];
  totalServers: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const serverUrl = searchParams.get('url');
    
    if (!serverUrl) {
      return NextResponse.json(
        { success: false, error: 'Server URL is required' },
        { status: 400 }
      );
    }

    const response = await axios.get(serverUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const servers: ServerLink[] = [];
    
    // Look for server links - various selectors
    const selectors = [
      'a[href*="/downloads/"][class*="newdl"]',
      'a[href*="/server/"]',
      'a[href*="/downloads/"]',
      '.newdl',
      'a[rel="nofollow"][href*="server"]'
    ];
    
    selectors.forEach(selector => {
      $(selector).each((index, element) => {
        const $element = $(element);
        const href = $element.attr('href');
        const text = $element.text().trim();
        
        if (href && text && !servers.some(s => s.url === href)) {
          // Extract server number if available
          const serverMatch = text.match(/server\s*(\d+)/i) || href.match(/server[_\s]*(\d+)/i);
          const serverNumber = serverMatch ? serverMatch[1] : undefined;
          
          // Clean up the title
          let title = text
            .replace(/start\s+download\s+now\s*-?\s*/i, '')
            .replace(/download\s+now\s*-?\s*/i, '')
            .replace(/click\s+here\s*-?\s*/i, '')
            .trim();
          
          if (!title) {
            title = serverNumber ? `Server ${serverNumber}` : `Download Link ${servers.length + 1}`;
          }
          
          servers.push({
            title,
            url: href.startsWith('http') ? href : `https://www.filmyzilla13.com${href}`,
            serverNumber
          });
        }
      });
    });
    
    // Remove duplicates and sort by server number
    const uniqueServers = servers
      .filter((server, index, self) => 
        index === self.findIndex(s => s.url === server.url)
      )
      .sort((a, b) => {
        const numA = a.serverNumber ? parseInt(a.serverNumber) : 999;
        const numB = b.serverNumber ? parseInt(b.serverNumber) : 999;
        return numA - numB;
      });
    
    const serverData: ServerData = {
      servers: uniqueServers,
      totalServers: uniqueServers.length
    };
    
    return NextResponse.json({
      success: true,
      data: serverData,
      sourceUrl: serverUrl,
      scrapedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error scraping server links:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch server links',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
