// ID3 tag verification script
const NodeID3 = require('node-id3');
const fs = require('fs');
const path = require('path');

function verifyID3Tags(mp3FilePath) {
    if (!fs.existsSync(mp3FilePath)) {
        console.log('❌ File does not exist:', mp3FilePath);
        return;
    }
    
    console.log('📁 Checking MP3 file:', mp3FilePath);
    console.log('📏 File size:', fs.statSync(mp3FilePath).size, 'bytes');
    
    try {
        // Read all tags
        const tags = NodeID3.read(mp3FilePath);
        
        if (!tags) {
            console.log('❌ No ID3 tags found');
            return;
        }
        
        console.log('\n📋 ID3 Tags Found:');
        console.log('Title:', tags.title || 'Not set');
        console.log('Artist:', tags.artist || 'Not set');
        console.log('Album:', tags.album || 'Not set');
        console.log('Genre:', tags.genre || 'Not set');
        console.log('Year:', tags.year || 'Not set');
        
        // Check for image/album art
        console.log('\n🎨 Album Art Check:');
        
        if (tags.image) {
            console.log('✅ Image tag found:');
            console.log('   MIME type:', tags.image.mime);
            console.log('   Type ID:', tags.image.type?.id);
            console.log('   Type name:', tags.image.type?.name);
            console.log('   Description:', tags.image.description);
            console.log('   Image size:', tags.image.imageBuffer ? tags.image.imageBuffer.length + ' bytes' : 'No buffer');
            
            // Save the image for verification
            if (tags.image.imageBuffer && tags.image.imageBuffer.length > 0) {
                const imageOutputPath = mp3FilePath.replace('.mp3', '_extracted_cover.jpg');
                fs.writeFileSync(imageOutputPath, tags.image.imageBuffer);
                console.log('   Extracted image saved as:', imageOutputPath);
            }
        } else {
            console.log('❌ No image tag found');
        }
        
        if (tags.APIC) {
            console.log('✅ APIC tag found:');
            console.log('   MIME type:', tags.APIC.mime);
            console.log('   Type ID:', tags.APIC.type?.id);
            console.log('   Type name:', tags.APIC.type?.name);
            console.log('   Description:', tags.APIC.description);
            console.log('   Image size:', tags.APIC.imageBuffer ? tags.APIC.imageBuffer.length + ' bytes' : 'No buffer');
            
            // Save the APIC image for verification
            if (tags.APIC.imageBuffer && tags.APIC.imageBuffer.length > 0) {
                const apicOutputPath = mp3FilePath.replace('.mp3', '_extracted_apic.jpg');
                fs.writeFileSync(apicOutputPath, tags.APIC.imageBuffer);
                console.log('   Extracted APIC image saved as:', apicOutputPath);
            }
        } else {
            console.log('❌ No APIC tag found');
        }
        
        // Check all available tag keys
        console.log('\n🔑 All available tag keys:');
        Object.keys(tags).forEach(key => {
            if (key !== 'image' && key !== 'APIC') {
                console.log(`   ${key}:`, typeof tags[key] === 'object' ? '[Object]' : tags[key]);
            }
        });
        
    } catch (error) {
        console.error('❌ Error reading ID3 tags:', error.message);
    }
}

// Usage
if (process.argv[2]) {
    verifyID3Tags(process.argv[2]);
} else {
    console.log('Usage: node test-id3.js "path/to/file.mp3"');
    console.log('');
    console.log('This will analyze the ID3 tags and extract album art from an MP3 file.');
    console.log('Example: node test-id3.js "C:\\Downloads\\song.mp3"');
}
