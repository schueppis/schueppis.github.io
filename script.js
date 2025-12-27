document.addEventListener('DOMContentLoaded', () => {
    const svg = document.getElementById('tree-connections');

    function drawConnections() {
        // Clear existing paths
        svg.innerHTML = `
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
        `;

        const cards = document.querySelectorAll('.member-card');
        constsvgRect = svg.getBoundingClientRect();

        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const cardCenterX = cardRect.left + cardRect.width / 2;
            const cardTopY = cardRect.top + window.scrollY;
            const cardBottomY = cardRect.bottom + window.scrollY;

            // Handle Parents (Vertical connection up)
            const parentIds = card.dataset.parents ? card.dataset.parents.split(',') : [];
            if (parentIds.length > 0) {
                let parentX = 0;
                let parentY = 0;

                // Calculate center point between parents
                const parents = parentIds.map(id => document.getElementById(id)).filter(p => p);

                if (parents.length > 0) {
                    const p1 = parents[0].getBoundingClientRect();
                    const p1X = p1.left + p1.width / 2;
                    const p1Y = p1.bottom + window.scrollY;

                    if (parents.length > 1) {
                        const p2 = parents[1].getBoundingClientRect();
                        const p2X = p2.left + p2.width / 2;
                        // Center between parents
                        parentX = (p1X + p2X) / 2;
                        parentY = p1Y;

                        // Draw horizontal line between parents specifically for this child? 
                        // Actually, let's just draw from the center point between them.
                    } else {
                        parentX = p1X;
                        parentY = p1Y;
                    }

                    // Create Path
                    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

                    // Bezier Curve Logic
                    // M startX startY C cp1x cp1y, cp2x cp2y, endX endY
                    const startX = parentX;
                    const startY = parentY;
                    const endX = cardCenterX;
                    const endY = cardTopY;

                    const midY = (startY + endY) / 2;

                    const d = `M ${startX} ${startY + 20} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY - 10}`;

                    path.setAttribute("d", d);
                    svg.appendChild(path);
                }
            }

            // Handle Partners (Horizontal connection)
            if (card.dataset.partner) {
                const partner = document.getElementById(card.dataset.partner);
                if (partner) {
                    // Only draw from left to right to avoid duplicates
                    const pRect = partner.getBoundingClientRect();
                    if (cardRect.left < pRect.left) {
                        const startX = cardRect.right - 20; // connect somewhat inside
                        const startY = cardRect.top + cardRect.height / 2 + window.scrollY;
                        const endX = pRect.left + 20;
                        const endY = startY;

                        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                        // Small arc connection
                        const d = `M ${startX} ${startY} L ${endX} ${endY}`;
                        path.setAttribute("d", d);
                        path.style.opacity = "0.3"; // Fainter line for partners
                        svg.appendChild(path);
                    }
                }
            }
        });

        setupScrollAnimation();
    }

    function setupScrollAnimation() {
        const paths = document.querySelectorAll('path');

        const observerOptions = {
            root: null,
            margin: "0px",
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const path = entry.target;
                    path.style.strokeDashoffset = '0';
                    // observer.unobserve(path); // Keep animating or stay?
                }
            });
        }, observerOptions);

        paths.forEach(path => {
            const length = path.getTotalLength();
            path.style.strokeDasharray = length;
            path.style.strokeDashoffset = length;
            observer.observe(path);
        });
    }

    // Initial draw
    // Timeout to ensure layout is settled
    setTimeout(drawConnections, 500);

    // Redraw on resize
    window.addEventListener('resize', () => {
        // Debounce could be added here
        drawConnections();
    });
});
