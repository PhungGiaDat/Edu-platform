class ComboSpawner {
    constructor(options = {}) {
        this._scene = options.scene || null;
        this._audioContext = options.audioContext || null;
        this._activeEffects = new Map();
        this._effectIdCounter = 0;
    }

    spawn(combo, position = { x: 0, y: 0, z: 0 }) {
        console.log(`[ComboSpawner] Spawning: ${combo.animation}`, position);

        switch (combo.animation) {
            case 'particle_burst':
                this._spawnParticles(position, combo.phrase);
                break;
            case 'spawn_coin':
                this._spawnCoin(position);
                break;
            case 'model_swap':
                this._swapModel(position);
                break;
            case 'combo_jungle':
                this._spawnJungleEffect(position, combo.phrase);
                break;
            default:
                console.warn(`[ComboSpawner] Unknown animation: ${combo.animation}`);
        }

        if (combo.sound) {
            this._playSound(combo.sound);
        }

        if (combo.phrase) {
            this._showPhrase(combo.phrase, position);
        }
    }

    _spawnParticles(position, phrase) {
        const id = ++this._effectIdCounter;
        const effect = {
            id,
            type: 'particle_burst',
            position: { ...position },
            startTime: Date.now(),
            dispose: () => {
                this._activeEffects.delete(id);
                console.log(`[ComboSpawner] Disposed particle burst #${id}`);
            }
        };
        this._activeEffects.set(id, effect);
        console.log('[ComboSpawner] Particle burst at', position);
    }

    _spawnCoin(position) {
        const id = ++this._effectIdCounter;
        const effect = {
            id,
            type: 'coin',
            position: { ...position },
            startTime: Date.now(),
            dispose: () => {
                this._activeEffects.delete(id);
                console.log(`[ComboSpawner] Disposed coin #${id}`);
            }
        };
        this._activeEffects.set(id, effect);
        console.log('[ComboSpawner] Coin spawned at', position);
    }

    _swapModel(position) {
        console.log('[ComboSpawner] Model swap at', position);
    }

    _spawnJungleEffect(position, phrase) {
        const id = ++this._effectIdCounter;
        const effect = {
            id,
            type: 'jungle_effect',
            position: { ...position },
            phrase,
            startTime: Date.now(),
            dispose: () => {
                this._activeEffects.delete(id);
                console.log(`[ComboSpawner] Disposed jungle effect #${id}`);
            }
        };
        this._activeEffects.set(id, effect);
        console.log('[ComboSpawner] Jungle effect at', position, phrase);
    }

    _playSound(url) {
        if (!this._audioContext) {
            console.warn('[ComboSpawner] No audio context, skipping sound');
            return;
        }
        
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => this._audioContext.decodeAudioData(buffer))
            .then(audioBuffer => {
                const source = this._audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(this._audioContext.destination);
                source.start(0);
            })
            .catch(err => console.error('[ComboSpawner] Sound error:', err));
    }

    _showPhrase(phrase, position) {
        console.log('[ComboSpawner] Phrase:', phrase, 'at', position);
    }

    getActiveEffects() {
        return [...this._activeEffects.values()];
    }

    dispose() {
        for (const [id, effect] of this._activeEffects) {
            effect.dispose?.();
        }
        this._activeEffects.clear();
    }
}

export { ComboSpawner };
