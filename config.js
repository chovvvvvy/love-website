// 🔧 配置文件
const SERVER_MODE = false;  // 本地存储模式（照片保存在浏览器中）

// 🌐 GitHub Pages 模式
// 设置为 true 时，照片将保存为本地文件，可上传到 GitHub Pages
const GITHUB_PAGES_MODE = true;  // GitHub Pages 模式（照片保存为本地文件）

// ⚠️ 重要提示：
// GITHUB_PAGES_MODE = true:
//   - 照片会转换为文件下载，需要手动保存到项目中
//   - 保存的文件可以上传到 GitHub，让所有人看到
//   - 适合在 GitHub Pages 上托管网站
//
// GITHUB_PAGES_MODE = false:
//   - 照片存储在浏览器 IndexedDB
//   - 仅本地可见
//   - 定期导出备份以防丢失
