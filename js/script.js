// Tree Application - Hydration & Logic

function hydrateTree() {
    if (typeof FAMILY_DATA === 'undefined') {
        console.error("No FAMILY_DATA found. Make sure data.js is loaded.");
        return;
    }

    FAMILY_DATA.forEach(person => {
        // Find existing card in the static HTML
        const card = document.getElementById(person.id);

        if (card) {
            // Filter: Only show Schüpbachs
            // Check if name implies Schüpbach
            if (!person.name.includes("Schüpbach")) {
                card.style.display = 'none';
                return;
            } else {
                card.style.display = ''; // Ensure visible if previously hidden
            }

            // Update Info
            const nameEl = card.querySelector('h3');
            const datesEl = card.querySelector('.dates');
            const portraitContainer = card.querySelector('.portrait');

            // Name
            let displayName = person.name;
            if (person.deathDate) displayName += " †";
            if (person.ledigname) displayName += ` (${person.ledigname})`;
            if (nameEl) nameEl.textContent = displayName;

            // Dates
            // Dates
            if (datesEl) {
                // Extract Year Helper
                const getYear = (dateStr) => {
                    if (!dateStr) return '';
                    const match = dateStr.match(/\d{4}/);
                    return match ? match[0] : dateStr;
                };

                const bYear = getYear(person.birthDate);
                const dYear = getYear(person.deathDate);

                let dateText = bYear;
                if (dYear) dateText += ' - ' + dYear;

                if (!dateText && person.generation < 3) dateText = "";
                datesEl.textContent = dateText;
            }

            // Portrait
            if (portraitContainer) {
                if (person.photo) {
                    portraitContainer.innerHTML = `<img src="${person.photo}" alt="${person.name}">`;
                } else {
                    const initials = person.name.split(' ').map(n => n[0]).slice(0, 2).join('');
                    portraitContainer.innerHTML = `<span>${initials}</span>`;
                }
            }

            // Add Interaction
            card.onclick = (e) => {
                e.stopPropagation();
                setFocus(person.id);
            };

            // Set Data Attributes for Lines - PARTNERS ONLY
            if (person.partners && person.partners.length > 0) {
                card.dataset.partners = person.partners.join(',');
            }
        } else {
            console.warn(`Card for ${person.name} (${person.id}) not found in HTML.`);
        }
    });

    // Initial Focus
    setFocus('adrian');
}

/**
 * Sets the visual focus on a specific person and their lineage.
 */
function setFocus(personId) {
    console.log("Setting focus to:", personId);

    // 1. Reset all classes
    document.querySelectorAll('.member-card').forEach(card => {
        card.classList.remove('focused', 'partner', 'lineage', 'sibling', 'dimmed');
        card.classList.add('dimmed');
    });

    const targetPerson = FAMILY_DATA.find(p => p.id === personId);
    if (!targetPerson) return;

    const targetCard = document.getElementById(personId);
    if (targetCard) {
        targetCard.classList.remove('dimmed');
        targetCard.classList.add('focused');
    }

    // 2. Identify Relationships
    const relationships = {
        partners: targetPerson.partners || [],
        parents: targetPerson.parents || [],
        children: FAMILY_DATA.filter(p => p.parents && p.parents.includes(personId)).map(p => p.id),
        siblings: []
    };

    if (targetPerson.parents && targetPerson.parents.length > 0) {
        relationships.siblings = FAMILY_DATA.filter(p =>
            p.id !== personId &&
            p.parents &&
            p.parents.some(parent => targetPerson.parents.includes(parent))
        ).map(p => p.id);
    }

    // 3. Apply Classes
    relationships.partners.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            card.classList.remove('dimmed');
            card.classList.add('partner');
        }
    });

    [...relationships.parents, ...relationships.children].forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            card.classList.remove('dimmed');
            card.classList.add('lineage');
        }
    });

    relationships.siblings.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
            card.classList.remove('dimmed');
            card.classList.add('sibling');
        }
    });

    // Inform Branch System
    if (branchSystem) branchSystem.setFocusId(personId);
}


// --- Canvas Drawing Logic ---

class Branch {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // Tracking state
        this.focusedId = null;
        this.animationFrameId = null;

        // Bind methods
        this.resize = this.resize.bind(this);
        this.animate = this.animate.bind(this);

        // Initial setup
        this.resize();
        window.addEventListener('resize', this.resize);

        // Start loop
        this.startAnimation();
    }

    resize() {
        // Canvas is fixed, so it matches viewport dimensions exactly
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
    }

    startAnimation() {
        if (!this.animationFrameId) {
            this.animate();
        }
    }

    stopAnimation() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    animate() {
        this.draw(this.focusedId);
        this.animationFrameId = requestAnimationFrame(this.animate);
    }

    setFocusId(id) {
        this.focusedId = id;
    }

    draw(focusedId) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Find all cards with data-partners
        const people = document.querySelectorAll('.member-card[data-partners]');
        const processedPairs = new Set();

        people.forEach(card => {
            if (childCardIsHidden(card)) return;

            const partnerIds = card.dataset.partners.split(',');
            const myId = card.id;

            partnerIds.forEach(partnerId => {
                partnerId = partnerId.trim();
                const partnerCard = document.getElementById(partnerId);

                if (!partnerCard || childCardIsHidden(partnerCard)) return;

                const pairKey = [myId, partnerId].sort().join('-');
                // Avoid drawing twice
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                let isActive = false;
                if (focusedId) {
                    if (myId === focusedId || partnerId === focusedId) isActive = true;
                }

                this.drawPartnerLine(card, partnerCard, isActive);
            });
        });
    }

    drawPartnerLine(card1, card2, isActive) {
        // Target the PORTRAIT circles specifically
        const p1 = card1.querySelector('.portrait');
        const p2 = card2.querySelector('.portrait');

        // Fallback to card if portrait not found (shouldn't happen)
        const el1 = p1 || card1;
        const el2 = p2 || card2;

        const r1 = el1.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();

        // Canvas is FIXED. 0,0 is viewport top-left.
        // We want to draw from CENTER to CENTER.

        // Calculate centers
        let x1 = r1.left + r1.width / 2;
        let y1 = r1.top + r1.height / 2;

        let x2 = r2.left + r2.width / 2;
        let y2 = r2.top + r2.height / 2;

        // Force straightness: average Y if they are close enough (likely intended to be horizontal)
        if (Math.abs(y1 - y2) < 20) {
            const avgY = (y1 + y2) / 2;
            y1 = avgY;
            y2 = avgY;
        }

        // Clip at Radius
        // We move the start and end points inwards towards each other by the radius amount

        // Direction vector
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist === 0) return;

        const ux = dx / dist;
        const uy = dy / dist;

        // Radii: using width / 2.
        // If scaled, r1.width is the scaled width, which is exactly what we want.
        const radius1 = (r1.width / 2) - 2; // -2 to ensure it slightly tucks in or +2 to leave gap? User wants "disappears at corner", so match edge.  
        const radius2 = (r2.width / 2) - 2;

        // New start/end
        const startX = x1 + ux * radius1;
        const startY = y1 + uy * radius1;

        const endX = x2 - ux * radius2;
        const endY = y2 - uy * radius2;

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);

        // Style
        this.ctx.lineWidth = isActive ? 3 : 2;
        this.ctx.strokeStyle = isActive ? '#FFD700' : 'rgba(255, 255, 255, 0.2)';

        if (isActive) {
            this.ctx.shadowColor = '#FFD700';
            this.ctx.shadowBlur = 10;
        } else {
            this.ctx.shadowBlur = 0;
        }

        this.ctx.stroke();
        this.ctx.shadowBlur = 0; // Reset
    }
}

function childCardIsHidden(el) {
    if (!el) return true;
    if (el.offsetParent === null) return true;
    const rect = el.getBoundingClientRect();
    return (rect.width === 0 && rect.height === 0);
}

// Initialize
let branchSystem;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Logic
    setTimeout(() => {
        branchSystem = new Branch('tree-canvas');
        hydrateTree();
        // Reveal content after hydration and filtering
        document.body.classList.add('loaded');
    }, 100);
});
