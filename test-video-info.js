// Test script to check video info detection
const { app } = require('electron');
const YTDlpWrap = require('yt-dlp-wrap').default;
const path = require('path');
const fs = require('fs');

let ytDlp;

async function initializeYtDlp() {
    try {
        const localYtDlpPath = path.join(__dirname, 'yt-dlp.exe');
        
        if (fs.existsSync(localYtDlpPath)) {
            ytDlp = new YTDlpWrap(localYtDlpPath);
            console.log('Using local yt-dlp binary:', localYtDlpPath);
            return true;
        } else {
            ytDlp = new YTDlpWrap();
            console.log('Using default yt-dlp initialization');
            return true;
        }
    } catch (error) {
        console.error('Failed to initialize yt-dlp:', error);
        return false;
    }
}

async function testVideoInfo(url) {
    try {
        console.log('Getting video info for:', url);
        
        // Get video information using yt-dlp
        const videoInfo = await ytDlp.getVideoInfo(url);
        
        console.log('Video info retrieved successfully');
        console.log('Title:', videoInfo.title);
        console.log('Duration:', videoInfo.duration);
        
        // Get available formats
        const formats = videoInfo.formats || [];
        console.log('Total formats available:', formats.length);
        
        // Log some format details for debugging
        if (formats.length > 0) {
            console.log('Sample formats:');
            formats.slice(0, 5).forEach(f => {
                console.log(`- ${f.format_id}: ${f.height}p, vcodec: ${f.vcodec}, acodec: ${f.acodec}`);
            });
        }
        
        const videoFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none'));
        const audioFormats = formats.filter(f => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none'));
        const combinedFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none');
        
        console.log('Video formats:', videoFormats.length);
        console.log('Audio formats:', audioFormats.length);
        console.log('Combined formats:', combinedFormats.length);
        
        // Log video format details
        if (videoFormats.length > 0) {
            console.log('Video format details:');
            videoFormats.forEach(f => {
                console.log(`- ${f.format_id}: ${f.height}p, ${f.fps}fps, ${f.vcodec}`);
            });
        }
        
        // Get available qualities - check all formats that have video
        let availableQualities = [];
        let highestQuality = 'Unknown';
        
        // Combine all formats that have video (both video-only and combined)
        const allVideoFormats = [...videoFormats, ...combinedFormats].filter(f => f.height);
        
        if (allVideoFormats.length > 0) {
            console.log('All video formats with height:');
            allVideoFormats.forEach(f => {
                console.log(`- ${f.format_id}: ${f.height}p, ${f.format_note || 'no note'}`);
            });
            
            const qualities = allVideoFormats
                .map(f => f.height)
                .filter((height, index, self) => self.indexOf(height) === index)
                .sort((a, b) => b - a)
                .map(h => h + 'p');
            
            availableQualities = qualities;
            highestQuality = qualities[0] || 'Unknown';
        }
        
        console.log('Highest quality detected:', highestQuality);
        console.log('Available qualities:', availableQualities);
        
        return {
            success: true,
            title: videoInfo.title,
            duration: videoInfo.duration,
            availableQualities: availableQualities,
            highestQuality: highestQuality
        };
    } catch (error) {
        console.error('Error getting video info:', error);
        return {
            success: false,
            error: 'Could not get video information. Please check the URL and try again.'
        };
    }
}

async function main() {
    console.log('Testing video info function...');
    
    const initialized = await initializeYtDlp();
    if (!initialized) {
        console.log('Failed to initialize yt-dlp');
        return;
    }
    
    const testUrl = process.argv[2] || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const result = await testVideoInfo(testUrl);
    
    console.log('\nFINAL RESULT:');
    console.log(JSON.stringify(result, null, 2));
}

main().then(() => {
    console.log('Test completed');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
