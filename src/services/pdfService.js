import * as pdfjsLib from 'pdfjs-dist';

// Configure worker URL for pdfjs in browser/Vite environment
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("Could not set workerSrc via cdnjs:", e);
}

/**
 * Extracts clean text from an uploaded PDF File or ArrayBuffer
 * @param {File | ArrayBuffer} fileOrBuffer
 * @returns {Promise<{ text: string, numPages: number, title: string, isScannedLikely: boolean }>}
 */
export async function extractTextFromPdf(fileOrBuffer) {
  let arrayBuffer;
  let filename = "Uploaded Document.pdf";

  if (fileOrBuffer instanceof File) {
    filename = fileOrBuffer.name;
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  let fullText = "";
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Group text items by line layout
    let lastY = null;
    let pageText = "";

    for (const item of textContent.items) {
      if (!item.str) continue;
      
      // If Y coordinate changed noticeably, insert a newline
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 6) {
        pageText += "\n";
      } else if (pageText.length > 0 && !pageText.endsWith(" ") && !pageText.endsWith("\n")) {
        pageText += " ";
      }

      pageText += item.str;
      lastY = item.transform[5];
    }

    fullText += `\n\n## Section Page ${pageNum}\n` + pageText.trim();
    totalChars += pageText.trim().length;
  }

  // Scanned PDF detection heuristic: if average chars per page < 40, likely scanned images
  const avgCharsPerPage = totalChars / (numPages || 1);
  const isScannedLikely = avgCharsPerPage < 50;

  // Clean document title from filename
  const cleanTitle = filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  return {
    text: fullText.trim(),
    numPages,
    title: cleanTitle,
    isScannedLikely
  };
}
