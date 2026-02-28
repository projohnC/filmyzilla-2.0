import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface ServerLink {
  title: string;
  url: string;
  server: string;
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.filmyzilla13.com/'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const serverLinks: ServerLink[] = [];
    
    // Look for server download links
    $('a.newdl, a[href*="/downloads/"], a[href*="/server"]').each((index, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const title = $element.text().trim();
      
      if (href && title) {
        // Extract server number or name
        let serverName = 'Server';
        const serverMatch = title.match(/server\s*(\d+)/i);
        if (serverMatch) {
          serverName = `Server ${serverMatch[1]}`;
        } else if (title.toLowerCase().includes('download')) {
          serverName = 'Download Link';
        }
        
        serverLinks.push({
          title: title,
          url: href.startsWith('http') ? href : `https://www.filmyzilla13.com${href}`,
          server: serverName
        });
      }
    });
    
    // Also look for direct download links
    $('a[href*=".mp4"], a[href*=".mkv"], a[href*=".avi"]').each((index, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const title = $element.text().trim() || 'Direct Download';
      
      if (href) {
        serverLinks.push({
          title: title,
          url: href.startsWith('http') ? href : `https://www.filmyzilla13.com${href}`,
          server: 'Direct Link'
        });
      }
    });
    
    return NextResponse.json({
      success: true,
      data: serverLinks,
      sourceUrl: serverUrl,
      scrapedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching server links:', error);
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
