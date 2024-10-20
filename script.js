document.addEventListener('DOMContentLoaded', function() {
    const background = document.querySelector('.background');

    // Добавляем обработчик события для плавного перехода между изображениями
    background.addEventListener('animationiteration', function() {
        background.style.animation = 'none';
        setTimeout(() => {
            background.style.animation = '';
        });
    });
});