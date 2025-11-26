'use client';

import { useEffect, useState } from 'react';

// 图片预加载Hook
export function useImagePreloader(imageUrls: string[]) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrls || imageUrls.length === 0) {
      setLoaded(true);
      return;
    }

    let mounted = true;
    const loadedImages: HTMLImageElement[] = [];
    let loadCount = 0;

    const handleLoad = () => {
      loadCount++;
      if (loadCount === imageUrls.length && mounted) {
        setLoaded(true);
      }
    };

    const handleError = (url: string) => {
      console.warn(`Failed to preload image: ${url}`);
      if (mounted) {
        setError(`Failed to load: ${url}`);
        // 即使某些图片加载失败，也标记为已加载
        setLoaded(true);
      }
    };

    // 开始预加载图片
    imageUrls.forEach(url => {
      const img = new Image();
      img.onload = handleLoad;
      img.onerror = () => handleError(url);
      img.src = url;
      loadedImages.push(img);
    });

    return () => {
      mounted = false;
      // 清理图片引用
      loadedImages.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [imageUrls]);

  return { loaded, error };
}