const sharp = require('sharp');

/**
 * Standard compression function - Medium quality (80%)
 */
const compressImage = async (req, res) => {
    const file = req.file;
    if (!file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mimetype, buffer, originalname } = file;
    const quality = parseInt(req.body.quality) || 80; // Default to 80% quality

    try {
        if (!mimetype.startsWith('image/')) {
            console.error('Unsupported file type:', mimetype);
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        console.log('Processing image:', originalname, 'with quality:', quality);

        const compressedImage = await sharp(buffer)
            .resize(800, null, { // Resize to 800px width, maintain aspect ratio
                withoutEnlargement: true // Don't enlarge if image is smaller
            })
            .jpeg({ 
                quality: quality,
                chromaSubsampling: '4:4:4', // Better color quality
                force: false // Don't force JPEG if input is different
            })
            .toBuffer();
        
        console.log('Image compressed successfully');
        return res.type('image/jpeg').send(compressedImage);
    } catch (err) {
        console.error('Error compressing image:', err);
        return res.status(500).json({ 
            error: 'Error compressing image',
            details: err.message 
        });
    }
}

/**
 * Low compression (high quality - 95%)
 */
const compressImageLow = async (req, res) => {
    const file = req.file;
    if (!file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mimetype, buffer, originalname } = file;
    const quality = 95; // High quality (minimal compression)

    try {
        if (!mimetype.startsWith('image/')) {
            console.error('Unsupported file type:', mimetype);
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        console.log('Processing image with LOW compression:', originalname, 'with quality:', quality);

        const compressedImage = await sharp(buffer)
            .resize(1200, null, { // Higher resolution - 1200px width
                withoutEnlargement: true
            })
            .jpeg({ 
                quality: quality,
                chromaSubsampling: '4:4:4', // Better color quality
                force: false
            })
            .toBuffer();
        
        console.log('Image compressed with LOW compression successfully');
        return res.type('image/jpeg').send(compressedImage);
    } catch (err) {
        console.error('Error compressing image:', err);
        return res.status(500).json({ 
            error: 'Error compressing image',
            details: err.message 
        });
    }
}

/**
 * High compression (low quality - 50%)
 */
const compressImageHigh = async (req, res) => {
    const file = req.file;
    if (!file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mimetype, buffer, originalname } = file;
    const quality = 50; // Low quality (high compression)

    try {
        if (!mimetype.startsWith('image/')) {
            console.error('Unsupported file type:', mimetype);
            return res.status(400).json({ error: 'Unsupported file type' });
        }

        console.log('Processing image with HIGH compression:', originalname, 'with quality:', quality);

        const compressedImage = await sharp(buffer)
            .resize(600, null, { // Lower resolution - 600px width
                withoutEnlargement: true
            })
            .jpeg({ 
                quality: quality,
                chromaSubsampling: '4:2:0', // Lower color quality for better compression
                force: false
            })
            .toBuffer();
        
        console.log('Image compressed with HIGH compression successfully');
        return res.type('image/jpeg').send(compressedImage);
    } catch (err) {
        console.error('Error compressing image:', err);
        return res.status(500).json({ 
            error: 'Error compressing image',
            details: err.message 
        });
    }
}

module.exports = {
    compressImage,         // Medium quality (default - 80%)
    compressImageLow,      // Low compression (high quality - 95%)
    compressImageHigh      // High compression (low quality - 50%)
};
