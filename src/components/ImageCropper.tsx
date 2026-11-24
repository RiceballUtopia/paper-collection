import React, { useState, useCallback } from 'react';
import Cropper, { Area } from 'react-easy-crop';
import { RotateCw, ZoomIn, Check, X } from 'lucide-react';
import { getCroppedImg } from '../lib/imageUtils';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob, previewUrl: string) => void;
  onCancel: () => void;
}

// 選択可能な比率プリセット
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
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 切り抜き範囲が更新された時のコールバック
  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onCropAreaChange = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 90度時計回りに回転
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 決定ボタンを押した時
  const handleDone = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
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
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between text-white select-none">
      {/* 上部ヘッダーバー */}
      <div className="px-4 py-3 flex items-center justify-between bg-black/40 backdrop-blur z-10">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex items-center gap-1 text-sm text-stone-300 hover:text-white px-2 py-1 rounded-lg"
        >
          <X className="w-5 h-5" />
          <span>キャンセル</span>
        </button>
        <span className="text-sm font-medium">紙ものをトリミング</span>
        <button
          type="button"
          onClick={handleDone}
          disabled={isProcessing}
          className="flex items-center gap-1 text-sm font-bold bg-amber-700 hover:bg-amber-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg shadow-sm"
        >
          {isProcessing ? (
            <span>処理中...</span>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>決定</span>
            </>
          )}
        </button>
      </div>

      {/* クロップエリア */}
      <div className="relative flex-1 w-full overflow-hidden bg-black/70">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={onCropChange}
          onCropComplete={onCropAreaChange}
          onZoomChange={setZoom}
          showGrid={true}
        />
      </div>

      {/* 下部コントローラー */}
      <div className="p-4 bg-stone-900/90 backdrop-blur space-y-3 pb-safe z-10">
        {/* 比率選択ボタン */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
          {ASPECT_RATIOS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setAspect(item.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                aspect === item.value
                  ? 'bg-amber-700 text-white font-bold'
                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* ズーム & 回転コントロール */}
        <div className="flex items-center gap-4 max-w-sm mx-auto px-2">
          <div className="flex items-center gap-2 flex-1">
            <ZoomIn className="w-4 h-4 text-stone-400 flex-shrink-0" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-amber-600 h-1 bg-stone-700 rounded-lg cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={handleRotate}
            title="90度回転"
            className="p-2 bg-stone-800 hover:bg-stone-700 rounded-lg text-stone-200 transition-colors flex items-center gap-1 text-xs"
          >
            <RotateCw className="w-4 h-4" />
            <span>回転</span>
          </button>
        </div>
      </div>
    </div>
  );
};
