const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const NodeID3 = require('node-id3');
const axios = require('axios');
const sharp = require('sharp');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Configure ytdl-core for better format detection in built apps
const ytdlOptions = {
    requestOptions: {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"'
        }
    },
    requestCallback: (req) => {
        // Additional request configuration for built apps
        req.setHeader('Referer', 'https://www.youtube.com/');
        req.setHeader('Origin', 'https://www.youtube.com');
    }
};

// Helper function to download thumbnail
async function downloadThumbnail(thumbnailUrl, outputPath) {
    try {
        console.log('Downloading thumbnail from:', thumbnailUrl);
        
        // Detect if URL suggests WebP format
        const isWebP = thumbnailUrl.includes('vi_webp') || thumbnailUrl.includes('.webp');
        
        const response = await axios({
            url: thumbnailUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 15000, // 15 second timeout for larger images
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        if (response.data && response.data.byteLength > 0) {
            console.log(`Thumbnail downloaded: ${response.data.byteLength} bytes`);
            
            // If it's WebP, convert directly from buffer to avoid file locking
            if (isWebP || thumbnailUrl.includes('vi_webp')) {
                try {
                    console.log('Converting WebP to JPEG from buffer...');
                    const jpegBuffer = await sharp(response.data)
                        .resize(800, 800, { 
                            fit: 'inside',
                            withoutEnlargement: true 
                        })
                        .jpeg({ 
                            quality: 90,
                            progressive: false,
                            mozjpeg: true 
                        })
                        .toBuffer();
                    
                    fs.writeFileSync(outputPath, jpegBuffer);
                    console.log(`Converted thumbnail saved: ${jpegBuffer.length} bytes`);
                    return outputPath;
                } catch (conversionError) {
                    console.warn('WebP conversion failed, trying fallback:', conversionError.message);
                    // Fallback: save original data
                    fs.writeFileSync(outputPath, response.data);
                    console.log('Using original format as fallback');
                    return outputPath;
                }
            } else {
                // For regular images, still process through Sharp for consistency and optimization
                try {
                    const processedBuffer = await sharp(response.data)
                        .resize(800, 800, { 
                            fit: 'inside',
                            withoutEnlargement: true 
                        })
                        .jpeg({ 
                            quality: 90,
                            progressive: false,
                            mozjpeg: true 
                        })
                        .toBuffer();
                    
                    fs.writeFileSync(outputPath, processedBuffer);
                    console.log(`Processed thumbnail saved: ${processedBuffer.length} bytes`);
                    return outputPath;
                } catch (processError) {
                    console.warn('Image processing failed, using original:', processError.message);
                    // Use original data if processing fails
                    fs.writeFileSync(outputPath, response.data);
                    return outputPath;
                }
            }
        } else {
            console.warn('Thumbnail response was empty');
            return null;
        }
    } catch (error) {
        console.error('Error downloading thumbnail:', error.message);
        return null;
    }
}

// Helper function to extract metadata from YouTube video info
function extractMetadata(videoDetails) {
    const metadata = {
        title: videoDetails.title || 'Unknown Title',
        artist: videoDetails.author?.name || videoDetails.ownerChannelName || 'Unknown Artist',
        album: `YouTube - ${videoDetails.author?.name || 'Unknown Channel'}`,
        year: null,
        comment: {
            language: 'eng',
            text: `Downloaded from: ${videoDetails.video_url}\nChannel: ${videoDetails.author?.name || 'Unknown'}\nViews: ${videoDetails.viewCount || 'Unknown'}\nDuration: ${videoDetails.lengthSeconds ? Math.floor(videoDetails.lengthSeconds / 60) + ':' + (videoDetails.lengthSeconds % 60).toString().padStart(2, '0') : 'Unknown'}`
        },
        genre: 'YouTube',
        performerInfo: videoDetails.author?.name || 'Unknown',
        originalFilename: videoDetails.title || 'Unknown'
    };
    
    // Try to extract year from upload date or publish date
    if (videoDetails.publishDate) {
        const year = new Date(videoDetails.publishDate).getFullYear();
        if (year > 1900 && year <= new Date().getFullYear()) {
            metadata.year = year.toString();
        }
    } else if (videoDetails.uploadDate) {
        const year = parseInt(videoDetails.uploadDate.substring(0, 4));
        if (year > 1900 && year <= new Date().getFullYear()) {
            metadata.year = year.toString();
        }
    }
    
    // Add more detailed description if available
    if (videoDetails.description) {
        const shortDesc = videoDetails.description.length > 200 
            ? videoDetails.description.substring(0, 200) + '...' 
            : videoDetails.description;
        metadata.comment.text = `${shortDesc}\n\n${metadata.comment.text}`;
    }
    
    return metadata;
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets', 'YoutubeDownloaderLogo.png'),
        autoHideMenuBar: true,
        menuBarVisible: false
    });

    // Remove the menu bar completely
    mainWindow.setMenuBarVisibility(false);
    mainWindow.setMenu(null);

    mainWindow.loadFile('index.html');
    
    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC handlers
ipcMain.handle('select-directory', async (event, defaultPath) => {
    const dialogOptions = {
        properties: ['openDirectory']
    };
    
    // Set default path if provided and it exists
    if (defaultPath) {
        const fs = require('fs');
        try {
            if (fs.existsSync(defaultPath)) {
                dialogOptions.defaultPath = defaultPath;
            }
        } catch (error) {
            // Ignore error, just don't set default path
        }
    }
    
    const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
    
    return result.filePaths[0];
});

ipcMain.handle('get-video-info', async (event, url) => {
    try {
        // Validate URL first
        if (!ytdl.validateURL(url)) {
            return {
                success: false,
                error: 'Invalid YouTube URL'
            };
        }

        console.log('Getting video info for:', url);
        const info = await ytdl.getInfo(url, ytdlOptions);
        
        console.log('Available formats count:', info.formats.length);
        console.log('Video formats:', info.formats.filter(f => f.hasVideo && f.hasAudio === false).map(f => ({
            quality: f.qualityLabel,
            height: f.height,
            container: f.container,
            codecs: f.codecs
        })));
        
        // Get the best quality thumbnail
        let thumbnail = null;
        if (info.videoDetails.thumbnails && info.videoDetails.thumbnails.length > 0) {
            // Sort thumbnails by resolution (highest first)
            const sortedThumbnails = info.videoDetails.thumbnails
                .filter(thumb => thumb.url && thumb.width && thumb.height)
                .sort((a, b) => b.width - a.width);
            
            // Get the highest quality thumbnail, but prefer medium quality for faster loading
            if (sortedThumbnails.length > 0) {
                // If there are multiple thumbnails, get a good balance of quality and size
                const mediumQualityThumb = sortedThumbnails.find(thumb => 
                    thumb.width >= 320 && thumb.width <= 640
                );
                thumbnail = mediumQualityThumb?.url || sortedThumbnails[0]?.url;
            }
        }
        
        // Get available quality information from video-only formats (highest quality)
        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
        const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        
        console.log('Video-only formats count:', videoFormats.length);
        console.log('Combined formats count:', combinedFormats.length);
        
        // Find the absolute highest quality from video-only formats
        let highestQuality = 'Unknown';
        let availableQualities = [];
        
        if (videoFormats.length > 0) {
            const sortedVideoFormats = videoFormats
                .filter(format => format.height) // Only formats with height info
                .sort((a, b) => b.height - a.height); // Sort by height descending
            
            availableQualities = sortedVideoFormats
                .map(format => format.qualityLabel || `${format.height}p`)
                .filter((quality, index, self) => self.indexOf(quality) === index);
            
            highestQuality = availableQualities[0] || 'Unknown';
            console.log('Highest video quality detected:', highestQuality);
        } else if (combinedFormats.length > 0) {
            // Fallback to combined formats if no video-only available
            availableQualities = combinedFormats
                .map(format => format.qualityLabel || `${format.height}p`)
                .filter((quality, index, self) => self.indexOf(quality) === index)
                .sort((a, b) => {
                    const aNum = parseInt(a);
                    const bNum = parseInt(b);
                    return bNum - aNum;
                });
            highestQuality = availableQualities[0] || 'Unknown';
            console.log('Highest combined quality detected:', highestQuality);
        }
        
        return {
            success: true,
            title: info.videoDetails.title,
            duration: info.videoDetails.lengthSeconds,
            thumbnail: thumbnail,
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
});

ipcMain.handle('download-video', async (event, { url, downloadPath, format }) => {
    try {
        // Validate URL first
        if (!ytdl.validateURL(url)) {
            return { success: false, error: 'Invalid YouTube URL' };
        }

        console.log('Getting video info for download...');
        const info = await ytdl.getInfo(url, ytdlOptions);
        const title = info.videoDetails.title.replace(/[^\w\s\-_.]/gi, ''); // Remove special characters but keep safe ones
        
        console.log('Total formats available:', info.formats.length);
        
        // Check if directory exists and is writable
        if (!fs.existsSync(downloadPath)) {
            return { success: false, error: 'Download directory does not exist' };
        }

        return new Promise((resolve, reject) => {
            if (format === 'mp4') {
                // Strategy: Try highest quality video-only + audio-only first, then fallback to combined
                const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
                const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
                
                console.log('Available video-only formats:', videoFormats.length);
                console.log('Available audio-only formats:', audioFormats.length);
                console.log('Available combined formats:', combinedFormats.length);
                
                // Log detailed format information for debugging
                if (videoFormats.length > 0) {
                    console.log('Video formats details:', videoFormats.map(f => ({
                        itag: f.itag,
                        quality: f.qualityLabel,
                        height: f.height,
                        container: f.container,
                        codecs: f.codecs,
                        fps: f.fps
                    })));
                }
                
                // Check if we have separate high-quality streams available
                if (videoFormats.length > 0 && audioFormats.length > 0) {
                    // Find the highest quality video and audio with improved selection
                    const highestVideo = videoFormats.reduce((prev, current) => {
                        // Prioritize by height, then by fps for same height
                        if (current.height !== prev.height) {
                            return (current.height > prev.height) ? current : prev;
                        }
                        // If same height, prefer higher fps
                        if (current.fps && prev.fps && current.fps !== prev.fps) {
                            return (current.fps > prev.fps) ? current : prev;
                        }
                        // If same height and fps (or no fps info), prefer better container/codec
                        if (current.container === 'mp4' && prev.container !== 'mp4') {
                            return current;
                        }
                        return prev;
                    });
                    
                    const highestAudio = audioFormats.reduce((prev, current) => {
                        return (current.audioBitrate > prev.audioBitrate) ? current : prev;
                    });
                    
                    console.log(`Available video qualities: ${videoFormats.map(f => f.qualityLabel || f.height + 'p').join(', ')}`);
                    console.log(`Selected: ${highestVideo.qualityLabel || highestVideo.height + 'p'} video (${highestVideo.container}, ${highestVideo.codecs}) + ${highestAudio.audioBitrate}kbps audio`);
                    
                    const outputPath = path.join(downloadPath, `${title}.mp4`);
                    
                    // Create temporary file paths for video and audio
                    const tempVideoPath = path.join(downloadPath, `temp_video_${Date.now()}.mp4`);
                    const tempAudioPath = path.join(downloadPath, `temp_audio_${Date.now()}.mp4`);
                    
                    // Download video stream with options
                    const videoStream = ytdl(url, { 
                        format: highestVideo,
                        ...ytdlOptions
                    });
                    const videoWriteStream = fs.createWriteStream(tempVideoPath);
                    
                    let videoDownloaded = false;
                    let audioDownloaded = false;
                    
                    const checkBothComplete = () => {
                        if (videoDownloaded && audioDownloaded) {
                            // Both downloads complete, now merge with FFmpeg
                            event.sender.send('download-progress', { 
                                percent: 95,
                                stage: 'Processing for Premiere Pro compatibility...' 
                            });
                            
                            // Check if video needs re-encoding (VP9 to H.264 for Premiere Pro)
                            const needsVideoReencoding = highestVideo.codecs && 
                                (highestVideo.codecs.includes('vp9') || highestVideo.codecs.includes('vp09'));
                            
                            console.log(`Video codec: ${highestVideo.codecs}, needs re-encoding: ${needsVideoReencoding}`);
                            
                            const ffmpegCommand = ffmpeg(tempVideoPath)
                                .input(tempAudioPath)
                                .audioCodec('aac')
                                .audioChannels(2)
                                .audioFrequency(48000)
                                .audioBitrate('320k')
                                .format('mp4')
                                .outputOptions([
                                    '-movflags', '+faststart',
                                    '-strict', 'experimental'
                                ]);
                            
                            if (needsVideoReencoding) {
                                // Re-encode VP9 to H.264 for Premiere Pro compatibility
                                console.log('Converting VP9 to H.264 for Premiere Pro...');
                                event.sender.send('download-progress', { 
                                    percent: 95,
                                    stage: 'Converting VP9 to H.264 for Premiere Pro...' 
                                });
                                
                                ffmpegCommand
                                    .videoCodec('libx264')
                                    .videoBitrate('8000k') // High quality for editing
                                    .outputOptions([
                                        '-preset', 'fast',      // Balance speed vs compression
                                        '-crf', '18',           // High quality constant rate factor
                                        '-pix_fmt', 'yuv420p'   // Premiere-compatible pixel format
                                    ]);
                            } else {
                                // Copy video codec if it's already compatible (H.264, etc.)
                                ffmpegCommand.videoCodec('copy');
                            }
                            
                            ffmpegCommand
                                .save(outputPath)
                                .on('progress', (progress) => {
                                    if (needsVideoReencoding) {
                                        // Video re-encoding progress (slower)
                                        const percent = Math.min(99, 95 + (progress.percent || 0) * 0.04);
                                        event.sender.send('download-progress', { 
                                            percent: percent,
                                            stage: `Converting VP9 to H.264... ${Math.round(progress.percent || 0)}%`
                                        });
                                    }
                                })
                                .on('end', () => {
                                    // Clean up temporary files
                                    try {
                                        fs.unlinkSync(tempVideoPath);
                                        fs.unlinkSync(tempAudioPath);
                                    } catch (cleanupError) {
                                        console.warn('Could not clean up temporary files:', cleanupError);
                                    }
                                    resolve({ success: true, path: outputPath });
                                })
                                .on('error', (error) => {
                                    console.error('FFmpeg merge error:', error);
                                    // Clean up temporary files on error
                                    try {
                                        fs.unlinkSync(tempVideoPath);
                                        fs.unlinkSync(tempAudioPath);
                                    } catch (cleanupError) {}
                                    
                                    // Fallback to combined format
                                    downloadCombinedFormat();
                                });
                        }
                    };
                    
                    const downloadCombinedFormat = () => {
                        console.log('Falling back to combined format...');
                        if (combinedFormats.length > 0) {
                            const highestCombined = combinedFormats.reduce((prev, current) => {
                                if (current.height !== prev.height) {
                                    return (current.height > prev.height) ? current : prev;
                                }
                                return (current.bitrate > prev.bitrate) ? current : prev;
                            });
                            
                            const fallbackStream = ytdl(url, { 
                                format: highestCombined,
                                ...ytdlOptions
                            });
                            const writeStream = fs.createWriteStream(outputPath);
                            
                            fallbackStream.on('progress', (chunkLength, downloaded, total) => {
                                const percent = ((downloaded / total) * 100).toFixed(1);
                                event.sender.send('download-progress', { 
                                    percent, 
                                    stage: `Downloading ${highestCombined.qualityLabel || highestCombined.height + 'p'}...`
                                });
                            });
                            
                            fallbackStream.pipe(writeStream);
                            
                            writeStream.on('finish', () => {
                                resolve({ success: true, path: outputPath });
                            });
                            
                            writeStream.on('error', (error) => {
                                reject({ success: false, error: 'Failed to download video: ' + error.message });
                            });
                        } else {
                            reject({ success: false, error: 'No suitable video formats available' });
                        }
                    };
                    
                    // Download video
                    videoStream.on('progress', (chunkLength, downloaded, total) => {
                        const percent = ((downloaded / total) * 50).toFixed(1); // Video is 50% of progress
                        event.sender.send('download-progress', { 
                            percent, 
                            stage: `Downloading ${highestVideo.qualityLabel || highestVideo.height + 'p'} video...`
                        });
                    });
                    
                    videoStream.pipe(videoWriteStream);
                    
                    videoWriteStream.on('finish', () => {
                        videoDownloaded = true;
                        checkBothComplete();
                    });
                    
                    videoWriteStream.on('error', (error) => {
                        console.error('Video download error:', error);
                        downloadCombinedFormat();
                    });
                    
                    // Download audio
                    const audioStream = ytdl(url, { 
                        format: highestAudio,
                        ...ytdlOptions
                    });
                    const audioWriteStream = fs.createWriteStream(tempAudioPath);
                    
                    audioStream.on('progress', (chunkLength, downloaded, total) => {
                        const percent = (50 + (downloaded / total) * 45).toFixed(1); // Audio is 45% of progress (50-95%)
                        event.sender.send('download-progress', { 
                            percent, 
                            stage: 'Downloading audio...'
                        });
                    });
                    
                    audioStream.pipe(audioWriteStream);
                    
                    audioWriteStream.on('finish', () => {
                        audioDownloaded = true;
                        checkBothComplete();
                    });
                    
                    audioWriteStream.on('error', (error) => {
                        console.error('Audio download error:', error);
                        downloadCombinedFormat();
                    });
                    
                } else {
                    // Fallback to combined formats only
                    if (combinedFormats.length > 0) {
                        const highestCombined = combinedFormats.reduce((prev, current) => {
                            if (current.height !== prev.height) {
                                return (current.height > prev.height) ? current : prev;
                            }
                            return (current.bitrate > prev.bitrate) ? current : prev;
                        });
                        
                        console.log(`Available combined qualities: ${combinedFormats.map(f => f.qualityLabel || f.height + 'p').join(', ')}`);
                        console.log(`Selected combined quality: ${highestCombined.qualityLabel || highestCombined.height + 'p'}`);
                        
                        const videoStream = ytdl(url, { 
                            format: highestCombined,
                            ...ytdlOptions
                        });
                        const outputPath = path.join(downloadPath, `${title}.mp4`);
                        const tempCombinedPath = path.join(downloadPath, `temp_combined_${Date.now()}.mp4`);
                        const writeStream = fs.createWriteStream(tempCombinedPath);
                        
                        videoStream.on('progress', (chunkLength, downloaded, total) => {
                            const percent = ((downloaded / total) * 90).toFixed(1); // Leave 10% for processing
                            event.sender.send('download-progress', { 
                                percent, 
                                stage: `Downloading ${highestCombined.qualityLabel || highestCombined.height + 'p'}...`
                            });
                        });
                        
                        videoStream.pipe(writeStream);
                        
                        writeStream.on('finish', () => {
                            // Check if video needs re-encoding for Premiere Pro compatibility
                            event.sender.send('download-progress', { 
                                percent: 95,
                                stage: 'Processing for Premiere Pro compatibility...' 
                            });
                            
                            const needsVideoReencoding = highestCombined.codecs && 
                                (highestCombined.codecs.includes('vp9') || highestCombined.codecs.includes('vp09'));
                            
                            console.log(`Combined format codec: ${highestCombined.codecs}, needs re-encoding: ${needsVideoReencoding}`);
                            
                            const ffmpegCommand = ffmpeg(tempCombinedPath)
                                .audioCodec('aac')
                                .audioChannels(2)
                                .audioFrequency(48000)
                                .audioBitrate('320k')
                                .format('mp4')
                                .outputOptions([
                                    '-movflags', '+faststart',
                                    '-strict', 'experimental'
                                ]);
                            
                            if (needsVideoReencoding) {
                                // Re-encode VP9 to H.264 for Premiere Pro compatibility
                                console.log('Converting VP9 to H.264 for Premiere Pro...');
                                event.sender.send('download-progress', { 
                                    percent: 95,
                                    stage: 'Converting VP9 to H.264 for Premiere Pro...' 
                                });
                                
                                ffmpegCommand
                                    .videoCodec('libx264')
                                    .videoBitrate('8000k')
                                    .outputOptions([
                                        '-preset', 'fast',
                                        '-crf', '18',
                                        '-pix_fmt', 'yuv420p'
                                    ]);
                            } else {
                                ffmpegCommand.videoCodec('copy');
                            }
                            
                            ffmpegCommand
                                .save(outputPath)
                                .on('progress', (progress) => {
                                    if (needsVideoReencoding) {
                                        // Video re-encoding progress
                                        const percent = Math.min(99, 95 + (progress.percent || 0) * 0.04);
                                        event.sender.send('download-progress', { 
                                            percent: percent,
                                            stage: `Converting VP9 to H.264... ${Math.round(progress.percent || 0)}%`
                                        });
                                    }
                                })
                                .on('end', () => {
                                    // Clean up temporary file
                                    try {
                                        fs.unlinkSync(tempCombinedPath);
                                    } catch (cleanupError) {
                                        console.warn('Could not clean up temporary file:', cleanupError);
                                    }
                                    resolve({ success: true, path: outputPath });
                                })
                                .on('error', (error) => {
                                    console.error('FFmpeg processing error:', error);
                                    // Clean up temp file and fall back to original
                                    try {
                                        if (fs.existsSync(tempCombinedPath)) {
                                            fs.renameSync(tempCombinedPath, outputPath);
                                            console.log('Falling back to original file format');
                                            resolve({ success: true, path: outputPath });
                                        } else {
                                            reject({ success: false, error: 'Failed to process video: ' + error.message });
                                        }
                                    } catch (fallbackError) {
                                        reject({ success: false, error: 'Failed to process video: ' + error.message });
                                    }
                                });
                        });
                        
                        writeStream.on('error', (error) => {
                            reject({ success: false, error: 'Failed to write file: ' + error.message });
                        });
                        
                        videoStream.on('error', (error) => {
                            reject({ success: false, error: 'Failed to download video: ' + error.message });
                        });
                    } else {
                        reject({ success: false, error: 'No video formats available for this video' });
                    }
                }
                
            } else if (format === 'mp3') {
                // Async function to handle MP3 download with thumbnail
                const downloadMp3WithMetadata = async () => {
                    // Check for audio formats
                    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                    if (audioFormats.length === 0) {
                        throw new Error('No audio formats available for this video');
                    }

                    // Get highest quality audio
                    const highestAudio = audioFormats.reduce((prev, current) => {
                        return (current.audioBitrate > prev.audioBitrate) ? current : prev;
                    });

                    // Extract metadata from video info
                    const metadata = extractMetadata(info.videoDetails);
                    
                    // First, download the thumbnail if available
                    let thumbnailPath = null;
                    if (info.videoDetails.thumbnails && info.videoDetails.thumbnails.length > 0) {
                        const thumbnails = info.videoDetails.thumbnails;
                        
                        // Sort thumbnails by quality (width) descending
                        const sortedThumbnails = thumbnails
                            .filter(thumb => thumb.url && thumb.width && thumb.height)
                            .sort((a, b) => b.width - a.width);
                        
                        const thumbnailFile = path.join(downloadPath, `temp_thumb_${Date.now()}.jpg`);
                        event.sender.send('download-progress', { 
                            percent: 5,
                            stage: 'Downloading thumbnail...' 
                        });
                        
                        // Try multiple thumbnail URLs in order of quality
                        for (let i = 0; i < Math.min(3, sortedThumbnails.length); i++) {
                            const thumbnail = sortedThumbnails[i];
                            console.log(`Trying thumbnail ${i + 1}: ${thumbnail.width}x${thumbnail.height} from ${thumbnail.url}`);
                            
                            try {
                                thumbnailPath = await downloadThumbnail(thumbnail.url, thumbnailFile);
                                
                                if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                    const stats = fs.statSync(thumbnailPath);
                                    if (stats.size > 0) {
                                        console.log(`Thumbnail success: ${stats.size} bytes`);
                                        break; // Success, stop trying
                                    } else {
                                        console.warn('Thumbnail file is empty, trying next...');
                                        try {
                                            fs.unlinkSync(thumbnailPath);
                                        } catch (e) {}
                                        thumbnailPath = null;
                                    }
                                } else {
                                    console.warn('Thumbnail download failed, trying next...');
                                    thumbnailPath = null;
                                }
                            } catch (thumbError) {
                                console.warn(`Thumbnail ${i + 1} failed:`, thumbError.message);
                                thumbnailPath = null;
                            }
                        }
                        
                        if (!thumbnailPath) {
                            console.warn('All thumbnail downloads failed');
                        }
                    }

                    // Now start audio download and conversion
                    const audioStream = ytdl(url, { 
                        format: highestAudio,
                        ...ytdlOptions
                    });
                    const outputPath = path.join(downloadPath, `${title}.mp3`);
                    const tempMp3Path = path.join(downloadPath, `temp_${title}_${Date.now()}.mp3`);
                    
                    event.sender.send('download-progress', { 
                        percent: 10,
                        stage: 'Starting audio conversion...' 
                    });
                    
                    return new Promise((resolveInner, rejectInner) => {
                        ffmpeg(audioStream)
                            .audioBitrate(320)
                            .audioCodec('libmp3lame')
                            .format('mp3')
                            .save(tempMp3Path)
                            .on('progress', (progress) => {
                                const percent = Math.min(80, 15 + (progress.percent || 0) * 0.65);
                                event.sender.send('download-progress', { 
                                    percent: percent,
                                    stage: 'Converting to MP3...' 
                                });
                            })
                            .on('end', () => {
                                // Now add metadata tags to the MP3 file
                                event.sender.send('download-progress', { 
                                    percent: 85,
                                    stage: 'Adding metadata tags...' 
                                });
                                
                                const tags = {
                                    title: metadata.title,
                                    artist: metadata.artist,
                                    album: metadata.album,
                                    genre: metadata.genre,
                                    year: metadata.year,
                                    comment: metadata.comment,
                                    performerInfo: metadata.performerInfo,
                                    originalFilename: metadata.originalFilename,
                                    TRCK: '1/1',
                                    TPE2: metadata.artist,
                                    TPOS: '1/1',
                                    TBPM: '',
                                    TIT3: 'YouTube Download',
                                    TKEY: '',
                                    TLAN: 'eng',
                                    TMED: 'DIG',
                                    TPUB: 'YouTube',
                                    TCOP: `© ${metadata.artist}`,
                                    TENC: 'YouTube Video Downloader',
                                    TSSE: 'YouTube Video Downloader v1.0',
                                    WXXX: {
                                        description: 'Source',
                                        url: url
                                    }
                                };
                                
                                // Add thumbnail as album art if available and verify it exists
                                if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                    try {
                                        const thumbnailBuffer = fs.readFileSync(thumbnailPath);
                                        if (thumbnailBuffer.length > 0) {
                                            // Use APIC frame format for better compatibility
                                            tags.APIC = {
                                                mime: 'image/jpeg',
                                                type: {
                                                    id: 3,
                                                    name: 'front cover'
                                                },
                                                description: 'Cover (front)',
                                                imageBuffer: thumbnailBuffer
                                            };
                                            
                                            // Also set the legacy image field for backward compatibility
                                            tags.image = {
                                                mime: 'image/jpeg',
                                                type: {
                                                    id: 3,
                                                    name: 'front cover'
                                                },
                                                description: 'Cover (front)',
                                                imageBuffer: thumbnailBuffer
                                            };
                                            
                                            console.log(`Album art added (APIC + image): ${thumbnailBuffer.length} bytes`);
                                            
                                            event.sender.send('download-progress', { 
                                                percent: 90,
                                                stage: 'Embedding album artwork...' 
                                            });
                                        } else {
                                            console.warn('Thumbnail buffer is empty');
                                        }
                                    } catch (thumbError) {
                                        console.warn('Could not read thumbnail for album art:', thumbError);
                                    }
                                } else {
                                    console.warn('No thumbnail available for album art');
                                }
                                
                                event.sender.send('download-progress', { 
                                    percent: 95,
                                    stage: 'Writing metadata to file...' 
                                });
                                
                                // Write tags to MP3 file
                                try {
                                    const success = NodeID3.write(tags, tempMp3Path);
                                    
                                    if (success) {
                                        // Move the tagged file to final location
                                        fs.renameSync(tempMp3Path, outputPath);
                                        console.log('MP3 metadata written successfully');
                                        
                                        // Clean up thumbnail file
                                        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                            try {
                                                fs.unlinkSync(thumbnailPath);
                                                console.log('Thumbnail cleanup completed');
                                            } catch (cleanupError) {
                                                console.warn('Could not clean up thumbnail:', cleanupError);
                                            }
                                        }
                                        
                                        event.sender.send('download-progress', { 
                                            percent: 100,
                                            stage: 'Complete!' 
                                        });
                                        
                                        resolveInner({ 
                                            success: true, 
                                            path: outputPath,
                                            metadata: {
                                                title: metadata.title,
                                                artist: metadata.artist,
                                                year: metadata.year,
                                                hasArtwork: !!(thumbnailPath && tags.image)
                                            }
                                        });
                                    } else {
                                        console.warn('NodeID3.write returned false');
                                        fs.renameSync(tempMp3Path, outputPath);
                                        
                                        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                            try {
                                                fs.unlinkSync(thumbnailPath);
                                            } catch (cleanupError) {}
                                        }
                                        
                                        resolveInner({ 
                                            success: true, 
                                            path: outputPath,
                                            warning: 'MP3 created but metadata tagging failed'
                                        });
                                    }
                                } catch (tagError) {
                                    console.error('Error writing metadata:', tagError);
                                    fs.renameSync(tempMp3Path, outputPath);
                                    
                                    if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                        try {
                                            fs.unlinkSync(thumbnailPath);
                                        } catch (cleanupError) {}
                                    }
                                    
                                    resolveInner({ 
                                        success: true, 
                                        path: outputPath,
                                        warning: 'MP3 created but metadata tagging failed: ' + tagError.message
                                    });
                                }
                            })
                            .on('error', (error) => {
                                console.error('FFmpeg error:', error);
                                
                                // Clean up temp files on error
                                try {
                                    if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
                                    if (thumbnailPath && fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
                                } catch (cleanupError) {
                                    console.warn('Error cleaning up temp files:', cleanupError);
                                }
                                
                                rejectInner({ success: false, error: 'Failed to convert to MP3: ' + error.message });
                            });
                    });
                };
                
                // Execute the async MP3 download
                downloadMp3WithMetadata()
                    .then(result => resolve(result))
                    .catch(error => reject(error));
            }
        });
        
    } catch (error) {
        console.error('Download error:', error);
        return { 
            success: false, 
            error: 'Download failed. This could be due to YouTube restrictions or network issues. Please try again.' 
        };
    }
});