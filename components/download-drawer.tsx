"use client"

import { useState, useEffect, useRef } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExternalLinkIcon, ServerIcon, XIcon, PlayCircle, Loader2 } from "lucide-react";

interface ServerLink {
  title: string;
  url: string;
  serverNumber?: string;
}

interface DownloadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  movieTitle: string;
  onPlay?: (url: string) => void;
}

export function DownloadDrawer({ isOpen, onClose, downloadUrl, movieTitle, onPlay }: DownloadDrawerProps) {
  const [serverLinks, setServerLinks] = useState<ServerLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [isResolving, setIsResolving] = useState(false);
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
  const [resolveWarning, setResolveWarning] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && downloadUrl) {
      fetchServerLinks();
    }
  }, [isOpen, downloadUrl]);

  const fetchServerLinks = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/servers?url=${encodeURIComponent(downloadUrl)}`);
      const result = await response.json();

      if (result.success) {
        setServerLinks(result.data.servers || []);
      } else {
        setError(result.error || 'Failed to fetch server links');
      }
    } catch (err) {
      setError('Failed to load server links');
    } finally {
      setLoading(false);
    }
  };

  const handleServerClick = (serverUrl: string) => {
    // Open in the same tab
    window.location.href = serverUrl;
  };

  const handlePlayClick = async (serverUrl: string, index: number) => {
    if (!onPlay) return;

    // Cancel any previous resolution attempt
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const TIMEOUT_MS = 20_000;

    setIsResolving(true);
    setResolvingIndex(index);
    setResolveWarning(false);

    // Show a warning after 8 seconds
    const warningTimer = setTimeout(() => setResolveWarning(true), 8000);
    // Auto-abort after timeout
    const abortTimer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`/api/resolve?url=${encodeURIComponent(serverUrl)}`, {
        signal: controller.signal,
      });
      const result = await response.json();

      if (result.success && result.resolvedUrl) {
        onPlay(result.resolvedUrl);
        onClose();
      } else if (result.error === 'File Not Found or Link Expired' || !result.success) {
        // Show an error right in the drawer instead of crashing the video player
        setError(result.error || 'This server link cannot be played directly. Try another server or use the Open button to download it.');
      } else {
        // We only fall back if success but no resolved URL, or some other edge case
        onPlay(serverUrl);
        onClose();
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Timed out — fall back to original URL
        console.warn('Resolution timed out');
        setError('Resolution took too long. The server might be down or busy.');
      } else {
        console.error('Failed to resolve video:', err);
        setError('Failed to resolve the video. Please try another server.');
      }
    } finally {
      clearTimeout(warningTimer);
      clearTimeout(abortTimer);
      setIsResolving(false);
      setResolvingIndex(null);
      setResolveWarning(false);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-lg font-semibold line-clamp-2">
                Download Options
              </DrawerTitle>
              <DrawerDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {movieTitle}
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 ml-2"
            >
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Loading server links...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8 space-y-4">
              <div className="text-destructive font-medium">Error loading servers</div>
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="space-y-2">
                <Button onClick={fetchServerLinks} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Server Links */}
              {serverLinks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <ServerIcon className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Available Servers</h3>
                    <Badge variant="secondary" className="text-xs">
                      {serverLinks.length} server{serverLinks.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {serverLinks.map((server, index) => (
                      <Card key={index} className="transition-colors hover:bg-muted/50">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center shrink-0">
                                <ServerIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">
                                  {server.title}
                                </h4>
                                {server.serverNumber && (
                                  <p className="text-xs text-muted-foreground">
                                    Server {server.serverNumber}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleServerClick(server.url)}
                                variant="outline"
                                size="sm"
                                className="shrink-0"
                              >
                                <ExternalLinkIcon className="h-4 w-4 mr-2" />
                                Open
                              </Button>
                              {onPlay && (
                                <Button
                                  onClick={() => handlePlayClick(server.url, index)}
                                  variant="default"
                                  size="sm"
                                  disabled={isResolving}
                                  className="shrink-0 bg-primary hover:bg-primary/90 min-w-[70px]"
                                >
                                  {isResolving && resolvingIndex === index ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      {resolveWarning ? 'Slow...' : 'Loading'}
                                    </>
                                  ) : (
                                    <>
                                      <PlayCircle className="h-4 w-4 mr-2" />
                                      Play
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {serverLinks.length === 0 && !loading && !error && (
                <div className="text-center py-8 space-y-4">
                  <ServerIcon className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">No server links found</p>
                    <p className="text-sm text-muted-foreground">
                      Please try again later or contact support
                    </p>
                  </div>
                  <Button onClick={fetchServerLinks} variant="outline" className="w-full">
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <DrawerFooter className="border-t">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-center text-xs text-muted-foreground">
              <span>Choose your preferred server</span>
            </div>
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
