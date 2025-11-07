const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');

/**
 * Import scraped articles to MongoDB
 */

// Article Schema
const articleSchema = new mongoose.Schema({
  url: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: String,
  author: String,
  publishDate: String,
  summary: String,
  content: String,
  contentText: String,
  images: [{
    src: String,
    alt: String,
    caption: String,
    title: String,
    width: Number,
    height: Number,
    isFeatured: Boolean
  }],
  tags: [String],
  hashtags: [String],
  relatedArticles: [{
    title: String,
    url: String,
    thumbnail: String
  }],
  metaDescription: String,
  metaKeywords: String,
  ogTitle: String,
  ogDescription: String,
  ogImage: String,
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  scrapedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Article = mongoose.model('Article', articleSchema);

// Category Schema
const categorySchema = new mongoose.Schema({
  id: String,
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  url: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const ArticleCategory = mongoose.model('ArticleCategory', categorySchema);

async function importData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/medicare';
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Read JSON file
    const dataDir = path.join(__dirname, '../data');
    const files = await fs.readdir(dataDir);
    const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('articles'));

    if (jsonFiles.length === 0) {
      console.log('❌ No article JSON files found in backend/data/');
      console.log('   Run scraper first: npm run scrape');
      process.exit(1);
    }

    // Use the most recent file
    const jsonFile = jsonFiles[jsonFiles.length - 1];
    const filePath = path.join(dataDir, jsonFile);
    console.log(`📖 Reading data from: ${jsonFile}`);

    const fileContent = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    console.log(`\n📊 Data summary:`);
    console.log(`   - Categories: ${data.categories?.length || 0}`);
    console.log(`   - Articles: ${data.articles?.length || 0}`);

    // Import categories
    if (data.categories && data.categories.length > 0) {
      console.log('\n📂 Importing categories...');
      for (const cat of data.categories) {
        try {
          await ArticleCategory.findOneAndUpdate(
            { slug: cat.slug },
            cat,
            { upsert: true, new: true }
          );
          console.log(`  ✅ ${cat.name}`);
        } catch (error) {
          console.error(`  ❌ Error importing category ${cat.name}:`, error.message);
        }
      }
    }

    // Import articles
    if (data.articles && data.articles.length > 0) {
      console.log('\n📰 Importing articles...');
      let imported = 0;
      let skipped = 0;
      let errors = 0;

      for (const article of data.articles) {
        try {
          if (!article.title || !article.slug) {
            console.log(`  ⚠️  Skipping article without title/slug`);
            skipped++;
            continue;
          }

          await Article.findOneAndUpdate(
            { slug: article.slug },
            {
              ...article,
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
          
          imported++;
          console.log(`  ✅ [${imported}] ${article.title?.substring(0, 60)}...`);
        } catch (error) {
          errors++;
          console.error(`  ❌ Error importing article:`, error.message);
        }
      }

      console.log(`\n✨ Import completed!`);
      console.log(`   - Imported: ${imported}`);
      console.log(`   - Skipped: ${skipped}`);
      console.log(`   - Errors: ${errors}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Import failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  importData()
    .then(() => {
      console.log('\n✅ ALL DONE!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ FAILED:', error);
      process.exit(1);
    });
}

module.exports = { importData, Article, ArticleCategory };

