import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.filmyzilla13.com';
const REQUEST_TIMEOUT = 15000; // 15 second timeout per request

const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': BASE_URL + '/',
    'Connection': 'keep-alive',
};

function isDirectLink(url: string): boolean {
    return (
        url.includes('workers.dev') ||
        url.includes('.mkv') ||
        url.includes('.mp4') ||
        url.includes('.m3u8') ||
        url.includes('cdn.') ||
        url.includes('stream.')
    );
}

/**
 * Follow redirects by making a streaming request and aborting immediately.
 * This is MUCH faster than downloading the full body — we only need the final URL.
 */
async function followRedirectsFast(url: string, extraHeaders: Record<string, string> = {}): Promise<string> {
    const response = await axios.get(url, {
        headers: { ...BROWSER_HEADERS, ...extraHeaders },
        maxRedirects: 10,
        validateStatus: (status) => status >= 200 && status < 400,
        responseType: 'stream',
        timeout: REQUEST_TIMEOUT,
    });

    // Get the final URL after redirects
    const finalUrl = (response.request as any)?.res?.responseUrl || response.config.url || url;

    // Abort the stream immediately — we don't need the body
    if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy();
    }

    return finalUrl;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json(
                { success: false, error: 'URL is required' },
                { status: 400 }
            );
        }

        console.log('Resolving URL:', url);

        // Fast path: URL already looks like a direct video/stream link
        if (isDirectLink(url)) {
            return NextResponse.json({
                success: true,
                originalUrl: url,
                resolvedUrl: url,
                isResolved: true,
                strategy: 'fast-path',
                scrapedAt: new Date().toISOString()
            });
        }

        // Step 1: Fetch the download/server page HTML
        // We DO need the HTML here to find the download button, so we can't stream
        const pageResponse = await axios.get(url, {
            headers: BROWSER_HEADERS,
            maxRedirects: 10,
            validateStatus: (status) => status >= 200 && status < 400,
            timeout: REQUEST_TIMEOUT,
        });

        const cookies = pageResponse.headers['set-cookie'];
        const cookieHeader = cookies ? cookies.join('; ') : '';
        const $ = cheerio.load(pageResponse.data);

        let resolvedUrl = '';

        // Strategy 1: Find the "Start Download Now" button (a.newdl)
        const downloadButton = $('a.newdl').first();
        if (downloadButton.length > 0) {
            const buttonHref = downloadButton.attr('href');
            if (buttonHref) {
                const absoluteButtonUrl = buttonHref.startsWith('http')
                    ? buttonHref
                    : `${BASE_URL}${buttonHref}`;

                // Use streaming + abort to follow redirects without downloading the file body
                try {
                    resolvedUrl = await followRedirectsFast(absoluteButtonUrl, {
                        'Cookie': cookieHeader,
                        'Referer': url,
                    });
                } catch (err) {
                    console.warn('Strategy 1 (newdl button) failed:', err instanceof Error ? err.message : err);
                }
            }
        }

        // Strategy 2: Look for other known direct link patterns
        if (!resolvedUrl || !isDirectLink(resolvedUrl)) {
            const directLinkSelectors = [
                'a[href*="getfile"]',
                'a[href*="downloadfile"]',
                'a:contains("Start Download Now")',
                'a:contains("Download Now")',
            ];

            for (const selector of directLinkSelectors) {
                const link = $(selector).first().attr('href');
                if (link) {
                    const absoluteLink = link.startsWith('http') ? link : `${BASE_URL}${link}`;
                    try {
                        resolvedUrl = await followRedirectsFast(absoluteLink, {
                            'Cookie': cookieHeader,
                            'Referer': url,
                        });
                        if (isDirectLink(resolvedUrl)) break;
                    } catch (err) {
                        console.warn('Strategy 2 selector failed:', selector, err instanceof Error ? err.message : err);
                    }
                }
            }
        }

        // Strategy 3: Scan all anchors for video extensions directly in the href
        if (!resolvedUrl || !isDirectLink(resolvedUrl)) {
            $('a').each((_, el) => {
                const href = $(el).attr('href');
                if (href && isDirectLink(href)) {
                    resolvedUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                    return false; // break cheerio loop
                }
            });
        }

        const isResolved = !!resolvedUrl && isDirectLink(resolvedUrl);

        return NextResponse.json({
            success: true,
            originalUrl: url,
            resolvedUrl: resolvedUrl || url,
            isResolved,
            strategy: isResolved ? 'scraped' : 'fallback',
            scrapedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error resolving video link:', error);

        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'File Not Found or Link Expired',
                    isResolved: false
                },
                { status: 200 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to resolve video link',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
