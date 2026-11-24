import React, { useState, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '' }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // 傾き角度（rotateX, rotateY）と光沢ハイライトの位置（shineX, shineY, shineOpacity）
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [shine, setShine] = useState({ x: 50, y: 50, opacity: 0 });
  const [hasSensorPermission, setHasSensorPermission] = useState<boolean | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    // モバイル端末かどうかを判定
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsMobileDevice(isMobile);

    // iOS以外のAndroid等は許可ダイアログ不要でセンサーが使える
    if (typeof (DeviceOrientationEvent as any)?.requestPermission !== 'function') {
      setHasSensorPermission(true);
    }
  }, []);

  // スマホのジャイロセンサー（DeviceOrientation）の監視
  useEffect(() => {
    if (!hasSensorPermission) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;

      // beta: 前後の傾き (-180 ~ 180), gamma: 左右の傾き (-90 ~ 90)
      // 自然に持ったときの角度（約45度傾き）を基準に調整
      const targetX = Math.max(-15, Math.min(15, (e.beta - 45) * 0.4));
      const targetY = Math.max(-15, Math.min(15, e.gamma * 0.4));

      setRotateX(-targetX);
      setRotateY(targetY);

      // 光の反射位置を計算
      const shinePosX = 50 + targetY * 3;
      const shinePosY = 50 - targetX * 3;
      setShine({
        x: Math.max(0, Math.min(100, shinePosX)),
        y: Math.max(0, Math.min(100, shinePosY)),
        opacity: 0.35,
      });
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [hasSensorPermission]);

  // iOS Safari 用のセンサー許可リクエスト
  const requestSensorAccess = async () => {
    if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setHasSensorPermission(true);
        } else {
          setHasSensorPermission(false);
        }
      } catch (err) {
        console.warn('センサー許可リクエスト失敗:', err);
        setHasSensorPermission(false);
      }
    } else {
      setHasSensorPermission(true);
    }
  };

  // PC向け：マウスカーソルの動きに合わせた傾きと光の反射
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 中心からの距離に応じて最大12度傾ける
    const rotX = ((y - centerY) / centerY) * -12;
    const rotY = ((x - centerX) / centerX) * 12;

    // 光のハイライト位置（%）
    const shineX = (x / rect.width) * 100;
    const shineY = (y / rect.height) * 100;

    setRotateX(rotX);
    setRotateY(rotY);
    setShine({ x: shineX, y: shineY, opacity: 0.4 });
  };

  // マウスが離れたら元の角度に戻す
  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
    setShine((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div className="flex flex-col items-center">
      {/* 傾きカード本体 */}
      <div
        className="w-full"
        style={{ perspective: '1000px' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div
          ref={cardRef}
          className={`relative transition-transform duration-150 ease-out will-change-transform rounded-3xl overflow-hidden select-none ${className}`}
          style={{
            transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {children}

          {/* 光沢・光の反射レイヤー（ニス引きのようなパール調の輝き） */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-200 rounded-3xl"
            style={{
              opacity: shine.opacity,
              background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.15) 35%, transparent 70%)`,
              mixBlendMode: 'overlay',
            }}
          />
        </div>
      </div>

      {/* iOS端末向け：ジャイロセンサー有効化ボタン（まだ許可していない場合のみ表示） */}
      {isMobileDevice && hasSensorPermission === null && (
        <button
          type="button"
          onClick={requestSensorAccess}
          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-paper-200/80 hover:bg-paper-300 text-stone-700 text-[11px] font-medium rounded-full transition-colors shadow-2xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>スマホを傾けて紙の質感を体験する</span>
        </button>
      )}
    </div>
  );
};
