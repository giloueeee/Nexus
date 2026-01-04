
import { PodcastScript } from '../types';

/**
 * Decodes a base64 string into a Uint8Array.
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Creates a WAV file header and concatenates it with raw PCM data.
 * Assuming 24kHz, 1 channel, 16-bit PCM (standard for Gemini TTS output).
 */
export const createWavBlob = (pcmData: Uint8Array, sampleRate: number = 24000): Blob => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const fileSize = 36 + dataSize;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, fileSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  return new Blob([header, pcmData], { type: 'audio/wav' });
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

/**
 * Splits a script into smaller chunks for progressive audio generation.
 * Keeps chunks relatively small (e.g., 5-8 lines) for fast initial playback.
 */
export const chunkScript = (script: PodcastScript, linesPerChunk: number = 8): PodcastScript[] => {
  const chunks: PodcastScript[] = [];
  const lines = script.lines;
  
  for (let i = 0; i < lines.length; i += linesPerChunk) {
    chunks.push({
      ...script,
      lines: lines.slice(i, i + linesPerChunk)
    });
  }
  
  return chunks;
};

/**
 * Merges multiple WAV URLs into a single Blob for downloading.
 * Strips headers from chunks and creates a new unified WAV file.
 */
export const mergeAudioSegments = async (segmentUrls: string[]): Promise<Blob> => {
  const buffers = await Promise.all(
    segmentUrls.map(async (url) => {
      const response = await fetch(url);
      return await response.arrayBuffer();
    })
  );

  // Standard WAV header is 44 bytes. 
  // We skip the header of each chunk to get raw PCM, then concatenate.
  const headerSize = 44;
  let totalLength = 0;
  
  const pcmChunks = buffers.map(buffer => {
    // If buffer is smaller than header, it's invalid, return empty
    if (buffer.byteLength <= headerSize) return new Uint8Array(0);
    const pcm = new Uint8Array(buffer.slice(headerSize));
    totalLength += pcm.length;
    return pcm;
  });

  const mergedPcm = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of pcmChunks) {
    mergedPcm.set(chunk, offset);
    offset += chunk.length;
  }

  // Create new WAV blob with the merged PCM data
  return createWavBlob(mergedPcm, 24000); // Assuming 24kHz based on Gemini output
};
