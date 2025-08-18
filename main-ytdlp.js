const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const NodeID3 = require('node-id3');
const axios = require('axios');
const sharp = require('sharp');
const YTDlpWrap = require('yt-dlp-wrap').default;

// Initialize yt-dlp wrapper
let ytDlp;

// Initialize yt-dlp on app ready
async function initializeYtDlp() {
    try {
        ytDlp = new YTDlpWrap();
        console.log('yt-dlp initialized successfully');
    } catch (error) {
        console.error('Failed to initialize yt-dlp:', error);
        // Fallback: try to use system yt-dlp
        ytDlp = new YTDlpWrap('yt-dlp');
    }
}

// Helper function to download thumbnail
async function downloadThumbnail(thumbnailUrl, outputPath) {
    try {
        console.log('Downloading thumbnail from:', thumbnailUrl);
        
        const response = await axios({
            url: thumbnailUrl,
            method: 'GET',
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        });
        
        if (response.data && response.data.byteLength > 0) {
            console.log(`Thumbnail downloaded: ${response.data.byteLength} bytes`);
            
            try {
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
                console.log(`Processed thumbnail saved: ${jpegBuffer.length} bytes`);
                return outputPath;
            } catch (processError) {
                console.warn('Image processing failed, using original:', processError.message);
                fs.writeFileSync(outputPath, response.data);
                return outputPath;
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

// Helper function to extract metadata from yt-dlp info
function extractMetadata(videoInfo) {
    const metadata = {
        title: videoInfo.title || 'Unknown Title',
        artist: videoInfo.uploader || videoInfo.channel || 'Unknown Artist',
        album: `YouTube - ${videoInfo.uploader || videoInfo.channel || 'Unknown Channel'}`,
        year: null,
        comment: {
            language: 'eng',
            text: `Downloaded from: ${videoInfo.webpage_url || videoInfo.original_url}\nChannel: ${videoInfo.uploader || 'Unknown'}\nViews: ${videoInfo.view_count || 'Unknown'}\nDuration: ${videoInfo.duration ? Math.floor(videoInfo.duration / 60) + ':' + (videoInfo.duration % 60).toString().padStart(2, '0') : 'Unknown'}`
        },
        genre: 'YouTube',
        performerInfo: videoInfo.uploader || 'Unknown',
        originalFilename: videoInfo.title || 'Unknown',
        trackNumber: '1/1',
        partOfSet: '1/1',
        albumArtist: videoInfo.uploader || 'Unknown',
        subtitle: 'YouTube Download',
        language: 'eng',
        mediaType: 'DIG',
        publisher: 'YouTube',
        copyright: `© ${videoInfo.uploader || 'Unknown'}`,
        encodedBy: 'YouTube Video Downloader',
        software: 'YouTube Video Downloader v1.0'
    };
    
    // Try to extract year from upload date
    if (videoInfo.upload_date) {
        const year = parseInt(videoInfo.upload_date.substring(0, 4));
        if (year > 1900 && year <= new Date().getFullYear()) {
            metadata.year = year.toString();
        }
    }
    
    // Add description if available
    if (videoInfo.description) {
        const shortDesc = videoInfo.description.length > 200 
            ? videoInfo.description.substring(0, 200) + '...' 
            : videoInfo.description;
        metadata.comment.text = `${shortDesc}\n\n${metadata.comment.text}`;
    }
    
    // Add custom URL tag
    if (videoInfo.webpage_url) {
        metadata.userDefinedUrl = [{
            description: 'Source URL',
            url: videoInfo.webpage_url
        }];
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

    mainWindow.setMenuBarVisibility(false);
    mainWindow.setMenu(null);
    mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
    await initializeYtDlp();
    createWindow();
});

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
    
    if (defaultPath && fs.existsSync(defaultPath)) {
        dialogOptions.defaultPath = defaultPath;
    }
    
    const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
    return result.filePaths[0];
});

ipcMain.handle('get-video-info', async (event, url) => {
    try {
        console.log('Getting video info for:', url);
        
        // Get video information using yt-dlp
        const videoInfo = await ytDlp.getVideoInfo(url);
        
        console.log('Video info retrieved successfully');
        console.log('Title:', videoInfo.title);
        console.log('Duration:', videoInfo.duration);
        
        // Get available formats
        const formats = videoInfo.formats || [];
        const videoFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && !f.acodec);
        const audioFormats = formats.filter(f => f.acodec && f.acodec !== 'none' && !f.vcodec);
        const combinedFormats = formats.filter(f => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none');
        
        console.log('Video formats:', videoFormats.length);
        console.log('Audio formats:', audioFormats.length);
        console.log('Combined formats:', combinedFormats.length);
        
        // Get available qualities
        let availableQualities = [];
        let highestQuality = 'Unknown';
        
        if (videoFormats.length > 0) {
            const qualities = videoFormats
                .filter(f => f.height)
                .map(f => f.height + 'p')
                .filter((quality, index, self) => self.indexOf(quality) === index)
                .sort((a, b) => parseInt(b) - parseInt(a));
            
            availableQualities = qualities;
            highestQuality = qualities[0] || 'Unknown';
        } else if (combinedFormats.length > 0) {
            const qualities = combinedFormats
                .filter(f => f.height)
                .map(f => f.height + 'p')
                .filter((quality, index, self) => self.indexOf(quality) === index)
                .sort((a, b) => parseInt(b) - parseInt(a));
            
            availableQualities = qualities;
            highestQuality = qualities[0] || 'Unknown';
        }
        
        console.log('Highest quality detected:', highestQuality);
        console.log('Available qualities:', availableQualities);
        
        // Get thumbnail
        let thumbnail = null;
        if (videoInfo.thumbnail) {
            thumbnail = videoInfo.thumbnail;
        } else if (videoInfo.thumbnails && videoInfo.thumbnails.length > 0) {
            // Get highest quality thumbnail
            const sortedThumbnails = videoInfo.thumbnails
                .filter(thumb => thumb.url && thumb.width && thumb.height)
                .sort((a, b) => b.width - a.width);
            
            thumbnail = sortedThumbnails[0]?.url;
        }
        
        return {
            success: true,
            title: videoInfo.title,
            duration: videoInfo.duration,
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
        console.log('Starting download with yt-dlp...');
        console.log('URL:', url);
        console.log('Path:', downloadPath);
        console.log('Format:', format);
        
        // Check if directory exists
        if (!fs.existsSync(downloadPath)) {
            return { success: false, error: 'Download directory does not exist' };
        }

        // Get video info first for metadata
        const videoInfo = await ytDlp.getVideoInfo(url);
        const title = videoInfo.title.replace(/[^\w\s\-_.]/gi, '');
        
        console.log('Video title:', title);

        return new Promise(async (resolve, reject) => {
            try {
                if (format === 'mp4') {
                    // Download best quality video
                    const outputPath = path.join(downloadPath, `${title}.%(ext)s`);
                    
                    console.log('Downloading MP4 with highest quality...');
                    
                    // Use yt-dlp to download best quality video
                    const stream = ytDlp.exec([
                        url,
                        '-f', 'best[height<=2160]', // Best quality up to 4K
                        '-o', outputPath,
                        '--no-playlist',
                        '--embed-metadata',
                        '--add-metadata'
                    ]);
                    
                    let progress = 0;
                    
                    stream.on('progress', (progressData) => {
                        if (progressData.percent) {
                            progress = parseFloat(progressData.percent);
                            event.sender.send('download-progress', {
                                percent: progress,
                                stage: `Downloading ${progressData.percent}%...`
                            });
                        }
                    });
                    
                    stream.on('youtubeDL', (data) => {
                        console.log('yt-dlp output:', data);
                    });
                    
                    stream.on('error', (error) => {
                        console.error('Download error:', error);
                        reject({ success: false, error: 'Download failed: ' + error.message });
                    });
                    
                    stream.on('close', () => {
                        console.log('Download completed');
                        const finalPath = path.join(downloadPath, `${title}.mp4`);
                        resolve({ success: true, path: finalPath });
                    });
                    
                } else if (format === 'mp3') {
                    console.log('Downloading MP3...');
                    
                    // Download thumbnail first for metadata
                    let thumbnailPath = null;
                    if (videoInfo.thumbnail) {
                        try {
                            event.sender.send('download-progress', {
                                percent: 5,
                                stage: 'Downloading thumbnail...'
                            });
                            
                            thumbnailPath = path.join(downloadPath, `temp_thumbnail_${Date.now()}.jpg`);
                            await downloadThumbnail(videoInfo.thumbnail, thumbnailPath);
                        } catch (error) {
                            console.warn('Thumbnail download failed:', error);
                        }
                    }
                    
                    // Download audio with yt-dlp
                    const outputPath = path.join(downloadPath, `${title}.%(ext)s`);
                    
                    const stream = ytDlp.exec([
                        url,
                        '-x', // Extract audio
                        '--audio-format', 'mp3',
                        '--audio-quality', '0', // Best quality
                        '-o', outputPath,
                        '--no-playlist',
                        '--embed-metadata',
                        '--add-metadata'
                    ]);
                    
                    let downloadProgress = 0;
                    
                    stream.on('progress', (progressData) => {
                        if (progressData.percent) {
                            downloadProgress = parseFloat(progressData.percent);
                            // Reserve 5-85% for download, 85-90% for metadata, 90-100% for finalization
                            const adjustedProgress = 5 + (downloadProgress * 0.8);
                            event.sender.send('download-progress', {
                                percent: adjustedProgress,
                                stage: `Converting to MP3... ${progressData.percent}%`
                            });
                        }
                    });
                    
                    stream.on('youtubeDL', (data) => {
                        console.log('yt-dlp output:', data);
                    });
                    
                    stream.on('error', (error) => {
                        console.error('Download error:', error);
                        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                            fs.unlinkSync(thumbnailPath);
                        }
                        reject({ success: false, error: 'Download failed: ' + error.message });
                    });
                    
                    stream.on('close', async () => {
                        try {
                            console.log('Audio download completed, adding metadata...');
                            
                            event.sender.send('download-progress', {
                                percent: 85,
                                stage: 'Adding metadata tags...'
                            });
                            
                            const finalMp3Path = path.join(downloadPath, `${title}.mp3`);
                            
                            // Extract metadata
                            const metadata = extractMetadata(videoInfo);
                            
                            // Add thumbnail as album art if available
                            if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                try {
                                    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
                                    metadata.image = {
                                        mime: 'image/jpeg',
                                        type: {
                                            id: 3,
                                            name: 'front cover'
                                        },
                                        description: 'Album Cover',
                                        imageBuffer: thumbnailBuffer
                                    };
                                } catch (error) {
                                    console.warn('Failed to add album art:', error);
                                }
                            }
                            
                            // Write metadata to MP3
                            try {
                                const success = NodeID3.write(metadata, finalMp3Path);
                                if (success) {
                                    console.log('Metadata written successfully');
                                } else {
                                    console.warn('Failed to write some metadata');
                                }
                            } catch (error) {
                                console.warn('Metadata writing failed:', error);
                            }
                            
                            // Clean up thumbnail
                            if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                fs.unlinkSync(thumbnailPath);
                            }
                            
                            event.sender.send('download-progress', {
                                percent: 100,
                                stage: 'Complete!'
                            });
                            
                            resolve({ 
                                success: true, 
                                path: finalMp3Path,
                                metadata: {
                                    title: metadata.title,
                                    artist: metadata.artist,
                                    year: metadata.year,
                                    hasAlbumArt: !!metadata.image
                                }
                            });
                            
                        } catch (error) {
                            console.error('Post-processing error:', error);
                            if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                fs.unlinkSync(thumbnailPath);
                            }
                            reject({ success: false, error: 'Post-processing failed: ' + error.message });
                        }
                    });
                }
                
            } catch (error) {
                console.error('Download setup error:', error);
                reject({ success: false, error: 'Failed to start download: ' + error.message });
            }
        });
        
    } catch (error) {
        console.error('Download error:', error);
        return { 
            success: false, 
            error: 'Download failed. Please check the URL and try again.'
        };
    }
});
