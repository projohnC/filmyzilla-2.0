'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DownloadDrawer } from "@/components/download-drawer";
import { VideoPlayer } from "@/components/video-player";
import { PlayCircle, Download } from 'lucide-react';

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

interface MoviePageData {
  success: boolean;
  data: MovieDetails;
  sourceUrl: string;
  scrapedAt: string;
}

export default function MoviePage() {
  const [data, setData] = useState<MoviePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadDrawerOpen, setIsDownloadDrawerOpen] = useState(false);
  const [selectedDownloadUrl, setSelectedDownloadUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const params = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const slug = params.slug as string;

        if (!slug) return;

        // Construct the full movie URL correctly
        let movieUrl;
        if (slug.startsWith('http')) {
          movieUrl = slug;
        } else {
          // Remove any leading path components to get clean slug
          const cleanSlug = slug.replace(/^(movies?\/|category\/)?/, '');

          // Determine if we need /movie/ or /movies/ by checking the slug pattern
          let urlPath = '/movies/'; // default

          // If slug has .html extension, it might be a direct file
          if (cleanSlug.includes('.html')) {
            // For HTML files, try /movie/ first
            urlPath = '/movie/';
          }

          movieUrl = `https://www.filmyzilla13.com${urlPath}${cleanSlug}`;
        }

        if (movieUrl) {
          const response = await fetch(`/api/movie?url=${encodeURIComponent(movieUrl)}`);
          const result = await response.json();

          if (result.success) {
            setData(result);
          } else {
            setError(result.error);
          }
        }
      } catch (err) {
        setError('Failed to fetch movie data');
      } finally {
        setLoading(false);
      }
    };

    if (params.slug) {
      fetchData();
    }
  }, [params.slug]);

  const handleDownloadClick = (downloadUrl: string) => {
    setSelectedDownloadUrl(downloadUrl);
    setIsDownloadDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading movie details...</p>
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
            <Button asChild className="mt-4">
              <Link href="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const movie = data?.data;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6">
        {/* Video Player Section */}
        {videoUrl && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="border-primary/20 overflow-hidden bg-zinc-950">
              <CardContent className="p-0">
                <VideoPlayer
                  url={videoUrl}
                  title={videoTitle}
                  poster={movie?.thumbnail}
                  onClose={() => setVideoUrl(null)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          {movie?.breadcrumb?.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="truncate max-w-[100px] sm:max-w-[150px]" title={crumb}>{crumb}</span>
              {index < movie.breadcrumb.length - 1 && <span>/</span>}
            </div>
          ))}
        </div>

        {/* Movie Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Movie Poster and Basic Info */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden sticky top-4">
              <CardContent className="p-0">
                <div className="aspect-[3/4] relative">
                  <img
                    src={movie?.thumbnail}
                    alt={movie?.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://www.filmyzilla13.com/thumbs.jpg';
                    }}
                  />
                  {movie?.quality && (
                    <Badge className="absolute top-3 right-3 bg-red-600 hover:bg-red-600 text-white">
                      {movie.quality}
                    </Badge>
                  )}
                </div>
                <div className="p-3 sm:p-4 lg:p-6 space-y-4">
                  <div className="space-y-2">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold break-words leading-tight">{movie?.title}</h1>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-white"
                        size="sm"
                        onClick={() => {
                          const element = document.getElementById('downloads');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Watch Online
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const element = document.getElementById('downloads');
                          element?.scrollIntoView({ behavior: 'smooth' });
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {movie?.starcast && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-red-500">Starcast:</span>
                        <p className="text-sm text-green-600 break-words leading-relaxed">{movie.starcast}</p>
                      </div>
                    )}

                    {movie?.genres && (
                      <div className="space-y-1">
                        <span className="text-sm font-medium text-red-500">Genres:</span>
                        <div className="flex flex-wrap gap-1">
                          {movie.genres.split(',').filter(g => g.trim()).map((genre, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {genre.trim()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      {movie?.length && (
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-red-500">Duration:</span>
                          <p className="text-sm text-green-600">{movie.length}</p>
                        </div>
                      )}

                      {movie?.releaseDate && (
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-red-500">Release:</span>
                          <p className="text-sm text-green-600">{movie.releaseDate}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {movie?.movieStory && (
                    <div className="space-y-2 pt-3 border-t">
                      <span className="text-sm font-medium text-red-500">Story:</span>
                      <p className="text-sm text-green-600 break-words leading-relaxed">{movie.movieStory}</p>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="pt-3 border-t">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Downloads</p>
                        <p className="text-sm font-semibold">{movie?.downloadLinks?.length || 0}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <p className="text-xs text-muted-foreground">Related</p>
                        <p className="text-sm font-semibold">{movie?.relatedMovies?.length || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Download Links and Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6" id="downloads">
            {/* Download Links */}
            <Card className="border-primary/10">
              <CardHeader className="p-3 sm:p-4 lg:p-6 border-b bg-muted/30">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  Download & Watch Options ({movie?.downloadLinks?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                {movie?.downloadLinks && movie.downloadLinks.length > 0 ? (
                  <div className="space-y-4">
                    {/* Group downloads by type */}
                    {(() => {
                      const groupedLinks = movie.downloadLinks.reduce((acc, link) => {
                        const title = link.title.toLowerCase();
                        let category = 'Other';

                        // Web Series/Season categorization
                        if (title.includes('complete') && (title.includes('series') || title.includes('season'))) {
                          if (title.includes('part')) {
                            // Extract part number for better organization
                            const partMatch = title.match(/part\s*[-]?\s*(\d+)/);
                            if (partMatch) {
                              category = `Complete Part ${partMatch[1]}`;
                            } else {
                              category = 'Complete Parts';
                            }
                          } else {
                            category = 'Complete Season/Series';
                          }
                        } else if (title.includes('ep ') || title.includes('episode')) {
                          // Extract episode and part info
                          const epMatch = title.match(/ep\s*(\d+)/);
                          const partMatch = title.match(/part\s*[-]?\s*(\d+)/);

                          if (partMatch && epMatch) {
                            category = `Part ${partMatch[1]} Episodes`;
                          } else if (epMatch) {
                            category = 'Individual Episodes';
                          } else {
                            category = 'Episodes';
                          }
                        } else if (title.includes('part')) {
                          const partMatch = title.match(/part\s*[-]?\s*(\d+)/);
                          if (partMatch) {
                            category = `Part ${partMatch[1]}`;
                          } else {
                            category = 'Parts';
                          }
                        } else if (title.includes('season')) {
                          category = 'Season Downloads';
                        }

                        if (!acc[category]) acc[category] = [];
                        acc[category].push(link);
                        return acc;
                      }, {} as Record<string, DownloadLink[]>);

                      // Sort categories in logical order
                      const categoryOrder = [
                        'Complete Season/Series',
                        'Complete Part 1',
                        'Complete Part 2',
                        'Complete Part 3',
                        'Complete Parts',
                        'Part 1 Episodes',
                        'Part 2 Episodes',
                        'Part 3 Episodes',
                        'Part 1',
                        'Part 2',
                        'Part 3',
                        'Parts',
                        'Individual Episodes',
                        'Episodes',
                        'Season Downloads',
                        'Other'
                      ];

                      const sortedCategories = Object.entries(groupedLinks).sort(([a], [b]) => {
                        const indexA = categoryOrder.indexOf(a);
                        const indexB = categoryOrder.indexOf(b);
                        const orderA = indexA === -1 ? categoryOrder.length : indexA;
                        const orderB = indexB === -1 ? categoryOrder.length : indexB;
                        return orderA - orderB;
                      });

                      return sortedCategories.map(([category, links]) => (
                        <div key={category} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-primary border-b pb-2 flex-1">{category}</h3>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              {links.length} file{links.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {links
                              .sort((a, b) => {
                                // Sort by quality (480p, 720p, 1080p) and episode number
                                const getQuality = (title: string) => {
                                  if (title.includes('1080p')) return 3;
                                  if (title.includes('720p')) return 2;
                                  if (title.includes('480p')) return 1;
                                  return 0;
                                };

                                const getEpisode = (title: string) => {
                                  const match = title.match(/ep\s*(\d+)/i);
                                  return match ? parseInt(match[1]) : 0;
                                };

                                const epA = getEpisode(a.title);
                                const epB = getEpisode(b.title);

                                if (epA !== epB) return epA - epB;
                                return getQuality(b.title) - getQuality(a.title);
                              })
                              .map((link, index) => (
                                <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm break-words line-clamp-2" title={link.title}>
                                      {link.title}
                                    </h4>
                                    {link.size && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">Size:</span>
                                        <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                          {link.size}
                                        </span>
                                        {/* Quality badge */}
                                        {(() => {
                                          const title = link.title.toLowerCase();
                                          let quality = '';
                                          if (title.includes('1080p')) quality = '1080p';
                                          else if (title.includes('720p')) quality = '720p';
                                          else if (title.includes('480p')) quality = '480p';

                                          return quality ? (
                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                                              {quality}
                                            </span>
                                          ) : null;
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-2 w-full sm:w-auto">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 sm:flex-initial whitespace-nowrap border-primary/50 hover:bg-primary/10"
                                      onClick={() => {
                                        setVideoTitle(link.title);
                                        // We set selectedDownloadUrl to trigger the drawer, 
                                        // which will now have a "Play" option
                                        handleDownloadClick(link.url);
                                      }}
                                    >
                                      <PlayCircle className="w-4 h-4 mr-2 text-primary" />
                                      Watch
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="flex-1 sm:flex-initial whitespace-nowrap"
                                      onClick={() => handleDownloadClick(link.url)}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No download links available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Movies */}
            <Card>
              <CardHeader className="p-3 sm:p-4 lg:p-6">
                <CardTitle className="text-base sm:text-lg">Related Movies</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 lg:p-6">
                {movie?.relatedMovies && movie.relatedMovies.length > 0 ? (
                  <div className="space-y-4">
                    {/* Desktop Table */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Poster</TableHead>
                            <TableHead className="w-[40%]">Title</TableHead>
                            <TableHead className="w-[15%]">Quality</TableHead>
                            <TableHead className="w-[30%]">Starcast</TableHead>
                            <TableHead className="w-[15%]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {movie.relatedMovies.map((relatedMovie, index) => (
                            <TableRow key={index} className="hover:bg-muted/50 transition-colors">
                              <TableCell className="p-3">
                                <img
                                  src={relatedMovie.thumbnail}
                                  alt={relatedMovie.title}
                                  className="w-12 h-16 object-cover rounded border shadow-sm"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = 'https://www.filmyzilla13.com/thumbs.jpg';
                                  }}
                                />
                              </TableCell>
                              <TableCell className="p-3">
                                <div className="space-y-1">
                                  <p className="font-medium text-sm truncate max-w-[200px]" title={relatedMovie.title}>
                                    {relatedMovie.title}
                                  </p>
                                  {relatedMovie.length && (
                                    <p className="text-xs text-muted-foreground">
                                      Length: <span className="text-green-600">{relatedMovie.length}</span>
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="p-3">
                                {relatedMovie.quality && (
                                  <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs">
                                    {relatedMovie.quality}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="p-3">
                                {relatedMovie.starcast && (
                                  <p className="text-xs text-green-600 truncate max-w-[150px]" title={relatedMovie.starcast}>
                                    {relatedMovie.starcast}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="p-3">
                                <Button variant="outline" size="sm" asChild>
                                  <Link
                                    href={`/movie${new URL(relatedMovie.url).pathname.replace('/movies/', '/')}`}
                                  >
                                    View
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="lg:hidden space-y-3">
                      {movie.relatedMovies.map((relatedMovie, index) => (
                        <Card key={index} className="overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex space-x-3">
                              <img
                                src={relatedMovie.thumbnail}
                                alt={relatedMovie.title}
                                className="w-16 h-20 object-cover rounded border shrink-0 shadow-sm"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'https://www.filmyzilla13.com/thumbs.jpg';
                                }}
                              />
                              <div className="flex-1 min-w-0 space-y-2">
                                <h3 className="font-medium text-sm leading-tight break-words line-clamp-2">
                                  {relatedMovie.title}
                                </h3>

                                <div className="flex flex-wrap items-center gap-2">
                                  {relatedMovie.quality && (
                                    <Badge className="bg-red-600 hover:bg-red-600 text-white text-xs">
                                      {relatedMovie.quality}
                                    </Badge>
                                  )}
                                </div>

                                {relatedMovie.starcast && (
                                  <p className="text-xs text-muted-foreground break-words line-clamp-2">
                                    <span className="text-red-500">Cast:</span>{' '}
                                    <span className="text-green-600">{relatedMovie.starcast}</span>
                                  </p>
                                )}

                                {relatedMovie.length && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="text-red-500">Length:</span>{' '}
                                    <span className="text-green-600">{relatedMovie.length}</span>
                                  </p>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs"
                                  asChild
                                >
                                  <Link
                                    href={`/movie${new URL(relatedMovie.url).pathname.replace('/movies/', '/')}`}
                                  >
                                    View Details
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No related movies available</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 sm:pt-6 lg:pt-8">
          <p className="text-muted-foreground text-xs sm:text-sm">
            Data scraped from FilmyZilla • Last updated: {data?.scrapedAt ? new Date(data.scrapedAt).toLocaleString() : new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {/* Download Drawer */}
      <DownloadDrawer
        isOpen={isDownloadDrawerOpen}
        onClose={() => setIsDownloadDrawerOpen(false)}
        downloadUrl={selectedDownloadUrl}
        movieTitle={movie?.title || ''}
        onPlay={(url) => {
          setVideoUrl(url);
          // Scroll to top to see the player
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
