// ============================================
// KMCA - WATERMARK
// ============================================

// Add watermark to image
function addWatermarkToImage(imageUrl, callback) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Add logo watermark (center top)
        const logoSize = Math.min(canvas.width, canvas.height) * 0.1;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = logoSize * 0.5;
        
        ctx.font = `${logoSize}px "Font Awesome 6 Free"`;
        ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText('\uf6d5', canvas.width / 2, logoY + logoSize);
        
        // Add name watermark (bottom right)
        const nameSize = Math.min(canvas.width, canvas.height) * 0.04;
        const nameX = canvas.width - nameSize * 3;
        const nameY = canvas.height - nameSize;
        
        ctx.font = `bold ${nameSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'right';
        ctx.fillText('KMCA', nameX, nameY);
        
        callback(canvas.toDataURL('image/png'));
    };
    
    img.onerror = function() {
        callback(imageUrl);
    };
    
    img.src = imageUrl;
}

// Add watermark to video
function addWatermarkToVideo(videoUrl, callback) {
    // Video watermark requires server-side processing
    // For now, we'll just return the original URL
    console.log('Video watermark requires server-side processing');
    callback(videoUrl);
}

// Generate PDF with watermark
function generatePDFWithWatermark(title, content) {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <html>
            <head>
                <title>${title}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 40px;
                        position: relative;
                    }
                    .watermark {
                        position: fixed;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 80px;
                        color: rgba(0, 0, 0, 0.05);
                        font-weight: bold;
                        z-index: 1000;
                    }
                    .watermark-logo {
                        position: fixed;
                        top: 20px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-size: 40px;
                        color: rgba(212, 175, 55, 0.3);
                        z-index: 1000;
                    }
                    .watermark-name {
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        color: #999;
                        z-index: 1000;
                    }
                    h1 {
                        color: #1a73e8;
                    }
                </style>
            </head>
            <body>
                <div class="watermark">KMCA</div>
                <div class="watermark-logo">&#9960;</div>
                <div class="watermark-name">KMCA - Kwaya ya Vijana Mt. Carlo Acutis</div>
                <h1>${title}</h1>
                <p>${content}</p>
                <script>
                    window.print();
                </script>
            </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Initialize watermark on media
function initializeWatermarks() {
    // Add watermark to all single images
    document.querySelectorAll('.single-image img').forEach(img => {
        addWatermarkToImage(img.src, (watermarkedUrl) => {
            img.src = watermarkedUrl;
        });
    });
    
    // Add watermark to all carousel images
    document.querySelectorAll('.carousel-slide img').forEach(img => {
        addWatermarkToImage(img.src, (watermarkedUrl) => {
            img.src = watermarkedUrl;
        });
    });
}