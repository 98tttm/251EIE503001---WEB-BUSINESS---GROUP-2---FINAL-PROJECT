// Navigation and Breadcrumb Management
class NavigationManager {
    constructor() {
        this.currentCategory = null;
        this.currentSubcategory = null;
        this.init();
    }

    init() {
        this.setupNavigationListeners();
        this.setupBreadcrumb();
        this.loadFromURL();
    }

    setupNavigationListeners() {
        // Listen for clicks on main navigation items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const categoryId = item.dataset.categoryId;
                const categoryName = item.dataset.categoryName;
                
                if (categoryId && categoryName) {
                    this.setCategory(categoryId, categoryName);
                }
            });
        });

        // Listen for clicks on subcategory items
        document.querySelectorAll('.nav-popup-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const subcategoryId = item.dataset.subcategoryId;
                const subcategoryName = item.dataset.subcategoryName;
                const parentCategoryId = item.closest('.nav-item').dataset.categoryId;
                const parentCategoryName = item.closest('.nav-item').dataset.categoryName;
                
                if (subcategoryId && subcategoryName && parentCategoryId && parentCategoryName) {
                    this.setSubcategory(parentCategoryId, parentCategoryName, subcategoryId, subcategoryName);
                }
            });
        });
    }

    setupBreadcrumb() {
        // Create breadcrumb container if it doesn't exist
        let breadcrumbContainer = document.querySelector('.breadcrumb');
        if (!breadcrumbContainer) {
            breadcrumbContainer = document.createElement('div');
            breadcrumbContainer.className = 'breadcrumb';
            document.querySelector('#header').insertAdjacentElement('afterend', breadcrumbContainer);
        }
    }

    setCategory(categoryId, categoryName) {
        this.currentCategory = { id: categoryId, name: categoryName };
        this.currentSubcategory = null;
        this.updateBreadcrumb();
        this.navigateToCategory(categoryId);
    }

    setSubcategory(parentCategoryId, parentCategoryName, subcategoryId, subcategoryName) {
        this.currentCategory = { id: parentCategoryId, name: parentCategoryName };
        this.currentSubcategory = { id: subcategoryId, name: subcategoryName };
        this.updateBreadcrumb();
        this.navigateToSubcategory(subcategoryId);
    }

    updateBreadcrumb() {
        const breadcrumbContainer = document.querySelector('.breadcrumb');
        if (!breadcrumbContainer) return;

        let breadcrumbHTML = '<span class="breadcrumb-item">Trang chủ</span>';
        
        if (this.currentCategory) {
            breadcrumbHTML += '<span class="breadcrumb-separator">/</span>';
            breadcrumbHTML += `<span class="breadcrumb-item">${this.currentCategory.name}</span>`;
        }
        
        if (this.currentSubcategory) {
            breadcrumbHTML += '<span class="breadcrumb-separator">/</span>';
            breadcrumbHTML += `<span class="breadcrumb-item current">${this.currentSubcategory.name}</span>`;
        }
        
        breadcrumbContainer.innerHTML = breadcrumbHTML;
    }

    navigateToCategory(categoryId) {
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('category', categoryId);
        url.searchParams.delete('subcategory');
        window.history.pushState({ categoryId }, '', url);
        
        // Load products for this category
        this.loadProductsByCategory(categoryId);
    }

    navigateToSubcategory(subcategoryId) {
        // Update URL without page reload
        const url = new URL(window.location);
        url.searchParams.set('subcategory', subcategoryId);
        window.history.pushState({ subcategoryId }, '', url);
        
        // Load products for this subcategory
        this.loadProductsByCategory(subcategoryId);
    }

    loadFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const categoryId = urlParams.get('category');
        const subcategoryId = urlParams.get('subcategory');
        
        if (subcategoryId) {
            // Load subcategory
            this.loadSubcategoryFromAPI(subcategoryId);
        } else if (categoryId) {
            // Load category
            this.loadCategoryFromAPI(categoryId);
        }
    }

    async loadCategoryFromAPI(categoryId) {
        try {
            const category = await window.apiService.getCategory(categoryId);
            
            if (category) {
                this.currentCategory = { id: categoryId, name: category.name };
                this.currentSubcategory = null;
                this.updateBreadcrumb();
                this.loadProductsByCategory(categoryId);
            }
        } catch (error) {
            console.error('Error loading category:', error);
        }
    }

    async loadSubcategoryFromAPI(subcategoryId) {
        try {
            const subcategory = await window.apiService.getCategory(subcategoryId);
            
            if (subcategory) {
                this.currentSubcategory = { id: subcategoryId, name: subcategory.name };
                
                // Load parent category
                if (subcategory.parentId) {
                    const parentCategory = await window.apiService.getCategory(subcategory.parentId);
                    
                    if (parentCategory) {
                        this.currentCategory = { 
                            id: subcategory.parentId, 
                            name: parentCategory.name 
                        };
                    }
                }
                
                this.updateBreadcrumb();
                this.loadProductsByCategory(subcategoryId);
            }
        } catch (error) {
            console.error('Error loading subcategory:', error);
        }
    }

    async loadProductsByCategory(categoryId) {
        try {
            // Use ApiService for better connection management
            const products = await window.apiService.getProductsByCategory(categoryId, { limit: 12 });
            this.displayProducts(products);
        } catch (error) {
            console.error('Error loading products:', error);
            this.loadProductsFromJSON();
        }
    }

    async loadProductsFromJSON() {
        try {
            const response = await fetch('../data/longchau_products.json');
            const products = await response.json();
            
            // Filter products for "Sinh lý - Nội tiết tố" category
            const filteredProducts = products.filter(product => 
                product.categoryId === '9bed0236c5b87c043200fb11'
            );
            
            this.displayProducts(filteredProducts.slice(0, 12));
        } catch (error) {
            console.error('Error loading products from JSON:', error);
        }
    }

    displayProducts(products) {
        const productGrid = document.getElementById('productGrid');
        if (!productGrid) return;
        
        productGrid.innerHTML = '';
        
        products.forEach((product, index) => {
            const productCard = this.createProductCard(product, index);
            productGrid.appendChild(productCard);
        });
    }

    createProductCard(product, index) {
        const card = document.createElement('div');
        card.className = 'product-card';
        
        const discount = product.discount || 0;
        const finalPrice = product.price - discount;
        
        card.innerHTML = `
            ${discount > 0 ? `
                <div class="discount-badge">
                    -${discount.toLocaleString()}đ
                </div>
            ` : ''}
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" loading="lazy">
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <div class="product-price">
                    <span class="current-price">${finalPrice.toLocaleString()}đ</span>
                    <span class="unit">/ ${product.unit}</span>
                </div>
                <button class="product-btn" onclick="addToCart('${product._id}')">Chọn mua</button>
            </div>
        `;
        
        return card;
    }
}

// Initialize navigation manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.navigationManager = new NavigationManager();
});

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (window.navigationManager) {
        window.navigationManager.loadFromURL();
    }
});
