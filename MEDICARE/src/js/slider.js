const DEFAULT_INTERVAL = 6000;

export function initAutoplaySlider(selector, options = {}) {
  const root = document.querySelector(selector);

  if (!root) {
    return undefined;
  }

  const slides = Array.from(root.querySelectorAll('.hero-slide'));
  const dotsContainer = root.querySelector('[data-slider-dots]');
  const prevButton = root.querySelector('.slider-control--prev');
  const nextButton = root.querySelector('.slider-control--next');

  if (slides.length === 0 || !dotsContainer) {
    return undefined;
  }

  let current = 0;
  let timerId;
  const interval = options.interval ?? DEFAULT_INTERVAL;

  const goToSlide = (index) => {
    slides[current].classList.remove('is-active');
    dotsContainer.children[current]?.classList.remove('is-active');

    current = (index + slides.length) % slides.length;

    slides[current].classList.add('is-active');
    dotsContainer.children[current]?.classList.add('is-active');
  };

  const next = () => goToSlide(current + 1);
  const prev = () => goToSlide(current - 1);

  const startTimer = () => {
    stopTimer();
    timerId = window.setInterval(next, interval);
  };

  const stopTimer = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
    }
  };

  slides.forEach((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'slider-dot';
    dot.setAttribute('aria-label', `Chuyển đến slide ${index + 1}`);

    dot.addEventListener('click', () => {
      goToSlide(index);
      startTimer();
    });

    dotsContainer.appendChild(dot);
  });

  dotsContainer.children[0]?.classList.add('is-active');

  root.addEventListener('mouseenter', stopTimer);
  root.addEventListener('mouseleave', startTimer);

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      next();
      startTimer();
    });
  }

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      prev();
      startTimer();
    });
  }

  startTimer();

  return {
    next,
    prev,
    destroy: () => {
      stopTimer();
      root.removeEventListener('mouseenter', stopTimer);
      root.removeEventListener('mouseleave', startTimer);
    },
  };
}
