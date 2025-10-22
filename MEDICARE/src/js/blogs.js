document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'blogs.html') {
        loadBlogListWithFilters();
        setTimeout(() => {
            handleFilterChanges();
            handleRealTimeSearch();
        }, 100);
    } else if (currentPage === 'blog.html') {
        const urlParams = new URLSearchParams(window.location.search);
        const blogId = urlParams.get('id');
        if (blogId) {
            loadBlogDetail(blogId);
        } else {
            document.getElementById('blog-content').innerHTML = '<p>Không tìm thấy ID blog.</p>';
        }
    }

    // Xử lý sự kiện nhấp vào mục danh mục trong menu
    const categoryCards = document.querySelectorAll('.nav-popup-card');
    categoryCards.forEach(card => {
        card.addEventListener('click', () => {
            const categoryText = card.querySelector('span').textContent;
            let category = '';

            // Ánh xạ văn bản hiển thị với danh mục trong XML
            switch (categoryText) {
                case 'Bệnh tim mạch':
                    category = 'Tim Mạch';
                    break;
                case 'Bệnh thần kinh':
                    category = 'Thần Kinh';
                    break;
                case 'Bệnh tiêu hóa':
                    category = 'Tiêu Hóa';
                    break;
                case 'Bệnh hô hấp':
                    category = 'Hô Hấp';
                    break;
                case 'Bệnh xương khớp':
                    category = 'Xương Khớp';
                    break;
                default:
                    category = '';
            }

            if (category) {
                if (currentPage === 'index.html' || currentPage === '') {
                    window.location.href = '../html/blogs.html?category=' + encodeURIComponent(category);
                } else if (currentPage === 'blogs.html') {
                    filterBlogs('', category, '');
                }
            }
        });
    });
});

function loadBlogList() {
    fetch('../data/blogs.xml')
        .then(response => response.text())
        .then(xmlText => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const blogs = xmlDoc.querySelectorAll('blog');
            const blogListEl = document.getElementById('blog-list');
            blogListEl.innerHTML = '';

            blogs.forEach(blog => {
                const id = blog.getAttribute('id');
                const title = blog.querySelector('title').textContent;
                const author = blog.querySelector('author').textContent;
                const date = blog.querySelector('date').textContent;
                const summaryEl = blog.querySelector('summary') || blog.querySelector('introduction');
                const summary = summaryEl ? summaryEl.textContent.substring(0, 150) + '...' : '';

                let imgSrc = '../assets/images/medical_13713053.png';
                const contentEl = blog.querySelector('content');
                if (contentEl) {
                    const contentImages = contentEl.querySelectorAll('image');
                    if (contentImages.length > 0) {
                        imgSrc = contentImages[0].getAttribute('src') || imgSrc;
                    }
                }
                if (imgSrc === '../assets/images/medical_13713053.png') {
                    const directImage = blog.querySelector('image');
                    if (directImage) {
                        imgSrc = directImage.getAttribute('src') || imgSrc;
                    }
                }
                if (imgSrc.startsWith('../assets/')) {
                    // Keep relative path as is
                } else if (imgSrc.startsWith('https://') || imgSrc.startsWith('http://')) {
                    // Keep absolute URLs as is
                } else if (imgSrc !== '../assets/images/medical_13713053.png') {
                    imgSrc = '../assets/images/' + imgSrc;
                }

                const blogItem = document.createElement('div');
                blogItem.className = 'blog-item';
                blogItem.innerHTML = `
                    <img src="${imgSrc}" alt="Ảnh blog" onerror="this.src='../assets/images/medical_13713053.png'">
                    <div class="blog-item-content">
                        <h2><a href="../html/blog.html?id=${id}">${title}</a></h2>
                        <p>Tác giả: ${author} | Ngày: ${date}</p>
                        <p>${summary}</p>
                    </div>
                `;
                blogListEl.appendChild(blogItem);
            });
        })
        .catch(error => {
            console.error('Error loading XML:', error);
            document.getElementById('blog-list').innerHTML = '<p>Lỗi tải dữ liệu.</p>';
        });
}

function loadBlogDetail(blogId) {
    fetch('../data/blogs.xml')
        .then(response => response.text())
        .then(xmlText => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const blog = xmlDoc.querySelector(`blog[id="${blogId}"]`);
            if (!blog) {
                document.getElementById('blog-content').innerHTML = '<p>Không tìm thấy blog.</p>';
                return;
            }

            const title = blog.querySelector('title').textContent;
            const author = blog.querySelector('author').textContent;
            const date = blog.querySelector('date').textContent;

            document.getElementById('blog-title').textContent = title;
            document.getElementById('blog-meta').textContent = `Tác giả: ${author} | Ngày: ${date}`;

            const contentEl = blog.querySelector('content') || blog;
            const blogContentEl = document.getElementById('blog-content');
            blogContentEl.innerHTML = '';

            const sections = contentEl.children;
            Array.from(sections).forEach(section => {
                const sectionTag = section.tagName.toLowerCase();
                if (sectionTag === 'section') {
                    let sectionHTML = '';
                    Array.from(section.children).forEach(child => {
                        const childTag = child.tagName.toLowerCase();
                        if (childTag === 'p') {
                            sectionHTML += `<p>${child.textContent}</p>`;
                        } else if (childTag === 'subtitle' || childTag === 'heading') {
                            sectionHTML += `<subtitle>${child.textContent}</subtitle>`;
                        } else if (childTag === 'image') {
                            const src = child.getAttribute('src') || '';
                            const caption = child.getAttribute('caption') || '';
                            sectionHTML += `<img src="${src}" alt="${caption}"><figcaption>${caption}</figcaption>`;
                        } else if (childTag === 'list') {
                            sectionHTML += '<list>';
                            Array.from(child.querySelectorAll('item')).forEach(item => {
                                sectionHTML += `<item>${item.textContent}</item>`;
                            });
                            sectionHTML += '</list>';
                        } else if (childTag === 'formula') {
                            sectionHTML += '<formula>';
                            Array.from(child.children).forEach(formulaChild => {
                                sectionHTML += `<p>${formulaChild.textContent}</p>`;
                            });
                            sectionHTML += '</formula>';
                        } else if (childTag === 'note') {
                            sectionHTML += `<note>${child.textContent}</note>`;
                        } else if (childTag === 'subsection') {
                            let subHTML = '';
                            Array.from(child.children).forEach(subChild => {
                                if (subChild.tagName.toLowerCase() === 'title') {
                                    subHTML += `<subsection title>${subChild.textContent}</subsection title>`;
                                } else if (subChild.tagName.toLowerCase() === 'content') {
                                    subHTML += `<p>${subChild.textContent}</p>`;
                                } else if (subChild.tagName.toLowerCase() === 'image') {
                                    const src = subChild.getAttribute('src') || '';
                                    const caption = subChild.querySelector('caption') ? subChild.querySelector('caption').textContent : '';
                                    subHTML += `<img src="${src}" alt="${caption}"><figcaption>${caption}</figcaption>`;
                                }
                            });
                            sectionHTML += subHTML;
                        } else {
                            sectionHTML += child.outerHTML;
                        }
                    });
                    const sectionWrapper = document.createElement('section');
                    sectionWrapper.innerHTML = sectionHTML;
                    blogContentEl.appendChild(sectionWrapper);
                }
            });

            const introEl = blog.querySelector('summary') || blog.querySelector('introduction');
            if (introEl) {
                const introP = document.createElement('p');
                introP.textContent = introEl.textContent;
                blogContentEl.insertBefore(introP, blogContentEl.firstChild);
            }
        })
        .catch(error => {
            console.error('Error loading XML:', error);
            document.getElementById('blog-content').innerHTML = '<p>Lỗi tải dữ liệu.</p>';
        });
}

let allBlogs = [];
let currentFilters = {
    author: '',
    category: '',
    keyword: ''
};

function filterBlogs(author = '', category = '', keyword = '') {
    currentFilters.author = author.toLowerCase().trim();
    currentFilters.category = category.toLowerCase().trim();
    currentFilters.keyword = keyword.toLowerCase().trim();
    
    const filteredBlogs = allBlogs.filter(blog => {
        const blogAuthor = blog.author.toLowerCase();
        const blogCategory = blog.category.toLowerCase();
        const blogTitle = blog.title.toLowerCase();
        const blogSummary = blog.summary.toLowerCase();
        const blogContent = blog.content.toLowerCase();
        
        const authorMatch = !currentFilters.author || blogAuthor.includes(currentFilters.author);
        const categoryMatch = !currentFilters.category || blogCategory === currentFilters.category; // So sánh chính xác
        const keywordMatch = !currentFilters.keyword || 
            blogTitle.includes(currentFilters.keyword) ||
            blogSummary.includes(currentFilters.keyword) ||
            blogContent.includes(currentFilters.keyword);
        
        return authorMatch && categoryMatch && keywordMatch;
    });
    
    displayFilteredBlogs(filteredBlogs);
    updateFilterStatus(filteredBlogs.length);
}

function displayFilteredBlogs(blogs) {
    const blogListEl = document.getElementById('blog-list');
    blogListEl.innerHTML = '';
    
    if (blogs.length === 0) {
        blogListEl.innerHTML = '<p class="no-results">Không tìm thấy blog nào phù hợp với tiêu chí tìm kiếm.</p>';
        return;
    }
    
    blogs.forEach(blog => {
        const blogItem = document.createElement('div');
        blogItem.className = 'blog-item';
        blogItem.innerHTML = `
            <img src="${blog.imageSrc}" alt="Ảnh blog" onerror="this.src='../assets/images/medical_13713053.png'">
            <div class="blog-item-content">
                <h2><a href="../html/blog.html?id=${blog.id}">${blog.title}</a></h2>
                <p>Tác giả: ${blog.author} | Ngày: ${blog.date} | Danh mục: ${blog.category}</p>
                <p>${blog.summary}</p>
            </div>
        `;
        blogListEl.appendChild(blogItem);
    });
}

function updateFilterStatus(resultCount) {
    const statusEl = document.getElementById('filter-status');
    if (statusEl) {
        const activeFilters = [];
        if (currentFilters.author) activeFilters.push(`Tác giả: "${currentFilters.author}"`);
        if (currentFilters.category) activeFilters.push(`Danh mục: "${currentFilters.category}"`);
        if (currentFilters.keyword) activeFilters.push(`Từ khóa: "${currentFilters.keyword}"`);
        
        if (activeFilters.length > 0) {
            statusEl.innerHTML = `
                <div class="filter-status">
                    <strong>Kết quả tìm kiếm:</strong> ${resultCount} blog(s) 
                    <span class="active-filters">(${activeFilters.join(', ')})</span>
                    <button onclick="clearAllFilters()" class="clear-filters-btn">Xóa bộ lọc</button>
                </div>
            `;
        } else {
            statusEl.innerHTML = `<div class="filter-status">Hiển thị tất cả ${resultCount} blog(s)</div>`;
        }
    }
}

function clearAllFilters() {
    const authorInput = document.getElementById('author-filter');
    const categoryInput = document.getElementById('category-filter');
    const keywordInput = document.getElementById('keyword-filter');
    
    if (authorInput) authorInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (keywordInput) keywordInput.value = '';
    
    filterBlogs('', '', '');
}

function getUniqueAuthors() {
    const authors = [...new Set(allBlogs.map(blog => blog.author))];
    return authors.sort();
}

function getUniqueCategories() {
    const categories = [...new Set(allBlogs.map(blog => blog.category))];
    return categories.sort();
}

function populateFilterDropdowns() {
    const authors = getUniqueAuthors();
    const categories = getUniqueCategories();
    
    const authorSelect = document.getElementById('author-filter');
    if (authorSelect) {
        authorSelect.innerHTML = '<option value="">Tất cả tác giả</option>';
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            authorSelect.appendChild(option);
        });
    }
    
    const categorySelect = document.getElementById('category-filter');
    if (categorySelect) {
        categorySelect.innerHTML = '<option value="">Tất cả danh mục</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
    }
}

function loadBlogListWithFilters() {
    fetch('../data/blogs.xml')
        .then(response => response.text())
        .then(xmlText => {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            const blogs = xmlDoc.querySelectorAll('blog');
            
            allBlogs = [];
            blogs.forEach(blog => {
                const id = blog.getAttribute('id');
                const title = blog.querySelector('title').textContent;
                const author = blog.querySelector('author').textContent;
                const date = blog.querySelector('date').textContent;
                const category = blog.getAttribute('category') || 'khác';
                const summaryEl = blog.querySelector('summary') || blog.querySelector('introduction');
                const summary = summaryEl ? summaryEl.textContent.substring(0, 150) + '...' : '';
                
                const contentEl = blog.querySelector('content');
                const content = contentEl ? contentEl.textContent : '';
                
                let imgSrc = '../assets/images/medical_13713053.png';
                if (contentEl) {
                    const contentImages = contentEl.querySelectorAll('image');
                    if (contentImages.length > 0) {
                        imgSrc = contentImages[0].getAttribute('src') || imgSrc;
                    }
                }
                if (imgSrc === '../assets/images/medical_13713053.png') {
                    const directImage = blog.querySelector('image');
                    if (directImage) {
                        imgSrc = directImage.getAttribute('src') || imgSrc;
                    }
                }
                if (imgSrc.startsWith('../assets/')) {
                    // Keep relative path as is
                } else if (imgSrc.startsWith('https://') || imgSrc.startsWith('http://')) {
                    // Keep absolute URLs as is
                } else if (imgSrc !== '../assets/images/medical_13713053.png') {
                    imgSrc = '../assets/images/' + imgSrc;
                }
                
                allBlogs.push({
                    id,
                    title,
                    author,
                    date,
                    category,
                    summary,
                    content,
                    imageSrc: imgSrc
                });
            });
            
            // Populate filter dropdowns
            populateFilterDropdowns();
            
            // Kiểm tra query parameters từ URL và áp dụng filter tự động
            const urlParams = new URLSearchParams(window.location.search);
            const categoryParam = urlParams.get('category') ? decodeURIComponent(urlParams.get('category')) : '';
            const validCategories = getUniqueCategories();
            
            if (categoryParam && validCategories.includes(categoryParam)) {
                filterBlogs('', categoryParam, '');
                const categorySelect = document.getElementById('category-filter');
                if (categorySelect) {
                    categorySelect.value = categoryParam;
                }
            } else {
                displayFilteredBlogs(allBlogs);
                updateFilterStatus(allBlogs.length);
            }
        })
        .catch(error => {
            console.error('Error loading XML:', error);
            document.getElementById('blog-list').innerHTML = '<p>Lỗi tải dữ liệu.</p>';
        });
}

function handleRealTimeSearch() {
    const keywordInput = document.getElementById('keyword-filter');
    if (keywordInput) {
        keywordInput.addEventListener('input', function() {
            const author = document.getElementById('author-filter')?.value || '';
            const category = document.getElementById('category-filter')?.value || '';
            const keyword = this.value;
            filterBlogs(author, category, keyword);
        });
    }
}

function handleFilterChanges() {
    const authorSelect = document.getElementById('author-filter');
    const categorySelect = document.getElementById('category-filter');
    
    if (authorSelect) {
        authorSelect.addEventListener('change', function() {
            const author = this.value;
            const category = document.getElementById('category-filter')?.value || '';
            const keyword = document.getElementById('keyword-filter')?.value || '';
            filterBlogs(author, category, keyword);
        });
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            const author = document.getElementById('author-filter')?.value || '';
            const category = this.value;
            const keyword = document.getElementById('keyword-filter')?.value || '';
            filterBlogs(author, category, keyword);
        });
    }
}