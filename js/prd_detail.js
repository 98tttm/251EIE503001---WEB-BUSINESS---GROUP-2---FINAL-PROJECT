// prd_detail.js
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    if (!productId) {
        document.querySelector('#product-info').innerHTML = '<p>Không tìm thấy ID sản phẩm.</p>';
        return;
    }

    // Load dữ liệu
    Promise.all([
        fetch('../data/longchau_categories.json').then(r => r.json()),
        fetch('../data/longchau_products.json').then(r => r.json())
    ]).then(([categories, products]) => {
        const catDict = {};
        categories.forEach(cat => {
            catDict[cat._id] = cat;
        });

        const product = products.find(p => p._id === productId);
        if (!product) {
            document.querySelector('#product-info').innerHTML = '<p>Sản phẩm không tồn tại.</p>';
            return;
        }

        // Hiển thị thông tin sản phẩm
        displayProduct(product, catDict[product.categoryId]?.name || 'Không xác định');

        // Sản phẩm liên quan: cùng category, random 4 (khác product hiện tại)
        const related = products.filter(p => p.categoryId === product.categoryId && p._id !== productId);
        const shuffledRelated = related.sort(() => 0.5 - Math.random()).slice(0, 4);
        displayRelatedProducts(shuffledRelated, '#related-list');

        // Sản phẩm đã xem: từ localStorage
        const viewed = getViewedProducts();
        const uniqueViewed = [...new Set(viewed)].filter(id => id !== productId).slice(0, 4);
        const viewedProducts = uniqueViewed.map(id => products.find(p => p._id === id)).filter(Boolean);
        displayRelatedProducts(viewedProducts, '#viewed-list');

        // Thêm sản phẩm hiện tại vào viewed
        addToViewed(productId);
    }).catch(error => {
        console.error('Lỗi tải dữ liệu:', error);
        document.querySelector('#product-info').innerHTML = '<p>Lỗi tải dữ liệu sản phẩm.</p>';
    });

    // Event cho gallery
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('thumb-img')) {
            document.querySelector('#main-image img').src = e.target.src;
        }
    });

    // Event cho CTA (demo)
    document.getElementById('add-to-cart').addEventListener('click', () => {
        alert('Đã thêm vào giỏ hàng!');
    });
    document.getElementById('buy-now').addEventListener('click', () => {
        alert('Chuyển đến thanh toán!');
    });
});

function displayProduct(product, categoryName) {
    document.getElementById('product-name').textContent = product.name;
    document.getElementById('product-brand').textContent = `Thương hiệu: ${product.brand} | Xuất xứ: ${product.country} | Danh mục: ${categoryName}`;
    
    const price = formatPrice(product.price);
    const discount = product.discount ? formatPrice(product.discount) : '';
    document.getElementById('product-price').textContent = price;
    document.getElementById('product-discount').textContent = discount ? `Giảm ${discount}` : '';

    document.getElementById('product-stock').textContent = product.stock > 0 ? `Còn ${product.stock} ${product.unit}` : 'Hết hàng';

    // Ảnh chính
    document.getElementById('main-image').innerHTML = `<img src="${product.image}" alt="${product.name}">`;

    // Gallery thumbs
    const thumbs = document.getElementById('gallery-thumbs');
    thumbs.innerHTML = '';
    (product.gallery || [product.image]).forEach(imgSrc => {
        const thumb = document.createElement('img');
        thumb.src = imgSrc;
        thumb.alt = product.name;
        thumb.className = 'thumb-img';
        thumbs.appendChild(thumb);
    });

    // Thành phần
    document.getElementById('product-ingredients').innerHTML = `<h3>Thành phần:</h3><p>${product.ingredients}</p>`;
}

function displayRelatedProducts(products, containerId) {
    const container = document.querySelector(containerId);
    container.innerHTML = '';
    products.forEach(p => {
        const item = document.createElement('div');
        item.className = containerId.includes('related') ? 'related-item' : 'viewed-item';
        item.innerHTML = `
            <div class="product-card">
                <div class="product-image">
                    <img src="${p.image}" alt="${p.name}">
                </div>
                <div class="product-info">
                    <h3 class="product-name">
                        <a href="prd_detail.html?id=${p._id}">${p.name.substring(0, 50)}...</a>
                    </h3>
                    <div class="product-pricing">
                        <span class="price">${formatPrice(p.price)}</span>
                        <span class="discount">${formatDiscount(p.discount)}</span>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(item);
    });
    if (products.length === 0) {
        container.innerHTML = '<p>Không có sản phẩm.</p>';
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
}

function getViewedProducts() {
    return JSON.parse(localStorage.getItem('viewedProducts') || '[]');
}

function addToViewed(productId) {
    const viewed = getViewedProducts();
    const updated = [productId, ...viewed.filter(id => id !== productId)].slice(0, 10); // Giới hạn 10
    localStorage.setItem('viewedProducts', JSON.stringify(updated));
}

function formatDiscount(discount) {
    return discount ? `Giảm ${formatPrice(discount)}` : '';
}