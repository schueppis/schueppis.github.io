class Branch {
    constructor(start, end, targetElement = null) {
        this.start = start;
        this.end = end;
        this.targetElement = targetElement;
        this.points = [];
        this.generate();
    }

    generate() {
        // RecursiveMidpoint logic to create organic path
        this.points = [];
        this.points.push(this.start);

        // Add some control points for a curve
        // Standard curve goes down then over
        const midY = (this.start.y + this.end.y) / 2;

        // Generate points along a Bezier-like path but with noise
        const steps = 40;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;

            // Standard Cubic Bezier interpolation
            // P0: start, P1: (start.x, midY), P2: (end.x, midY), P3: end
            // But we add noise perpendicular to the tangent

            const p1 = { x: this.start.x, y: midY };
            const p2 = { x: this.end.x, y: midY };

            const x = this.cubic(this.start.x, p1.x, p2.x, this.end.x, t);
            const y = this.cubic(this.start.y, p1.y, p2.y, this.end.y, t);

            // Noise (more noise in the middle)
            const noiseScale = 20 * Math.sin(t * Math.PI);
            const jitterX = (Math.random() - 0.5) * noiseScale;

            this.points.push({ x: x + jitterX, y: y });
        }
    }

    cubic(a, b, c, d, t) {
        return (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
    }

    draw(ctx, scrollY, windowHeight) {
        if (this.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        let drawn = false;
        let reachedEnd = false;

        // Draw threshold: bottom of screen + buffer
        const threshold = scrollY + windowHeight + 100;

        for (let i = 1; i < this.points.length; i++) {
            const p = this.points[i];

            if (p.y < threshold) {
                ctx.lineTo(p.x, p.y);
                drawn = true;

                // Check if we've reached the end point
                if (i === this.points.length - 1) {
                    reachedEnd = true;
                }
            } else {
                break;
            }
        }

        if (drawn) {
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#8b7355';
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Reveal target element when branch reaches it
        if (reachedEnd && this.targetElement) {
            this.targetElement.classList.add('visible');
        }
    }
}

const TreeApp = {
    canvas: null,
    ctx: null,
    branches: [],

    init() {
        this.canvas = document.getElementById('tree-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Styling
        this.ctx.strokeStyle = '#6d5a43'; // Dark Gold/Wood
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        window.addEventListener('resize', () => this.resize());
        window.addEventListener('scroll', () => this.onScroll()); // Force redraw

        // Initial setup
        // We wait for fonts and layout
        setTimeout(() => this.resize(), 500);

        // Animation loop
        this.animate();
    },

    resize() {
        // Set canvas to full scrollable height
        this.canvas.width = window.innerWidth;
        this.canvas.height = Math.max(document.body.scrollHeight, window.innerHeight);

        this.ctx.strokeStyle = '#8b7355';
        this.ctx.lineWidth = 2.5;

        this.generateTree();
        this.draw();
    },

    generateTree() {
        this.branches = [];

        const cards = document.querySelectorAll('.member-card');

        cards.forEach(card => {
            // Connect to Parents
            if (card.dataset.parents) {
                const parentIds = card.dataset.parents.split(',');
                // Find effective parent point (center of parents)
                const parents = parentIds.map(id => document.getElementById(id)).filter(p => p);

                if (parents.length > 0) {
                    let startX = 0;
                    let startY = 0;

                    if (parents.length > 1) {
                        const p1Rect = this.getRect(parents[0]);
                        const p2Rect = this.getRect(parents[1]);
                        startX = (p1Rect.x + p2Rect.x) / 2;
                        startY = p1Rect.y + p1Rect.height; // Bottom of parents
                    } else {
                        const pRect = this.getRect(parents[0]);
                        startX = pRect.x; // Center
                        startY = pRect.y + pRect.height;
                    }

                    const cardRect = this.getRect(card);
                    const end = { x: cardRect.x, y: cardRect.y };

                    this.branches.push(new Branch({ x: startX, y: startY }, end, card));
                }
            }

            // Connect to Partner (Simple horizontal branch)
            if (card.dataset.partner) {
                const partner = document.getElementById(card.dataset.partner);
                if (partner) {
                    const cRect = this.getRect(card);
                    const pRect = this.getRect(partner);

                    // Only draw once (e.g. from left element)
                    if (cRect.x < pRect.x) {
                        // Draw a small arc between them
                        const start = { x: cRect.x + cRect.width / 2, y: cRect.y + cRect.height / 2 };
                        const end = { x: pRect.x - pRect.width / 2, y: pRect.y + pRect.height / 2 };

                        // Just a direct line for partners or small arc
                        // Treating it as a branch but straight
                        const branch = new Branch(start, end);
                        // Force straight line logic for partners? 
                        // For now, let it be organic too
                        this.branches.push(branch);
                    }
                }
            }
        });
    },

    getRect(el) {
        const rect = el.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 + window.scrollX,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height
        };
    },

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const scrollY = window.scrollY;
        const h = window.innerHeight;

        this.branches.forEach(branch => branch.draw(this.ctx, scrollY, h));
    },

    onScroll() {
        // We can just rely on requestAnimationFrame, but checking here helps sync
    },

    animate() {
        this.draw();
        requestAnimationFrame(() => this.animate());
    }
};

document.addEventListener('DOMContentLoaded', () => {
    TreeApp.init();
});
