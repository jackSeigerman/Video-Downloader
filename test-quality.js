// Quick test script - run with: node test-quality.js
const { testVideoQuality } = require('./debug-quality.js');

// Example usage:
// Replace this URL with your 2160p video URL to test
const testUrl = process.argv[2];

if (testUrl) {
    console.log('Testing video quality detection...\n');
    testVideoQuality(testUrl);
} else {
    console.log('Usage: node test-quality.js "https://www.youtube.com/watch?v=YOUR_VIDEO_ID"');
    console.log('This will show you all available qualities for the video.');
}
