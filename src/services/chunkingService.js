/**
 * Chunks raw text or markdown into logical, digestible reading sections
 * with calculated expected reading times and key-concept heuristics.
 */

export function chunkDocument(rawText, readingWpm = 200) {
  if (!rawText || !rawText.trim()) return [];

  // 1. Split text into preliminary blocks by markdown headings or double breaks
  const rawSections = splitByHeadingsOrParagraphs(rawText);

  const chunks = [];
  let chunkIndex = 0;

  for (let i = 0; i < rawSections.length; i++) {
    const sec = rawSections[i];
    const words = countWords(sec.content);

    // If section is tiny (< 35 words) and we already have a previous chunk, merge if logical
    if (words < 35 && chunks.length > 0 && !sec.heading) {
      chunks[chunks.length - 1].content += "\n\n" + sec.content;
      chunks[chunks.length - 1].wordCount += words;
      chunks[chunks.length - 1].expectedDwellSeconds = calculateExpectedDwell(chunks[chunks.length - 1].wordCount, readingWpm);
      chunks[chunks.length - 1].minDwellSeconds = Math.max(4, Math.round(chunks[chunks.length - 1].expectedDwellSeconds * 0.35));
      continue;
    }

    // If section is very large (> 450 words), split into smaller digestible parts
    if (words > 450) {
      const subParts = splitLargeSection(sec.content, 250);
      subParts.forEach((part, subIdx) => {
        const subWords = countWords(part);
        const expSec = calculateExpectedDwell(subWords, readingWpm);
        chunks.push({
          id: `chunk-${chunkIndex}`,
          index: chunkIndex,
          title: sec.heading ? `${sec.heading} (Part ${subIdx + 1})` : `Section ${chunkIndex + 1}`,
          content: part.trim(),
          wordCount: subWords,
          expectedDwellSeconds: expSec,
          minDwellSeconds: Math.max(4, Math.round(expSec * 0.35)),
          keyTerms: extractKeyTerms(part)
        });
        chunkIndex++;
      });
      continue;
    }

    const expSec = calculateExpectedDwell(words, readingWpm);
    chunks.push({
      id: `chunk-${chunkIndex}`,
      index: chunkIndex,
      title: sec.heading || `Section ${chunkIndex + 1}`,
      content: sec.content.trim(),
      wordCount: words,
      expectedDwellSeconds: expSec,
      minDwellSeconds: Math.max(4, Math.round(expSec * 0.35)),
      keyTerms: extractKeyTerms(sec.content)
    });
    chunkIndex++;
  }

  return chunks;
}

function calculateExpectedDwell(words, wpm) {
  // words / (wpm / 60 seconds)
  const seconds = Math.round((words / Math.max(100, wpm)) * 60);
  return Math.max(6, seconds);
}

function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function splitByHeadingsOrParagraphs(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];

  let currentHeading = "";
  let currentLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isHeading = /^#{1,3}\s+(.+)/.test(line);

    if (isHeading) {
      if (currentLines.length > 0 || currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentLines.join("\n").trim()
        });
        currentLines = [];
      }
      currentHeading = line.replace(/^#{1,3}\s+/, "").trim();
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0 || currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentLines.join("\n").trim()
    });
  }

  // If no markdown headings were detected, fallback to paragraph clusters
  if (sections.length <= 1 && text.length > 800) {
    return splitByParagraphClusters(text);
  }

  return sections.filter(s => s.content.length > 0);
}

function splitByParagraphClusters(text) {
  const paragraphs = text.split(/\n\s*\n/);
  const sections = [];
  let currentGroup = [];
  let currentCount = 0;

  paragraphs.forEach((p, idx) => {
    const w = countWords(p);
    if (currentCount + w > 250 && currentGroup.length > 0) {
      sections.push({
        heading: `Part ${sections.length + 1}`,
        content: currentGroup.join("\n\n")
      });
      currentGroup = [p];
      currentCount = w;
    } else {
      currentGroup.push(p);
      currentCount += w;
    }
  });

  if (currentGroup.length > 0) {
    sections.push({
      heading: `Part ${sections.length + 1}`,
      content: currentGroup.join("\n\n")
    });
  }

  return sections;
}

function splitLargeSection(text, targetWords = 250) {
  const paragraphs = text.split(/\n\s*\n/);
  const parts = [];
  let currentLines = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const w = countWords(para);
    if (currentWordCount + w > targetWords && currentLines.length > 0) {
      parts.push(currentLines.join("\n\n"));
      currentLines = [para];
      currentWordCount = w;
    } else {
      currentLines.push(para);
      currentWordCount += w;
    }
  }

  if (currentLines.length > 0) {
    parts.push(currentLines.join("\n\n"));
  }

  return parts;
}

function extractKeyTerms(text) {
  // Regex heuristics: bold words (**term**), capitalized multi-word terms (e.g., "Virtual Memory Area"), acronyms (TLB, RPC, WAL)
  const keyTerms = new Set();

  const boldMatches = text.match(/\*\*([^*]+)\*\*/g) || [];
  boldMatches.forEach(m => {
    const clean = m.replace(/\*\*/g, "").trim();
    if (clean.length > 2 && clean.length < 40) keyTerms.add(clean);
  });

  const acronymMatches = text.match(/\b[A-Z]{2,6}\b/g) || [];
  acronymMatches.forEach(a => {
    if (!["THE", "AND", "FOR", "NOT", "CAN", "ARE", "WAS"].includes(a)) {
      keyTerms.add(a);
    }
  });

  return Array.from(keyTerms).slice(0, 5);
}
