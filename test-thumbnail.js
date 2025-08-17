// Thumbnail test script
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const fs = require('fs');
const sharp = require('sharp');

async function downloadAndConvertThumbnail(url, outputPath) {
    try {
        console.log(`Downloading: ${url}`);
        
        const isWebP = url.includes('vi_webp') || url.includes('.webp');
        
        const response = await axios({
            url: url,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.byteLength > 0) {
            console.log(`Downloaded: ${response.data.byteLength} bytes`);
            
            if (isWebP || url.includes('vi_webp')) {
                console.log('Converting WebP to JPEG from buffer...');
                const jpegBuffer = await sharp(response.data)
                    .jpeg({ quality: 90 })
                    .toBuffer();
                
                fs.writeFileSync(outputPath, jpegBuffer);
                console.log(`Converted: ${jpegBuffer.length} bytes`);
            } else {
                // Process other formats through Sharp for consistency
                const processedBuffer = await sharp(response.data)
                    .jpeg({ quality: 90 })
                    .toBuffer();
                
                fs.writeFileSync(outputPath, processedBuffer);
                console.log(`Processed: ${processedBuffer.length} bytes`);
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error(`Failed: ${error.message}`);
        return false;
    }
}

async function testThumbnailDownload(videoUrl) {
    try {
        console.log('Testing thumbnail download for:', videoUrl);
        
        const info = await ytdl.getInfo(videoUrl);
        console.log('Video title:', info.videoDetails.title);
        console.log('Video author:', info.videoDetails.author?.name);
        
        if (info.videoDetails.thumbnails && info.videoDetails.thumbnails.length > 0) {
            console.log('\nAvailable thumbnails:');
            
            const sortedThumbnails = info.videoDetails.thumbnails
                .filter(thumb => thumb.url && thumb.width && thumb.height)
                .sort((a, b) => b.width - a.width);
            
            sortedThumbnails.forEach((thumb, index) => {
                const format = thumb.url.includes('vi_webp') ? '(WebP)' : '(JPEG)';
                console.log(`${index + 1}. ${thumb.width}x${thumb.height} ${format} - ${thumb.url}`);
            });
            
            console.log('\nTesting top 3 thumbnails:');
            
            for (let i = 0; i < Math.min(3, sortedThumbnails.length); i++) {
                const thumb = sortedThumbnails[i];
                const outputPath = `test_thumbnail_${i + 1}.jpg`;
                
                console.log(`\nTest ${i + 1}: ${thumb.width}x${thumb.height}`);
                const success = await downloadAndConvertThumbnail(thumb.url, outputPath);
                
                if (success && fs.existsSync(outputPath)) {
                    const stats = fs.statSync(outputPath);
                    console.log(`✅ Success: ${outputPath} (${stats.size} bytes)`);
                    
                    // Try to verify it's a valid image
                    try {
                        const metadata = await sharp(outputPath).metadata();
                        console.log(`   Format: ${metadata.format}, ${metadata.width}x${metadata.height}`);
                    } catch (e) {
                        console.log(`   ⚠️ Could not read image metadata: ${e.message}`);
                    }
                } else {
                    console.log('❌ Failed to download or convert');
                }
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
    console.log('This will test thumbnail downloading and conversion for a video.');
}
