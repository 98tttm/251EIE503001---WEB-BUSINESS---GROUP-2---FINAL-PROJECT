// // // products.js
// // document.addEventListener('DOMContentLoaded', () => {
// //     const itemsPerPage = 8;
// //     let currentPage = 0;
// //     let filteredProducts = [];

// //     // Load dữ liệu
// //     Promise.all([
// //         fetch('../data/longchau_categories.json').then(r => r.json()),
// //         fetch('../data/longchau_products.json').then(r => r.json())
// //     ]).then(([categories, products]) => {
// //         filteredProducts = [...products];
// //         populateFilters(categories, products);
// //         displayProducts(filteredProducts, currentPage, itemsPerPage);

// //         // Xử lý bộ lọc
// //         document.getElementById('apply-filter').addEventListener('click', () => applyFilters(products));
// //         document.getElementById('reset-filter').addEventListener('click', () => resetFilters(products));
// //         document.getElementById('show-more').addEventListener('click', () => loadMore(itemsPerPage));
// //     }).catch(error => {
// //         console.error('Lỗi tải dữ liệu:', error);
// //         document.getElementById('product-grid').innerHTML = '<p>Lỗi tải dữ liệu sản phẩm.</p>';
// //     });

// //     // Hiển thị sản phẩm đã xem
// //     displayViewedProducts();
// // });

// // function populateFilters(categories, products) {
// //     const catSelect = document.getElementById('category-filter');
// //     const brandSelect = document.getElementById('brand-filter');
// //     const brands = [...new Set(products.map(p => p.brand))].sort();

// //     categories.forEach(cat => {
// //         const option = document.createElement('option');
// //         option.value = cat._id;
// //         option.textContent = cat.name;
// //         catSelect.appendChild(option);
// //     });

// //     brands.forEach(brand => {
// //         const option = document.createElement('option');
// //         option.value = brand;
// //         option.textContent = brand;
// //         brandSelect.appendChild(option);
// //     });
// // }

// // function applyFilters(products) {
// //     const catFilter = document.getElementById('category-filter').value;
// //     const brandFilter = document.getElementById('brand-filter').value;
// //     const priceMin = parseInt(document.getElementById('price-min').value) || 0;
// //     const priceMax = parseInt(document.getElementById('price-max').value) || Infinity;

// //     filteredProducts = products.filter(p => 
// //         (!catFilter || p.categoryId === catFilter) &&
// //         (!brandFilter || p.brand === brandFilter) &&
// //         p.price >= priceMin && p.price <= priceMax
// //     );

// //     currentPage = 0;
// //     displayProducts(filteredProducts, currentPage, itemsPerPage);
// // }

// // function resetFilters(products) {
// //     document.getElementById('category-filter').value = '';
// //     document.getElementById('brand-filter').value = '';
// //     document.getElementById('price-min').value = '';
// //     document.getElementById('price-max').value = '';
// //     filteredProducts = [...products];
// //     currentPage = 0;
// //     displayProducts(filteredProducts, currentPage, itemsPerPage);
// // }

// // function displayProducts(products, page, perPage) {
// //     const grid = document.getElementById('product-grid');
// //     const start = page * perPage;
// //     const end = start + perPage;
// //     const paginated = products.slice(start, end);

// //     grid.innerHTML = '';
// //     paginated.forEach(p => {
// //         const item = document.createElement('div');
// //         item.className = 'product-item';
// //         item.innerHTML = `
// //             <img src="${p.image}" alt="${p.name}">
// //             <h3><a href="../html/prd_detail.html?id=${p._id}">${p.name.substring(0, 50)}...</a></h3>
// //             <p class="price">${formatPrice(p.price)}</p>
// //             ${p.discount ? `<p class="discount">${formatPrice(p.discount)} giảm</p>` : ''}
// //         `;
// //         grid.appendChild(item);
// //     });

// //     const showMore = document.getElementById('show-more');
// //     if (end < products.length) {
// //         showMore.style.display = 'block';
// //     } else {
// //         showMore.style.display = 'none';
// //     }
// // }

// // function loadMore(perPage) {
// //     currentPage++;
// //     displayProducts(filteredProducts, currentPage, perPage);
// // }

// // function displayViewedProducts() {
// //     const viewed = getViewedProducts();
// //     const uniqueViewed = [...new Set(viewed)].slice(0, 4);
// //     Promise.all([
// //         fetch('../data/longchau_products.json').then(r => r.json())
// //     ]).then(([products]) => {
// //         const viewedProducts = uniqueViewed.map(id => products.find(p => p._id === id)).filter(Boolean);
// //         const grid = document.getElementById('viewed-list');
// //         grid.innerHTML = '';
// //         viewedProducts.forEach(p => {
// //             const item = document.createElement('div');
// //             item.className = 'product-item';
// //             item.innerHTML = `
// //                 <img src="${p.image}" alt="${p.name}">
// //                 <h3><a href="../html/prd_detail.html?id=${p._id}">${p.name.substring(0, 50)}...</a></h3>
// //                 <p class="price">${formatPrice(p.price)}</p>
// //                 ${p.discount ? `<p class="discount">${formatPrice(p.discount)} giảm</p>` : ''}
// //             `;
// //             grid.appendChild(item);
// //         });
// //         if (viewedProducts.length === 0) {
// //             grid.innerHTML = '<p>Chưa xem sản phẩm nào.</p>';
// //         }
// //     }).catch(error => {
// //         console.error('Lỗi tải dữ liệu đã xem:', error);
// //         document.getElementById('viewed-list').innerHTML = '<p>Lỗi tải dữ liệu.</p>';
// //     });
// // }

// // function getViewedProducts() {
// //     return JSON.parse(localStorage.getItem('viewedProducts') || '[]');
// // }

// // function formatPrice(price) {
// //     return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
// // }

// // products.js
// document.addEventListener('DOMContentLoaded', () => {
//     const itemsPerPage = 8;
//     let currentPage = 0;
//     let filteredProducts = [];

//     // Load dữ liệu
//     Promise.all([
//         fetch('../data/longchau_categories.json').then(r => r.json()),
//         fetch('../data/longchau_products.json').then(r => r.json())
//     ]).then(([categories, products]) => {
//         filteredProducts = [...products];
//         populateFilters(categories, products);
//         displayProducts(filteredProducts, currentPage, itemsPerPage);

//         // Gắn sự kiện cho bộ lọc
//         document.getElementById('apply-filter').addEventListener('click', () => applyFilters(products));
//         document.getElementById('reset-filter').addEventListener('click', () => resetFilters(products));
//         document.getElementById('show-more').addEventListener('click', () => loadMore(itemsPerPage));
//     }).catch(error => {
//         console.error('Lỗi tải dữ liệu:', error);
//         document.getElementById('product-grid').innerHTML = '<p>Lỗi tải dữ liệu sản phẩm.</p>';
//     });

//     // Hiển thị sản phẩm đã xem
//     displayViewedProducts();
// });

// function populateFilters(categories, products) {
//     const catSelect = document.getElementById('category-filter');
//     const brandSelect = document.getElementById('brand-filter');
//     const brands = [...new Set(products.map(p => p.brand))].sort();

//     categories.forEach(cat => {
//         const option = document.createElement('option');
//         option.value = cat._id;
//         option.textContent = cat.name;
//         catSelect.appendChild(option);
//     });

//     brands.forEach(brand => {
//         const option = document.createElement('option');
//         option.value = brand;
//         option.textContent = brand;
//         brandSelect.appendChild(option);
//     });
// }

// function applyFilters(products) {
//     const catFilter = document.getElementById('category-filter').value;
//     const brandFilter = document.getElementById('brand-filter').value;
//     const priceMin = parseInt(document.getElementById('price-min').value) || 0;
//     const priceMax = parseInt(document.getElementById('price-max').value) || Infinity;

//     filteredProducts = products.filter(p => 
//         (!catFilter || p.categoryId === catFilter) &&
//         (!brandFilter || p.brand === brandFilter) &&
//         p.price >= priceMin && p.price <= priceMax
//     );

//     currentPage = 0; // Reset trang khi áp dụng bộ lọc mới
//     displayProducts(filteredProducts, currentPage, itemsPerPage);
// }

// function resetFilters(products) {
//     document.getElementById('category-filter').value = '';
//     document.getElementById('brand-filter').value = '';
//     document.getElementById('price-min').value = '';
//     document.getElementById('price-max').value = '';
//     filteredProducts = [...products];
//     currentPage = 0;
//     displayProducts(filteredProducts, currentPage, itemsPerPage);
// }

// function displayProducts(products, page, perPage) {
//     const grid = document.getElementById('product-grid');
//     const start = page * perPage;
//     const end = start + perPage;
//     const paginated = products.slice(start, end);

//     grid.innerHTML = ''; // Xóa nội dung cũ
//     if (paginated.length === 0) {
//         grid.innerHTML = '<p>Không tìm thấy sản phẩm nào.</p>';
//     } else {
//         paginated.forEach(p => {
//             const item = document.createElement('div');
//             item.className = 'product-item';
//             item.innerHTML = `
//                 <img src="${p.image}" alt="${p.name}">
//                 <h3><a href="../html/prd_detail.html?id=${p._id}">${p.name.substring(0, 50)}...</a></h3>
//                 <p class="price">${formatPrice(p.price)}</p>
//                 ${p.discount ? `<p class="discount">${formatPrice(p.discount)} giảm</p>` : ''}
//             `;
//             grid.appendChild(item);
//         });
//     }

//     const showMore = document.getElementById('show-more');
//     if (end < products.length) {
//         showMore.style.display = 'block';
//     } else {
//         showMore.style.display = 'none';
//     }
// }

// function loadMore(perPage) {
//     currentPage++;
//     displayProducts(filteredProducts, currentPage, perPage);
// }

// function displayViewedProducts() {
//     const viewed = getViewedProducts();
//     const uniqueViewed = [...new Set(viewed)].slice(0, 4);
//     Promise.all([
//         fetch('../data/longchau_products.json').then(r => r.json())
//     ]).then(([products]) => {
//         const viewedProducts = uniqueViewed.map(id => products.find(p => p._id === id)).filter(Boolean);
//         const grid = document.getElementById('viewed-list');
//         grid.innerHTML = '';
//         if (viewedProducts.length === 0) {
//             grid.innerHTML = '<p>Chưa xem sản phẩm nào.</p>';
//         } else {
//             viewedProducts.forEach(p => {
//                 const item = document.createElement('div');
//                 item.className = 'product-item';
//                 item.innerHTML = `
//                     <img src="${p.image}" alt="${p.name}">
//                     <h3><a href="../html/prd_detail.html?id=${p._id}">${p.name.substring(0, 50)}...</a></h3>
//                     <p class="price">${formatPrice(p.price)}</p>
//                     ${p.discount ? `<p class="discount">${formatPrice(p.discount)} giảm</p>` : ''}
//                 `;
//                 grid.appendChild(item);
//             });
//         }
//     }).catch(error => {
//         console.error('Lỗi tải dữ liệu đã xem:', error);
//         document.getElementById('viewed-list').innerHTML = '<p>Lỗi tải dữ liệu.</p>';
//     });
// }

// function getViewedProducts() {
//     return JSON.parse(localStorage.getItem('viewedProducts') || '[]');
// }

// function formatPrice(price) {
//     return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
// }

// products.js
// Khai báo biến toàn cục
let filteredProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    // Load dữ liệu
    Promise.all([
        fetch('../data/longchau_categories.json').then(r => r.json()),
        fetch('../data/longchau_products.json').then(r => r.json())
    ]).then(([categories, products]) => {
        filteredProducts = [...products];
        populateFilters(categories, products);
        displayProducts(filteredProducts);

        // Gắn sự kiện cho bộ lọc
        document.getElementById('apply-filter').addEventListener('click', () => applyFilters(products));
        document.getElementById('reset-filter').addEventListener('click', () => resetFilters(products));
    }).catch(error => {
        console.error('Lỗi tải dữ liệu:', error);
        document.getElementById('product-grid').innerHTML = '<p>Lỗi tải dữ liệu sản phẩm.</p>';
    });

    // Hiển thị sản phẩm đã xem
    displayViewedProducts();
});

function populateFilters(categories, products) {
    const catSelect = document.getElementById('category-filter');
    const brandSelect = document.getElementById('brand-filter');
    const brands = [...new Set(products.map(p => p.brand))].sort();

    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat._id;
        option.textContent = cat.name;
        catSelect.appendChild(option);
    });

    brands.forEach(brand => {
        const option = document.createElement('option');
        option.value = brand;
        option.textContent = brand;
        brandSelect.appendChild(option);
    });
}

function applyFilters(products) {
    const catFilter = document.getElementById('category-filter').value;
    const brandFilter = document.getElementById('brand-filter').value;
    const priceMin = parseInt(document.getElementById('price-min').value) || 0;
    const priceMax = parseInt(document.getElementById('price-max').value) || Infinity;

    filteredProducts = products.filter(p => 
        (!catFilter || p.categoryId === catFilter) &&
        (!brandFilter || p.brand === brandFilter) &&
        p.price >= priceMin && p.price <= priceMax
    );

    displayProducts(filteredProducts);
}

function resetFilters(products) {
    document.getElementById('category-filter').value = '';
    document.getElementById('brand-filter').value = '';
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    filteredProducts = [...products];
    displayProducts(filteredProducts);
}

function displayProducts(products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = ''; // Xóa nội dung cũ
    if (products.length === 0) {
        grid.innerHTML = '<p>Không tìm thấy sản phẩm nào.</p>';
    } else {
        products.forEach(p => {
            const item = document.createElement('div');
            item.className = 'product-item';
            item.innerHTML = `
                <img src="${p.image}" alt="${p.name}">
                <h3><a href="../html/prd_detail.html?id=${p._id}">${p.name.substring(0, 50)}...</a></h3>
                <p class="price">${formatPrice(p.price)}</p>
                ${p.discount ? `<p class="discount">${formatPrice(p.discount)} giảm</p>` : ''}
            `;
            grid.appendChild(item);
        });
    }
}

function displayViewedProducts() {
    const viewed = getViewedProducts();
    const uniqueViewed = [...new Set(viewed)].slice(0, 4);
    Promise.all([
        fetch('../data/longchau_products.json').then(r => r.json())
    ]).then(([products]) => {
        const viewedProducts = uniqueViewed.map(id => products.find(p => p._id === id)).filter(Boolean);
        const grid = document.getElementById('viewed-list');
        grid.innerHTML = '';
        if (viewedProducts.length === 0) {
            grid.innerHTML = '<p>Chưa xem sản phẩm nào.</p>';
        } else {
            viewedProducts.forEach(p => {
                const item = document.createElement('div');
                item.className = 'product-item';
                item.innerHTML = `
                    <img src="${p.image}" alt="${p.name}">
                    <h3><a href="../html/prd_detail.html?id=${p._id}">${p.name.substring(0, 50)}...</a></h3>
                    <p class="price">${formatPrice(p.price)}</p>
                    ${p.discount ? `<p class="discount">${formatPrice(p.discount)} giảm</p>` : ''}
                `;
                grid.appendChild(item);
            });
        }
    }).catch(error => {
        console.error('Lỗi tải dữ liệu đã xem:', error);
        document.getElementById('viewed-list').innerHTML = '<p>Lỗi tải dữ liệu.</p>';
    });
}

function getViewedProducts() {
    return JSON.parse(localStorage.getItem('viewedProducts') || '[]');
}

function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ';
}