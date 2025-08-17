// Debug script to test YouTube video quality detection
const ytdl = require('@distube/ytdl-core');

async function testVideoQuality(url) {
    try {
        console.log('Testing URL:', url);
        const info = await ytdl.getInfo(url);
        
        console.log('\n=== VIDEO INFO ===');
        console.log('Title:', info.videoDetails.title);
        console.log('Duration:', info.videoDetails.lengthSeconds + ' seconds');
        
        console.log('\n=== VIDEO-ONLY FORMATS (HIGHEST QUALITY) ===');
        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
        if (videoFormats.length > 0) {
            const sortedVideo = videoFormats
                .filter(f => f.height)
                .sort((a, b) => b.height - a.height);
            
            console.log('Available video-only qualities:');
            sortedVideo.slice(0, 10).forEach((format, index) => {
                console.log(`  ${index + 1}. ${format.qualityLabel || format.height + 'p'} (${format.container}) - ${format.bitrate || 'N/A'} kbps`);
            });
            
            const highest = sortedVideo[0];
            console.log(`\nHIGHEST VIDEO QUALITY: ${highest.qualityLabel || highest.height + 'p'}`);
        } else {
            console.log('No video-only formats found');
        }
        
        console.log('\n=== AUDIO-ONLY FORMATS ===');
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        if (audioFormats.length > 0) {
            const sortedAudio = audioFormats.sort((a, b) => b.audioBitrate - a.audioBitrate);
            console.log('Available audio-only qualities:');
            sortedAudio.slice(0, 5).forEach((format, index) => {
                console.log(`  ${index + 1}. ${format.audioBitrate}kbps (${format.container})`);
            });
            
            const highestAudio = sortedAudio[0];
            console.log(`\nHIGHEST AUDIO QUALITY: ${highestAudio.audioBitrate}kbps`);
        }
        
        console.log('\n=== COMBINED FORMATS (video+audio) ===');
        const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        if (combinedFormats.length > 0) {
            console.log('Available combined qualities:');
            combinedFormats.forEach((format, index) => {
                console.log(`  ${index + 1}. ${format.qualityLabel || format.height + 'p'} (${format.container}) - ${format.bitrate || 'N/A'} kbps`);
            });
            
            const highestCombined = combinedFormats.reduce((prev, current) => {
                if (current.height !== prev.height) {
                    return (current.height > prev.height) ? current : prev;
                }
                return (current.bitrate > prev.bitrate) ? current : prev;
            });
            
            console.log(`\nHIGHEST COMBINED QUALITY: ${highestCombined.qualityLabel || highestCombined.height + 'p'}`);
        } else {
            console.log('No combined formats found');
        }
        
        console.log('\n=== RECOMMENDATION ===');
        if (videoFormats.length > 0 && audioFormats.length > 0) {
            const highestVideo = videoFormats.reduce((prev, current) => {
                return (current.height > prev.height) ? current : prev;
            });
            const highestAudio = audioFormats.reduce((prev, current) => {
                return (current.audioBitrate > prev.audioBitrate) ? current : prev;
            });
            
            console.log(`Best strategy: Download ${highestVideo.qualityLabel || highestVideo.height + 'p'} video + ${highestAudio.audioBitrate}kbps audio separately, then merge`);
        } else if (combinedFormats.length > 0) {
            const highestCombined = combinedFormats.reduce((prev, current) => {
                return (current.height > prev.height) ? current : prev;
            });
            console.log(`Fallback strategy: Download ${highestCombined.qualityLabel || highestCombined.height + 'p'} combined format`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test function
console.log('Debug script loaded. Usage:');
console.log('testVideoQuality("https://www.youtube.com/watch?v=YOUR_VIDEO_ID")');

module.exports = { testVideoQuality };
