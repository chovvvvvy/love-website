// 🌐 GitHub Pages 静态存储模式
// 将照片保存为本地文件，可以在GitHub Pages上使用

class GitHubPagesStorage {
    constructor() {
        this.photos = [];
        this.photosDir = 'images'; // 照片保存目录
        this.thumbnailsDir = 'thumbnails'; // 缩略图目录
    }

    // 初始化
    async init() {
        try {
            // 尝试从 data/photos_metadata.json 加载照片列表
            const response = await fetch('data/photos_metadata.json');
            if (response.ok) {
                const data = await response.json();
                this.photos = data.photos || [];
                console.log(`📸 GitHub Pages 模式: 加载了 ${this.photos.length} 张照片 (静态文件模式)`);
                return true;
            }
        } catch (error) {
            console.log('未找到 data/photos_metadata.json，使用空列表');
            this.photos = [];
        }
        return false;
    }

    // 上传照片（转换为Base64并保存为本地文件）
    async uploadPhoto(file, message) {
        try {
            // 显示上传进度
            this.showUploadProgress(0);

            // 读取文件
            const reader = new FileReader();
            const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            this.showUploadProgress(30);

            // 压缩图片
            const blob = await this.fetch(dataUrl);
            const compressedBlob = await this.compressImage(blob);
            this.showUploadProgress(60);

            // 生成文件名
            const timestamp = Date.now();
            const filename = `photo_${timestamp}.jpg`;
            const thumbnailFilename = `thumb_${timestamp}.jpg`;

            // 转换为Base64（用于保存为文件）
            const base64 = await this.blobToBase64(compressedBlob);
            const thumbnailBase64 = await this.blobToBase64(
                await this.createThumbnail(compressedBlob)
            );

            this.showUploadProgress(80);

            // 创建照片对象
            const photo = {
                id: timestamp.toString(),
                type: 'image',
                message: message,
                filename: filename,
                thumbnail: thumbnailFilename,
                date: new Date().toLocaleDateString('zh-CN'),
                timestamp: new Date().toISOString()
            };

            this.photos.unshift(photo);

            // 保存照片列表
            await this.savePhotosList();

            // 提示用户手动保存文件
            this.showSaveInstructions(photo, base64, thumbnailBase64);

            this.showUploadProgress(100);

            setTimeout(() => this.hideUploadProgress(), 2000);

            return photo;

        } catch (error) {
            console.error('上传失败:', error);
            this.hideUploadProgress();
            throw error;
        }
    }

    // 压缩图片
    async compressImage(blob, maxSize = 1920, quality = 0.85) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 计算新尺寸
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round((height * maxSize) / width);
                        width = maxSize;
                    } else {
                        width = Math.round((width * maxSize) / height);
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    // 创建缩略图
    async createThumbnail(blob, size = 200) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.75);
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }

    // Blob转Base64
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result.split(',')[1];
                resolve(result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // 保存照片列表
    async savePhotosList() {
        const data = {
            photos: this.photos,
            updated: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = 'photos.json';
        a.click();

        URL.revokeObjectURL(url);
    }

    // 显示保存说明
    showSaveInstructions(photo, base64, thumbnailBase64) {
        const instructions = `
══════════════════════════════════════════════════════════
📸 照片已准备保存！请按以下步骤操作：
══════════════════════════════════════════════════════════

1. 创建文件夹：
   在项目目录中创建 images 和 thumbnails 文件夹

2. 保存原图：
   - 点击下方按钮下载照片
   - 保存到 images/${photo.filename}

3. 保存缩略图：
   - 点击下方按钮下载缩略图
   - 保存到 thumbnails/${photo.thumbnail}

4. 上传到GitHub：
   - 将 images 和 thumbnails 文件夹
   - 以及 photos.json 文件
   - 一起上传到GitHub仓库

══════════════════════════════════════════════════════════
        `;

        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            z-index: 10000;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
        `;
        div.innerHTML = `
            <h3 style="margin: 0 0 20px 0; color: #333;">📸 照片已准备保存</h3>
            <pre style="white-space: pre-wrap; font-size: 12px; background: #f5f5f5; padding: 15px; border-radius: 5px;">${instructions}</pre>
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="downloadPhoto('${base64}', '${photo.filename}')" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">📥 下载原图</button>
                <button onclick="downloadThumbnail('${thumbnailBase64}', '${photo.thumbnail}')" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">📥 下载缩略图</button>
                <button onclick="this.parentElement.parentElement.remove()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin: 5px;">✕ 关闭</button>
            </div>
        `;
        document.body.appendChild(div);
    }

    // 显示上传进度
    showUploadProgress(progress) {
        let progressDiv = document.getElementById('ghPagesUploadProgress');
        if (!progressDiv) {
            progressDiv = document.createElement('div');
            progressDiv.id = 'ghPagesUploadProgress';
            progressDiv.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.8);color:white;padding:30px 50px;border-radius:20px;font-size:18px;z-index:10000;text-align:center;';
            document.body.appendChild(progressDiv);
        }
        progressDiv.innerHTML = `<div class="loading-spinner"></div><p>处理中... ${progress}%</p>`;
        progressDiv.style.display = 'block';
    }

    // 隐藏上传进度
    hideUploadProgress() {
        const progressDiv = document.getElementById('ghPagesUploadProgress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }

    // 删除照片
    async deletePhoto(photoId) {
        this.photos = this.photos.filter(p => p.id !== photoId);
        await this.savePhotosList();
        return true;
    }

    // 获取照片URL
    getPhotoUrl(photo) {
        return `${this.photosDir}/${photo.filename}`;
    }

    // 获取缩略图URL
    getThumbnailUrl(photo) {
        return `${this.thumbnailsDir}/${photo.thumbnail}`;
    }

    // 获取所有照片
    getPhotos() {
        return this.photos;
    }
}

// 全局下载函数
window.downloadPhoto = function(base64, filename) {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64}`;
    link.download = filename;
    link.click();
};

window.downloadThumbnail = function(base64, filename) {
    const link = document.createElement('a');
    link.href = `data:image/jpeg;base64,${base64}`;
    link.download = filename;
    link.click();
};

// 创建实例
const ghPagesStorage = new GitHubPagesStorage();

// 导出
window.GitHubPagesStorage = GitHubPagesStorage;
window.ghPagesStorage = ghPagesStorage;
