import imageCompression from 'browser-image-compression';
import { Area } from 'react-easy-crop';

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
 * react-easy-crop で指定された切り抜き領域（pixelCrop）をもとに、
 * Canvasを使って切り抜いた画像Blobを生成します。
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // 回転計算用の設定
  const rotRad = (rotation * Math.PI) / 180;

  // バウンディングボックスのサイズ
  const { width: bBoxWidth, height: bBoxHeight } = calculateBoundingBox(
    image.width,
    image.height,
    rotation
  );

  // キャンバスのサイズを設定
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // キャンバスの中心を基準に回転
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // 元画像を描画
  ctx.drawImage(image, 0, 0);

  // 切り抜き用の新しいキャンバスを作成
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('Cropped canvas context not available');
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  // 指定された領域だけを切り出して描画
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // Blob（JPEG形式）として書き出す
  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
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
 * 回転時のバウンディングボックスサイズを計算
 */
function calculateBoundingBox(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  return {
    width: Math.floor(width * cos + height * sin),
    height: Math.floor(width * sin + height * cos),
  };
}

/**
 * browser-image-compression を使用して画像をブラウザ側で軽量化します。
 * Supabase Storageの無料枠（500MB）を圧迫しないよう、最大幅1600px・最大約600KBに抑えます。
 */
export async function compressImage(imageFile: Blob): Promise<File> {
  const options = {
    maxSizeMB: 0.6,          // 最大ファイルサイズ（約600KB）
    maxWidthOrHeight: 1600,   // 最大幅または高さ（きれいに見えつつ軽量）
    useWebWorker: true,      // 画面の動作が重くならないようバックグラウンド処理
    fileType: 'image/jpeg',  // JPEGで統一
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
