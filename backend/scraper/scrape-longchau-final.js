const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * FINAL LONG CHAU ARTICLE SCRAPER
 * Strategy: Take screenshot, inspect real DOM, extract actual content
 */

class LongChauFinalScraper {
  constructor() {
    this.baseUrl = 'https://nhathuoclongchau.com.vn';
    this.articlesUrl = 'https://nhathuoclongchau.com.vn/bai-viet';
    this.articles = [];
    this.browser = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 Starting Final Long Chau Scraper...\n');
    this.browser = await puppeteer.launch({
      headless: 'new',  // Headless mode for faster scraping
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set realistic user agent and encoding
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1920, height: 1080 });
    
    // DON'T block images - we need them for articles!
  }

  async getArticleLinks() {
    console.log('📰 Fetching article links from homepage...\n');
    
    try {
      await this.page.goto(this.articlesUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.page.waitForTimeout(5000);
      
      const links = await this.page.evaluate(() => {
        const articleLinks = new Set();
        
        // Strategy: Look for article cards with images (real articles have thumbnails)
        // Try specific article card selectors first
        const articleCardSelectors = [
          'article a[href*="/bai-viet/"]',
          '[class*="article-card"] a[href*="/bai-viet/"]',
          '[class*="post-card"] a[href*="/bai-viet/"]',
          '[class*="news-item"] a[href*="/bai-viet/"]'
        ];
        
        let allLinks = [];
        for (const selector of articleCardSelectors) {
          const links = Array.from(document.querySelectorAll(selector));
          if (links.length > 0) {
            allLinks = links;
            break;
          }
        }
        
        // Fallback to all links if no specific selectors found
        if (allLinks.length === 0) {
          allLinks = Array.from(document.querySelectorAll('a[href*="/bai-viet/"]'));
        }
        
        // Common article URL patterns
        const articlePatterns = [
          // Long article slugs
          /\/bai-viet\/[\w\-]+\-[\w\-]+\-/i,
          // Category/article format
          /\/bai-viet\/[a-z\-]+\/[a-z\-]+/i
        ];
        
        allLinks.forEach(link => {
          const href = link.href;
          
          // Exclude category listing pages
          const categoryPages = [
            'tin-khuyen-mai$',
            'truyen-thong$',
            'chuyen-trang$',
            'dinh-duong$',
            'phong-chua-benh$',
            'nguoi-cao-tuoi$',
            'khoe-dep$',
            'me-va-be$',
            'gioi-tinh$',
            'kien-thuc-y-khoa$',
            'y-hoc-co-truyen$',
            'suc-khoe-gia-dinh$',
            'tiem-chung$',
            'tam-ly-tam-than$',
            'tin-tuc-suc-khoe$',
            'tin-tuc-khuyen-mai$',
            'benh-thuong-gap$'
          ];
          
          // Check if it's a category listing page
          const isCategoryPage = categoryPages.some(pattern => new RegExp(pattern).test(href));
          
          if (!isCategoryPage && !href.endsWith('/bai-viet') && href.includes('/bai-viet/')) {
            // Must have content after /bai-viet/
            const urlParts = href.split('/');
            const baiVietIndex = urlParts.indexOf('bai-viet');
            if (baiVietIndex >= 0) {
              const afterBaiViet = urlParts.slice(baiVietIndex + 1).filter(p => p && p.length > 0 && p !== 'bai-viet');
              
              // Check if matches article pattern OR has a long slug (real articles have detailed slugs)
              const looksLikeArticle = articlePatterns.some(pattern => pattern.test(href));
              const hasLongSlug = afterBaiViet.length >= 1 && afterBaiViet[0].split('-').length >= 5;
              
              // Exclude very short slugs that are likely category pages
              const firstPart = afterBaiViet[0];
              const isVeryShort = firstPart && firstPart.split('-').length < 4;
              
              if ((looksLikeArticle || hasLongSlug) && !isVeryShort && !href.includes('#') && !href.includes('?page=')) {
                articleLinks.add(href);
              }
            }
          }
        });
        
        return Array.from(articleLinks);
      });
      
      console.log(`✅ Found ${links.length} article URLs\n`);
      return links;
    } catch (error) {
      console.error('❌ Error fetching links:', error.message);
      return [];
    }
  }

  async scrapeArticle(url) {
    try {
      await this.page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await this.page.waitForTimeout(5000);
      
      const articleData = await this.page.evaluate(() => {
        // Helper function
        const getText = (selector, attr) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          if (attr) return el.getAttribute(attr);
          return el.textContent?.trim();
        };
        
        const getTexts = (selector) => {
          return Array.from(document.querySelectorAll(selector))
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 0);
        };
        
        const data = {
          title: null,
          slug: null,
          category: null,
          author: null,
          publishDate: null,
          summary: null,
          content: null,
          contentText: null,
          images: [],
          tags: [],
          hashtags: [],
          relatedArticles: []
        };
        
        // 1. TITLE
        data.title = getText('h1') || getText('[class*="title"]');
        
        // 2. CONTENT - The most important part!
        // Based on debug: posts-detail_posts-detail-container__GFMNQ has the content
        const contentSelectors = [
          '[class*="posts-detail"]',
          '[class*="post-content"]',
          'article',
          'main'
        ];
        
        let foundContent = false;
        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const text = el.textContent?.trim();
            
            // Real content should be substantial (at least 1000 chars based on debug)
            if (text && text.length > 1000) {
              // Get only the text content for contentText
              data.contentText = text;
              
              // Get innerHTML and clean it
              let innerHTML = el.innerHTML;
              const tempDiv = document.createElement('div');
              tempDiv.innerHTML = innerHTML;
              
              // Remove common UI elements
              tempDiv.querySelectorAll('script, style, nav, header, footer').forEach(el => el.remove());
              tempDiv.querySelectorAll('[class*="nav"], [class*="menu"], [class*="sidebar"], button').forEach(el => el.remove());
              
              data.content = tempDiv.innerHTML;
              foundContent = true;
              break;
            }
          }
        }
        
        // 3. CATEGORY
        const breadcrumbs = getTexts('[class*="breadcrumb"] a, [class*="category"] a');
        if (breadcrumbs.length > 1) {
          data.category = breadcrumbs[breadcrumbs.length - 1];
        }
        
        // 4. AUTHOR
        data.author = getText('[class*="author"]') || 'Long Châu';
        
        // 5. DATE
        data.publishDate = getText('time', 'datetime') || getText('[class*="date"]');
        
        // 6. SUMMARY
        data.summary = getText('[class*="summary"], [class*="excerpt"]') ||
                      getText('meta[property="og:description"]', 'content') ||
                      getText('meta[name="description"]', 'content');
        
        // 7. IMAGES - only from content area
        if (data.content) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = data.content;
          const imgs = tempDiv.querySelectorAll('img');
          
          imgs.forEach(img => {
            const src = img.src || img.getAttribute('data-src');
            if (src && src.includes('cms-prod') && !src.includes('icon')) {
              data.images.push({
                src,
                alt: img.alt || '',
                width: img.naturalWidth,
                height: img.naturalHeight
              });
            }
          });
        }
        
        // OG Image as featured
        const ogImage = getText('meta[property="og:image"]', 'content');
        if (ogImage && !data.images.some(img => img.src === ogImage)) {
          data.images.unshift({
            src: ogImage,
            alt: data.title,
            isFeatured: true
          });
        }
        
        // 8. TAGS
        const tagElements = document.querySelectorAll('[class*="tag"]:not([class*="hashtag"])');
        tagElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length < 50 && !text.includes('#') && !data.tags.includes(text)) {
            data.tags.push(text);
          }
        });
        
        // 9. RELATED ARTICLES
        const relatedLinks = document.querySelectorAll('[class*="related"] a[href*="/bai-viet/"]');
        relatedLinks.forEach(link => {
          data.relatedArticles.push({
            title: link.textContent?.trim(),
            url: link.href
          });
        });
        
        // 10. METADATA
        data.metaDescription = getText('meta[name="description"]', 'content');
        data.ogTitle = getText('meta[property="og:title"]', 'content');
        data.ogDescription = getText('meta[property="og:description"]', 'content');
        data.ogImage = ogImage;
        
        return data;
      });
      
      // Validate we got something meaningful
      if (!articleData.title || !articleData.contentText || articleData.contentText.length < 300) {
        console.log('    ⚠️  Missing or insufficient content');
        return null;
      }
      
      // Extract slug from URL
      const urlParts = url.split('/');
      articleData.slug = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2];
      
      return {
        url,
        ...articleData,
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.log(`    ❌ Error: ${error.message}`);
      return null;
    }
  }

  async run(maxArticles = 20, scrapeAll = false) {
    await this.init();
    
    const articleUrls = await this.getArticleLinks();
    const urlsToScrape = scrapeAll ? articleUrls : articleUrls.slice(0, maxArticles);
    
    console.log(`🔍 Scraping ${urlsToScrape.length} articles...\n`);
    
    let count = 0;
    for (const url of urlsToScrape) {
      count++;
      console.log(`[${count}/${urlsToScrape.length}] ${url.substring(0, 80)}...`);
      
      const article = await this.scrapeArticle(url);
      if (article) {
        this.articles.push(article);
        console.log(`  ✅ ${article.title?.substring(0, 60)}...`);
      }
      
      // Small delay to be polite
      await this.page.waitForTimeout(2000);
    }
    
    await this.saveToFile();
    await this.browser.close();
    
    console.log(`\n✅ Done! Scraped ${this.articles.length} articles\n`);
  }

  async saveToFile() {
    const outputDir = path.join(__dirname, '../data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, 'longchau-articles-final.json');
    const data = {
      metadata: {
        source: 'Long Chau Health Corner',
        url: this.articlesUrl,
        scrapedAt: new Date().toISOString(),
        totalArticles: this.articles.length,
        method: 'puppeteer-final'
      },
      categories: [],
      articles: this.articles
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Saved to: ${outputFile}\n`);
  }
}

if (require.main === module) {
  const arg = process.argv[2];
  const scrapeAll = arg === 'all' || arg === 'ALL';
  const maxArticles = scrapeAll ? 9999 : (arg ? parseInt(arg) : 20);
  const scraper = new LongChauFinalScraper();
  
  if (scrapeAll) {
    console.log('🚨 SCRAPING ALL ARTICLES MODE');
    console.log('⚠️  This may take a very long time!\n');
  }
  
  scraper.run(maxArticles, scrapeAll)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = LongChauFinalScraper;

