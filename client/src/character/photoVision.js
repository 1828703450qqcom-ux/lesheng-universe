// The model and WASM are served from this app. No photo or inference request leaves the browser.
let detectorPromise;

async function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const base = `${import.meta.env.BASE_URL}vision/`;
      const files = await FilesetResolver.forVisionTasks(`${base}wasm`);
      return FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: `${base}blaze_face_short_range.tflite`, delegate: 'CPU' },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.55
      });
    })().catch(error => { detectorPromise = undefined; throw error; });
  }
  return detectorPromise;
}

export function summarizeDetections(detections, width, height) {
  const faces = (detections || []).filter(item => item.boundingBox && item.boundingBox.width > 0 && item.boundingBox.height > 0);
  if (!faces.length) return { faceCount: 0, faceBox: null };
  const primary = [...faces].sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height)[0];
  const box = primary.boundingBox;
  const clamp = value => Math.max(0, Math.min(1, value));
  return {
    faceCount: faces.length,
    faceBox: {
      x: clamp(box.originX / width), y: clamp(box.originY / height),
      width: clamp(box.width / width), height: clamp(box.height / height)
    }
  };
}

export async function detectPhotoFaces(image) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, 320 / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  const detector = await getDetector();
  return summarizeDetections(detector.detect(canvas).detections, canvas.width, canvas.height);
}
