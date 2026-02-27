// src/lib/coinSound.ts
/**
 * Sintetiza el sonido de una moneda cayendo en una alcancía
 * usando Web Audio API — sin archivos externos.
 *
 * Funciona en cualquier navegador moderno.
 * El sonido solo se reproduce si el usuario ya interactuó con la página
 * (restricción de los navegadores para evitar audio no solicitado).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
}

/**
 * Tono de moneda: dos "pings" metálicos cortos, decrecientes.
 * Suena como una moneda rebotando en metal.
 */
export function playCoinSound(volume: number = 0.6): void {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        // Si el contexto está suspendido (política de autoplay), lo reanudamos
        if (ctx.state === 'suspended') ctx.resume();

        const now = ctx.currentTime;

        // ── Primer ping (más fuerte, frecuencia alta) ──
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const filter1 = ctx.createBiquadFilter();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1760, now);           // La 6 — tono de moneda
        osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08); // Baja rápido

        filter1.type = 'highpass';
        filter1.frequency.value = 800;

        gain1.gain.setValueAtTime(volume, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25); // Decae en 250ms

        osc1.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.25);

        // ── Segundo ping (eco, más corto y suave) ──
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.1);     // Mi 6
        osc2.frequency.exponentialRampToValueAtTime(660, now + 0.2);

        gain2.gain.setValueAtTime(volume * 0.4, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.35);

        // ── Ruido metálico breve (texture de moneda) ──
        const bufferSize = ctx.sampleRate * 0.05; // 50ms de ruido
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.15;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 4000;
        noiseFilter.Q.value = 0.5;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(volume * 0.3, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(now);

    } catch (e) {
        // Silencio si el navegador no soporta Web Audio API
        console.debug('[coinSound] No se pudo reproducir:', e);
    }
}
