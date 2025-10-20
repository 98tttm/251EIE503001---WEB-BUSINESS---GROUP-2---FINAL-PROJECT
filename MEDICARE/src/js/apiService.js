// API Service for MediCare Frontend
class ApiService {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.isConnected = false;
        this.checkConnection();
    }

    async checkConnection() {
        try {
            const response = await fetch('http://localhost:5000/health');
            const data = await response.json();
            this.isConnected = data.success;
            
            if (this.isConnected) {
                console.log('✅ Connected to MediCare API');
                this.showConnectionStatus('connected');
            } else {
                console.log('❌ API connection failed');
                this.showConnectionStatus('disconnected');
            }
        } catch (error) {
            console.log('❌ API server not available, using JSON fallback');
            this.isConnected = false;
            this.showConnectionStatus('disconnected');
        }
    }

    showConnectionStatus(status) {
        // Create or update connection status indicator
        let statusElement = document.getElementById('api-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'api-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(statusElement);
        }

        if (status === 'connected') {
            statusElement.textContent = '🟢 API Connected';
            statusElement.style.backgroundColor = '#d4edda';
            statusElement.style.color = '#155724';
            statusElement.style.border = '1px solid #c3e6cb';
        } else {
            statusElement.textContent = '🔴 Using JSON Fallback';
            statusElement.style.backgroundColor = '#f8d7da';
            statusElement.style.color = '#721c24';
            statusElement.style.border = '1px solid #f5c6cb';
        }

        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (statusElement) {
                statusElement.style.opacity = '0.7';
            }
        }, 3000);
    }

    async getCategories() {
        if (!this.isConnected) {
            return this.getCategoriesFromJSON();
        }

        try {
            const response = await fetch(`${this.baseURL}/categories`);
            const data = await response.json();
            return data.success ? data.data.categories : [];
        } catch (error) {
            console.error('Error fetching categories:', error);
            return this.getCategoriesFromJSON();
        }
    }

    async getCategory(categoryId) {
        if (!this.isConnected) {
            return this.getCategoryFromJSON(categoryId);
        }

        try {
            const response = await fetch(`${this.baseURL}/categories/${categoryId}`);
            const data = await response.json();
            return data.success ? data.data.category : null;
        } catch (error) {
            console.error('Error fetching category:', error);
            return this.getCategoryFromJSON(categoryId);
        }
    }

    async getProductsByCategory(categoryId, options = {}) {
        if (!this.isConnected) {
            return this.getProductsFromJSON(categoryId);
        }

        try {
            const params = new URLSearchParams({
                limit: options.limit || 12,
                page: options.page || 1,
                sortBy: options.sortBy || 'createdAt',
                sortOrder: options.sortOrder || 'desc'
            });

            const response = await fetch(`${this.baseURL}/products/category/${categoryId}?${params}`);
            const data = await response.json();
            return data.success ? data.data.products : [];
        } catch (error) {
            console.error('Error fetching products:', error);
            return this.getProductsFromJSON(categoryId);
        }
    }

    async getProducts(options = {}) {
        if (!this.isConnected) {
            return this.getAllProductsFromJSON();
        }

        try {
            const params = new URLSearchParams(options);
            const response = await fetch(`${this.baseURL}/products?${params}`);
            const data = await response.json();
            return data.success ? data.data.products : [];
        } catch (error) {
            console.error('Error fetching products:', error);
            return this.getAllProductsFromJSON();
        }
    }

    // JSON Fallback Methods
    async getCategoriesFromJSON() {
        try {
            const response = await fetch('../data/longchau_categories.json');
            return await response.json();
        } catch (error) {
            console.error('Error loading categories from JSON:', error);
            return [];
        }
    }

    async getCategoryFromJSON(categoryId) {
        try {
            const categories = await this.getCategoriesFromJSON();
            return categories.find(cat => cat._id === categoryId) || null;
        } catch (error) {
            console.error('Error loading category from JSON:', error);
            return null;
        }
    }

    async getProductsFromJSON(categoryId) {
        try {
            const response = await fetch('../data/longchau_products.json');
            const products = await response.json();
            return products.filter(product => product.categoryId === categoryId);
        } catch (error) {
            console.error('Error loading products from JSON:', error);
            return [];
        }
    }

    async getAllProductsFromJSON() {
        try {
            const response = await fetch('../data/longchau_products.json');
            return await response.json();
        } catch (error) {
            console.error('Error loading products from JSON:', error);
            return [];
        }
    }

    // Utility methods
    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    }

    formatNumber(number) {
        return new Intl.NumberFormat('vi-VN').format(number);
    }
}

// Initialize API service
window.apiService = new ApiService();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
