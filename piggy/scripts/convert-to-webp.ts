import sharp from 'sharp';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';

const IMAGES_DIR = join(process.cwd(), 'public', 'images');
const SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png'];

async function convertToWebP(inputPath: string, outputPath: string) {
  try {
    const metadata = await sharp(inputPath).metadata();
    const originalSize = (await stat(inputPath)).size;
    
    await sharp(inputPath)
      .webp({ quality: 85 }) // 85% 质量，平衡文件大小和视觉质量
      .toFile(outputPath);
    
    const newSize = (await stat(outputPath)).size;
    const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
    
    console.log(`✓ ${basename(inputPath)} → ${basename(outputPath)} (${reduction}% 减小)`);
    return { success: true, reduction: parseFloat(reduction) };
  } catch (error) {
    console.error(`✗ 转换失败 ${basename(inputPath)}:`, error);
    return { success: false, reduction: 0 };
  }
}

async function processImages() {
  try {
    const files = await readdir(IMAGES_DIR);
    const imageFiles = files.filter(file => {
      const ext = extname(file).toLowerCase();
      return SUPPORTED_FORMATS.includes(ext);
    });

    if (imageFiles.length === 0) {
      console.log('没有找到需要转换的图片文件');
      return;
    }

    console.log(`找到 ${imageFiles.length} 个图片文件，开始转换...\n`);

    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let successCount = 0;

    for (const file of imageFiles) {
      const inputPath = join(IMAGES_DIR, file);
      const outputPath = join(IMAGES_DIR, basename(file, extname(file)) + '.webp');
      
      const originalSize = (await stat(inputPath)).size;
      totalOriginalSize += originalSize;

      const result = await convertToWebP(inputPath, outputPath);
      
      if (result.success) {
        const newSize = (await stat(outputPath)).size;
        totalNewSize += newSize;
        successCount++;
      }
    }

    console.log(`\n转换完成！`);
    console.log(`成功: ${successCount}/${imageFiles.length}`);
    if (successCount > 0) {
      const totalReduction = ((1 - totalNewSize / totalOriginalSize) * 100).toFixed(1);
      const savedMB = ((totalOriginalSize - totalNewSize) / 1024 / 1024).toFixed(2);
      console.log(`总体积减小: ${totalReduction}% (节省 ${savedMB} MB)`);
    }
  } catch (error) {
    console.error('处理图片时出错:', error);
    process.exit(1);
  }
}

processImages();

