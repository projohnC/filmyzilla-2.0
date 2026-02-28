import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface DownloadLink {
  title: string;
  url: string;
  size: string;
}

interface RelatedMovie {
  title: string;
  url: string;
  thumbnail: string;
  starcast: string;
  length: string;
  quality: string;
}

interface MovieDetails {
  title: string;
  starcast: string;
  genres: string;
  quality: string;
  length: string;
  releaseDate: string;
  movieStory: string;
  thumbnail: string;
  downloadLinks: DownloadLink[];
  relatedMovies: RelatedMovie[];
  breadcrumb: string[];
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const movieUrl = searchParams.get('url');
    
    if (!movieUrl) {
      return NextResponse.json(
        { success: false, error: 'Movie URL is required' },
        { status: 400 }
      );
    }

    // Try multiple URL patterns if the first one fails
    const urlsToTry = [movieUrl];
    
    // If URL doesn't work, try alternative patterns
    if (movieUrl.includes('/movies/')) {
      urlsToTry.push(movieUrl.replace('/movies/', '/movie/'));
    } else if (movieUrl.includes('/movie/')) {
      urlsToTry.push(movieUrl.replace('/movie/', '/movies/'));
    }
    
    let response;
    let finalUrl = movieUrl;
    
    for (const urlToTry of urlsToTry) {
      try {
        response = await axios.get(urlToTry, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        finalUrl = urlToTry;
        break;
      } catch (urlError) {
        console.log(`Failed to fetch ${urlToTry}, trying next...`);
        if (urlToTry === urlsToTry[urlsToTry.length - 1]) {
          throw urlError; // If last URL also fails, throw the error
        }
      }
    }

    if (!response) {
      throw new Error('All URL patterns failed');
    }
    
    const $ = cheerio.load(response.data);
    
    // Extract movie title
    const title = $('.head').first().text().trim();
    
    // Extract movie poster/thumbnail - more specific selector
    const thumbnail = $('.imglarge img').attr('src') || $('.video img').attr('src') || '';
    
    // Extract movie details with more specific selectors
    let starcast = '';
    let genres = '';
    let quality = '';
    let length = '';
    let releaseDate = '';
    let movieStory = '';
    
    // Parse movie information - look for specific patterns
    $('p.info, p.black').each((index, element) => {
      const $element = $(element);
      const fullText = $element.text();
      
      if (fullText.toLowerCase().includes('starcast')) {
        const greenFont = $element.find('font[color="green"]');
        if (greenFont.length > 0) {
          starcast = greenFont.text().trim();
        }
      } else if (fullText.toLowerCase().includes('genres')) {
        const greenFont = $element.find('font[color="green"]');
        if (greenFont.length > 0) {
          genres = greenFont.text().trim();
        }
      } else if (fullText.toLowerCase().includes('quality')) {
        const greenFont = $element.find('font[color="green"]');
        if (greenFont.length > 0) {
          quality = greenFont.text().trim();
        }
      } else if (fullText.toLowerCase().includes('length')) {
        const greenFont = $element.find('font[color="green"]');
        if (greenFont.length > 0) {
          length = greenFont.text().trim();
        }
      } else if (fullText.toLowerCase().includes('release date')) {
        const greenFont = $element.find('font[color="green"]');
        if (greenFont.length > 0) {
          releaseDate = greenFont.text().trim();
        }
      } else if (fullText.toLowerCase().includes('movie story')) {
        const greenFont = $element.find('font[color="green"]');
        if (greenFont.length > 0) {
          movieStory = greenFont.text().trim();
        }
      }
    });
    
    // Extract breadcrumb navigation
    const breadcrumb: string[] = [];
    $('.path a').each((index, element) => {
      const linkText = $(element).text().trim();
      if (linkText && linkText !== 'Home') {
        breadcrumb.push(linkText);
      }
    });
    
    // Add current movie title to breadcrumb if not already present
    const pathText = $('.path').text();
    const pathParts = pathText.split('»').map(part => part.trim()).filter(part => part && part !== 'Home');
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && !breadcrumb.includes(lastPart)) {
      breadcrumb.push(lastPart);
    }
    
    // Extract download links - look for server links specifically
    const downloadLinks: DownloadLink[] = [];
    $('.touch').each((index, element) => {
      const $element = $(element);
      // Look for both /server/ and /servers/ patterns
      let linkElement = $element.find('a[href*="/server/"]');
      
      // If no /server/ links found, try /servers/
      if (linkElement.length === 0) {
        linkElement = $element.find('a[href*="/servers/"]');
      }
      
      if (linkElement.length > 0) {
        const downloadTitle = linkElement.find('font[color="red"]').text().trim() || linkElement.text().trim();
        const downloadUrl = linkElement.attr('href') || '';
        
        // Extract file size from small tag with span
        let size = '';
        const smallElement = $element.find('small');
        if (smallElement.length > 0) {
          const sizeSpan = smallElement.find('span[style*="color:#339900"]');
          if (sizeSpan.length > 0) {
            size = sizeSpan.text().trim();
          } else {
            // Fallback to regex if span not found
            const sizeText = smallElement.text();
            const sizeMatch = sizeText.match(/\(([^)]+(?:MB|GB)[^)]*)\)/i);
            size = sizeMatch ? sizeMatch[1].trim() : '';
          }
        }
        
        if (downloadTitle && downloadUrl) {
          downloadLinks.push({
            title: downloadTitle,
            url: downloadUrl.startsWith('http') ? downloadUrl : `https://www.filmyzilla13.com${downloadUrl}`,
            size
          });
        }
      }
    });
    
    // Extract related movies
    const relatedMovies: RelatedMovie[] = [];
    $('.filmyvideo').each((index, element) => {
      const $element = $(element);
      const movieLink = $element.find('a').first();
      const movieUrl = movieLink.attr('href') || '';
      const movieThumbnail = $element.find('img').attr('src') || '';
      
      // Get movie title from font size="2"
      const titleElement = $element.find('font[size="2"]');
      let movieTitle = titleElement.text().trim();
      
      let relatedStarcast = '';
      let relatedLength = '';
      let relatedQuality = '';
      
      // Extract quality from title (look for content in small tag or parentheses)
      const qualitySmall = titleElement.find('font[color="red"] small');
      if (qualitySmall.length > 0) {
        relatedQuality = qualitySmall.text().replace(/[()]/g, '').trim();
        // Remove quality from title
        movieTitle = movieTitle.replace(qualitySmall.text(), '').trim();
      }
      
      // Extract starcast and length from black paragraphs
      $element.find('p.black').each((i, infoElement) => {
        const $info = $(infoElement);
        const infoText = $info.text().toLowerCase();
        
        if (infoText.includes('starcast')) {
          relatedStarcast = $info.find('font[color="green"]').text().trim();
        } else if (infoText.includes('length')) {
          relatedLength = $info.find('font[color="green"]').text().trim();
        }
      });
      
      if (movieTitle && movieUrl) {
        relatedMovies.push({
          title: movieTitle,
          url: movieUrl.startsWith('http') ? movieUrl : `https://www.filmyzilla13.com${movieUrl}`,
          thumbnail: movieThumbnail.startsWith('http') ? movieThumbnail : `https://www.filmyzilla13.com${movieThumbnail}`,
          starcast: relatedStarcast,
          length: relatedLength,
          quality: relatedQuality
        });
      }
    });
    
    const movieDetails: MovieDetails = {
      title,
      starcast,
      genres,
      quality,
      length,
      releaseDate,
      movieStory,
      thumbnail: thumbnail.startsWith('http') ? thumbnail : `https://www.filmyzilla13.com${thumbnail}`,
      downloadLinks,
      relatedMovies,
      breadcrumb
    };
    
    return NextResponse.json({
      success: true,
      data: movieDetails,
      sourceUrl: finalUrl,
      scrapedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error scraping movie details:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to scrape movie details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
