importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');

self.addEventListener('message', async (e) => {
  const { imageData, imageUrl } = e.data;

  try {
    const worker = await Tesseract.createWorker('eng');

    const { data } = await worker.recognize(imageUrl || imageData);

    await worker.terminate();

    self.postMessage({
      success: true,
      text: data.text,
      confidence: data.confidence,
      lines: data.lines,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    });
  }
});
