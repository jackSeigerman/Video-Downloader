// VP9 Detection Script
const ytdl = require('@distube/ytdl-core');

async function checkVideoCodecs(videoUrl) {
    try {
        console.log('Checking video codecs for:', videoUrl);
        
        const info = await ytdl.getInfo(videoUrl);
        console.log('Video title:', info.videoDetails.title);
        console.log('Duration:', Math.floor(info.videoDetails.lengthSeconds / 60) + ':' + (info.videoDetails.lengthSeconds % 60).toString().padStart(2, '0'));
        
        // Get video-only formats
        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
        const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        
        console.log('\n=== VIDEO-ONLY FORMATS ===');
        videoFormats.forEach((format, index) => {
            const isVP9 = format.codecs && (format.codecs.includes('vp9') || format.codecs.includes('vp09'));
            const codec = format.codecs || 'Unknown';
            const quality = format.qualityLabel || format.height + 'p';
            const marker = isVP9 ? '🔴 VP9' : '✅ H264';
            
            console.log(`${index + 1}. ${quality} - ${codec} ${marker}`);
        });
        
        console.log('\n=== COMBINED FORMATS ===');
        combinedFormats.forEach((format, index) => {
            const isVP9 = format.codecs && (format.codecs.includes('vp9') || format.codecs.includes('vp09'));
            const codec = format.codecs || 'Unknown';
            const quality = format.qualityLabel || format.height + 'p';
            const marker = isVP9 ? '🔴 VP9' : '✅ H264';
            
            console.log(`${index + 1}. ${quality} - ${codec} ${marker}`);
        });
        
        // Check what would be selected
        if (videoFormats.length > 0) {
            const highestVideo = videoFormats.reduce((prev, current) => {
                return (current.height > prev.height) ? current : prev;
            });
            
            const needsReencoding = highestVideo.codecs && 
                (highestVideo.codecs.includes('vp9') || highestVideo.codecs.includes('vp09'));
            
            console.log('\n=== SELECTION RESULT ===');
            console.log('Highest video format:', highestVideo.qualityLabel || highestVideo.height + 'p');
            console.log('Video codec:', highestVideo.codecs);
            console.log('Needs VP9 to H.264 conversion:', needsReencoding ? 'YES' : 'NO');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Usage
if (process.argv[2]) {
    checkVideoCodecs(process.argv[2]);
} else {
    console.log('Usage: node check-vp9.js "https://www.youtube.com/watch?v=VIDEO_ID"');
    console.log('This will show video codecs and identify VP9 videos that need conversion.');
}
