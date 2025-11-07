/**
 * Chatbot Service - Xử lý tin nhắn chatbot với AI
 * Hỗ trợ: OpenAI API hoặc Google Gemini API
 */

const { MongoClient } = require('mongodb');

// Cấu hình - có thể đặt trong .env file
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const USE_OPENAI = !!OPENAI_API_KEY;
const USE_GEMINI = !!GEMINI_API_KEY && !USE_OPENAI;

// MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'MediCare_database';

// Knowledge Base Cache
let knowledgeBaseCache = {
  blogs: [],
  diseases: [],
  products: [],
  lastUpdated: null
};

const KNOWLEDGE_BASE_CACHE_TTL = 3600000; // 1 hour

/**
 * Load Knowledge Base từ MongoDB (blogs, diseases, products)
 */
async function loadKnowledgeBase() {
  const now = Date.now();
  
  // Return cached data if still valid
  if (knowledgeBaseCache.lastUpdated && 
      (now - knowledgeBaseCache.lastUpdated) < KNOWLEDGE_BASE_CACHE_TTL &&
      knowledgeBaseCache.blogs.length > 0) {
    return knowledgeBaseCache;
  }
  
  let client;
  try {
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    
    console.log('📚 Loading knowledge base from MongoDB...');
    
    // Load blogs (health articles)
    const blogs = await db.collection('blogs')
      .find({ 
        isApproved: { $ne: false },
        status: { $ne: 'draft' }
      })
      .project({
        title: 1,
        slug: 1,
        summary: 1,
        content: 1,
        contentText: 1,
        category: 1,
        tags: 1,
        metaDescription: 1
      })
      .limit(1000) // Limit để tránh quá tải
      .toArray();
    
    // Load diseases
    const diseases = await db.collection('diseases')
      .find({})
      .project({
        name: 1,
        slug: 1,
        description: 1,
        symptoms: 1,
        causes: 1,
        treatment: 1,
        prevention: 1
      })
      .limit(500)
      .toArray();
    
    // Load products (sample - để hiểu về sản phẩm)
    const products = await db.collection('products')
      .find({ is_active: { $ne: false } })
      .project({
        name: 1,
        description: 1,
        brand: 1,
        usage: 1,
        ingredients: 1,
        category: 1
      })
      .limit(2000) // Sample products để hiểu về sản phẩm
      .toArray();
    
    knowledgeBaseCache = {
      blogs: blogs || [],
      diseases: diseases || [],
      products: products || [],
      lastUpdated: now
    };
    
    console.log(`✅ Knowledge base loaded: ${blogs.length} blogs, ${diseases.length} diseases, ${products.length} products`);
    
    return knowledgeBaseCache;
  } catch (error) {
    console.error('❌ Error loading knowledge base:', error);
    return knowledgeBaseCache; // Return cached data if available
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Search trong Knowledge Base để tìm thông tin liên quan
 */
function searchKnowledgeBase(query, knowledgeBase) {
  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2);
  
  const results = {
    blogs: [],
    diseases: [],
    products: []
  };
  
  // Search blogs
  for (const blog of knowledgeBase.blogs) {
    const text = [
      blog.title,
      blog.summary,
      blog.contentText,
      blog.metaDescription,
      (blog.tags || []).join(' ')
    ].filter(Boolean).join(' ').toLowerCase();
    
    const score = queryWords.reduce((score, word) => {
      if (text.includes(word)) {
        return score + (blog.title?.toLowerCase().includes(word) ? 3 : 1);
      }
      return score;
    }, 0);
    
    if (score > 0) {
      results.blogs.push({ ...blog, relevanceScore: score });
    }
  }
  
  // Search diseases
  for (const disease of knowledgeBase.diseases) {
    const text = [
      disease.name,
      disease.description,
      (disease.symptoms || []).join(' '),
      (disease.causes || []).join(' '),
      disease.treatment,
      disease.prevention
    ].filter(Boolean).join(' ').toLowerCase();
    
    const score = queryWords.reduce((score, word) => {
      if (text.includes(word)) {
        return score + (disease.name?.toLowerCase().includes(word) ? 3 : 1);
      }
      return score;
    }, 0);
    
    if (score > 0) {
      results.diseases.push({ ...disease, relevanceScore: score });
    }
  }
  
  // Search products (for understanding product context)
  for (const product of knowledgeBase.products) {
    const text = [
      product.name,
      product.description,
      product.brand,
      product.usage,
      (product.ingredients || []).join(' ')
    ].filter(Boolean).join(' ').toLowerCase();
    
    const score = queryWords.reduce((score, word) => {
      if (text.includes(word)) {
        return score + (product.name?.toLowerCase().includes(word) ? 2 : 1);
      }
      return score;
    }, 0);
    
    if (score > 0) {
      results.products.push({ ...product, relevanceScore: score });
    }
  }
  
  // Sort by relevance
  results.blogs.sort((a, b) => b.relevanceScore - a.relevanceScore);
  results.diseases.sort((a, b) => b.relevanceScore - a.relevanceScore);
  results.products.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Return top results
  return {
    blogs: results.blogs.slice(0, 3),
    diseases: results.diseases.slice(0, 3),
    products: results.products.slice(0, 5)
  };
}

/**
 * Extract smart keywords từ message (fallback)
 */
function extractSmartKeywords(message) {
  const lowerMessage = message.toLowerCase();
  const medicalTerms = {
    'đau lưng': 'xương khớp',
    'đau đầu': 'thần kinh não',
    'nhức đầu': 'thần kinh não',
    'não': 'thần kinh não',
    'thần kinh': 'thần kinh não',
    'ho': 'thuốc ho',
    'cough': 'thuốc ho',
    'vitamin': 'vitamin',
    'calcium': 'calcium canxi',
    'canxi': 'calcium canxi',
    'tim': 'tim mạch',
    'da': 'dưỡng da',
    'mụn': 'trị mụn',
    'xương khớp': 'xương khớp',
    'đau xương': 'xương khớp',
    'đau khớp': 'xương khớp'
  };
  
  // Sắp xếp theo độ dài để match cụ thể hơn trước
  const sortedTerms = Object.keys(medicalTerms).sort((a, b) => b.length - a.length);
  
  for (const term of sortedTerms) {
    if (lowerMessage.includes(term)) {
      return medicalTerms[term];
    }
  }
  
  return null;
}

/**
 * Tìm kiếm sản phẩm trong database (cải thiện)
 */
async function searchProducts(keywords, limit = 5) {
  let client;
  try {
    client = await MongoClient.connect(MONGODB_URI);
    const db = client.db(DB_NAME);
    const productsCollection = db.collection('products');

    // Tạo query tìm kiếm thông minh hơn
    const searchTerms = keywords.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    
    // Tạo query với priority: name > description > brand
    const query = {
      $and: [
        { is_active: { $ne: false } },
        {
          $or: [
            // Exact match trong name (priority cao nhất)
            { name: { $regex: keywords, $options: 'i' } },
            // Match từng từ trong name
            ...searchTerms.map(term => ({ name: { $regex: term, $options: 'i' } })),
            // Match trong description
            { description: { $regex: keywords, $options: 'i' } },
            ...searchTerms.map(term => ({ description: { $regex: term, $options: 'i' } })),
            // Match trong brand
            { brand: { $regex: keywords, $options: 'i' } }
          ]
        }
      ]
    };

    const products = await productsCollection
      .find(query)
      .limit(limit * 2) // Lấy nhiều hơn để filter
      .project({
        _id: 1,
        name: 1,
        price: 1,
        discount: 1,
        image: 1,
        description: 1,
        brand: 1,
        slug: 1,
        category: 1
      })
      .toArray();

    // Sort by relevance (name match > description match)
    const sortedProducts = products.sort((a, b) => {
      const aNameMatch = a.name?.toLowerCase().includes(keywords.toLowerCase()) ? 1 : 0;
      const bNameMatch = b.name?.toLowerCase().includes(keywords.toLowerCase()) ? 1 : 0;
      return bNameMatch - aNameMatch;
    });

    return sortedProducts.slice(0, limit);
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  } finally {
    if (client) {
      await client.close();
    }
  }
}

/**
 * Gọi OpenAI API
 */
async function callOpenAI(messages, functions = []) {
  if (!USE_OPENAI) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // Hoặc 'gpt-3.5-turbo' để tiết kiệm
      messages: messages,
      functions: functions.length > 0 ? functions : undefined,
      function_call: functions.length > 0 ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  return await response.json();
}

/**
 * Gọi Google Gemini API
 */
async function callGemini(message, context = '') {
  if (!USE_GEMINI) {
    throw new Error('Gemini API key not configured');
  }

  const prompt = context 
    ? `${context}\n\nNgười dùng hỏi: ${message}\n\nHãy trả lời bằng tiếng Việt một cách chuyên nghiệp và hữu ích về y tế.`
    : message;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.candidates[0]?.content?.parts[0]?.text || 'Xin lỗi, tôi không thể trả lời câu hỏi này.';
}

/**
 * Xử lý tin nhắn với AI (fallback nếu không có API key)
 */
async function processMessageWithAI(message, conversationHistory = [], productContext = null) {
  // System prompt cho chatbot y tế
  const systemPrompt = `Bạn là MeCa, một trợ lý y tế thông minh và thân thiện của MediCare. 
Nhiệm vụ của bạn:
1. Trả lời các câu hỏi về sức khỏe, bệnh tật, thuốc men một cách chuyên nghiệp
2. Gợi ý sản phẩm phù hợp khi người dùng cần
3. Luôn nhắc nhở người dùng tham khảo ý kiến bác sĩ cho các vấn đề nghiêm trọng
4. Trả lời bằng tiếng Việt, thân thiện và dễ hiểu

Khi người dùng hỏi về sản phẩm, bạn có thể gọi function search_products để tìm kiếm.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10), // Chỉ lấy 10 tin nhắn gần nhất
    { role: 'user', content: message }
  ];

  // Function definitions cho OpenAI
  const functions = [
    {
      name: 'search_products',
      description: 'Tìm kiếm sản phẩm trong cửa hàng MediCare dựa trên từ khóa',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'string',
            description: 'Từ khóa tìm kiếm sản phẩm (ví dụ: "thuốc ho", "vitamin C", "kem dưỡng da")'
          },
          limit: {
            type: 'number',
            description: 'Số lượng sản phẩm cần tìm (mặc định 5)',
            default: 5
          }
        },
        required: ['keywords']
      }
    }
  ];

  try {
    // Load knowledge base và search relevant info
    const knowledgeBase = await loadKnowledgeBase();
    const relevantInfo = searchKnowledgeBase(message, knowledgeBase);
    
    // Build knowledge context
    let knowledgeContext = '';
    if (relevantInfo.diseases.length > 0) {
      knowledgeContext += '\n\nTHÔNG TIN VỀ BỆNH TỪ DATABASE:\n';
      relevantInfo.diseases.forEach((disease, idx) => {
        knowledgeContext += `${idx + 1}. ${disease.name}: ${disease.description || ''}\n`;
        if (disease.symptoms && disease.symptoms.length > 0) {
          knowledgeContext += `   Triệu chứng: ${disease.symptoms.slice(0, 3).join(', ')}\n`;
        }
      });
    }
    if (relevantInfo.blogs.length > 0) {
      knowledgeContext += '\n\nTHÔNG TIN TỪ BÀI VIẾT SỨC KHỎE:\n';
      relevantInfo.blogs.forEach((blog, idx) => {
        knowledgeContext += `${idx + 1}. ${blog.title}: ${blog.summary || blog.metaDescription || ''}\n`;
      });
    }
    
    // Add knowledge context to system prompt
    if (knowledgeContext) {
      const enhancedSystemPrompt = systemPrompt + '\n\n' + knowledgeContext;
      messages[0].content = enhancedSystemPrompt;
    }
    
    if (USE_OPENAI) {
      const response = await callOpenAI(messages, functions);
      
      // Kiểm tra nếu AI muốn gọi function
      if (response.choices[0].message.function_call) {
        const functionName = response.choices[0].message.function_call.name;
        const functionArgs = JSON.parse(response.choices[0].message.function_call.arguments);

        if (functionName === 'search_products') {
          const products = await searchProducts(functionArgs.keywords, functionArgs.limit || 5);
          
          // Thêm function result vào conversation
          messages.push({
            role: 'function',
            name: 'search_products',
            content: JSON.stringify(products)
          });

          // Gọi lại AI để tạo response có sản phẩm
          const finalResponse = await callOpenAI(messages, functions);
          return {
            text: finalResponse.choices[0].message.content,
            products: products
          };
        }
      }

      return {
        text: response.choices[0].message.content,
        products: null
      };
    } else if (USE_GEMINI) {
      const lowerMessage = message.toLowerCase();
      
      // Load knowledge base
      const knowledgeBase = await loadKnowledgeBase();
      
      // Search trong knowledge base để tìm thông tin liên quan
      const relevantInfo = searchKnowledgeBase(message, knowledgeBase);
      
      // Extract keywords trước để hiểu context
      const productKeywords = extractProductKeywords(message);
      const detectedCondition = productKeywords || extractSmartKeywords(message);
      
      // Build context từ knowledge base
      let knowledgeContext = '';
      
      // Add product context if available - FULL PRODUCT INFORMATION
      if (productContext) {
        knowledgeContext += `\n\n═══════════════════════════════════════════════════════════
📦 THÔNG TIN CHI TIẾT SẢN PHẨM NGƯỜI DÙNG ĐANG XEM:
═══════════════════════════════════════════════════════════\n`;
        knowledgeContext += `Tên sản phẩm: ${productContext.name}\n`;
        if (productContext.brand) {
          knowledgeContext += `Thương hiệu: ${productContext.brand}\n`;
        }
        if (productContext.price) {
          const formattedPrice = new Intl.NumberFormat('vi-VN').format(productContext.price) + 'đ';
          knowledgeContext += `Giá: ${formattedPrice}`;
          if (productContext.unit) {
            knowledgeContext += ` / ${productContext.unit}\n`;
          } else {
            knowledgeContext += `\n`;
          }
          if (productContext.original_price && productContext.original_price > productContext.price) {
            const originalFormatted = new Intl.NumberFormat('vi-VN').format(productContext.original_price) + 'đ';
            knowledgeContext += `Giá gốc: ${originalFormatted}\n`;
          }
          if (productContext.discount && productContext.discount > 0) {
            knowledgeContext += `Giảm giá: ${productContext.discount}%\n`;
          }
        }
        if (productContext.description) {
          // Remove HTML tags for better readability
          const cleanDescription = productContext.description.replace(/<[^>]*>/g, '').trim();
          knowledgeContext += `Mô tả: ${cleanDescription}\n`;
        }
        if (productContext.usage) {
          const cleanUsage = productContext.usage.replace(/<[^>]*>/g, '').trim();
          knowledgeContext += `Công dụng: ${cleanUsage}\n`;
        }
        if (productContext.ingredients) {
          const cleanIngredients = productContext.ingredients.replace(/<[^>]*>/g, '').trim();
          knowledgeContext += `Thành phần: ${cleanIngredients}\n`;
        }
        if (productContext.manufacturer) {
          knowledgeContext += `Nhà sản xuất: ${productContext.manufacturer}\n`;
        }
        if (productContext.country) {
          knowledgeContext += `Nước sản xuất: ${productContext.country}\n`;
        }
        if (productContext.dosage_form) {
          knowledgeContext += `Dạng bào chế: ${productContext.dosage_form}\n`;
        }
        if (productContext.stock !== undefined) {
          knowledgeContext += `Tồn kho: ${productContext.stock > 0 ? 'Còn hàng' : 'Hết hàng'}\n`;
        }
        knowledgeContext += `\n═══════════════════════════════════════════════════════════
QUAN TRỌNG: Người dùng đang hỏi về sản phẩm "${productContext.name}" này.
Khi người dùng hỏi:
- "sản phẩm này bao nhiêu tiền?" hoặc "giá bao nhiêu?" -> Bạn PHẢI trả lời: "Sản phẩm ${productContext.name} có giá ${productContext.price ? new Intl.NumberFormat('vi-VN').format(productContext.price) + 'đ' : 'liên hệ'}${productContext.unit ? ' / ' + productContext.unit : ''}"
- "công dụng của sản phẩm này?" hoặc "sản phẩm này dùng để làm gì?" -> Bạn PHẢI trả lời dựa trên thông tin "Công dụng" ở trên
- "thành phần của sản phẩm?" -> Bạn PHẢI trả lời dựa trên thông tin "Thành phần" ở trên
- "sản phẩm này có gì?" hoặc "mô tả sản phẩm" -> Bạn PHẢI trả lời dựa trên thông tin "Mô tả" ở trên
- Bất kỳ câu hỏi nào về sản phẩm này -> Bạn PHẢI trả lời dựa trên thông tin sản phẩm ở trên, KHÔNG được trả lời chung chung

Hãy luôn trả lời CỤ THỂ và CHÍNH XÁC về sản phẩm này, không được trả lời chung chung hoặc gợi ý sản phẩm khác trừ khi người dùng yêu cầu.
═══════════════════════════════════════════════════════════\n`;
      }
      
      if (relevantInfo.diseases.length > 0) {
        knowledgeContext += '\n\n📖 THÔNG TIN VỀ BỆNH TỪ DATABASE:\n';
        relevantInfo.diseases.forEach((disease, idx) => {
          knowledgeContext += `${idx + 1}. ${disease.name}: ${disease.description || ''}\n`;
          if (disease.symptoms && disease.symptoms.length > 0) {
            knowledgeContext += `   Triệu chứng: ${disease.symptoms.slice(0, 3).join(', ')}\n`;
          }
        });
      }
      
      if (relevantInfo.blogs.length > 0) {
        knowledgeContext += '\n\n📚 THÔNG TIN TỪ BÀI VIẾT SỨC KHỎE:\n';
        relevantInfo.blogs.forEach((blog, idx) => {
          knowledgeContext += `${idx + 1}. ${blog.title}: ${blog.summary || blog.metaDescription || ''}\n`;
        });
      }
      
      // Improved context với instruction rõ ràng và chi tiết hơn
      let context = `Bạn là MeCa, trợ lý y tế thông minh và chuyên nghiệp của MediCare. 

Bạn đã được TRAIN trên toàn bộ dữ liệu của MediCare bao gồm:
- Hàng nghìn bài viết về sức khỏe
- Thông tin về các bệnh và triệu chứng
- Mô tả của tất cả sản phẩm

QUAN TRỌNG: Bạn PHẢI phân tích kỹ câu hỏi của người dùng để hiểu ĐÚNG vấn đề họ đang gặp. Sử dụng kiến thức từ database để trả lời chính xác.

Nhiệm vụ của bạn:
1. ĐỌC KỸ và PHÂN TÍCH câu hỏi của người dùng để hiểu đúng vấn đề:
   - Phân tích từng từ trong câu hỏi
   - Xác định vấn đề sức khỏe cụ thể họ đang gặp
   - Sử dụng thông tin từ database để hiểu rõ hơn
   - ĐẶC BIỆT: Nếu có thông tin sản phẩm cụ thể (productContext), người dùng đang hỏi về sản phẩm đó, KHÔNG phải sản phẩm khác

2. Trả lời câu hỏi về y tế một cách chính xác, chuyên nghiệp và dễ hiểu:
   - Nếu có thông tin sản phẩm cụ thể, BẮT BUỘC phải trả lời về sản phẩm đó
   - Sử dụng kiến thức từ database để đưa ra thông tin chính xác
   - Nếu có thông tin về bệnh trong database, hãy tham khảo và trả lời dựa trên đó
   - Nếu có bài viết liên quan, hãy tham khảo nội dung để trả lời

3. Khi người dùng mô tả triệu chứng:
   - Phân tích triệu chứng để hiểu vấn đề
   - Sử dụng thông tin từ database về bệnh để giải thích
   - Gợi ý sản phẩm PHÙ HỢP với vấn đề đó
   - KHÔNG BAO GIỜ trả lời sai chủ đề

4. Luôn nhắc nhở tham khảo ý kiến bác sĩ cho vấn đề nghiêm trọng

5. Trả lời bằng tiếng Việt, thân thiện, dễ hiểu

VÍ DỤ KHI CÓ PRODUCT CONTEXT:
- Người dùng hỏi: "sản phẩm này bao nhiêu tiền?" 
  -> Bạn PHẢI trả lời: "Sản phẩm [TÊN SẢN PHẨM] có giá [GIÁ] / [ĐƠN VỊ]"
  
- Người dùng hỏi: "công dụng của sản phẩm này?" 
  -> Bạn PHẢI trả lời dựa trên thông tin "Công dụng" của sản phẩm đó
  
- Người dùng hỏi: "thành phần của sản phẩm?" 
  -> Bạn PHẢI trả lời dựa trên thông tin "Thành phần" của sản phẩm đó

VÍ DỤ KHI KHÔNG CÓ PRODUCT CONTEXT:
- Người dùng: "Tôi hay đi tiểu tiện nhiều lần" 
  -> Bạn phân tích: Đây là triệu chứng liên quan đến đường tiết niệu, có thể do nhiều nguyên nhân. Sử dụng thông tin từ database về bệnh liên quan để giải thích.
  
- Người dùng: "Tôi đau lưng, gợi ý sản phẩm" 
  -> Bạn: "Tôi hiểu bạn đang gặp vấn đề về đau lưng. Đau lưng có thể do nhiều nguyên nhân... Tôi sẽ gợi ý sản phẩm hỗ trợ xương khớp và giảm đau lưng..."

Hãy phân tích câu hỏi sau và trả lời PHÙ HỢP với vấn đề người dùng đang gặp, sử dụng kiến thức từ database:`;
      
      // Thêm knowledge context vào prompt
      if (knowledgeContext) {
        context += knowledgeContext;
      }
      
      // Thêm thông tin về condition đã detect để AI hiểu rõ hơn
      if (detectedCondition) {
        context += `\n\nLƯU Ý: Từ câu hỏi của người dùng, tôi đã phát hiện họ đang gặp vấn đề về: "${detectedCondition}". Hãy trả lời về vấn đề này, KHÔNG phải vấn đề khác.`;
      }
      
      const text = await callGemini(message, context);
      
      // Tìm kiếm sản phẩm với keywords đã extract
      let products = null;
      
      // Luôn tìm sản phẩm nếu có từ khóa y tế hoặc yêu cầu gợi ý
      if (productKeywords || detectedCondition || lowerMessage.includes('gợi ý') || lowerMessage.includes('đề xuất') || lowerMessage.includes('sản phẩm')) {
        const searchTerm = productKeywords || detectedCondition;
        if (searchTerm) {
          console.log('🔍 Searching products with keyword:', searchTerm);
          products = await searchProducts(searchTerm, 5);
          console.log('✅ Found products:', products?.length || 0);
        }
      }

      return {
        text,
        products
      };
    } else {
      // Fallback: Simple keyword matching và rule-based response
      return await processMessageFallback(message);
    }
  } catch (error) {
    console.error('Error processing message with AI:', error);
    // Fallback nếu API lỗi
    return await processMessageFallback(message);
  }
}

/**
 * Extract keywords từ message để tìm sản phẩm (cải thiện với medical knowledge)
 */
function extractProductKeywords(message) {
  const lowerMessage = message.toLowerCase();
  
  // Medical condition mapping chi tiết hơn
  const medicalConditionMap = {
    // Đau đầu / Não / Thần kinh
    'đau đầu': 'thần kinh não',
    'nhức đầu': 'thần kinh não',
    'migraine': 'thần kinh não',
    'não': 'thần kinh não',
    'thần kinh': 'thần kinh não',
    'trí nhớ': 'thần kinh não',
    'memory': 'thần kinh não',
    
    // Ho / Hô hấp
    'ho': 'thuốc ho',
    'cough': 'thuốc ho',
    'long đờm': 'thuốc ho',
    'giảm ho': 'thuốc ho',
    'siro ho': 'thuốc ho',
    'hô hấp': 'hô hấp',
    
    // Đau lưng / Xương khớp
    'đau lưng': 'xương khớp',
    'đau xương': 'xương khớp',
    'đau khớp': 'xương khớp',
    'viêm khớp': 'xương khớp',
    'thoái hóa': 'xương khớp',
    'xương khớp': 'xương khớp',
    'back pain': 'xương khớp',
    'joint pain': 'xương khớp',
    
    // Vitamin / Khoáng chất
    'vitamin': 'vitamin',
    'khoáng chất': 'vitamin',
    'bổ sung': 'vitamin',
    'calcium': 'calcium canxi',
    'canxi': 'calcium canxi',
    'xương': 'calcium canxi',
    
    // Tim mạch
    'tim mạch': 'tim mạch',
    'tim': 'tim mạch',
    'huyết áp': 'huyết áp',
    'cardiovascular': 'tim mạch',
    'heart': 'tim mạch',
    
    // Tiêu hóa
    'tiêu hóa': 'tiêu hóa',
    'dạ dày': 'tiêu hóa',
    'đau dạ dày': 'tiêu hóa',
    'đường ruột': 'tiêu hóa',
    'stomach': 'tiêu hóa',
    'digestion': 'tiêu hóa',
    
    // Da / Mụn
    'da': 'dưỡng da',
    'kem': 'dưỡng da',
    'dưỡng da': 'dưỡng da',
    'mụn': 'trị mụn',
    'acne': 'trị mụn',
    'trị mụn': 'trị mụn',
    'skin': 'dưỡng da',
    
    // Mắt
    'mắt': 'mắt',
    'eye': 'mắt',
    'cận thị': 'mắt',
    
    // Giảm đau
    'giảm đau': 'giảm đau',
    'pain relief': 'giảm đau',
    'đau': 'giảm đau',
    
    // Mất ngủ
    'mất ngủ': 'mất ngủ',
    'insomnia': 'mất ngủ',
    'ngủ': 'mất ngủ',
    
    // Tiểu đường
    'tiểu đường': 'tiểu đường',
    'diabetes': 'tiểu đường',
    'đường huyết': 'tiểu đường',
    
    // Gan
    'gan': 'gan',
    'liver': 'gan',
    'giải độc gan': 'gan',
  };
  
  // Tìm medical condition trong message (ưu tiên match dài hơn trước)
  const sortedConditions = Object.keys(medicalConditionMap).sort((a, b) => b.length - a.length);
  
  for (const condition of sortedConditions) {
    if (lowerMessage.includes(condition)) {
      return medicalConditionMap[condition];
    }
  }
  
  // Nếu không tìm thấy condition mapping, tìm các từ khóa y tế phổ biến
  const medicalKeywords = [
    'đau lưng', 'đau đầu', 'đau xương', 'đau khớp', 'đau dạ dày',
    'ho', 'cough', 'vitamin', 'calcium', 'canxi',
    'tim', 'mạch', 'huyết áp', 'da', 'mụn', 'mắt',
    'não', 'thần kinh', 'trí nhớ', 'tiêu hóa', 'gan'
  ];
  
  const foundKeywords = medicalKeywords.filter(keyword => lowerMessage.includes(keyword));
  
  if (foundKeywords.length > 0) {
    // Tìm từ khóa dài nhất (ưu tiên cụ thể hơn)
    const longestKeyword = foundKeywords.reduce((a, b) => a.length > b.length ? a : b);
    
    // Map lại với condition map nếu có
    for (const condition of sortedConditions) {
      if (longestKeyword.includes(condition)) {
        return medicalConditionMap[condition];
      }
    }
    
    return longestKeyword;
  }
  
  // Nếu có yêu cầu gợi ý sản phẩm nhưng không có từ khóa y tế rõ ràng
  const productIndicators = [
    'thuốc', 'sản phẩm', 'mua', 'cần', 'tìm', 'gợi ý', 'đề xuất',
    'vitamin', 'thực phẩm chức năng', 'kem', 'dầu', 'siro', 'viên'
  ];
  
  const hasProductIntent = productIndicators.some(indicator => 
    lowerMessage.includes(indicator)
  );
  
  if (hasProductIntent || lowerMessage.includes('gợi ý') || lowerMessage.includes('đề xuất')) {
    // Extract keywords từ message
    const stopWords = ['tôi', 'bạn', 'của', 'và', 'cho', 'với', 'là', 'một', 'các', 'để', 'có', 'đang', 'bị', 'cần', 'một', 'loại', 'thuốc', 'liên', 'quan', 'đến', 'hãy', 'gợi', 'ý', 'cho', 'sản', 'phẩm', 'nào', 'có', 'thể', 'trị', 'không'];
    
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\d+/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
    
    // Lấy các từ khóa quan trọng (không phải stop words)
    const importantWords = words.filter(w => 
      !['có', 'thể', 'nào', 'trị', 'không', 'được', 'giúp', 'hỗ', 'trợ'].includes(w)
    );
    
    return importantWords.slice(0, 3).join(' ');
  }
  
  return null;
}

/**
 * Fallback: Xử lý message không có AI API
 */
async function processMessageFallback(message) {
  const lowerMessage = message.toLowerCase();
  let response = '';
  let products = null;

  // Kiểm tra nếu cần tìm sản phẩm
  const productKeywords = extractProductKeywords(message);
  if (productKeywords) {
    products = await searchProducts(productKeywords, 5);
  }

  // Rule-based responses
  if (lowerMessage.includes('chào') || lowerMessage.includes('hello')) {
    response = 'Xin chào! Tôi là MeCa, trợ lý y tế của MediCare. Tôi có thể giúp gì cho bạn?';
  } else if (lowerMessage.includes('ho') || lowerMessage.includes('cough')) {
    response = 'Tôi có thể giúp bạn tìm sản phẩm hỗ trợ giảm ho. Bạn có thể thử tìm "thuốc ho" hoặc "siro ho" trong cửa hàng.';
    if (!products) {
      products = await searchProducts('thuốc ho', 5);
    }
  } else if (lowerMessage.includes('vitamin') || lowerMessage.includes('vitamin')) {
    response = 'Tôi có thể giúp bạn tìm các sản phẩm vitamin và khoáng chất. Bạn cần loại vitamin nào cụ thể không?';
    if (!products) {
      products = await searchProducts('vitamin', 5);
    }
  } else if (lowerMessage.includes('đau đầu') || lowerMessage.includes('nhức đầu') || (lowerMessage.includes('não') && lowerMessage.includes('thuốc'))) {
    response = 'Đau đầu có thể do nhiều nguyên nhân như căng thẳng, thiếu ngủ, hoặc vấn đề về thần kinh. Tôi có thể gợi ý một số sản phẩm hỗ trợ giảm đau đầu và tăng cường sức khỏe thần kinh. Tuy nhiên, nếu đau đầu kéo dài hoặc nghiêm trọng, bạn nên tham khảo ý kiến bác sĩ.';
    if (!products) {
      products = await searchProducts('thần kinh não', 5);
    }
  } else if (lowerMessage.includes('đau lưng') || lowerMessage.includes('back pain')) {
    response = 'Đau lưng có thể do nhiều nguyên nhân như căng cơ, thoái hóa cột sống, hoặc vấn đề về xương khớp. Tôi có thể gợi ý một số sản phẩm hỗ trợ xương khớp và giảm đau lưng. Tuy nhiên, nếu đau lưng kéo dài hoặc nghiêm trọng, bạn nên tham khảo ý kiến bác sĩ.';
    if (!products) {
      products = await searchProducts('xương khớp', 5);
    }
  } else if (lowerMessage.includes('sản phẩm') || lowerMessage.includes('mua')) {
    response = 'Tôi có thể giúp bạn tìm sản phẩm phù hợp. Bạn đang tìm loại sản phẩm nào?';
  } else {
    response = 'Cảm ơn bạn đã liên hệ! Để tôi có thể hỗ trợ tốt hơn, bạn có thể:\n\n' +
              '1. Mô tả vấn đề sức khỏe bạn đang gặp\n' +
              '2. Hỏi về sản phẩm cụ thể\n' +
              '3. Yêu cầu gợi ý sản phẩm\n\n' +
              'Lưu ý: Tôi chỉ cung cấp thông tin tham khảo. Với các vấn đề nghiêm trọng, vui lòng tham khảo ý kiến bác sĩ.';
  }

  return {
    text: response,
    products
  };
}

// Initialize knowledge base on startup
loadKnowledgeBase().catch(err => {
  console.error('⚠️ Failed to load knowledge base on startup:', err);
});

module.exports = {
  processMessageWithAI,
  searchProducts,
  loadKnowledgeBase
};

