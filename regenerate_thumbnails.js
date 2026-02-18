/**
 * Regenerate Thumbnails for Photo Wall
 *
 * This script reads images from the images/ directory and generates
 * proper 200x200 thumbnails in the thumbnails/ directory.
 *
 * Requirements: npm install sharp
 *
 * Run with: node regenerate_thumbnails.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const IMAGES_DIR = path.join(__dirname, 'images');
const THUMBNAILS_DIR = path.join(__dirname, 'thumbnails');
const METADATA_FILE = path.join(__dirname, 'data', 'photos_metadata.json');
const THUMBNAIL_SIZE = 200;

// Try to use sharp for efficient image processing
let sharp;
try {
    sharp = require('sharp');
    console.log('✅ Using sharp for fast thumbnail generation');
} catch (e) {
    console.log('⚠️  sharp not found, using Canvas fallback');
    console.log('   For faster processing: npm install sharp');
}

/**
 * Generate thumbnail using sharp (fast, efficient)
 */
function generateThumbnailSharp(inputPath, outputPath, size = THUMBNAIL_SIZE) {
    return sharp(inputPath)
        .resize(size, size, {
            fit: 'cover',
            position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
}

/**
 * Generate thumbnail using Canvas (fallback, slower)
 */
async function generateThumbnailCanvas(inputPath, outputPath, size = THUMBNAIL_SIZE) {
    const { createCanvas, loadImage } = require('canvas');

    const image = await loadImage(inputPath);

    // Calculate crop dimensions to maintain aspect ratio
    const minDimension = Math.min(image.width, image.height);
    const startX = (image.width - minDimension) / 2;
    const startY = (image.height - minDimension) / 2;

    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Draw cropped and resized image
    ctx.drawImage(
        image,
        startX, startY, minDimension, minDimension,  // Source
        0, 0, size, size  // Destination
    );

    // Write to file
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
    fs.writeFileSync(outputPath, buffer);
}

/**
 * Get file size in human-readable format
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/**
 * Main processing function
 */
async function processImages() {
    console.log('🖼️  Starting thumbnail regeneration...');

    // Verify directories exist
    if (!fs.existsSync(IMAGES_DIR)) {
        console.error('❌ images/ directory not found');
        process.exit(1);
    }

    if (!fs.existsSync(THUMBNAILS_DIR)) {
        fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
        console.log('✅ Created thumbnails/ directory');
    }

    // Read metadata file
    let metadata = { photos: [] };
    if (fs.existsSync(METADATA_FILE)) {
        const rawData = fs.readFileSync(METADATA_FILE, 'utf8');
        metadata = JSON.parse(rawData);
        console.log(`📂 Found ${metadata.photos.length} photos in metadata`);
    }

    // Get all image files
    const imageFiles = fs.readdirSync(IMAGES_DIR)
        .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
        .sort();

    console.log(`📊 Found ${imageFiles.length} images in images/`);

    // Process each image
    let successCount = 0;
    let errorCount = 0;
    let totalOriginalSize = 0;
    let totalThumbnailSize = 0;

    const startTime = Date.now();

    for (const [index, filename] of imageFiles.entries()) {
        const inputPath = path.join(IMAGES_DIR, filename);
        const thumbnailFilename = 'thumb_' + filename.replace(/^photo_/, '');
        const outputPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

        try {
            // Get original file size
            const originalStats = fs.statSync(inputPath);
            totalOriginalSize += originalStats.size;

            // Generate thumbnail
            if (sharp) {
                await generateThumbnailSharp(inputPath, outputPath);
            } else {
                await generateThumbnailCanvas(inputPath, outputPath);
            }

            // Get thumbnail file size
            const thumbnailStats = fs.statSync(outputPath);
            totalThumbnailSize += thumbnailStats.size;

            successCount++;

            // Update metadata if needed
            const photoIndex = metadata.photos.findIndex(p => p.filename === filename);
            if (photoIndex >= 0 && metadata.photos[photoIndex].thumbnail !== thumbnailFilename) {
                metadata.photos[photoIndex].thumbnail = thumbnailFilename;
            }

            const reduction = ((1 - thumbnailStats.size / originalStats.size) * 100).toFixed(1);
            console.log(`   [${index + 1}/${imageFiles.length}] ${filename}`);
            console.log(`      Original: ${formatFileSize(originalStats.size)} → Thumbnail: ${formatFileSize(thumbnailStats.size)} (${reduction}% reduction)`);

        } catch (error) {
            errorCount++;
            console.error(`   ❌ Error processing ${filename}:`, error.message);
        }
    }

    // Save updated metadata
    if (successCount > 0) {
        metadata.updated = new Date().toISOString();
        metadata.total = metadata.photos.length;
        fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
        console.log(`\n✅ Updated metadata file`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n📊 Regeneration Summary:');
    console.log(`   ✅ Successfully processed: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏱️  Time elapsed: ${elapsed}s`);
    console.log(`   📦 Total original size: ${formatFileSize(totalOriginalSize)}`);
    console.log(`   📦 Total thumbnail size: ${formatFileSize(totalThumbnailSize)}`);
    console.log(`   💾 Space saved: ${formatFileSize(totalOriginalSize - totalThumbnailSize)}`);
    console.log(`   📉 Average reduction: ${((1 - totalThumbnailSize / totalOriginalSize) * 100).toFixed(1)}%`);

    console.log('\n✅ Thumbnail regeneration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test the website to verify thumbnails load correctly');
    console.log('   2. Check browser Network tab to confirm thumbnail sizes');
    console.log('   3. Commit and push to GitHub');
}

// Run the main function
processImages().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
