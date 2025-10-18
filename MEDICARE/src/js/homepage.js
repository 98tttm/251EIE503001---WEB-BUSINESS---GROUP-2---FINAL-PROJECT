import { initComponentLoader } from './componentLoader.js';
import { initAutoplaySlider } from './slider.js';

const mockProducts = {
  'flash-sale': [
    {
      id: 'vitamin-c-1000',
      name: 'Vitamin C 1000mg MediCare',
      image: 'https://via.placeholder.com/320x200?text=Vitamin+C',
      price: '155.000₫',
      originalPrice: '210.000₫',
    },
    {
      id: 'omega-3',
      name: 'Viên uống Omega 3 DHA',
      image: 'https://via.placeholder.com/320x200?text=Omega+3',
      price: '280.000₫',
      originalPrice: '320.000₫',
    },
    {
      id: 'sleep-support',
      name: 'Thực phẩm hỗ trợ giấc ngủ',
      image: 'https://via.placeholder.com/320x200?text=Sleep+Aid',
      price: '189.000₫',
      originalPrice: '245.000₫',
    },
    {
      id: 'calcium-d3',
      name: 'Canxi + Vitamin D3 MediCare',
      image: 'https://via.placeholder.com/320x200?text=Calcium+D3',
      price: '220.000₫',
      originalPrice: '265.000₫',
    },
  ],
  'medical-devices': [
    {
      id: 'bp-monitor',
      name: 'Máy đo huyết áp bắp tay MediCare',
      image: 'https://via.placeholder.com/320x200?text=Huyet+ap',
      price: '950.000₫',
      originalPrice: '1.100.000₫',
    },
    {
      id: 'glucometer',
      name: 'Máy đo đường huyết thông minh',
      image: 'https://via.placeholder.com/320x200?text=Duong+huyet',
      price: '780.000₫',
      originalPrice: '870.000₫',
    },
    {
      id: 'nebulizer',
      name: 'Máy xông khí dung cho bé',
      image: 'https://via.placeholder.com/320x200?text=Khi+dung',
      price: '650.000₫',
      originalPrice: '720.000₫',
    },
    {
      id: 'thermometer',
      name: 'Nhiệt kế hồng ngoại',
      image: 'https://via.placeholder.com/320x200?text=Nhiet+ke',
      price: '420.000₫',
      originalPrice: '480.000₫',
    },
  ],
};

const renderProductCard = (product) => `
  <article class="product-card" data-product-id="${product.id}">
    <img src="${product.image}" alt="${product.name}" width="320" height="200" loading="lazy" />
    <h3>${product.name}</h3>
    <div class="product-card__price">
      <span>${product.price}</span>
      <del>${product.originalPrice}</del>
    </div>
    <div class="product-card__actions">
      <button class="btn btn--secondary" type="button" data-action="add-to-wishlist">
        Yêu thích
      </button>
      <button class="btn btn--primary" type="button" data-action="add-to-cart">
        Thêm giỏ
      </button>
    </div>
  </article>
`;

function hydrateProductSections() {
  document.querySelectorAll('[data-product-list]').forEach((list) => {
    const key = list.getAttribute('data-product-list');
    const products = mockProducts[key] ?? [];
    list.innerHTML = products.map(renderProductCard).join('');
  });
}

function initCountdown() {
  const countdown = document.querySelector('[data-countdown]');
  if (!countdown) {
    return;
  }

  const deadline = new Date(countdown.getAttribute('data-countdown'));
  if (Number.isNaN(deadline.getTime())) {
    return;
  }

  const spans = countdown.querySelectorAll('span');

  const update = () => {
    const now = new Date();
    const diff = Math.max(0, deadline.getTime() - now.getTime());

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);

    spans[0].textContent = String(hours).padStart(2, '0');
    spans[1].textContent = String(minutes).padStart(2, '0');
    spans[2].textContent = String(seconds).padStart(2, '0');
  };

  update();
  return window.setInterval(update, 1000);
}

function initNavInteractions() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  document.querySelectorAll('.nav-item--mega > button').forEach((button) => {
    button.addEventListener('click', () => {
      const parent = button.closest('.nav-item--mega');
      const isOpen = parent?.classList.toggle('is-open');
      button.setAttribute('aria-expanded', String(Boolean(isOpen)));
    });
  });
}

function setCurrentYear() {
  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = new Date().getFullYear();
  });
}

function registerNewsletterForm() {
  const form = document.querySelector('.newsletter-form');
  if (!form) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = formData.get('email');

    if (typeof email === 'string' && email.trim()) {
      alert(`Đăng ký nhận tin thành công cho ${email.trim()}.`);
      form.reset();
    }
  });
}

async function bootstrapHomepage() {
  await initComponentLoader();

  initNavInteractions();
  setCurrentYear();
  hydrateProductSections();
  registerNewsletterForm();
  initAutoplaySlider('[data-slider="hero"]', { interval: 7000 });
  initCountdown();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapHomepage);
} else {
  bootstrapHomepage().catch((error) => console.error(error));
}
