// Emblem Generator JavaScript - Individual Image Version
// Uses individual PNG files instead of sprite sheets

(function() {
    // Halo 2 emblem color palette (accurate colors from in-game color blocks)
    const colorPalette = [
        { r: 255, g: 255, b: 255 }, // 0: White (10E0)
        { r: 110, g: 110, b: 110 }, // 1: Steel (11E0)
        { r: 189, g: 43,  b: 44  }, // 2: Red (12E0)
        { r: 244, g: 123, b: 32  }, // 3: Orange (13E0)
        { r: 244, g: 209, b: 45  }, // 4: Gold (14E0)
        { r: 158, g: 169, b: 90  }, // 5: Olive (15E0)
        { r: 35,  g: 145, b: 46  }, // 6: Green (16E0)
        { r: 36,  g: 87,  b: 70  }, // 7: Sage (17E0)
        { r: 22,  g: 160, b: 160 }, // 8: Cyan (18E0)
        { r: 55,  g: 115, b: 123 }, // 9: Teal (27E0)
        { r: 32,  g: 113, b: 178 }, // 10: Cobalt (19E0)
        { r: 45,  g: 60,  b: 180 }, // 11: Blue (1FE0)
        { r: 108, g: 80,  b: 182 }, // 12: Violet (20E0)
        { r: 148, g: 39,  b: 132 }, // 13: Purple (22E0)
        { r: 248, g: 155, b: 200 }, // 14: Pink (23E0)
        { r: 156, g: 15,  b: 68  }, // 15: Crimson (24E0)
        { r: 120, g: 73,  b: 43  }, // 16: Brown (25E0)
        { r: 175, g: 144, b: 87  }  // 17: Tan (26E0)
    ];

    // Foreground emblem filenames (index matches dropdown value)
    // Order based on in-game selection screen
    const foregroundFiles = [
        'Sol.png',              // 0: Seventh Column / Sol
        'Bullseye.png',         // 1: Bullseye
        'Double Crescent.png',  // 2: Fist / Double Crescent
        'Halt.png',             // 3: Halt
        'Phoenix.png',          // 4: Sol -> Phoenix
        'Champion.png',         // 5: Da Bomb -> Champion
        'Sergeant.png',         // 6: Sergeant
        'Drone.png',            // 7: Star -> Drone
        'Spartan.png',          // 8: Jolly Roger -> Spartan
        'Delta.png',            // 9: Halo -> Delta
        'Helmet.png',           // 10: Cube -> Helmet
        'Radioactive.png',      // 11: Radioactive
        'Smiley.png',           // 12: Rampancy -> Smiley
        'Frowney.png',          // 13: Marathon -> Frowney
        'Triad.png',            // 14: Champion -> Triad
        'Waypoint.png',         // 15: Heliograph -> Waypoint
        'Ying Yang.png',        // 16: Smiley -> Ying Yang
        'Brute Head.png',       // 17: Frowney -> Brute Head
        'Trinity.png',          // 18: Spearhead -> Trinity
        'Vortex.png',           // 19: Phoenix -> Vortex
        'Spearhead.png',        // 20: Waypoint -> Spearhead
        'Trident.png',          // 21: Yin Yang -> Trident
        'Skull King.png',       // 22: Helmet -> Skull King
        'Triplicate.png',       // 23: Triad -> Triplicate
        'Subnova.png',          // 24: Vortex -> Subnova
        'Marathon.png',         // 25: Trinity -> Marathon
        'Valkyrie.png',         // 26: Skull King -> Valkyrie
        'Spades.png',           // 27: Crescent -> Spades
        'Clubs.png',            // 28: Flaming Ninja -> Clubs
        'Diamonds.png',         // 29: Double Crescent -> Diamonds
        'Hearts.png',           // 30: Spades -> Hearts
        'Snake.png',            // 31: Clubs -> Snake
        'Flaming Ninja.png',    // 32: Hearts -> Flaming Ninja
        'Rampancy.png',         // 33: Diamonds -> Rampancy
        'Hawk.png',             // 34: Mark of Shame -> Hawk
        'Lips.png',             // 35: Eagle -> Lips
        'Capsule.png',          // 36: Lips -> Capsule
        'Race.png',             // 37: Capsule -> Race
        'Gas Mask.png',         // 38: Cancel -> Gas Mask
        'Grunt.png',            // 39: Gas Mask -> Grunt
        'Grenade.png',          // 40: Tsantsa -> Grenade
        'Thor.png',             // 41: Spartan -> Thor
        'Mark of Shame.png',    // 42: Valkyrie -> Mark of Shame
        'Wasp.png',             // 43: Drone -> Wasp
        'Da Bomb.png',          // 44: Delta -> Da Bomb
        'Runes.png',            // 45: Thor -> Runes
        'Grunt Head.png',       // 46: Grunt Symbol -> Grunt Head
        'Tsantsa.png',          // 47: Trident -> Tsantsa
        'Cancel.png',           // 48: -> Cancel
        'Jolly Roger.png',      // 49: -> Jolly Roger
        'Cube.png',             // 50: -> Cube
        'Cleave.png',           // 51: -> Cleave
        'Grunt Symbol.png',     // 52: -> Grunt Symbol
        'Number 0.png',         // 53: Number 0
        'Number 1.png',         // 54: Number 1
        'Number 2.png',         // 55: Number 2
        'Number 3.png',         // 56: Number 3
        'Number 4.png',         // 57: Number 4
        'Number 5.png',         // 58: Number 5
        'Number 6.png',         // 59: Number 6
        'Number 7.png',         // 60: Number 7
        'Number 8.png',         // 61: Number 8
        'Number 9.png'          // 62: Number 9
    ];

    // Background filenames (index matches dropdown value)
    // Order based on in-game selection screen
    const backgroundFiles = [
        'Solid.png',            // 0: Solid
        'Vertical Split.png',   // 1: Vertical Split
        'Horizontal Split 1.png', // 2: Horizontal Split 1
        'Horizontal Split 2.png', // 3: Horizontal Split 2
        'Horizontal Gradient.png', // 4: Horizontal Gradient
        'Vertical Gradient.png', // 5: Vertical Gradient
        'Triple Row.png',       // 6: Triple Row
        'Quadrants 1.png',      // 7: Quadrants 1
        'DIagonal Slice.png',   // 8: Diagonal Slice (note: typo in filename)
        'Cleft.png',            // 9: Cleft
        'X1.png',               // 10: X1
        'X2.png',               // 11: X2
        'Diamond.png',          // 12: Diamond
        'Cross.png',            // 13: Cross
        'Square.png',           // 14: Square
        'Dual Half-Circle.png', // 15: Dual Half-Circle
        'Diagonal Quadrant.png', // 16: Diagonal Quadrant
        'Three Quarters.png',   // 17: Three Quarters
        'Quarter.png',          // 18: Quarter
        'Four Rows 1.png',      // 19: Four Rows 1
        'Split Circle.png',     // 20: Split Circle
        'One Third.png',        // 21: One Third
        'Two Thirds.png',       // 22: Two Thirds
        'Upper Field.png',      // 23: Upper Field
        'Top and Bottom.png',   // 24: Top and Bottom
        'Center Stripe.png',    // 25: Center Stripe
        'Left and Right.png',   // 26: Left and Right
        'Circle.png',           // 27: Circle
        'Triangle.png',         // 28: Triangle
        'Four Rows 2.png',      // 29: Four Rows 2
        'Quadrants 2.png',      // 30: Quadrants 2
        'Triple Column.png'     // 31: Triple Column
    ];

    // Image cache for loaded images
    const imageCache = {};
    let imagesReady = false;

    // Load a single image and cache it
    function loadImage(path) {
        return new Promise((resolve, reject) => {
            if (imageCache[path]) {
                resolve(imageCache[path]);
                return;
            }
            const img = new Image();
            img.onload = () => {
                imageCache[path] = img;
                resolve(img);
            };
            img.onerror = () => {
                console.error('Failed to load:', path);
                reject(new Error('Failed to load: ' + path));
            };
            img.src = path;
        });
    }

    // Preload essential images for faster initial render
    async function preloadImages() {
        try {
            // Load default emblem and background
            const defaultFg = 'emblems/embems/' + encodeURIComponent(foregroundFiles[12]);
            const defaultBg = 'emblems/backgrounds/' + encodeURIComponent(backgroundFiles[5]);
            await Promise.all([loadImage(defaultFg), loadImage(defaultBg)]);
            imagesReady = true;
            updateEmblem();
        } catch (e) {
            console.error('Error preloading images:', e);
            imagesReady = true; // Allow rendering to attempt anyway
            updateEmblem();
        }
    }

    window.updateEmblem = async function() {
        const canvas = document.getElementById('emblemCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const emblemPrimary = parseInt(document.getElementById('emblemPrimary').value);
        const emblemSecondary = parseInt(document.getElementById('emblemSecondary').value);
        const emblemForeground = parseInt(document.getElementById('emblemForeground').value);
        const emblemBackground = parseInt(document.getElementById('emblemBackground').value);
        const emblemToggle = document.getElementById('emblemToggle').checked ? 1 : 0;

        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 256);

        // Get file paths
        const fgFile = foregroundFiles[emblemForeground] || foregroundFiles[0];
        const bgFile = backgroundFiles[emblemBackground] || backgroundFiles[0];
        const fgPath = 'emblems/embems/' + encodeURIComponent(fgFile);
        const bgPath = 'emblems/backgrounds/' + encodeURIComponent(bgFile);

        try {
            // Load both images (uses cache if available)
            const [fgImg, bgImg] = await Promise.all([
                loadImage(fgPath),
                loadImage(bgPath)
            ]);

            // Draw background first
            drawBackground(ctx, bgImg, colorPalette[emblemPrimary], colorPalette[emblemSecondary]);

            // Draw foreground on top
            drawForeground(ctx, fgImg, colorPalette[emblemPrimary], colorPalette[emblemSecondary], emblemToggle);
        } catch (e) {
            console.error('Error rendering emblem:', e);
        }
    }

    // Draw background - blue pixels get primary color, white areas get secondary color
    function drawBackground(ctx, img, primaryColor, secondaryColor) {
        const tempCanvas = document.createElement('canvas');
        const size = 256;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw image scaled to canvas size
        tempCtx.drawImage(img, 0, 0, size, size);
        const imageData = tempCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Check if pixel is blue (primary area)
            if (b > 200 && r < 100 && g < 100) {
                // Blue pixel -> Primary color
                const intensity = b / 255;
                data[i] = primaryColor.r * intensity;
                data[i + 1] = primaryColor.g * intensity;
                data[i + 2] = primaryColor.b * intensity;
                data[i + 3] = 255;
            } else if (r > 200 && g > 200 && b > 200) {
                // White/light pixel -> Secondary color
                const intensity = (r + g + b) / (255 * 3);
                data[i] = secondaryColor.r * intensity;
                data[i + 1] = secondaryColor.g * intensity;
                data[i + 2] = secondaryColor.b * intensity;
                data[i + 3] = 255;
            } else {
                // Other pixels (gradients, etc) - blend based on blue channel
                const blueRatio = b / 255;
                const whiteRatio = Math.min(r, g) / 255;

                data[i] = primaryColor.r * blueRatio + secondaryColor.r * whiteRatio * (1 - blueRatio);
                data[i + 1] = primaryColor.g * blueRatio + secondaryColor.g * whiteRatio * (1 - blueRatio);
                data[i + 2] = primaryColor.b * blueRatio + secondaryColor.b * whiteRatio * (1 - blueRatio);
                data[i + 3] = 255;
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    // Draw foreground - yellow pixels get primary color, blue pixels get secondary color
    // When toggle is 1, only show secondary color (hide primary)
    function drawForeground(ctx, img, primaryColor, secondaryColor, toggle) {
        const tempCanvas = document.createElement('canvas');
        const size = 256;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw image scaled to canvas size
        tempCtx.drawImage(img, 0, 0, size, size);
        const imageData = tempCtx.getImageData(0, 0, size, size);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // Skip fully transparent pixels
            if (a === 0) continue;

            // Skip black/near-black pixels (transparent background)
            if (r < 30 && g < 30 && b < 30) {
                data[i + 3] = 0; // Make transparent
                continue;
            }

            // Yellow pixels (high R, high G, low B) -> Primary color (or transparent if toggled)
            if (r > 150 && g > 150 && b < 100) {
                if (toggle === 1) {
                    // Hide primary color when toggled
                    data[i + 3] = 0;
                } else {
                    const intensity = (r + g) / (255 * 2);
                    data[i] = primaryColor.r * intensity;
                    data[i + 1] = primaryColor.g * intensity;
                    data[i + 2] = primaryColor.b * intensity;
                    data[i + 3] = 255;
                }
            }
            // Blue pixels (low R, low G, high B) -> Secondary color
            else if (b > 150 && r < 100 && g < 100) {
                const intensity = b / 255;
                data[i] = secondaryColor.r * intensity;
                data[i + 1] = secondaryColor.g * intensity;
                data[i + 2] = secondaryColor.b * intensity;
                data[i + 3] = 255;
            }
            // Mixed/edge pixels - blend based on color channels
            else {
                const yellowIntensity = Math.min(r, g) / 255;
                const blueIntensity = b / 255;
                const total = yellowIntensity + blueIntensity;

                if (total > 0) {
                    if (toggle === 1) {
                        // Only show secondary (blue) portion when toggled
                        if (blueIntensity > 0.1) {
                            data[i] = secondaryColor.r * blueIntensity;
                            data[i + 1] = secondaryColor.g * blueIntensity;
                            data[i + 2] = secondaryColor.b * blueIntensity;
                            data[i + 3] = Math.floor(blueIntensity * 255);
                        } else {
                            data[i + 3] = 0;
                        }
                    } else {
                        const yellowRatio = yellowIntensity / total;
                        const blueRatio = blueIntensity / total;

                        data[i] = (primaryColor.r * yellowRatio + secondaryColor.r * blueRatio) * (total / 1.5);
                        data[i + 1] = (primaryColor.g * yellowRatio + secondaryColor.g * blueRatio) * (total / 1.5);
                        data[i + 2] = (primaryColor.b * yellowRatio + secondaryColor.b * blueRatio) * (total / 1.5);
                        data[i + 3] = 255;
                    }
                } else {
                    data[i + 3] = 0; // Make transparent
                }
            }
        }

        tempCtx.putImageData(imageData, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0);
    }

    window.downloadEmblem = function() {
        const canvas = document.getElementById('emblemCanvas');
        const link = document.createElement('a');
        link.download = 'halo2-emblem.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    // Parse URL parameters and set emblem values
    function applyUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        // Map URL parameters to form elements
        // EP = Emblem foreground design
        // EB = Emblem background design
        // EF = Emblem primary color (foreground color)
        // ES = Emblem secondary color (or use S as fallback)
        // ET = Emblem toggle
        // P/S = Player primary/secondary colors from old system

        const emblemForeground = urlParams.get('EP');
        const emblemBackground = urlParams.get('EB');
        const emblemPrimaryColor = urlParams.get('EF');
        const emblemSecondaryColor = urlParams.get('ES') || urlParams.get('S');
        const emblemToggle = urlParams.get('ET');

        if (emblemForeground !== null) {
            const fgSelect = document.getElementById('emblemForeground');
            if (fgSelect) fgSelect.value = emblemForeground;
        }

        if (emblemBackground !== null) {
            const bgSelect = document.getElementById('emblemBackground');
            if (bgSelect) bgSelect.value = emblemBackground;
        }

        if (emblemPrimaryColor !== null) {
            const primarySelect = document.getElementById('emblemPrimary');
            if (primarySelect) primarySelect.value = emblemPrimaryColor;
        }

        if (emblemSecondaryColor !== null) {
            const secondarySelect = document.getElementById('emblemSecondary');
            if (secondarySelect) secondarySelect.value = emblemSecondaryColor;
        }

        if (emblemToggle !== null) {
            const toggleCheckbox = document.getElementById('emblemToggle');
            if (toggleCheckbox) toggleCheckbox.checked = (emblemToggle === '1');
        }

        // If any emblem parameters were provided, switch to the emblem tab
        if (emblemForeground !== null || emblemBackground !== null ||
            emblemPrimaryColor !== null || emblemSecondaryColor !== null) {
            // Wait a moment for the page to fully load, then switch to emblem tab
            setTimeout(() => {
                if (typeof switchMainTab === 'function') {
                    switchMainTab('emblem');
                }
            }, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            applyUrlParameters();
            preloadImages();
        });
    } else {
        applyUrlParameters();
        preloadImages();
    }

    // Re-render when emblem tab becomes visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const emblemTab = document.getElementById('main-tab-emblem');
                if (emblemTab && emblemTab.style.display !== 'none') {
                    updateEmblem();
                }
            }
        });
    });

    // Observe the emblem tab for visibility changes
    setTimeout(() => {
        const emblemTab = document.getElementById('main-tab-emblem');
        if (emblemTab) {
            observer.observe(emblemTab, { attributes: true, attributeFilter: ['style'] });
        }
    }, 100);
})();
