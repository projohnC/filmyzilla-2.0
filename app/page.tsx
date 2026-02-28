'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from 'next/link';

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

interface FlatMovie extends MovieLink {
  category: string;
  categoryUrl: string;
  thumbnail?: string;
}

export default function Home() {
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flatMovies, setFlatMovies] = useState<FlatMovie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<FlatMovie[]>([]);
  const [categoriesWithoutMovies, setCategoriesWithoutMovies] = useState<CategoryData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/movies');
        const result = await response.json();

        if (result.success) {
          setData(result.data);

          // Separate categories with movies and without movies
          const categoriesWithMovies = result.data.filter((category: CategoryData) => category.movies.length > 0);
          const categoriesWithoutMoviesData = result.data.filter((category: CategoryData) => category.movies.length === 0);

          setCategoriesWithoutMovies(categoriesWithoutMoviesData);

          // Flatten the data for categories that have movies
          const flattened = categoriesWithMovies.flatMap((category: CategoryData) =>
            category.movies.map((movie: MovieLink) => ({
              ...movie,
              category: category.category,
              categoryUrl: category.categoryUrl
            }))
          );
          setFlatMovies(flattened);
          setFilteredMovies(flattened);
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const filtered = flatMovies.filter(movie =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMovies(filtered);
  }, [searchQuery, flatMovies]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading FilmyZilla data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight">
            FilmyZilla Movies
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Latest Bollywood & Hollywood Movies
          </p>
          <div className="flex justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
            <span>Movies: {flatMovies.length}</span>
            <span>Categories: {categoriesWithoutMovies.length}</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto w-full">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search movies by title or category..."
              className="w-full pl-10 pr-4 py-2 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Movies Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">
              {searchQuery ? `Search Results (${filteredMovies.length})` : 'All Movies'}
            </h2>
          </div>

          {filteredMovies.length === 0 ? (
            <Card className="w-full">
              <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="p-4 bg-muted rounded-full">
                  <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium">No movies found</h3>
                  <p className="text-muted-foreground text-sm">Try adjusting your search or category</p>
                </div>
                <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredMovies.map((movie, index) => (
                <Link
                  key={index}
                  href={`/movie${new URL(movie.url).pathname.replace('/movies/', '/')}`}
                  className="group relative flex flex-col space-y-2"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-muted ring-1 ring-inset ring-foreground/10 transition-all group-hover:ring-primary/50 group-hover:shadow-lg">
                    {movie.thumbnail ? (
                      <img
                        src={movie.thumbnail}
                        alt={movie.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-accent/20">
                        <svg className="h-10 w-10 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L21 14m-6 7a9 9 0 110-18 9 9 0 010 18z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex flex-col justify-end p-3">
                      <Button variant="secondary" size="sm" className="w-full text-xs font-semibold h-8">
                        View Details
                      </Button>
                    </div>
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <Badge className="bg-primary/90 text-[10px] h-5 px-1.5 uppercase font-bold border-none">
                        {movie.quality}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
                      {movie.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Additional Categories without movies - Moved to bottom */}
        {categoriesWithoutMovies.length > 0 && (
          <Card className="w-full">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl">Special Categories</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Additional movie categories and collections
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {categoriesWithoutMovies.map((category, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-3 sm:p-4 justify-start text-left hover:bg-accent/50 transition-colors"
                    asChild
                  >
                    <Link
                      href={`/category${new URL(category.categoryUrl).pathname.replace('/category/', '/')}`}
                      className="block w-full"
                    >
                      <span className="text-xs sm:text-sm font-medium break-words leading-tight">
                        {category.category}
                      </span>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center pt-4 sm:pt-6 lg:pt-8">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Data scraped from FilmyZilla • Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
