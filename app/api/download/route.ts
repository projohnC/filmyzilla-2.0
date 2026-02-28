import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface DownloadServer {
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const downloadServers: DownloadServer[] = [];
    
    // Extract main download servers from a.newdl elements
    $('a.newdl').each((index, element) => {
      const $element = $(element);
      const title = $element.text().trim();
      const href = $element.attr('href');
      
      if (title && href) {
        const fullUrl = href.startsWith('http') ? href : `https://www.filmyzilla13.com${href}`;
        
        // Extract server number from title or URL
        const serverMatch = title.match(/server\s*(\d+)/i) || href.match(/servers_(\d+)/);
        const serverNumber = serverMatch ? serverMatch[1] : (index + 1).toString();
        
        downloadServers.push({
          title: title.replace(/^Start Download Now\s*-?\s*/i, '').trim() || `Server ${serverNumber}`,
          url: fullUrl,
          server: `Server ${serverNumber}`
        });
      }
    });
    
    // If no newdl links found, look for other download patterns
    if (downloadServers.length === 0) {
      // Look for fast download links
      $('.fast, .fastl').each((index, element) => {
        const $element = $(element);
        const title = $element.text().trim();
        const href = $element.attr('href');
        
        if (title && href) {
          const fullUrl = href.startsWith('http') ? href : `https://www.filmyzilla13.com${href}`;
          
          downloadServers.push({
            title: title,
            url: fullUrl,
            server: `Fast Server ${index + 1}`
          });
        }
      });
      
      // Look for any other download links
      $('a[href*="/download/"], a[href*="servers"]').each((index, element) => {
        const $element = $(element);
        const title = $element.text().trim();
        const href = $element.attr('href');
        
        if (title && href && !downloadServers.some(ds => ds.url.includes(href))) {
          const fullUrl = href.startsWith('http') ? href : `https://www.filmyzilla13.com${href}`;
          
          const serverMatch = href.match(/servers_(\d+)/) || href.match(/server(\d+)/);
          const serverNumber = serverMatch ? serverMatch[1] : (downloadServers.length + 1).toString();
          
          downloadServers.push({
            title: title || `Download Server ${serverNumber}`,
            url: fullUrl,
            server: `Server ${serverNumber}`
          });
        }
      });
    }
    
    // Extract file information
    let fileSize = '';
    let fileName = '';
    
    $('.whole, .bld').each((index, element) => {
      const $element = $(element);
      const text = $element.text();
      
      if (text.includes('Size of file') || text.includes('MB') || text.includes('GB')) {
        const sizeMatch = text.match(/([\d.]+\s*(MB|GB|KB))/i);
        if (sizeMatch) {
          fileSize = sizeMatch[1];
        }
      }
      
      if (text.includes('File:')) {
        const fileMatch = text.replace(/^File:\s*/i, '').trim();
        if (fileMatch) {
          fileName = fileMatch;
        }
      }
    });
    
    // Get page title for additional context
    const pageTitle = $('.head').first().text().trim() || $('title').text().trim();
    
    // Remove duplicates and add file info to servers
    const uniqueServers = downloadServers
      .filter((server, index, self) => 
        index === self.findIndex(s => s.url === server.url)
      )
      .map(server => ({
        ...server,
        title: server.title + (fileSize ? ` (${fileSize})` : ''),
        fileSize,
        fileName: fileName || pageTitle
      }));
    
    return NextResponse.json({
      success: true,
      totalServers: uniqueServers.length,
      servers: uniqueServers,
      fileInfo: {
        name: fileName || pageTitle,
        size: fileSize
      },
      sourceUrl: serverUrl,
      scrapedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error scraping download servers:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to scrape download servers',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
