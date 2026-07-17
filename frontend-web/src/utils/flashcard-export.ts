// frontend-web/src/utils/flashcard-export.ts
import type Konva from 'konva';
import { QRCodeCanvas } from 'qrcode.react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CanvasElement, TextElement, ImageElement } from '../stores/flashcard-editor.store';

interface ExportResult {
  imageWithQr: string; // Base64 data URL
  imageWithoutQr: string; // Base64 data URL
}

/**
 * Export the canvas as two PNG images:
 * 1. With QR code overlay (for printing)
 * 2. Without QR code (for re-editing/datasets)
 */
export async function exportDualImages(
  stageRef: React.RefObject<Konva.Stage>,
  qrData: string,
  showQR: boolean
): Promise<ExportResult> {
  if (!stageRef.current) {
    throw new Error('Stage reference is not available');
  }

  const stage = stageRef.current;
  
  // Create a temporary canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // First, export the stage with QR hidden
  if (showQR) {
    // Temporarily hide QR by setting opacity to 0
    const qrNodes = stage.find('#qr-layer');
    qrNodes.forEach(node => {
      node.opacity(0);
    });
  }

  // Export without QR
  const dataUrlWithoutQr = stage.toDataURL({
    x: 0,
    y: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    pixelRatio: 1, // Use 1 for standard size, 2 for retina
    mimeType: 'image/png',
  });

  // Restore QR visibility
  if (showQR) {
    const qrNodes = stage.find('#qr-layer');
    qrNodes.forEach(node => {
      node.opacity(1);
    });
  }

  // Now create the image WITH QR
  // Draw the clean canvas first
  const img = new window.Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrlWithoutQr;
  });
  
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.drawImage(img, 0, 0);
  
  // Draw QR code overlay
  if (showQR) {
    await drawQROverlay(ctx, qrData, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  const imageWithQr = canvas.toDataURL('image/png');
  const imageWithoutQr = dataUrlWithoutQr;

  return {
    imageWithQr,
    imageWithoutQr,
  };
}

/**
 * Draw QR code overlay on the canvas context
 */
async function drawQROverlay(
  ctx: CanvasRenderingContext2D,
  qrData: string,
  canvasWidth: number,
  canvasHeight: number
): Promise<void> {
  // QR position (bottom-right)
  const qrX = canvasWidth - 180;
  const qrY = canvasHeight - 180;
  const qrSize = 150;

  // Draw white background for QR
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundedRect(ctx, qrX, qrY, qrSize, qrSize, 16);
  ctx.fill();

  // Draw QR code using canvas directly
  const qrCanvas = document.createElement('canvas');
  qrCanvas.width = 256;
  qrCanvas.height = 256;
  const qrCtx = qrCanvas.getContext('2d');
  
  if (!qrCtx) {
    throw new Error('Could not get QR canvas context');
  }

  // Use qrcode library to generate QR
  const QRCode = await import('qrcode');
  await QRCode.toCanvas(qrCanvas, qrData || 'flashcard', {
    width: 256,
    margin: 2,
    errorCorrectionLevel: 'H',
  });

  // Draw QR onto the main canvas
  ctx.drawImage(qrCanvas, qrX + 16, qrY + 16, qrSize - 32, qrSize - 32);
}

/**
 * Helper function to draw rounded rectangles
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

/**
 * Convert base64 data URL to blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Download a data URL as a file
 */
export function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert base64 string to plain base64 (without data URL prefix)
 */
export function base64ToPlain(base64: string): string {
  return base64.replace(/^data:image\/\w+;base64,/, '');
}
