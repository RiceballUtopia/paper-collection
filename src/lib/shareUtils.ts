/**
 * SNSや友達にシェアするためのヘルパー関数
 * スマホではOS標準の共有ダイアログ（LINE, X, メモ等）が起動し、
 * PC等の非対応ブラウザでは X (Twitter) の投稿画面を開きます。
 */
export async function shareAppOrAchievement({
  title,
  text,
  url = window.location.origin,
}: {
  title: string;
  text: string;
  url?: string;
}): Promise<void> {
  const shareData = {
    title,
    text,
    url,
  };

  // 1. スマホの Web Share API が利用可能な場合（LINE, X, Instagram等）
  if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err: any) {
      // ユーザーが共有をキャンセルした場合は何もしない
      if (err.name === 'AbortError') return;
      console.warn('Web Share failed, fallback to Twitter:', err);
    }
  }

  // 2. PCや非対応ブラウザの場合：X (旧Twitter) の投稿画面を新規タブで開く
  const tweetText = encodeURIComponent(`${text}\n`);
  const tweetUrl = encodeURIComponent(url);
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=${tweetUrl}`;

  window.open(twitterShareUrl, '_blank', 'noopener,noreferrer');
}
