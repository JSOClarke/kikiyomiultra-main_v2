/**
 * Wrapper for communicating with the AnkiConnect local server addon.
 */
class AnkiConnectAPI {
  private url = 'http://127.0.0.1:8765';

  /**
   * Universal invoke method for AnkiConnect endpoints.
   */
  async invoke(action: string, params = {}): Promise<any> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        body: JSON.stringify({ action, version: 6, params }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      return data.result;
    } catch (e: any) {
      console.warn("AnkiConnect Error:", e.message);
      return null;
    }
  }

  /**
   * Retrieves the ID of the note that was most recently added to the user's collection.
   */
  async getLastCreatedCardId(): Promise<number | null> {
    const cards = await this.invoke('findCards', { query: 'added:2' });
    if (!cards || cards.length === 0) return null;
    return Math.max(...cards);
  }

  /**
   * Attaches an audio file to an existing card.
   * Can use either a base64 string or an external URL.
   */
  async addAudioToCard(
    cardId: number,
    audioSource: string,
    filename: string,
    targetField?: string,
    isUrl = false
  ): Promise<string | false> {
    const cardInfo = await this.invoke('cardsInfo', { cards: [cardId] });
    if (!cardInfo || cardInfo.length === 0) return false;

    const noteId = cardInfo[0].note;
    const noteInfo = await this.invoke('notesInfo', { notes: [noteId] });
    if (!noteInfo || noteInfo.length === 0) return false;

    const fields = noteInfo[0].fields;

    // Detect field
    let audioField = targetField && fields[targetField] !== undefined ? targetField : null;
    if (!audioField) {
      for (const key of Object.keys(fields)) {
        if (key.toLowerCase().includes('audio') || key.toLowerCase().includes('sound') || key.toLowerCase().includes('voice')) {
          audioField = key;
          break;
        }
      }
    }
    if (!audioField) audioField = Object.keys(fields)[0];

    // Store media file
    const mediaParams = isUrl ? { filename, url: audioSource } : { filename, data: audioSource };
    const storedFilename = await this.invoke('storeMediaFile', mediaParams);
    if (!storedFilename) return false;

    // Update note field
    const currentContent = fields[audioField].value;
    const newContent = `${currentContent} [sound:${storedFilename}]`;

    await this.invoke('updateNoteFields', {
      note: { id: noteId, fields: { [audioField]: newContent } }
    });
    
    return audioField;
  }

  /**
   * Attaches cover art logic as an img tag to the specified field
   */
  async addCoverToCard(
    cardId: number,
    base64Data: string,     // MUST be base64 without the data URI prefix
    storedFilename: string | null,
    targetField?: string
  ): Promise<string | false> {
    const cardInfo = await this.invoke('cardsInfo', { cards: [cardId] });
    if (!cardInfo || cardInfo.length === 0) return false;
    
    const noteId = cardInfo[0].note;
    const noteInfo = await this.invoke('notesInfo', { notes: [noteId] });
    if (!noteInfo || noteInfo.length === 0) return false;
    
    const fields = noteInfo[0].fields;

    let picField = targetField && fields[targetField] !== undefined ? targetField : null;
    if (!picField) {
      for (const key of Object.keys(fields)) {
        if (key.toLowerCase().includes('picture') || key.toLowerCase().includes('image') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('cover')) {
          picField = key;
          break;
        }
      }
    }
    if (!picField) return false;

    let filename = storedFilename;
    if (!filename) {
      const ext = 'jpg'; // We can safely assume jpeg or png based on base64 later if needed
      const proposed = `kikiyomi_cover_${Date.now()}.${ext}`;
      filename = await this.invoke('storeMediaFile', { filename: proposed, data: base64Data });
      if (!filename) return false;
    }

    const currentContent = fields[picField].value;
    const imgTag = `<img src="${filename}">`;
    const newContent = `${currentContent} ${imgTag}`;
    await this.invoke('updateNoteFields', {
      note: { id: noteId, fields: { [picField]: newContent } }
    });
    return filename;
  }

  /**
   * Adds specified tags to the card
   */
  async addTagsToCard(cardId: number, tagsString: string): Promise<boolean> {
    const cardInfo = await this.invoke('cardsInfo', { cards: [cardId] });
    if (!cardInfo || cardInfo.length === 0) return false;
    
    const noteId = cardInfo[0].note;
    await this.invoke('addTags', { notes: [noteId], tags: tagsString });
    return true;
  }
}

export const AnkiConnect = new AnkiConnectAPI();
