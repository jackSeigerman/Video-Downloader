const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ytdl = require('@distube/ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const fs = require('fs');
const NodeID3 = require('node-id3');
const axios = require('axios');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Helper function to download thumbnail
async function downloadThumbnail(thumbnailUrl, outputPath) {
    try {
        const response = await axios({
            url: thumbnailUrl,
            method: 'GET',
            responseType: 'arraybuffer'
        });
        
        fs.writeFileSync(outputPath, response.data);
        return outputPath;
    } catch (error) {
        console.error('Error downloading thumbnail:', error);
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
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, 'assets', 'YoutubeDownloaderLogo.png')
    });

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
ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    
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

        const info = await ytdl.getInfo(url);
        
        // Get available quality information from video-only formats (highest quality)
        const videoFormats = ytdl.filterFormats(info.formats, 'videoonly');
        const combinedFormats = ytdl.filterFormats(info.formats, 'videoandaudio');
        
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
        }
        
        return {
            success: true,
            title: info.videoDetails.title,
            duration: info.videoDetails.lengthSeconds,
            thumbnail: info.videoDetails.thumbnails[0]?.url,
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

        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title.replace(/[^\w\s\-_.]/gi, ''); // Remove special characters but keep safe ones
        
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
                
                // Check if we have separate high-quality streams available
                if (videoFormats.length > 0 && audioFormats.length > 0) {
                    // Find the highest quality video and audio
                    const highestVideo = videoFormats.reduce((prev, current) => {
                        return (current.height > prev.height) ? current : prev;
                    });
                    
                    const highestAudio = audioFormats.reduce((prev, current) => {
                        return (current.audioBitrate > prev.audioBitrate) ? current : prev;
                    });
                    
                    console.log(`Available video qualities: ${videoFormats.map(f => f.qualityLabel || f.height + 'p').join(', ')}`);
                    console.log(`Selected: ${highestVideo.qualityLabel || highestVideo.height + 'p'} video + ${highestAudio.audioBitrate}kbps audio`);
                    
                    const outputPath = path.join(downloadPath, `${title}.mp4`);
                    
                    // Create temporary file paths for video and audio
                    const tempVideoPath = path.join(downloadPath, `temp_video_${Date.now()}.mp4`);
                    const tempAudioPath = path.join(downloadPath, `temp_audio_${Date.now()}.mp4`);
                    
                    // Download video stream
                    const videoStream = ytdl(url, { format: highestVideo });
                    const videoWriteStream = fs.createWriteStream(tempVideoPath);
                    
                    let videoDownloaded = false;
                    let audioDownloaded = false;
                    
                    const checkBothComplete = () => {
                        if (videoDownloaded && audioDownloaded) {
                            // Both downloads complete, now merge with FFmpeg
                            event.sender.send('download-progress', { 
                                percent: 95,
                                stage: 'Merging video and audio...' 
                            });
                            
                            ffmpeg(tempVideoPath)
                                .input(tempAudioPath)
                                .videoCodec('copy')
                                .audioCodec('copy')
                                .format('mp4')
                                .save(outputPath)
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
                            
                            const fallbackStream = ytdl(url, { format: highestCombined });
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
                    const audioStream = ytdl(url, { format: highestAudio });
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
                        
                        const videoStream = ytdl(url, { format: highestCombined });
                        const outputPath = path.join(downloadPath, `${title}.mp4`);
                        const writeStream = fs.createWriteStream(outputPath);
                        
                        videoStream.on('progress', (chunkLength, downloaded, total) => {
                            const percent = ((downloaded / total) * 100).toFixed(1);
                            event.sender.send('download-progress', { 
                                percent, 
                                stage: `Downloading ${highestCombined.qualityLabel || highestCombined.height + 'p'}...`
                            });
                        });
                        
                        videoStream.pipe(writeStream);
                        
                        writeStream.on('finish', () => {
                            resolve({ success: true, path: outputPath });
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
                // Check for audio formats
                const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                if (audioFormats.length === 0) {
                    reject({ success: false, error: 'No audio formats available for this video' });
                    return;
                }

                // Get highest quality audio
                const highestAudio = audioFormats.reduce((prev, current) => {
                    return (current.audioBitrate > prev.audioBitrate) ? current : prev;
                });

                // Download audio only and convert to MP3
                const audioStream = ytdl(url, { format: highestAudio });
                const outputPath = path.join(downloadPath, `${title}.mp3`);
                const tempMp3Path = path.join(downloadPath, `temp_${title}_${Date.now()}.mp3`);
                
                // Extract metadata from video info
                const metadata = extractMetadata(info.videoDetails);
                
                // Get the best thumbnail (highest resolution)
                let thumbnailPromise = null;
                if (info.videoDetails.thumbnails && info.videoDetails.thumbnails.length > 0) {
                    const thumbnails = info.videoDetails.thumbnails;
                    const bestThumbnail = thumbnails.reduce((prev, current) => {
                        return (current.width > prev.width) ? current : prev;
                    });
                    
                    const thumbnailFile = path.join(downloadPath, `temp_thumb_${Date.now()}.jpg`);
                    event.sender.send('download-progress', { 
                        percent: 5,
                        stage: 'Downloading thumbnail...' 
                    });
                    
                    thumbnailPromise = downloadThumbnail(bestThumbnail.url, thumbnailFile);
                }
                
                ffmpeg(audioStream)
                    .audioBitrate(320)
                    .audioCodec('libmp3lame')
                    .format('mp3')
                    .save(tempMp3Path)
                    .on('progress', (progress) => {
                        const percent = Math.min(85, 10 + (progress.percent || 0) * 0.75);
                        event.sender.send('download-progress', { 
                            percent: percent,
                            stage: 'Converting to MP3...' 
                        });
                    })
                    .on('end', async () => {
                        // Wait for thumbnail download to complete
                        let thumbnailPath = null;
                        if (thumbnailPromise) {
                            try {
                                thumbnailPath = await thumbnailPromise;
                            } catch (thumbError) {
                                console.warn('Thumbnail download failed:', thumbError);
                            }
                        }
                        
                        // Now add metadata tags to the MP3 file
                        event.sender.send('download-progress', { 
                            percent: 90,
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
                            TRCK: '1/1', // Track number
                            TPE2: metadata.artist, // Album artist
                            TPOS: '1/1', // Disc number
                            TBPM: '', // BPM (empty)
                            TIT3: 'YouTube Download', // Subtitle
                            TKEY: '', // Key (empty)
                            TLAN: 'eng', // Language
                            TMED: 'DIG', // Media type (Digital)
                            TPUB: 'YouTube', // Publisher
                            TCOP: `© ${metadata.artist}`, // Copyright
                            TENC: 'YouTube Video Downloader', // Encoded by
                            TSSE: 'YouTube Video Downloader v1.0', // Software
                            WXXX: {
                                description: 'Source',
                                url: url
                            }
                        };
                        
                        // Add thumbnail as album art if available
                        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                            try {
                                tags.image = {
                                    mime: 'image/jpeg',
                                    type: {
                                        id: 3,
                                        name: 'front cover'
                                    },
                                    description: 'Album Cover',
                                    imageBuffer: fs.readFileSync(thumbnailPath)
                                };
                            } catch (thumbError) {
                                console.warn('Could not add thumbnail as album art:', thumbError);
                            }
                        }
                        
                        // Write tags to MP3 file
                        const success = NodeID3.write(tags, tempMp3Path);
                        
                        if (success) {
                            // Move the tagged file to final location
                            fs.renameSync(tempMp3Path, outputPath);
                            
                            // Clean up thumbnail file
                            if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                try {
                                    fs.unlinkSync(thumbnailPath);
                                } catch (cleanupError) {
                                    console.warn('Could not clean up thumbnail:', cleanupError);
                                }
                            }
                            
                            event.sender.send('download-progress', { 
                                percent: 100,
                                stage: 'Complete!' 
                            });
                            
                            resolve({ 
                                success: true, 
                                path: outputPath,
                                metadata: {
                                    title: metadata.title,
                                    artist: metadata.artist,
                                    year: metadata.year,
                                    hasArtwork: !!thumbnailPath
                                }
                            });
                        } else {
                            // If tagging fails, still keep the MP3 file
                            fs.renameSync(tempMp3Path, outputPath);
                            
                            // Clean up thumbnail file
                            if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                                try {
                                    fs.unlinkSync(thumbnailPath);
                                } catch (cleanupError) {}
                            }
                            
                            resolve({ 
                                success: true, 
                                path: outputPath,
                                warning: 'MP3 created but metadata tagging failed'
                            });
                        }
                    })
                    .on('error', (error) => {
                        console.error('FFmpeg error:', error);
                        
                        // Clean up temp files on error
                        try {
                            if (fs.existsSync(tempMp3Path)) fs.unlinkSync(tempMp3Path);
                            if (thumbnailPath && fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
                        } catch (cleanupError) {}
                        
                        reject({ success: false, error: 'Failed to convert to MP3: ' + error.message });
                    });
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