import imageCompression from 'browser-image-compression';
import { PixelCrop } from 'react-image-crop';

/**
 * 画像のURLからImageオブジェクトを生成するヘルパー
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * 画像を時計回りに90度回転させた新しいDataURLを生成するヘルパー
 */
export async function rotateImage90(imageSrc: string): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas context not available');

  // 90度回転するので幅と高さを入れ替える
  canvas.width = image.height;
  canvas.height = image.width;

  // キャンバスの中心に移動して90度回転
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((90 * Math.PI) / 180);
  ctx.drawImage(image, -image.width / 2, -image.height / 2);

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * react-image-crop の PixelCrop（実際の表示倍率を考慮した切り抜き領域）をもとに、
 * 切り抜いた画像Blob（JPEG）を生成します。
 */
export async function getCroppedImageBlob(
  imageElement: HTMLImageElement,
  crop: PixelCrop
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // 表示されている画像のサイズと、自然な元画像サイズ（naturalWidth/Height）の比率を計算
  const scaleX = imageElement.naturalWidth / imageElement.width;
  const scaleY = imageElement.naturalHeight / imageElement.height;

  // 実ピクセルでの切り抜きサイズ
  const pixelX = crop.x * scaleX;
  const pixelY = crop.y * scaleY;
  const pixelWidth = crop.width * scaleX;
  const pixelHeight = crop.height * scaleY;

  canvas.width = Math.floor(pixelWidth);
  canvas.height = Math.floor(pixelHeight);

  ctx.drawImage(
    imageElement,
    pixelX,
    pixelY,
    pixelWidth,
    pixelHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.95
    );
  });
}

/**
 * browser-image-compression を使用して画像をブラウザ側で軽量化します。
 * Supabase Storageの無料枠（500MB）を節約するため、最大幅1600px・約600KBに抑えます。
 */
export async function compressImage(imageFile: Blob): Promise<File> {
  const options = {
    maxSizeMB: 0.6,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: 'image/jpeg',
  };

  try {
    const file = new File([imageFile], 'paper-item.jpg', { type: 'image/jpeg' });
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.warn('画像圧縮に失敗したため、元画像を使用します:', error);
    return new File([imageFile], 'paper-item.jpg', { type: 'image/jpeg' });
  }
}
