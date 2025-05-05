document.addEventListener('DOMContentLoaded', function() {
    const background = document.querySelector('.background');

    background.addEventListener('animationiteration', function() {
        background.style.animation = 'none';
        setTimeout(() => {
            background.style.animation = '';
        });
    });
});