async function test() {
    const baseUrl = 'http://localhost:3001';

    // 1. Get movie details (we just need a valid movie URL to start)
    const movieUrl = 'https://www.filmyzilla13.com/movie/2464/jawan-(2023)-hindi-full-movie.html'; // Let's try this
    console.log(`Fetching movie details for: ${movieUrl}`);

    const movieRes = await fetch(`${baseUrl}/api/movie?url=${encodeURIComponent(movieUrl)}`);
    const movieData = await movieRes.json();

    if (!movieData.success || !movieData.data.downloadLinks.length) {
        console.log('Failed to fetch movie or no download links:', movieData);
        return;
    }

    const dlLink = movieData.data.downloadLinks[0].url;
    console.log(`\nFound original download link page: ${dlLink}`);

    // 2. Fetch server page manually to get cookies and token link
    console.log(`\nFetching server page: ${dlLink}`);
    // use dynamic import for axios and cheerio to avoid esm issues if needed, or require
    const axios = require('axios');
    const cheerio = require('cheerio');

    // Server page fetch
    const serverPageRes = await axios.get(dlLink, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Referer': 'https://www.filmyzilla13.com/'
        },
        validateStatus: () => true
    });

    console.log("Server page status:", serverPageRes.status);
    const cookies = serverPageRes.headers['set-cookie'] || [];
    const cookieHeader = cookies.join('; ');
    console.log("Cookies received:", cookieHeader);

    const $ = cheerio.load(serverPageRes.data);
    let tokenLink = '';
    $('a[href*="/downloads/"]').each((i, el) => {
        tokenLink = $(el).attr('href');
    });

    if (!tokenLink) {
        console.log("No token link found on server page! HTML snipped:");
        console.log("...", serverPageRes.data.substring(0, 500));
        return;
    }

    const absoluteTokenLink = tokenLink.startsWith('http') ? tokenLink : `https://www.filmyzilla13.com${tokenLink}`;
    console.log("\nExtracted token link:", absoluteTokenLink);

    // 3. Resolve the token link with cookies
    console.log(`\nResolving token link with cookies and referer...`);

    try {
        const resolveRes = await axios.get(absoluteTokenLink, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Referer': dlLink,
                'Cookie': cookieHeader
            },
            maxRedirects: 0,
            validateStatus: () => true
        });

        console.log(`Token fetch status: ${resolveRes.status}`);
        console.log(`Token fetch Location header: ${resolveRes.headers.location}`);
    } catch (err) {
        console.log("Error:", err.message);
    }
}

test();
