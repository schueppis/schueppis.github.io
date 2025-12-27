document.addEventListener('DOMContentLoaded', () => {
    // Select elements to animate
    const generations = document.querySelectorAll('.generation');
    const connectors = document.querySelectorAll('.connector-line');

    const observerOptions = {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: "0px"
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: Stop observing once visible if you want the animation to happen only once
                // observer.unobserve(entry.target); 
            }
        });
    }, observerOptions);

    generations.forEach(gen => {
        observer.observe(gen);
    });

    connectors.forEach(conn => {
        observer.observe(conn);
    });
});
