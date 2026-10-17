import * as THREE from 'three';

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function toTexture(canvas, { colorSpace = THREE.SRGBColorSpace } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = colorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function softCircleTexture(size = 128) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.28, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.66, 'rgba(255,255,255,0.28)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

export function glowTexture(size = 256) {
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(0.12, 'rgba(255,255,255,0.62)');
  gradient.addColorStop(0.36, 'rgba(214,238,255,0.2)');
  gradient.addColorStop(0.7, 'rgba(160,210,240,0.05)');
  gradient.addColorStop(1, 'rgba(120,180,220,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(canvas);
}

/** Waving silk banner with a gold 「秦」 glyph. */
export function flagTexture() {
  const width = 512;
  const height = 680;
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext('2d');

  const base = ctx.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, '#7c1420');
  base.addColorStop(0.46, '#671019');
  base.addColorStop(1, '#4b0a12');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Silk weave: thousands of faint vertical threads.
  for (let i = 0; i < 900; i += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,214,190' : '20,0,4'},${Math.random() * 0.045})`;
    ctx.fillRect(x, y, 1, 6 + Math.random() * 46);
  }

  // Soft folds in the fabric.
  for (let i = 0; i < 7; i += 1) {
    const x = (i / 6) * width + Math.sin(i * 2.2) * 22;
    const fold = ctx.createLinearGradient(x - 30, 0, x + 30, 0);
    fold.addColorStop(0, 'rgba(0,0,0,0)');
    fold.addColorStop(0.5, i % 2 ? 'rgba(255,196,160,0.045)' : 'rgba(0,0,0,0.07)');
    fold.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fold;
    ctx.fillRect(x - 30, 0, 60, height);
  }

  // Gold border.
  ctx.strokeStyle = 'rgba(224,187,116,0.9)';
  ctx.lineWidth = 9;
  ctx.strokeRect(22, 22, width - 44, height - 44);
  ctx.strokeStyle = 'rgba(224,187,116,0.32)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38, 38, width - 76, height - 76);

  // Corner studs.
  ctx.fillStyle = 'rgba(232,196,126,0.85)';
  for (const [x, y] of [[22, 22], [width - 22, 22], [22, height - 22], [width - 22, height - 22]]) {
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main glyph.
  const glyph = ctx.createLinearGradient(0, 180, 0, 480);
  glyph.addColorStop(0, '#f6dfa9');
  glyph.addColorStop(0.5, '#e0b96c');
  glyph.addColorStop(1, '#a87933');
  ctx.save();
  ctx.translate(width / 2 - 8, height / 2 + 4);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 300px "STKaiti", "KaiTi", "Kaiti SC", "Songti SC", serif';
  ctx.fillStyle = glyph;
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillText('秦', 0, 0);
  ctx.restore();

  // Vertical side inscription.
  ctx.save();
  ctx.translate(width - 78, 132);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '400 30px "STKaiti", "KaiTi", serif';
  ctx.fillStyle = 'rgba(235,206,150,0.85)';
  ctx.fillText('北', 0, 0);
  ctx.fillText('狩', 0, 46);
  ctx.restore();

  // Small vermilion seal at the lower left.
  ctx.fillStyle = 'rgba(150,30,38,0.9)';
  ctx.fillRect(58, height - 122, 46, 46);
  ctx.strokeStyle = 'rgba(244,226,190,0.85)';
  ctx.lineWidth = 2;
  ctx.strokeRect(61, height - 119, 40, 40);
  ctx.fillStyle = 'rgba(244,226,190,0.92)';
  ctx.font = '400 24px "STKaiti", "KaiTi", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('御', 81, height - 98);

  return toTexture(canvas);
}

/** Round bronze medallion used on the bear's caparison. */
export function medallionTexture() {
  const size = 256;
  const canvas = makeCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, size, size);

  const rim = ctx.createRadialGradient(110, 96, 8, 128, 128, 118);
  rim.addColorStop(0, '#f3d792');
  rim.addColorStop(0.55, '#c99b4f');
  rim.addColorStop(1, '#7f5a26');
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(128, 128, 98, 0, Math.PI * 2);
  ctx.fillStyle = '#571019';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(128, 128, 90, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(232,196,126,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(128, 132);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 104px "STKaiti", "KaiTi", "Kaiti SC", serif';
  const glyph = ctx.createLinearGradient(0, -60, 0, 60);
  glyph.addColorStop(0, '#f6dfa9');
  glyph.addColorStop(1, '#c79a4d');
  ctx.fillStyle = glyph;
  ctx.fillText('御', 0, 0);
  ctx.restore();

  return toTexture(canvas);
}
