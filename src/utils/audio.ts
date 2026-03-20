/**
 * Utility functions for client-side audio processing.
 */

export const AudioUtils = {
  /**
   * Slices a specific segment out of an audio Blob/File and returns it as a base64 encoded string.
   * Utilizes the Web Audio API and MediaRecorder.
   *
   * @param file The source audio File or Blob
   * @param startTime The start time in seconds
   * @param endTime The end time in seconds
   * @returns A Promise resolving to an object containing the base64 string and file extension.
   */
  async getAudioSnippetBase64(file: Blob | File, startTime: number, endTime: number): Promise<{ base64: string; ext: string }> {
    // Cap duration at 15s to be safe
    const duration = Math.min(endTime - startTime, 15.0);
    if (duration <= 0) throw new Error("Invalid duration");

    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.currentTime = startTime;

      // Ensure compatibility across browsers
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      const source = audioCtx.createMediaElementSource(audio);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const recorder = new MediaRecorder(dest.stream, { mimeType });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        audio.pause();
        source.disconnect();
        audioCtx.close();
        URL.revokeObjectURL(url);
        
        const rawBlob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(rawBlob);
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64data = result.split(',')[1];
          // Since we are forcing webm, return webm as ext
          resolve({ base64: base64data, ext: 'webm' });
        };
      };

      audio.onseeked = () => {
        audio.play().then(() => {
          recorder.start();
          setTimeout(() => recorder.stop(), duration * 1000);
        }).catch(e => { audioCtx.close(); reject(e); });
      };
      
      audio.onerror = (e) => { audioCtx.close(); reject(e); };
    });
  }
};
