// Debug script to test video quality detection in built app vs dev mode
const ytdl = require('@distube/ytdl-core');

// Configure ytdl-core with the same options as main.js
const ytdlOptions = {
    requestOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }
    }
};

async function debugVideoQuality(url) {
    console.log('='.repeat(60));
    console.log('VIDEO QUALITY DEBUG REPORT');
    console.log('='.repeat(60));
    console.log(`Testing URL: ${url}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`App packaged: ${process.resourcesPath ? 'YES (Built)' : 'NO (Dev)'}`);
    console.log('');

    try {
        // Test URL validation
        const isValid = ytdl.validateURL(url);
        console.log(`URL Valid: ${isValid}`);
        
        if (!isValid) {
            console.log('ERROR: Invalid YouTube URL');
            return;
        }

        console.log('Fetching video info...');
        const info = await ytdl.getInfo(url, ytdlOptions);
        
        console.log(`Video Title: ${info.videoDetails.title}`);
        console.log(`Video Length: ${info.videoDetails.lengthSeconds}s`);
        console.log(`Total Formats: ${info.formats.length}`);
        console.log('');

        // Analyze formats
        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');

        console.log('FORMAT BREAKDOWN:');
        console.log(`Video-only formats: ${videoFormats.length}`);
        console.log(`Audio-only formats: ${audioFormats.length}`);
        console.log(`Combined formats: ${combinedFormats.length}`);
        console.log('');

        // Show video-only formats in detail
        if (videoFormats.length > 0) {
            console.log('VIDEO-ONLY FORMATS:');
            console.log('Quality\tHeight\tFPS\tContainer\tCodecs\t\tItag');
            console.log('-'.repeat(70));
            
            const sortedVideo = videoFormats
                .filter(f => f.height)
                .sort((a, b) => b.height - a.height);
                
            sortedVideo.forEach(format => {
                const quality = format.qualityLabel || `${format.height}p`;
                const fps = format.fps || 'N/A';
                const container = format.container || 'N/A';
                const codecs = format.codecs || 'N/A';
                const itag = format.itag;
                
                console.log(`${quality}\t${format.height}\t${fps}\t${container}\t\t${codecs}\t${itag}`);
            });
            
            const highest = sortedVideo[0];
            console.log('');
            console.log(`HIGHEST QUALITY DETECTED: ${highest.qualityLabel || highest.height + 'p'}`);
            console.log(`Details: ${highest.height}p, ${highest.fps || 'unknown'}fps, ${highest.container}, ${highest.codecs}`);
        } else {
            console.log('WARNING: No video-only formats found!');
        }

        console.log('');

        // Show combined formats
        if (combinedFormats.length > 0) {
            console.log('COMBINED FORMATS:');
            console.log('Quality\tHeight\tContainer\tCodecs\t\tItag');
            console.log('-'.repeat(60));
            
            const sortedCombined = combinedFormats
                .filter(f => f.height)
                .sort((a, b) => b.height - a.height);
                
            sortedCombined.forEach(format => {
                const quality = format.qualityLabel || `${format.height}p`;
                const container = format.container || 'N/A';
                const codecs = format.codecs || 'N/A';
                const itag = format.itag;
                
                console.log(`${quality}\t${format.height}\t${container}\t\t${codecs}\t${itag}`);
            });
            
            const highestCombined = sortedCombined[0];
            console.log('');
            console.log(`HIGHEST COMBINED QUALITY: ${highestCombined.qualityLabel || highestCombined.height + 'p'}`);
        }

        // Show unique qualities available
        const allQualities = [...videoFormats, ...combinedFormats]
            .filter(f => f.height)
            .map(f => f.qualityLabel || `${f.height}p`)
            .filter((quality, index, self) => self.indexOf(quality) === index)
            .sort((a, b) => {
                const aNum = parseInt(a);
                const bNum = parseInt(b);
                return bNum - aNum;
            });

        console.log('');
        console.log(`ALL AVAILABLE QUALITIES: ${allQualities.join(', ')}`);
        
        // Environment info
        console.log('');
        console.log('ENVIRONMENT INFO:');
        console.log(`ytdl-core version: ${require('@distube/ytdl-core/package.json').version}`);
        console.log(`Working directory: ${process.cwd()}`);
        console.log(`Executable path: ${process.execPath}`);
        
        if (process.resourcesPath) {
            console.log(`Resources path: ${process.resourcesPath}`);
        }

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('');
    console.log('='.repeat(60));
}

// Test with a sample URL (replace with actual test URL)
const testUrl = process.argv[2] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

console.log('Starting quality debug test...');
debugVideoQuality(testUrl)
    .then(() => {
        console.log('Debug complete. Check the output above for quality information.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Debug failed:', error);
        process.exit(1);
    });
