import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(
  request: Request,
  { params }: { params: { category: string } }
) {
  try {
    const response = await axios.get('https://www.filmyzilla13.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const categoryFilter = params.category.toLowerCase();
    
    $('.update').each((index, element) => {
      const $element = $(element);
      const categoryTitle = $element.find('.black a').first().text().trim().toLowerCase();
      
      if (categoryTitle.includes(categoryFilter)) {
        const movies: any[] = [];
        
        // Get the HTML content and parse it more carefully
        const updateHtml = $element.html();
        if (updateHtml) {
          // Use regex to match movie links with quality
          const movieRegex = /<a href="([^"]*\/movies?\/[^"]*)"[^>]*>([^<]+)<\/a>\s*<font[^>]*color="green"[^>]*>\[([^\]]+)\]<\/font>/gi;
          let match;
          
          while ((match = movieRegex.exec(updateHtml)) !== null) {
            const [, url, title, quality] = match;
            
            if (title && url) {
              movies.push({
                title: title.trim(),
                url: url.startsWith('http') ? url : `https://www.filmyzilla13.com${url}`,
                quality: quality.trim()
              });
            }
          }
          
          // Fallback method
          if (movies.length === 0) {
            $element.find('a').each((i, movieElement) => {
              const $movieElement = $(movieElement);
              const href = $movieElement.attr('href');
              
              if (!href || $movieElement.closest('.black').length > 0) {
                return;
              }
              
              const title = $movieElement.text().trim();
              if (title && (href.includes('/movie') || href.includes('/movies'))) {
                let quality = 'Unknown';
                let nextElement = $movieElement.next();
                
                for (let j = 0; j < 3; j++) {
                  if (nextElement.length === 0) break;
                  
                  if (nextElement.is('font') && nextElement.attr('color') === 'green') {
                    quality = nextElement.text().replace(/[\[\]]/g, '').trim();
                    break;
                  }
                  nextElement = nextElement.next();
                }
                
                movies.push({
                  title,
                  url: href.startsWith('http') ? href : `https://www.filmyzilla13.com${href}`,
                  quality
                });
              }
            });
          }
        }
        
        return NextResponse.json({
          success: true,
          category: categoryTitle,
          totalMovies: movies.length,
          movies,
          scrapedAt: new Date().toISOString()
        });
      }
    });
    
    return NextResponse.json({
      success: false,
      error: 'Category not found'
    }, { status: 404 });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to scrape category data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
