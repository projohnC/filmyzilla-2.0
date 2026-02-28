import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface MovieLink {
  title: string;
  url: string;
  quality: string;
}

interface CategoryData {
  category: string;
  categoryUrl: string;
  movies: MovieLink[];
}

export async function GET() {
  try {
    const baseUrl = 'https://www.filmyzilla13.com';
    const response = await axios.get(baseUrl + '/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const categories: CategoryData[] = [];

    // Extract recent updates which have movie posters in their respective category pages
    const updatePromises = $('.update').map(async (index, element) => {
      const $element = $(element);
      const categoryLink = $element.find('.black a').first();
      const categoryTitle = categoryLink.text().trim();
      const categoryUrl = categoryLink.attr('href') || '';
      const fullCategoryUrl = categoryUrl.startsWith('http') ? categoryUrl : `${baseUrl}${categoryUrl}`;

      try {
        // Fetch the category page to get posters
        const catResponse = await axios.get(fullCategoryUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          },
          timeout: 5000
        });

        const $cat = cheerio.load(catResponse.data);
        const movies: (MovieLink & { thumbnail?: string })[] = [];

        $cat('.filmyvideo').each((i, movieElement) => {
          const $movie = $cat(movieElement);
          const movieAnchor = $movie.find('a').first();
          const href = movieAnchor.attr('href');
          const thumbnail = $movie.find('img').attr('src');

          let title = '';
          let quality = 'HD';

          const infoDiv = $movie.find('.informationn');
          const titleParagraph = infoDiv.find('p').eq(1);

          if (titleParagraph.length > 0) {
            const titleText = titleParagraph.text().trim();
            title = titleText.replace(/\s*\([^)]*\)\s*$/, '').trim();

            const qualElement = titleParagraph.find('font[color="red"] small');
            if (qualElement.length > 0) {
              quality = qualElement.text().replace(/[()]/g, '').trim();
            }
          }

          if (title && href) {
            movies.push({
              title,
              url: href.startsWith('http') ? href : `${baseUrl}${href}`,
              quality,
              thumbnail: thumbnail ? (thumbnail.startsWith('http') ? thumbnail : `${baseUrl}${thumbnail}`) : ''
            });
          }
        });

        if (movies.length > 0) {
          return {
            category: categoryTitle,
            categoryUrl: fullCategoryUrl,
            movies
          };
        }
      } catch (err) {
        console.error(`Failed to fetch category ${fullCategoryUrl}:`, err);
      }
      return null;
    }).get();

    const resolvedCategories = (await Promise.all(updatePromises)).filter(c => c !== null) as CategoryData[];
    categories.push(...resolvedCategories);

    // Extract additional categories from .touch divs
    $('.touch').each((index, element) => {
      const $element = $(element);
      const categoryLink = $element.find('a').first();
      const categoryTitle = categoryLink.text().trim();
      const categoryUrl = categoryLink.attr('href') || '';

      if (categoryTitle && categoryUrl) {
        categories.push({
          category: categoryTitle,
          categoryUrl: categoryUrl.startsWith('http') ? categoryUrl : `${baseUrl}${categoryUrl}`,
          movies: []
        });
      }
    });

    return NextResponse.json({
      success: true,
      totalCategories: categories.length,
      data: categories,
      scrapedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error scraping FilmyZilla:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to scrape data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
