// ⚡ 性能优化模块
// 包含懒加载、分页加载、图片优化等功能

class PerformanceOptimizer {
    constructor() {
        this.lazyLoadObserver = null;
        this.currentPage = 1;
        this.perPage = 20;
        this.isLoading = false;
        this.hasMore = true;
        this.loadedPhotos = new Set();
    }

    // 初始化懒加载
    initLazyLoad() {
        if ('IntersectionObserver' in window) {
            const options = {
                root: null,
                rootMargin: '200px',  // 提前200px开始加载
                threshold: 0.01
            };

            this.lazyLoadObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        this.loadImage(img);
                        this.lazyLoadObserver.unobserve(img);
                    }
                });
            }, options);

            // 监听所有需要懒加载的图片
            this.observeImages();
        }
    }

    // 监听图片
    observeImages() {
        document.querySelectorAll('img[data-src], img[data-lazy]').forEach(img => {
            if (this.lazyLoadObserver) {
                this.lazyLoadObserver.observe(img);
            }
        });
    }

    // 加载图片
    loadImage(img) {
        const src = img.dataset.src || img.dataset.lazy;
        if (!src) return;

        // 创建新图片对象预加载
        const tempImg = new Image();

        tempImg.onload = () => {
            img.src = src;
            img.classList.add('loaded');
            img.style.opacity = '1';
        };

        tempImg.onerror = () => {
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><text y="50%" x="50%" dominant-baseline="middle" text-anchor="middle" fill="#999">加载失败</text></svg>';
        };

        tempImg.src = src;
    }

    // 分页加载照片（服务器模式）
    async loadPhotosPaginated(page = 1, append = false) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoadingIndicator();

        try {
            const response = await fetch(`${SERVER_CONFIG.baseUrl}/api/photos?page=${page}&per_page=${this.perPage}`);

            if (!response.ok) {
                throw new Error('加载照片失败');
            }

            const result = await response.json();

            if (append) {
                photos.push(...result.photos);
            } else {
                photos = result.photos;
            }

            this.hasMore = result.has_more;
            this.currentPage = page;

            // 渲染照片
            this.renderPhotosOptimized(result.photos, append);

            // 更新"加载更多"按钮状态
            this.updateLoadMoreButton();

        } catch (error) {
            console.error('分页加载失败:', error);
            logger.error(`分页加载失败: ${error.message}`, 'PERFORMANCE');
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    // 优化的照片渲染
    renderPhotosOptimized(photosList, append = false) {
        const photoWall = document.getElementById('photoWall');
        if (!photoWall) return;

        if (!append) {
            photoWall.innerHTML = '';
        }

        if (photosList.length === 0 && !append) {
            photoWall.innerHTML = '<div class="photo-empty">📸 还没有照片，快添加第一张回忆吧~</div>';
            return;
        }

        // 使用文档片段优化DOM操作
        const fragment = document.createDocumentFragment();

        photosList.forEach((photo, index) => {
            const photoItem = this.createPhotoItem(photo, index);
            fragment.appendChild(photoItem);
        });

        photoWall.appendChild(fragment);

        // 懒加载新添加的图片
        if (this.lazyLoadObserver) {
            document.querySelectorAll('.photo-item:not(.observed)').forEach(item => {
                item.classList.add('observed');
                const img = item.querySelector('img[data-src]');
                if (img) {
                    this.lazyLoadObserver.observe(img);
                }
            });
        }
    }

    // 创建照片项
    createPhotoItem(photo, index) {
        const div = document.createElement('div');
        div.className = 'photo-item';
        div.dataset.index = index;
        div.dataset.id = photo.id;

        const thumbnailUrl = `${SERVER_CONFIG.baseUrl}/api/photos/${photo.id}/thumbnail`;
        const fullUrl = `${SERVER_CONFIG.baseUrl}/api/photos/${photo.id}/data`;

        div.innerHTML = `
            <div class="photo-inner">
                <div class="photo-img-wrapper">
                    ${photo.type === 'video'
                        ? `<video src="${fullUrl}" class="photo-video" muted loop preload="none" poster="${thumbnailUrl}"></video>
                           <div class="video-indicator">▶️</div>`
                        : `<img data-src="${thumbnailUrl}" data-full="${fullUrl}" alt="${photo.message || '照片'}" class="photo-img" style="opacity: 0; transition: opacity 0.3s;">`
                    }
                </div>
                <div class="photo-actions">
                    <button class="photo-action-btn photo-download-btn" title="下载">⬇️</button>
                    <button class="photo-action-btn photo-edit-btn" title="编辑">✏️</button>
                    <button class="photo-action-btn photo-delete-btn" title="删除">🗑️</button>
                </div>
            </div>
            <p class="photo-caption">${photo.message || ''}</p>
            <p class="photo-date">${photo.date}</p>
            <div class="photo-checkbox" style="display: ${photoBatchMode ? 'flex' : 'none'}">
                <input type="checkbox" class="batch-checkbox" data-id="${photo.id}">
            </div>
        `;

        return div;
    }

    // 显示加载指示器
    showLoadingIndicator() {
        let indicator = document.getElementById('photoLoadingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'photoLoadingIndicator';
            indicator.style.cssText = 'text-align: center; padding: 20px; color: #666; display: none;';
            indicator.innerHTML = '<div class="loading-spinner"></div><p>正在加载...</p>';
            document.getElementById('photoWall')?.appendChild(indicator);
        }
        indicator.style.display = 'block';
    }

    // 隐藏加载指示器
    hideLoadingIndicator() {
        const indicator = document.getElementById('photoLoadingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    // 更新"加载更多"按钮
    updateLoadMoreButton() {
        let btn = document.getElementById('loadMorePhotosBtn');

        if (this.hasMore) {
            if (!btn) {
                btn = document.createElement('button');
                btn.id = 'loadMorePhotosBtn';
                btn.className = 'load-more-btn';
                btn.textContent = '加载更多...';
                btn.onclick = () => {
                    this.loadPhotosPaginated(this.currentPage + 1, true);
                };

                const photoWall = document.getElementById('photoWall');
                if (photoWall) {
                    photoWall.appendChild(btn);
                }
            }
            btn.style.display = 'block';
            btn.textContent = '加载更多...';
        } else if (btn) {
            btn.style.display = 'none';
        }
    }

    // 优化图片加载 - 使用渐进式加载
    async loadProgressiveImage(imgElement) {
        const src = imgElement.dataset.src || imgElement.src;
        if (!src) return;

        // 先显示模糊预览
        imgElement.style.filter = 'blur(10px)';

        // 加载图片
        const tempImg = new Image();

        tempImg.onload = () => {
            imgElement.src = src;
            // 渐进式清晰
            setTimeout(() => {
                imgElement.style.filter = 'blur(0)';
                imgElement.style.transition = 'filter 0.3s';
            }, 100);
        };

        tempImg.src = src;
    }

    // 预加载下一页
    async preloadNextPage() {
        if (!this.hasMore || this.isLoading) return;

        try {
            const nextPage = this.currentPage + 1;
            const response = await fetch(`${SERVER_CONFIG.baseUrl}/api/photos?page=${nextPage}&per_page=${this.perPage}`);

            if (response.ok) {
                const result = await response.json();
                // 预加载图片
                result.photos.forEach(photo => {
                    const img = new Image();
                    img.src = `${SERVER_CONFIG.baseUrl}/api/photos/${photo.id}/thumbnail`;
                });
            }
        } catch (error) {
            console.log('预加载失败:', error);
        }
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // 优化滚动事件
    optimizeScroll() {
        const scrollHandler = this.throttle(() => {
            // 检查是否接近底部
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;

            if (scrollTop + windowHeight >= documentHeight - 500) {
                // 接近底部，加载更多
                if (this.hasMore && !this.isLoading) {
                    this.loadPhotosPaginated(this.currentPage + 1, true);
                }
            }
        }, 200);

        window.addEventListener('scroll', scrollHandler, { passive: true });
    }

    // 初始化所有优化
    init() {
        logger.info('性能优化模块初始化', 'PERFORMANCE');

        // 初始化懒加载
        this.initLazyLoad();

        // 优化滚动
        this.optimizeScroll();

        // 优化现有图片
        this.optimizeExistingImages();

        logger.info('性能优化模块初始化完成', 'PERFORMANCE');
    }

    // 优化现有图片
    optimizeExistingImages() {
        document.querySelectorAll('.photo-img').forEach(img => {
            if (!img.classList.contains('optimized')) {
                img.classList.add('optimized');
                this.loadProgressiveImage(img);
            }
        });
    }

    // 显示性能统计
    showPerformanceStats() {
        const perfData = performance.getEntriesByType('navigation')[0];
        const stats = {
            '页面加载时间': Math.round(perfData.loadEventEnd - perfData.fetchStart),
            'DOM解析时间': Math.round(perfData.domContentLoadedEventEnd - perfData.fetchStart),
            '首次渲染时间': Math.round(perfData.responseStart - perfData.fetchStart)
        };

        console.table(stats);
        logger.info(`性能统计: ${JSON.stringify(stats)}`, 'PERFORMANCE');

        return stats;
    }
}

// 创建全局实例
const perfOptimizer = new PerformanceOptimizer();

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => perfOptimizer.init());
} else {
    perfOptimizer.init();
}

// 导出
window.PerfOptimizer = PerformanceOptimizer;
window.perfOptimizer = perfOptimizer;
