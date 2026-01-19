/**
 * Global Ripple Effect Utility
 * Listens for click events on buttons and elements with the 'btn' class
 * to create a circular "wave" effect at the point of contact.
 */

export const initRippleEffect = () => {
    document.addEventListener('mousedown', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('button, .btn');

        if (button) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');

            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);

            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            // Adjust color based on background (shout-out to dark mode)
            const isDark = document.documentElement.classList.contains('dark') ||
                window.getComputedStyle(button).backgroundColor.includes('rgb(0, 0, 0)') ||
                window.getComputedStyle(button).backgroundColor.includes('rgba(0, 0, 0)');

            ripple.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';

            button.appendChild(ripple);

            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        }
    });
};
