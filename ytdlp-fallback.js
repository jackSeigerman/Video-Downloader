// Alternative implementation using yt-dlp
const { spawn } = require('child_process');
const path = require('path');

async function downloadWithYtDlp(url, outputPath, format) {
    return new Promise((resolve, reject) => {
        const args = [
            url,
            '-o', path.join(outputPath, '%(title)s.%(ext)s'),
        ];

        if (format === 'mp3') {
            args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
        } else {
            args.push('-f', 'best[height<=2160]'); // Best quality up to 4K
        }

        const ytDlp = spawn('yt-dlp', args);
        
        ytDlp.stdout.on('data', (data) => {
            console.log(data.toString());
        });

        ytDlp.stderr.on('data', (data) => {
            console.error(data.toString());
        });

        ytDlp.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true });
            } else {
                reject({ success: false, error: `yt-dlp failed with code ${code}` });
            }
        });
    });
}
