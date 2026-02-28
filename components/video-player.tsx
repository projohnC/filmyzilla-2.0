"use client"

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Settings, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

interface VideoPlayerProps {
    url: string;
    title?: string;
    poster?: string;
    onClose?: () => void;
}

export function VideoPlayer({ url, title, poster, onClose }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [error, setError] = useState<string | null>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        setIsLoading(true);
        setError(null);

        console.log('VideoPlayer attempting to load URL:', url);

        if (Hls.isSupported() && (url.endsWith('.m3u8') || url.includes('.m3u8'))) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setIsLoading(false);
                // video.play().catch(() => setIsPlaying(false));
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    console.error('HLS Fatal Error:', data);
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            setError('The video could not be loaded. This might be due to an unsupported format or an expired link.');
                            hls.destroy();
                            break;
                    }
                }
            });
            return () => hls.destroy();
        } else {
            video.src = url;

            const handleLoadedMetadata = () => {
                setIsLoading(false);
                setDuration(video.duration);
            };

            const handleError = () => {
                setIsLoading(false);
                const err = video.error;

                console.error('Video element error details:', {
                    code: err?.code,
                    message: err?.message,
                    networkState: video.networkState,
                    readyState: video.readyState,
                    src: video.src,
                    currentSrc: video.currentSrc
                });
                console.error('Video event error object:', err);

                let errorMessage = 'The video stream is unavailable or the format is not supported by your browser.';
                if (err) {
                    switch (err.code) {
                        case 1: // MediaError.MEDIA_ERR_ABORTED
                            errorMessage = 'Video playback was aborted.';
                            break;
                        case 2: // MediaError.MEDIA_ERR_NETWORK
                            errorMessage = 'A network error caused the video download to fail. Please check your connection.';
                            break;
                        case 3: // MediaError.MEDIA_ERR_DECODE
                            errorMessage = 'The video could not be decoded. It might be corrupted or in an unsupported format.';
                            break;
                        case 4: // MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
                            errorMessage = 'The video format is not supported or the link is invalid. Try a different server or download.';
                            break;
                    }
                }

                setError(errorMessage);
            };

            video.addEventListener('loadedmetadata', handleLoadedMetadata);
            video.addEventListener('error', handleError);

            return () => {
                video.removeEventListener('loadedmetadata', handleLoadedMetadata);
                video.removeEventListener('error', handleError);
            };
        }
    }, [url]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleSeek = (value: number[]) => {
        if (videoRef.current) {
            videoRef.current.currentTime = value[0];
            setCurrentTime(value[0]);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            setIsMuted(newVolume === 0);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const skip = (amount: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime += amount;
        }
    };

    const changePlaybackRate = (rate: number) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
            setPlaybackRate(rate);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative group bg-black rounded-xl overflow-hidden aspect-video shadow-2xl transition-all duration-300",
                isFullscreen ? "w-full h-full rounded-none" : "w-full"
            )}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && setShowControls(false)}
        >
            <video
                ref={videoRef}
                className="w-full h-full"
                onTimeUpdate={handleTimeUpdate}
                onClick={togglePlay}
                onPause={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                poster={poster}
                playsInline
            />

            {/* Loading Spinner */}
            {isLoading && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 p-6 text-center">
                    <div className="max-w-md space-y-4">
                        <VolumeX className="w-12 h-12 text-destructive mx-auto opacity-50" />
                        <h4 className="text-white font-semibold">Playback Error</h4>
                        <p className="text-zinc-400 text-sm">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                            onClick={() => window.location.reload()}
                        >
                            Try Refreshing
                        </Button>
                    </div>
                </div>
            )}

            {/* Overlay Title */}
            {showControls && title && (
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
                    <h3 className="text-white font-medium text-lg drop-shadow-md truncate">{title}</h3>
                </div>
            )}

            {/* Center Play/Pause Button (Mobile Style) */}
            {!isLoading && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-20 h-20 bg-primary/90 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 pointer-events-auto cursor-pointer" onClick={togglePlay}>
                        <Play className="w-10 h-10 text-white fill-current ml-1" />
                    </div>
                </div>
            )}

            {/* Bottom Controls */}
            <div className={cn(
                "absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300 space-y-2",
                showControls ? "opacity-100" : "opacity-0"
            )}>
                {/* Progress Bar */}
                <div className="flex items-center gap-3">
                    <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={togglePlay}>
                            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                        </Button>

                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hidden sm:flex" onClick={() => skip(-10)}>
                            <SkipBack className="w-5 h-5 fill-current" />
                        </Button>

                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hidden sm:flex" onClick={() => skip(10)}>
                            <SkipForward className="w-5 h-5 fill-current" />
                        </Button>

                        <div className="flex items-center group/volume">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleMute}>
                                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </Button>
                            <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 ml-1">
                                <Slider
                                    value={[isMuted ? 0 : volume]}
                                    max={1}
                                    step={0.01}
                                    onValueChange={handleVolumeChange}
                                    className="w-20"
                                />
                            </div>
                        </div>

                        <div className="text-white text-xs font-medium ml-2 font-mono">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                    <Settings className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => changePlaybackRate(0.5)}>0.5x</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => changePlaybackRate(1)}>1.0x (Normal)</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => changePlaybackRate(1.5)}>1.5x</DropdownMenuItem>
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => changePlaybackRate(2)}>2.0x</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                        </Button>

                        {onClose && !isFullscreen && (
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 bg-red-500/20 hover:bg-red-500/40" onClick={onClose}>
                                <span className="text-lg">×</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
