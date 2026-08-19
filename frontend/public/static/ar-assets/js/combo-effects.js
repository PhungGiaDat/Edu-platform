/**
 * combo-effects.js - Visual Effects for Multi-Card Combos
 * 
 * Provides particle effects, glowing animations, and combo model spawning
 * when two flashcards are brought together in AR.
 * 
 * This module can be loaded separately and registers A-Frame components
 * for combo visual effects.
 */
(function() {
    'use strict';

    // ============ CONFIGURATION ============
    const CONFIG = {
        particleCount: 20,
        particleColors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A855F7', '#FF8E53'],
        glowColor: '#FFD700',
        comboTextColor: '#FFFFFF',
        animationDuration: 2000
    };

    // ============ A-FRAME COMPONENTS ============

    /**
     * Particle system component for combo effects
     * Usage: <a-entity combo-particles="count: 20; color: #FFD700"></a-entity>
     */
    if (typeof AFRAME !== 'undefined') {
        AFRAME.registerComponent('combo-particles', {
            schema: {
                count: { type: 'number', default: 20 },
                colors: { type: 'array', default: ['#FFD700', '#FF6B6B', '#4ECDC4'] },
                radius: { type: 'number', default: 0.3 },
                speed: { type: 'number', default: 1 }
            },

            init: function() {
                this.particles = [];
                this.createParticles();
            },

            createParticles: function() {
                const data = this.data;
                const el = this.el;

                for (let i = 0; i < data.count; i++) {
                    const particle = document.createElement('a-sphere');
                    const color = data.colors[i % data.colors.length];
                    const angle = (i / data.count) * Math.PI * 2;
                    const radius = data.radius * (0.5 + Math.random() * 0.5);

                    particle.setAttribute('radius', 0.015 + Math.random() * 0.01);
                    particle.setAttribute('color', color);
                    particle.setAttribute('opacity', 0.8);
                    particle.setAttribute('position', {
                        x: Math.cos(angle) * radius,
                        y: Math.random() * 0.2 - 0.1,
                        z: Math.sin(angle) * radius
                    });

                    // Floating animation
                    const duration = 1000 + Math.random() * 1000;
                    particle.setAttribute('animation', {
                        property: 'position',
                        to: {
                            x: Math.cos(angle + 0.5) * radius * 1.2,
                            y: 0.1 + Math.random() * 0.2,
                            z: Math.sin(angle + 0.5) * radius * 1.2
                        },
                        dur: duration,
                        easing: 'easeInOutQuad',
                        loop: true,
                        dir: 'alternate'
                    });

                    // Pulsing opacity
                    particle.setAttribute('animation__opacity', {
                        property: 'opacity',
                        from: 0.5,
                        to: 1,
                        dur: 500 + Math.random() * 500,
                        loop: true,
                        dir: 'alternate'
                    });

                    el.appendChild(particle);
                    this.particles.push(particle);
                }
            },

            remove: function() {
                this.particles.forEach(p => p.parentNode?.removeChild(p));
                this.particles = [];
            }
        });

        /**
         * Combo glow ring component
         * Usage: <a-entity combo-glow="color: #FFD700; size: 0.2"></a-entity>
         */
        AFRAME.registerComponent('combo-glow', {
            schema: {
                color: { type: 'color', default: '#FFD700' },
                size: { type: 'number', default: 0.2 }
            },

            init: function() {
                const data = this.data;
                const el = this.el;

                // Inner ring
                const innerRing = document.createElement('a-ring');
                innerRing.setAttribute('radius-inner', data.size * 0.4);
                innerRing.setAttribute('radius-outer', data.size * 0.6);
                innerRing.setAttribute('color', data.color);
                innerRing.setAttribute('opacity', 0.9);
                innerRing.setAttribute('animation', {
                    property: 'scale',
                    to: '1.3 1.3 1.3',
                    dur: 500,
                    easing: 'easeOutQuad',
                    loop: true,
                    dir: 'alternate'
                });
                innerRing.setAttribute('animation__rotate', {
                    property: 'rotation',
                    to: '0 0 360',
                    dur: 2000,
                    easing: 'linear',
                    loop: true
                });
                el.appendChild(innerRing);

                // Outer ring
                const outerRing = document.createElement('a-ring');
                outerRing.setAttribute('radius-inner', data.size * 0.7);
                outerRing.setAttribute('radius-outer', data.size * 0.9);
                outerRing.setAttribute('color', '#FF6B6B');
                outerRing.setAttribute('opacity', 0.6);
                outerRing.setAttribute('animation', {
                    property: 'scale',
                    to: '1.2 1.2 1.2',
                    dur: 700,
                    easing: 'easeOutQuad',
                    loop: true,
                    dir: 'alternate'
                });
                outerRing.setAttribute('animation__rotate', {
                    property: 'rotation',
                    to: '0 0 -360',
                    dur: 3000,
                    easing: 'linear',
                    loop: true
                });
                el.appendChild(outerRing);
            }
        });

        /**
         * Combo text component with animation
         * Usage: <a-entity combo-text="text: COMBO!; color: #FFFFFF"></a-entity>
         */
        AFRAME.registerComponent('combo-text', {
            schema: {
                text: { type: 'string', default: '✨ COMBO! ✨' },
                color: { type: 'color', default: '#FFFFFF' }
            },

            init: function() {
                const data = this.data;
                const el = this.el;

                const text = document.createElement('a-text');
                text.setAttribute('value', data.text);
                text.setAttribute('align', 'center');
                text.setAttribute('color', data.color);
                text.setAttribute('scale', '0.15 0.15 0.15');
                text.setAttribute('position', '0 0.2 0');
                text.setAttribute('animation', {
                    property: 'position',
                    to: '0 0.25 0',
                    dur: 500,
                    easing: 'easeOutQuad',
                    loop: true,
                    dir: 'alternate'
                });
                text.setAttribute('animation__scale', {
                    property: 'scale',
                    from: '0.15 0.15 0.15',
                    to: '0.18 0.18 0.18',
                    dur: 300,
                    easing: 'easeOutQuad',
                    loop: true,
                    dir: 'alternate'
                });
                el.appendChild(text);
            }
        });

        /**
         * Full combo effect entity component
         * Combines particles, glow, and text
         * Usage: <a-entity combo-effect></a-entity>
         */
        AFRAME.registerComponent('combo-effect', {
            init: function() {
                const el = this.el;

                // Add particle system
                const particles = document.createElement('a-entity');
                particles.setAttribute('combo-particles', '');
                el.appendChild(particles);

                // Add glow rings
                const glow = document.createElement('a-entity');
                glow.setAttribute('combo-glow', '');
                el.appendChild(glow);

                // Add combo text
                const text = document.createElement('a-entity');
                text.setAttribute('combo-text', '');
                el.appendChild(text);
            }
        });

        console.log('[Combo Effects] A-Frame components registered');
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * Create a complete combo effect entity at a position
     * @param {THREE.Vector3} position - World position for the effect
     * @param {HTMLElement} scene - A-Frame scene element
     * @returns {HTMLElement} The created combo effect entity
     */
    function createComboEffect(position, scene) {
        const entity = document.createElement('a-entity');
        entity.id = 'combo-effect-' + Date.now();
        entity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
        entity.setAttribute('combo-effect', '');
        
        if (scene) {
            scene.appendChild(entity);
        }
        
        return entity;
    }

    /**
     * Remove all combo effects from the scene
     * @param {HTMLElement} scene - A-Frame scene element
     */
    function removeAllComboEffects(scene) {
        if (!scene) return;
        
        const effects = scene.querySelectorAll('[id^="combo-effect"]');
        effects.forEach(effect => effect.parentNode?.removeChild(effect));
    }

    /**
     * Create a burst effect (one-time explosion of particles)
     * @param {THREE.Vector3} position - World position for the burst
     * @param {HTMLElement} scene - A-Frame scene element
     */
    function createBurstEffect(position, scene) {
        if (!scene) return;

        const burst = document.createElement('a-entity');
        burst.id = 'burst-effect-' + Date.now();
        burst.setAttribute('position', `${position.x} ${position.y} ${position.z}`);

        // Create burst particles
        for (let i = 0; i < 12; i++) {
            const particle = document.createElement('a-sphere');
            const angle = (i / 12) * Math.PI * 2;
            const color = CONFIG.particleColors[i % CONFIG.particleColors.length];

            particle.setAttribute('radius', 0.02);
            particle.setAttribute('color', color);
            particle.setAttribute('position', '0 0 0');
            particle.setAttribute('animation', {
                property: 'position',
                to: {
                    x: Math.cos(angle) * 0.5,
                    y: 0.2 + Math.random() * 0.3,
                    z: Math.sin(angle) * 0.5
                },
                dur: 500,
                easing: 'easeOutQuad'
            });
            particle.setAttribute('animation__opacity', {
                property: 'opacity',
                from: 1,
                to: 0,
                dur: 500,
                easing: 'easeInQuad'
            });
            particle.setAttribute('animation__scale', {
                property: 'scale',
                from: '1 1 1',
                to: '0.1 0.1 0.1',
                dur: 500,
                easing: 'easeInQuad'
            });

            burst.appendChild(particle);
        }

        scene.appendChild(burst);

        // Remove after animation
        setTimeout(() => {
            burst.parentNode?.removeChild(burst);
        }, 600);
    }

    // ============ EXPORT ============
    window.ComboEffects = {
        CONFIG,
        createComboEffect,
        removeAllComboEffects,
        createBurstEffect
    };

    console.log('[Combo Effects] Module loaded');
})();
