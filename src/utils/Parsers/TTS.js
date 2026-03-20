export const TTS = {
    synth: window.speechSynthesis,
    utterance: null,
    voices: [],
    
    init() {
        if (!this.synth) return;
        const loadVoices = () => {
            this.voices = this.synth.getVoices();
        };
        loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
    },
    
    getVoices() {
        return this.voices;
    },

    stop() {
        if (this.synth) this.synth.cancel();
    },

    speak(text, onEndCallback = null) {
        if (!this.synth || !text) {
            if (onEndCallback) onEndCallback();
            return;
        }
        
        this.stop();
        
        this.utterance = new SpeechSynthesisUtterance(text);
        
        // Apply Settings
        const targetLang = localStorage.getItem('ky_lang') || 'en';
        const rate = parseFloat(localStorage.getItem('ky_tts_rate') || '1.0');
        const prefVoice = localStorage.getItem('ky_tts_voice');
        
        this.utterance.rate = rate;
        
        if (prefVoice) {
            const voice = this.voices.find(v => v.name === prefVoice);
            if (voice) this.utterance.voice = voice;
        } else {
            // Try to find a voice matching the target language
            const langVoice = this.voices.find(v => v.lang.startsWith(targetLang));
            if (langVoice) this.utterance.voice = langVoice;
        }

        if (onEndCallback) {
            this.utterance.onend = onEndCallback;
        }
        
        this.synth.speak(this.utterance);
    }
};

// Initialize on load
TTS.init();
