import { useState, useCallback } from 'react';

// A custom hook to encapsulate translation logic using the free Google Translate API.
export function useTranslate(targetLang = 'en') {
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTranslation = useCallback(async (text: string | undefined | null) => {
    // Prevent redundant fetches
    if (!text || translation) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // The Google Translate API returns a nested array where data[0] contains the translated segments
      let resultText = '';
      if (data && data[0]) {
        data[0].forEach((item: any[]) => {
          if (item[0]) {
            resultText += item[0];
          }
        });
      }

      setTranslation(resultText || "Translation failed to parse.");
    } catch (err) {
      console.error("Translation fetch error:", err);
      setError("Failed to fetch translation.");
      setTranslation("Translation unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, [translation, targetLang]);

  return { translation, isLoading, error, fetchTranslation };
}
