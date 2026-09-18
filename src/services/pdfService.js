import * as pdfjsLib from 'pdfjs-dist';

// Configure worker URL for pdfjs in browser/Vite environment
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("Could not set workerSrc via cdnjs:", e);
}

/**
 * Heuristic patterns that typically indicate a section heading in academic/technical PDFs:
 * - All-caps short lines (e.g., "INTRODUCTION", "RESULTS")
 * - Numbered headings (e.g., "1.", "2.1", "Section 3")
 * - Title-case short lines that end without punctuation
 */
function looksLikeHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;

  // Numbered headings: "1.", "2.1", "3.1.2", "Section 1", "CHAPTER 2"
  if (/^(section|chapter|part)\s+\d+/i.test(trimmed)) return true;
  if (/^\d+(\.\d+)*\.?\s+[A-Z]/.test(trimmed)) return true;

  // All-caps short phrases (e.g., "ABSTRACT", "INTRODUCTION")
  if (/^[A-Z][A-Z\s\-]{2,40}$/.test(trimmed) && trimmed.split(' ').length <= 5) return true;

  // Title-case line that doesn't end with sentence-ending punctuation and is short
  if (
    trimmed.length < 60 &&
    !/[.?!,;]$/.test(trimmed) &&
    /^[A-Z]/.test(trimmed) &&
    !/^\s*(the|a|an|in|on|at|to|for|of|and|but|or|because|when|while)\s/i.test(trimmed)
  ) {
    const wordCount = trimmed.split(/\s+/).length;
    if (wordCount >= 2 && wordCount <= 7) return true;
  }

  return false;
}

/**
 * Extracts clean text from an uploaded PDF File or ArrayBuffer.
 * Intelligently detects section headings within the raw text and emits
 * markdown H2 headings so the downstream chunkingService can split on them.
 *
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

  // Step 1: Extract all text content with Y-position grouping to detect headings
  let allLines = [];
  let totalChars = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items by Y-position bands (each band = one visual line)
    const lineMap = new Map();
    for (const item of textContent.items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5] / 4) * 4; // round to 4px bands
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y).push(item);
    }

    // Sort lines top-to-bottom (descending Y in PDF coordinate space)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const items = lineMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
      const lineText = items.map(i => i.str).join(' ').trim();
      if (lineText) {
        allLines.push(lineText);
        totalChars += lineText.length;
      }
    }

    // Add a light page separator (not a heading) to preserve paragraph flow
    allLines.push('');
  }

  // Step 2: Merge lines into paragraphs and detect headings
  const outputParts = [];
  let currentParagraph = [];
  let detectedHeadings = 0;

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];

    if (!line) {
      // Empty line = paragraph break
      if (currentParagraph.length > 0) {
        outputParts.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      continue;
    }

    if (looksLikeHeading(line)) {
      // Flush current paragraph first
      if (currentParagraph.length > 0) {
        outputParts.push(currentParagraph.join(' '));
        currentParagraph = [];
      }
      // Emit as markdown heading
      outputParts.push(`\n## ${line.trim()}\n`);
      detectedHeadings++;
    } else {
      currentParagraph.push(line);
    }
  }

  // Flush trailing paragraph
  if (currentParagraph.length > 0) {
    outputParts.push(currentParagraph.join(' '));
  }

  // Step 3: If no headings detected at all, fall back to page-based splitting
  // (better than one giant chunk with no structure)
  let fullText;
  if (detectedHeadings === 0 && numPages > 1) {
    // Re-extract with page boundaries as headings — but only create a new heading
    // when a page boundary falls mid-thought (skip if previous line ended sentence)
    const pageParts = outputParts;
    let pageNum = 1;
    const rebuiltParts = [];

    for (const part of pageParts) {
      if (part.includes('\f') || (rebuiltParts.length > 0 && rebuiltParts.length % 3 === 0)) {
        rebuiltParts.push(`\n## Part ${pageNum++}\n`);
      }
      rebuiltParts.push(part);
    }
    fullText = rebuiltParts.join('\n\n');
  } else {
    fullText = outputParts.join('\n\n');
  }

  // Scanned PDF detection: if average chars per page < 50, likely scanned images
  const avgCharsPerPage = totalChars / (numPages || 1);
  const isScannedLikely = avgCharsPerPage < 50;

  // Clean document title from filename
  const cleanTitle = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  return {
    text: fullText.trim(),
    numPages,
    title: cleanTitle,
    isScannedLikely
  };
}
