import React, { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { RotateCw, Check, X, Loader2 } from 'lucide-react';
import { getCroppedImageBlob, rotateImage90 } from '../lib/imageUtils';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

// 選択可能な比率プリセット（デフォルトは自由）
const ASPECT_RATIOS = [
  { label: '自由', value: undefined },
  { label: '1:1', value: 1 / 1 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
];

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
}) => {
  const [currentSrc, setCurrentSrc] = useState(imageSrc);
  const imgRef = useRef<HTMLImageElement>(null);

  // 初期の切り抜き枠（デフォルトは自由比率で画像中央の80%）
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    x: 10,
    y: 10,
    width: 80,
    height: 80,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // 画像がロードされたときの初期枠設定
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    // 初回は中央80%を囲む枠をセット
    const initialCrop: PixelCrop = {
      unit: 'px',
      x: width * 0.1,
      y: height * 0.1,
      width: width * 0.8,
      height: height * 0.8,
    };
    setCompletedCrop(initialCrop);
  };

  // 比率切り替えハンドラー
  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (!imgRef.current) return;

    const { width, height } = imgRef.current;
    if (newAspect) {
      // 比率が指定された場合、その比率に合わせて枠を初期化
      let cropW = width * 0.8;
      let cropH = cropW / newAspect;
      if (cropH > height * 0.8) {
        cropH = height * 0.8;
        cropW = cropH * newAspect;
      }
      setCrop({
        unit: 'px',
        x: (width - cropW) / 2,
        y: (height - cropH) / 2,
        width: cropW,
        height: cropH,
      });
    }
  };

  // 90度時計回りに回転
  const handleRotate = async () => {
    try {
      setIsRotating(true);
      const rotatedUrl = await rotateImage90(currentSrc);
      setCurrentSrc(rotatedUrl);
      // 回転後は枠をリセット
      setCrop({
        unit: '%',
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      });
    } catch (err) {
      console.error('回転に失敗しました:', err);
    } finally {
      setIsRotating(false);
    }
  };

  // 決定ボタンを押した時
  const handleDone = async () => {
    if (!imgRef.current || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      alert('切り抜き枠を指定してください。');
      return;
    }

    try {
      setIsProcessing(true);
      const croppedBlob = await getCroppedImageBlob(imgRef.current, completedCrop);
      const previewUrl = URL.createObjectURL(croppedBlob);
      onCropComplete(croppedBlob, previewUrl);
    } catch (e) {
      console.error('切り抜き処理に失敗しました:', e);
      alert('画像の切り抜きに失敗しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between text-white select-none">
      {/* 上部ヘッダーバー */}
      <div className="px-4 py-3 flex items-center justify-between bg-black/60 backdrop-blur z-10 border-b border-stone-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex items-center gap-1 text-sm text-stone-300 hover:text-white px-2 py-1 rounded-lg"
        >
          <X className="w-5 h-5" />
          <span>キャンセル</span>
        </button>
        <div className="text-center">
          <span className="text-sm font-bold">トリミング</span>
          <p className="text-[10px] text-stone-400">枠の四隅や辺をドラッグして調整</p>
        </div>
        <button
          type="button"
          onClick={handleDone}
          disabled={isProcessing || isRotating}
          className="flex items-center gap-1 text-sm font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg shadow-sm"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>決定</span>
            </>
          )}
        </button>
      </div>

      {/* 切り抜きプレビュー領域 */}
      <div className="relative flex-1 w-full overflow-auto flex items-center justify-center p-4">
        {isRotating ? (
          <div className="flex flex-col items-center gap-2 text-stone-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs">回転中...</span>
          </div>
        ) : (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-[68vh] shadow-2xl"
          >
            <img
              ref={imgRef}
              src={currentSrc}
              alt="トリミング対象"
              onLoad={onImageLoad}
              className="max-h-[68vh] max-w-full object-contain block mx-auto"
            />
          </ReactCrop>
        )}
      </div>

      {/* 下部コントローラー */}
      <div className="p-3 bg-stone-900/95 backdrop-blur space-y-2 pb-safe z-10 border-t border-stone-800">
        {/* 比率選択ボタン */}
        <div className="flex items-center justify-center gap-1.5 overflow-x-auto py-1">
          {ASPECT_RATIOS.map((item) => {
            const isSelected = aspect === item.value;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleAspectChange(item.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-amber-700 text-white font-bold ring-2 ring-amber-500/50'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          <div className="h-5 w-px bg-stone-700 mx-1" />

          {/* 90度回転ボタン */}
          <button
            type="button"
            onClick={handleRotate}
            disabled={isRotating}
            title="90度回転"
            className="p-1.5 px-3 bg-stone-800 hover:bg-stone-700 disabled:opacity-50 rounded-lg text-stone-200 transition-colors flex items-center gap-1 text-xs"
          >
            <RotateCw className="w-4 h-4" />
            <span>90°回転</span>
          </button>
        </div>
      </div>
    </div>
  );
};
