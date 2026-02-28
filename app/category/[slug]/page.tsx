'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams } from 'next/navigation';
import Link from 'next/link';

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

interface CategoryData {
  categoryTitle: string;
  totalMovies: number;
  totalSubCategories?: number;
  movies: MovieDetails[];
  subCategories?: SubCategory[];
  hasSubCategories?: boolean;
}

export default function CategoryPage() {
  const [data, setData] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState<MovieDetails[]>([]);
  const params = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const slug = params.slug as string;

        if (!slug) return;

        // Construct the full category URL correctly
        let categoryUrl;
        if (slug.startsWith('http')) {
          categoryUrl = slug;
        } else {
          // Remove any leading path components to get clean slug
          const cleanSlug = slug.replace(/^category\//, '');
          categoryUrl = `https://www.filmyzilla13.com/category/${cleanSlug}`;
        }

        if (categoryUrl) {
          const response = await fetch(`/api/category?url=${encodeURIComponent(categoryUrl)}`);
          const result = await response.json();

          if (result.success) {
            setData(result);
            setFilteredMovies(result.movies || []);
          } else {
            setError(result.error);
          }
        }
      } catch (err) {
        setError('Failed to fetch category data');
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchData();
    }
  }, [params.slug]);

  useEffect(() => {
    if (data?.movies) {
      const filtered = data.movies.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.starcast.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMovies(filtered);
    }
  }, [searchQuery, data?.movies]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading category data...</p>
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
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <span>/</span>
            <span>Category</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight break-words">
            {data?.categoryTitle}
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            {data?.hasSubCategories
              ? `${data.totalSubCategories} subcategories available`
              : `${data?.totalMovies} movies available`
            }
          </p>
        </div>

        {/* Search Bar */}
        {!data?.hasSubCategories && filteredMovies && (
          <div className="max-w-md w-full">
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
                placeholder="Search movies in this category..."
                className="w-full pl-10 pr-4 py-2 bg-muted rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Subcategories */}
        {data?.hasSubCategories && data?.subCategories && (
          <Card className="w-full">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl">Browse Subcategories</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {data.subCategories.map((subcat, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="h-auto p-4 justify-start text-left hover:bg-accent/50 transition-colors"
                    asChild
                  >
                    <Link href={`/category${new URL(subcat.url).pathname.replace('/category/', '/')}`}>
                      <div className="flex items-center gap-3 w-full">
                        {subcat.thumbnail && (
                          <img
                            src={subcat.thumbnail}
                            alt={subcat.title}
                            className="w-8 h-8 object-cover rounded shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-2 h-2 bg-primary rounded-full shrink-0"></div>
                          <span className="text-sm font-medium leading-tight truncate">
                            {subcat.title}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Movies Table - only show when we have movies */}
        {!data?.hasSubCategories && (
          <Card className="w-full overflow-hidden">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
              <CardTitle className="text-base sm:text-lg lg:text-xl">Movies in this Category</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px] xl:w-[100px]">Poster</TableHead>
                      <TableHead className="w-[35%] xl:w-[40%]">Movie Title</TableHead>
                      <TableHead className="w-[12%] xl:w-[15%]">Quality</TableHead>
                      <TableHead className="w-[25%] xl:w-[20%]">Starcast</TableHead>
                      <TableHead className="w-[10%]">Length</TableHead>
                      <TableHead className="w-[18%] xl:w-[15%]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!filteredMovies || filteredMovies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                          {searchQuery ? "No movies found matching your search" : "No movies available in this category"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMovies.map((movie, index) => (
                        <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="p-3">
                            <img
                              src={movie.thumbnail}
                              alt={movie.title}
                              className="w-12 h-16 xl:w-16 xl:h-20 object-cover rounded border shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://www.filmyzilla13.com/thumbs.jpg';
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium p-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm xl:text-base leading-tight">
                                {movie.title}
                              </p>
                              {movie.year && (
                                <p className="text-xs xl:text-sm text-muted-foreground">
                                  Year: <span className="text-green-600">{movie.year}</span>
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="p-3">
                            {movie.quality && (
                              <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs xl:text-sm">
                                {movie.quality}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="p-3">
                            {movie.starcast && (
                              <p className="text-xs xl:text-sm text-muted-foreground break-words">
                                <span className="text-green-600">{movie.starcast}</span>
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="p-3">
                            {movie.length && (
                              <p className="text-xs xl:text-sm text-muted-foreground">
                                <span className="text-green-600">{movie.length}</span>
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs xl:text-sm"
                              asChild
                            >
                              <Link href={`/movie${new URL(movie.url).pathname.replace('/movies/', '/')}`}>
                                View Details
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Tablet Table (simplified) */}
              <div className="hidden md:block lg:hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">Poster</TableHead>
                      <TableHead className="w-[45%]">Movie Title</TableHead>
                      <TableHead className="w-[15%]">Quality</TableHead>
                      <TableHead className="w-[25%]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data?.movies || data.movies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                          No movies available in this category
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.movies.map((movie, index) => (
                        <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="p-3">
                            <img
                              src={movie.thumbnail}
                              alt={movie.title}
                              className="w-10 h-14 object-cover rounded border shadow-sm"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'https://www.filmyzilla13.com/thumbs.jpg';
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium p-3">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm leading-tight">
                                {movie.title}
                              </p>
                              {movie.year && (
                                <p className="text-xs text-muted-foreground">
                                  <span className="text-green-600">{movie.year}</span>
                                </p>
                              )}
                              <div className="space-y-1">
                                {movie.starcast && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="text-red-500">Cast:</span>{' '}
                                    <span className="text-green-600">{movie.starcast}</span>
                                  </p>
                                )}
                                {movie.length && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="text-red-500">Length:</span>{' '}
                                    <span className="text-green-600">{movie.length}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="p-3">
                            {movie.quality && (
                              <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs">
                                {movie.quality}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="p-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              asChild
                            >
                              <Link href={`/movie${new URL(movie.url).pathname.replace('/movies/', '/')}`}>
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3 p-3 sm:p-4">
                {!filteredMovies || filteredMovies.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p className="text-sm">No movies found matching your search</p>
                    {searchQuery && (
                      <Button variant="link" onClick={() => setSearchQuery('')} className="mt-2">
                        Clear Search
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredMovies.map((movie, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex space-x-3">
                          <img
                            src={movie.thumbnail}
                            alt={movie.title}
                            className="w-16 h-20 sm:w-20 sm:h-24 object-cover rounded border shrink-0 shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = 'https://www.filmyzilla13.com/thumbs.jpg';
                            }}
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <h3 className="font-semibold text-sm sm:text-base leading-tight break-words">
                              {movie.title}
                            </h3>

                            {movie.year && (
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                <span className="text-red-500">Year:</span>{' '}
                                <span className="text-green-600">{movie.year}</span>
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-2">
                              {movie.quality && (
                                <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs">
                                  {movie.quality}
                                </Badge>
                              )}
                            </div>

                            {movie.starcast && (
                              <p className="text-xs sm:text-sm text-muted-foreground break-words">
                                <span className="text-red-500">Cast:</span>{' '}
                                <span className="text-green-600">{movie.starcast}</span>
                              </p>
                            )}

                            {movie.length && (
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                <span className="text-red-500">Length:</span>{' '}
                                <span className="text-green-600">{movie.length}</span>
                              </p>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full mt-3 text-xs sm:text-sm"
                              asChild
                            >
                              <Link href={`/movie${new URL(movie.url).pathname.replace('/movies/', '/')}`}>
                                View Details
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
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
    </div >
  );
}
