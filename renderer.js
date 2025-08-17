const { ipcRenderer } = require('electron');

// DOM elements
const videoUrlInput = document.getElementById('videoUrl');
const downloadPathInput = document.getElementById('downloadPath');
const selectDirBtn = document.getElementById('selectDir');
const formatSelect = document.getElementById('format');
const downloadBtn = document.getElementById('downloadBtn');
const downloadForm = document.getElementById('downloadForm');
const videoInfo = document.getElementById('videoInfo');
const videoTitle = document.getElementById('videoTitle');
const videoDuration = document.getElementById('videoDuration');
const status = document.getElementById('status');

// Event listeners
selectDirBtn.addEventListener('click', selectDirectory);
videoUrlInput.addEventListener('blur', getVideoInfo);
downloadForm.addEventListener('submit', downloadVideo);

async function selectDirectory() {
    try {
        const selectedPath = await ipcRenderer.invoke('select-directory');
        if (selectedPath) {
            downloadPathInput.value = selectedPath;
        }
    } catch (error) {
        showStatus('Error selecting directory: ' + error.message, 'error');
    }
}

async function getVideoInfo() {
    const url = videoUrlInput.value.trim();
    if (!url || !isValidYouTubeUrl(url)) {
        videoInfo.classList.remove('show');
        return;
    }

    try {
        showStatus('Getting video information...', 'loading');
        const info = await ipcRenderer.invoke('get-video-info', url);
        
        if (info.success) {
            videoTitle.textContent = info.title;
            videoDuration.textContent = `Duration: ${formatDuration(info.duration)}`;
            
            // Show quality information if available
            if (info.highestQuality) {
                const qualityInfo = document.createElement('div');
                qualityInfo.className = 'video-quality';
                qualityInfo.style.color = '#28a745';
                qualityInfo.style.fontWeight = '600';
                qualityInfo.style.marginTop = '5px';
                qualityInfo.textContent = `Highest Quality Available: ${info.highestQuality}`;
                
                // Remove any existing quality info
                const existingQuality = videoInfo.querySelector('.video-quality');
                if (existingQuality) {
                    existingQuality.remove();
                }
                
                videoInfo.appendChild(qualityInfo);
            }
            
            videoInfo.classList.add('show');
            hideStatus();
        } else {
            showStatus('Error getting video info: ' + info.error, 'error');
            videoInfo.classList.remove('show');
        }
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
        videoInfo.classList.remove('show');
    }
}

async function downloadVideo(event) {
    event.preventDefault();
    
    const url = videoUrlInput.value.trim();
    const downloadPath = downloadPathInput.value.trim();
    const format = formatSelect.value;

    if (!url || !downloadPath) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }

    if (!isValidYouTubeUrl(url)) {
        showStatus('Please enter a valid YouTube URL', 'error');
        return;
    }

    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = '📥 Downloading...';
        showStatus(`Downloading ${format.toUpperCase()} in highest quality...`, 'loading');

        // Listen for progress updates
        ipcRenderer.on('download-progress', (event, progress) => {
            if (progress.percent) {
                const percent = Math.round(progress.percent);
                downloadBtn.textContent = `📥 ${percent}%`;
                showStatus(`${progress.stage || 'Downloading'} ${percent}%`, 'loading');
            }
        });

        const result = await ipcRenderer.invoke('download-video', {
            url,
            downloadPath,
            format
        });

        // Remove progress listener
        ipcRenderer.removeAllListeners('download-progress');

        if (result.success) {
            showStatus(`✅ Download completed! File saved to: ${result.path}`, 'success');
        } else {
            showStatus('❌ Download failed: ' + result.error, 'error');
        }
    } catch (error) {
        showStatus('❌ Download error: ' + error.message, 'error');
        ipcRenderer.removeAllListeners('download-progress');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = '📥 Download Video';
    }
}

function isValidYouTubeUrl(url) {
    const patterns = [
        /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
        /^https?:\/\/youtu\.be\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
        /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
}

function hideStatus() {
    status.style.display = 'none';
}
