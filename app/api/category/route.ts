import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface MovieDetails {
  title: string;
  year: string;
  quality: string;
  starcast: string;
  length: string;
  thumbnail: string;
  url: string;
}

interface SubCategory {
  title: string;
  url: string;
  thumbnail?: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryUrl = searchParams.get('url');
    
    if (!categoryUrl) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Category URL is required',
          message: 'Please provide a category URL as a query parameter'
        },
        { status: 400 }
      );
    }
    
    console.log('Fetching category URL:', categoryUrl);
    
    // Try the URL as-is first, then try alternatives if it fails
    let response;
    let finalUrl = categoryUrl;
    
    try {
      response = await axios.get(categoryUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
    } catch (error) {
      // If direct URL fails and doesn't have /category/, try adding it
      if (!categoryUrl.includes('/category/')) {
        const baseUrl = 'https://www.filmyzilla13.com';
        const urlPart = categoryUrl.replace(baseUrl, '').replace(/^\/+/, '');
        const alternativeUrl = `${baseUrl}/category/${urlPart}`;
        
        try {
          response = await axios.get(alternativeUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          finalUrl = alternativeUrl;
        } catch (altError) {
          throw error; // Throw original error if alternative also fails
        }
      } else {
        throw error;
      }
    }
    
    const $ = cheerio.load(response.data);
    const movies: MovieDetails[] = [];
    const subCategories: SubCategory[] = [];
    
    // Enhanced detection for different page structures
    
    // First, check if this is a direct link page (like Popular TV Shows)
    $('.touch a[href*="/category/"]').each((index, element) => {
      const $element = $(element);
      const title = $element.text().trim();
      const url = $element.attr('href') || '';
      const imgElement = $element.find('img').first();
      const thumbnail = imgElement.attr('src') || '';
      
      if (title && url) {
        subCategories.push({
          title,
          url: url.startsWith('http') ? url : `https://www.filmyzilla13.com${url}`,
          thumbnail: thumbnail.startsWith('http') ? thumbnail : `https://www.filmyzilla13.com${thumbnail}`
        });
      }
    });
    
    // Check for movie grid layout (common in category pages)
    $('.movie-item, .post-item, .entry-item').each((index, element) => {
      const $element = $(element);
      const linkElement = $element.find('a[href*="/movie"]').first();
      
      if (linkElement.length > 0) {
        const movieUrl = linkElement.attr('href') || '';
        const title = linkElement.attr('title') || linkElement.text().trim();
        const imgElement = $element.find('img').first();
        const thumbnail = imgElement.attr('src') || imgElement.attr('data-src') || '';
        
        // Extract additional info
        const infoText = $element.text();
        const yearMatch = infoText.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : '';
        
        if (title && movieUrl) {
          movies.push({
            title: title.replace(/\s*\(\d{4}\)\s*/, '').trim(),
            year,
            quality: 'HD',
            starcast: 'N/A',
            length: 'N/A',
            thumbnail: thumbnail.startsWith('http') ? thumbnail : `https://www.filmyzilla13.com${thumbnail}`,
            url: movieUrl.startsWith('http') ? movieUrl : `https://www.filmyzilla13.com${movieUrl}`
          });
        }
      }
    });
    
    // Check for filmyvideo structure (existing logic)
    if (movies.length === 0) {
      $('.filmyvideo').each((index, element) => {
        const $element = $(element);
        const movieUrl = $element.attr('href') || '';
        
        const imgElement = $element.find('img');
        const thumbnail = imgElement.attr('src') || '';
        
        const infoDiv = $element.find('.informationn');
        const titleParagraph = infoDiv.find('p').eq(1);
        
        let title = '';
        let year = '';
        let quality = '';
        let starcast = '';
        let length = '';
        
        if (titleParagraph.length > 0) {
          const titleText = titleParagraph.text().trim();
          const titleMatch = titleText.match(/^(.+?)\s*\((\d{4})\)/);
          if (titleMatch) {
            title = titleMatch[1].trim();
            year = titleMatch[2];
          } else {
            title = titleText.replace(/\s*\([^)]*\)\s*$/, '').trim();
          }
          
          const qualityElement = titleParagraph.find('font[color="red"] small');
          if (qualityElement.length > 0) {
            quality = qualityElement.text().replace(/[()]/g, '').trim();
          }
        }
        
        const starcastElement = infoDiv.find('.artist font[color="green"]');
        if (starcastElement.length > 0) {
          starcast = starcastElement.text().trim();
        }
        
        const lengthElement = infoDiv.find('.duration font[color="green"]');
        if (lengthElement.length > 0) {
          length = lengthElement.text().trim();
        }
        
        if (title && movieUrl && movieUrl.includes('/movie')) {
          movies.push({
            title,
            year: year || '',
            quality: quality || 'Unknown',
            starcast: starcast || 'N/A',
            length: length || 'N/A',
            thumbnail: thumbnail.startsWith('http') ? thumbnail : `https://www.filmyzilla13.com${thumbnail}`,
            url: movieUrl.startsWith('http') ? movieUrl : `https://www.filmyzilla13.com${movieUrl}`
          });
        }
      });
    }
    
    // Fallback: Look for any movie links in the page
    if (movies.length === 0 && subCategories.length === 0) {
      $('a[href*="/movie"]').each((index, element) => {
        const $element = $(element);
        const movieUrl = $element.attr('href') || '';
        const title = $element.text().trim() || $element.attr('title') || '';
        
        if (title && movieUrl && title.length > 3) {
          // Try to find associated image
          const img = $element.find('img').first();
          const thumbnail = img.attr('src') || img.attr('data-src') || '';
          
          movies.push({
            title,
            year: '',
            quality: 'HD',
            starcast: 'N/A',
            length: 'N/A',
            thumbnail: thumbnail.startsWith('http') ? thumbnail : `https://www.filmyzilla13.com${thumbnail}`,
            url: movieUrl.startsWith('http') ? movieUrl : `https://www.filmyzilla13.com${movieUrl}`
          });
        }
      });
      
      // Remove duplicates based on URL
      const uniqueMovies = movies.filter((movie, index, self) => 
        index === self.findIndex(m => m.url === movie.url)
      );
      movies.length = 0;
      movies.push(...uniqueMovies);
    }
    
    // Extract category title from multiple sources
    let categoryTitle = 'Category';
    const titleSources = [
      $('.head').first().text(),
      $('h1').first().text(),
      $('title').text(),
      $('.page-title').first().text(),
      $('.category-title').first().text(),
      $('.path').text().split('»').pop()?.trim()
    ];
    
    for (const source of titleSources) {
      if (source && source.trim() && source.trim() !== 'Category') {
        categoryTitle = source.trim();
        break;
      }
    }
    
    // Clean up category title
    categoryTitle = categoryTitle
      .replace(/filmyzilla|download|movies?/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!categoryTitle || categoryTitle === 'Category') {
      // Extract from URL as fallback
      const urlMatch = categoryUrl.match(/\/([^/]+)\.html?$/);
      if (urlMatch) {
        categoryTitle = urlMatch[1]
          .replace(/-/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    
    // If we have subcategories, return them
    if (subCategories.length > 0) {
      return NextResponse.json({
        success: true,
        categoryTitle,
        totalMovies: 0,
        totalSubCategories: subCategories.length,
        movies: [],
        subCategories,
        hasSubCategories: true,
        scrapedAt: new Date().toISOString(),
        sourceUrl: categoryUrl
      });
    }
    
    return NextResponse.json({
      success: true,
      categoryTitle,
      totalMovies: movies.length,
      totalSubCategories: subCategories.length,
      movies,
      subCategories,
      hasSubCategories: subCategories.length > 0,
      scrapedAt: new Date().toISOString(),
      sourceUrl: finalUrl
    });
    
  } catch (error) {
    console.error('Error scraping category page:', error);
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
