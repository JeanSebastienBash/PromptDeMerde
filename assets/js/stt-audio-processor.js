/**
 * PromptDeMerde.com — stt-audio-processor.js
 *
 * Synopsis : AudioWorklet de capture micro pour dictée STT.
 * Objectif : Remplacer ScriptProcessor et poster les samples vers le thread principal.
 */
class SttCaptureProcessor extends AudioWorkletProcessor {
    process(inputs) {
        var input = inputs[0];
        if (!input || !input[0] || !input[0].length) return true;
        var samples = input[0];
        this.port.postMessage({ samples: samples.slice(0) });
        return true;
    }
}

registerProcessor('stt-capture-processor', SttCaptureProcessor);
