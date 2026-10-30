// Kept separate from the existing video-material generator.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {
      scope: './',
      updateViaCache: 'none'
    }).catch(error => {
      // A blocked registration must not prevent the core app from working.
      console.warn('オフライン機能を準備できませんでした。オンラインで再度開いてください。', error);
    });
  });
}
