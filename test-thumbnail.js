// Thumbnail test script
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const fs = require('fs');

async function testThumbnailDownload(videoUrl) {
    try {
        console.log('Testing thumbnail download for:', videoUrl);
        
        const info = await ytdl.getInfo(videoUrl);
        console.log('Video title:', info.videoDetails.title);
        
        if (info.videoDetails.thumbnails && info.videoDetails.thumbnails.length > 0) {
            console.log('\nAvailable thumbnails:');
            info.videoDetails.thumbnails.forEach((thumb, index) => {
                console.log(`${index + 1}. ${thumb.width}x${thumb.height} - ${thumb.url}`);
            });
            
            // Get highest quality thumbnail
            const bestThumbnail = info.videoDetails.thumbnails.reduce((prev, current) => {
                return (current.width > prev.width) ? current : prev;
            });
            
            console.log(`\nDownloading best thumbnail: ${bestThumbnail.width}x${bestThumbnail.height}`);
            console.log('URL:', bestThumbnail.url);
            
            // Download thumbnail
            const response = await axios({
                url: bestThumbnail.url,
                method: 'GET',
                responseType: 'arraybuffer',
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const outputPath = 'test_thumbnail.jpg';
            fs.writeFileSync(outputPath, response.data);
            
            console.log(`\nThumbnail downloaded successfully!`);
            console.log(`File size: ${response.data.byteLength} bytes`);
            console.log(`Saved as: ${outputPath}`);
            
            // Verify file
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log(`File verified: ${stats.size} bytes on disk`);
                
                if (stats.size > 0) {
                    console.log('✅ Thumbnail download successful!');
                } else {
                    console.log('❌ Thumbnail file is empty');
                }
            } else {
                console.log('❌ Thumbnail file was not created');
            }
            
        } else {
            console.log('No thumbnails available for this video');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Usage
if (process.argv[2]) {
    testThumbnailDownload(process.argv[2]);
} else {
    console.log('Usage: node test-thumbnail.js "https://www.youtube.com/watch?v=VIDEO_ID"');
}
