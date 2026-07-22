import { RuleLoader } from './rule-loader.js';

class SemanticManager {
    constructor(options = {}) {
        this._ruleLoader = new RuleLoader({
            baseUrl: options.baseUrl || '/api/v1'
        });
        this._rules = [];
        this._currentCards = new Set();
        this._flashcardSet = null;
        this._onCombo = options.onCombo || (() => {});
        this._triggeredCombos = new Set();
    }

    async init(flashcardSet) {
        this._flashcardSet = flashcardSet;
        this._rules = await this._ruleLoader.loadRules(flashcardSet);
        console.log(`[SemanticManager] Loaded ${this._rules.length} rules`);
    }

    updateCards(cardIds) {
        const newCards = new Set(cardIds);
        const addedCards = [...newCards].filter(c => !this._currentCards.has(c));
        const removedCards = [...this._currentCards].filter(c => !newCards.has(c));
        
        this._currentCards = newCards;
        
        if (addedCards.length > 0 || removedCards.length > 0) {
            this._checkCombos();
        }
    }

    addCard(cardId) {
        this._currentCards.add(cardId);
        this._checkCombos();
    }

    removeCard(cardId) {
        this._currentCards.delete(cardId);
    }

    clearCards() {
        this._currentCards.clear();
    }

    getCurrentCards() {
        return [...this._currentCards];
    }

    getRules() {
        return [...this._rules];
    }

    _checkCombos() {
        if (this._rules.length === 0) return;

        const sortedRules = [...this._rules].sort((a, b) => b.priority - a.priority);

        for (const rule of sortedRules) {
            if (!rule.active) continue;

            const hasAllCards = rule.cards.every(card => this._currentCards.has(card));
            
            if (hasAllCards) {
                const comboKey = rule.cards.sort().join('|');
                
                if (!this._triggeredCombos.has(comboKey)) {
                    this._triggeredCombos.add(comboKey);
                    
                    const result = {
                        ruleId: rule.id,
                        cardIds: [...rule.cards],
                        animation: rule.animation,
                        sound: rule.sound,
                        phrase: rule.phrase
                    };
                    
                    this._onCombo(result);
                    console.log(`[SemanticManager] Combo triggered: ${rule.result}`, result);
                }
            } else {
                const comboKey = rule.cards.sort().join('|');
                this._triggeredCombos.delete(comboKey);
            }
        }
    }

    reset() {
        this._triggeredCombos.clear();
        this._currentCards.clear();
    }

    async reloadRules() {
        await this._ruleLoader.reloadRule();
        this._rules = this._ruleLoader.getCachedRules(this._flashcardSet) || [];
    }
}

export { SemanticManager };
