document.addEventListener('DOMContentLoaded', () => {
    fetch('../data/longchau_products.json')
        .then(response => response.json())
        .then(products => {
            const promoList = document.getElementById('promo-list');
            if (!promoList) return;

            // Lọc các sản phẩm có giảm giá
            const promoProducts = products.filter(p => p.discount && p.discount > 0);

            // Xáo trộn danh sách (Fisher–Yates shuffle)
            for (let i = promoProducts.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [promoProducts[i], promoProducts[j]] = [promoProducts[j], promoProducts[i]];
            }

            // Chọn ngẫu nhiên 8 sản phẩm
            const randomPromos = promoProducts.slice(0, 8);

            // Hiển thị
            randomPromos.forEach(p => {
                const item = document.createElement('div');
                item.className = 'related-item';
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

                promoList.appendChild(item);
            });
        })
        .catch(err => console.error('Lỗi tải sản phẩm khuyến mãi:', err));
});

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
}

function formatDiscount(discount) {
    return discount ? `Tiết kiệm ${formatPrice(discount)}` : '';
}