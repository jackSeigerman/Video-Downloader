// Debug script to test yt-dlp video quality detection
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

// Initialize yt-dlp wrapper
let ytDlp;

async function initializeYtDlp() {
    try {
        // Use local yt-dlp.exe in the project folder
        const localYtDlpPath = path.join(__dirname, 'yt-dlp.exe');
        
        if (fs.existsSync(localYtDlpPath)) {
            ytDlp = new YTDlpWrap(localYtDlpPath);
            console.log('Using local yt-dlp binary:', localYtDlpPath);
            return true;
        } else {
            // Fallback to default initialization
            ytDlp = new YTDlpWrap();
            console.log('Using default yt-dlp initialization');
            return true;
        }
    } catch (error) {
        console.error('Failed to initialize yt-dlp:', error);
        try {
            // Final fallback: try to use system yt-dlp
            ytDlp = new YTDlpWrap('yt-dlp');
            console.log('Using system yt-dlp binary');
            return true;
        } catch (fallbackError) {
            console.error('All yt-dlp initialization methods failed:', fallbackError);
            return false;
        }
    }
}

async function debugVideoQuality(url) {
    console.log('='.repeat(60));
    console.log('YT-DLP VIDEO QUALITY DEBUG REPORT');
    console.log('='.repeat(60));
    console.log(`Testing URL: ${url}`);
    console.log(`Node.js version: ${process.version}`);
    console.log(`Platform: ${process.platform}`);
    console.log(`App packaged: ${process.resourcesPath ? 'YES (Built)' : 'NO (Dev)'}`);
    console.log('');

    try {
        // Initialize yt-dlp
        const initialized = await initializeYtDlp();
        if (!initialized) {
            console.log('ERROR: Could not initialize yt-dlp');
            return;
        }

        console.log('Fetching video info with yt-dlp...');
        const videoInfo = await ytDlp.getVideoInfo(url);
        
        console.log(`Video Title: ${videoInfo.title}`);
        console.log(`Video Duration: ${videoInfo.duration}s`);
        console.log(`Upload Date: ${videoInfo.upload_date}`);
        console.log(`Uploader: ${videoInfo.uploader}`);
        console.log(`View Count: ${videoInfo.view_count}`);
        console.log('');

        // Analyze formats
        const formats = videoInfo.formats || [];
        const videoFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none'));
        const audioFormats = formats.filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
        const combinedFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none');

        console.log('FORMAT BREAKDOWN:');
        console.log(`Total formats: ${formats.length}`);
        console.log(`Video-only formats: ${videoFormats.length}`);
        console.log(`Audio-only formats: ${audioFormats.length}`);
        console.log(`Combined formats: ${combinedFormats.length}`);
        console.log('');

        // Show video-only formats in detail
        if (videoFormats.length > 0) {
            console.log('VIDEO-ONLY FORMATS:');
            console.log('Format ID\tQuality\tHeight\tFPS\tCodec\t\tContainer');
            console.log('-'.repeat(80));
            
            const sortedVideo = videoFormats
                .filter(f => f.height)
                .sort((a, b) => b.height - a.height);
                
            sortedVideo.forEach(format => {
                const formatId = format.format_id || 'N/A';
                const quality = format.format_note || `${format.height}p`;
                const height = format.height || 'N/A';
                const fps = format.fps || 'N/A';
                const codec = format.vcodec || 'N/A';
                const container = format.ext || 'N/A';
                
                console.log(`${formatId}\t\t${quality}\t${height}\t${fps}\t${codec}\t${container}`);
            });
            
            const highest = sortedVideo[0];
            console.log('');
            console.log(`HIGHEST QUALITY DETECTED: ${highest.format_note || highest.height + 'p'}`);
            console.log(`Details: ${highest.height}p, ${highest.fps || 'unknown'}fps, ${highest.vcodec}, ${highest.ext}`);
        } else {
            console.log('WARNING: No video-only formats found!');
        }

        console.log('');

        // Show combined formats
        if (combinedFormats.length > 0) {
            console.log('COMBINED FORMATS:');
            console.log('Format ID\tQuality\tHeight\tCodecs\t\t\tContainer');
            console.log('-'.repeat(70));
            
            const sortedCombined = combinedFormats
                .filter(f => f.height)
                .sort((a, b) => b.height - a.height);
                
            sortedCombined.forEach(format => {
                const formatId = format.format_id || 'N/A';
                const quality = format.format_note || `${format.height}p`;
                const height = format.height || 'N/A';
                const codecs = `${format.vcodec || 'N/A'}+${format.acodec || 'N/A'}`;
                const container = format.ext || 'N/A';
                
                console.log(`${formatId}\t\t${quality}\t${height}\t${codecs}\t${container}`);
            });
            
            const highestCombined = sortedCombined[0];
            console.log('');
            console.log(`HIGHEST COMBINED QUALITY: ${highestCombined.format_note || highestCombined.height + 'p'}`);
        }

        // Show unique qualities available
        const allVideoQualities = [...videoFormats, ...combinedFormats]
            .filter(f => f.height)
            .map(f => f.height + 'p')
            .filter((quality, index, self) => self.indexOf(quality) === index)
            .sort((a, b) => {
                const aNum = parseInt(a);
                const bNum = parseInt(b);
                return bNum - aNum;
            });

        console.log('');
        console.log(`ALL AVAILABLE VIDEO QUALITIES: ${allVideoQualities.join(', ')}`);
        
        // Environment info
        console.log('');
        console.log('ENVIRONMENT INFO:');
        console.log(`yt-dlp-wrap version: ${require('yt-dlp-wrap/package.json').version}`);
        console.log(`Working directory: ${process.cwd()}`);
        console.log(`Executable path: ${process.execPath}`);
        
        if (process.resourcesPath) {
            console.log(`Resources path: ${process.resourcesPath}`);
        }

        // Test best format selection
        console.log('');
        console.log('RECOMMENDED FORMATS:');
        
        if (videoFormats.length > 0 && audioFormats.length > 0) {
            const bestVideo = videoFormats.reduce((best, current) => {
                if (current.height > best.height) return current;
                if (current.height === best.height && current.fps > best.fps) return current;
                return best;
            });
            
            const bestAudio = audioFormats.reduce((best, current) => {
                return (current.abr || 0) > (best.abr || 0) ? current : best;
            });
            
            console.log(`Best Video: ${bestVideo.format_id} (${bestVideo.height}p, ${bestVideo.fps}fps, ${bestVideo.vcodec})`);
            console.log(`Best Audio: ${bestAudio.format_id} (${bestAudio.abr}kbps, ${bestAudio.acodec})`);
        }
        
        if (combinedFormats.length > 0) {
            const bestCombined = combinedFormats.reduce((best, current) => {
                if (current.height > best.height) return current;
                if (current.height === best.height && (current.tbr || 0) > (best.tbr || 0)) return current;
                return best;
            });
            
            console.log(`Best Combined: ${bestCombined.format_id} (${bestCombined.height}p, ${bestCombined.vcodec}+${bestCombined.acodec})`);
        }

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
    }
    
    console.log('');
    console.log('='.repeat(60));
}

// Test with a sample URL
const testUrl = process.argv[2] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

console.log('Starting yt-dlp quality debug test...');
debugVideoQuality(testUrl)
    .then(() => {
        console.log('Debug complete. Check the output above for quality information.');
        process.exit(0);
    })
    .catch(error => {
        console.error('Debug failed:', error);
        process.exit(1);
    });
