const { MongoClient } = require('mongodb');
const fs = require('fs');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'MediCare_database';

async function seedDVHCVN() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  console.log('🚀 Bắt đầu seed dữ liệu từ DVHCVN (Tổng cục thống kê)...\n');

  try {
    // Đọc file JSON từ GitHub
    const rawData = fs.readFileSync('dvhcvn.json', 'utf8');
    const jsonData = JSON.parse(rawData);
    const dvhcvnData = jsonData.data; // Lấy array data từ object

    console.log(`📥 Đã load ${dvhcvnData.length} tỉnh/thành phố từ file`);
    console.log(`📅 Dữ liệu ngày: ${jsonData.data_date}`);
    console.log(`📊 Thống kê: ${jsonData.stats.level1s} tỉnh, ${jsonData.stats.level2s} quận/huyện, ${jsonData.stats.level3s} phường/xã\n`);

    const provinces = [];
    const districts = [];
    const wards = [];

    // Parse dữ liệu
    dvhcvnData.forEach((province, pIdx) => {
      const provinceId = `P${province.level1_id}`;
      
      // Thêm tỉnh/thành phố
      provinces.push({
        _id: provinceId,
        code: province.level1_id,
        name: province.name,
        type: province.type
      });

      // Parse quận/huyện
      if (province.level2s && Array.isArray(province.level2s)) {
        province.level2s.forEach((district, dIdx) => {
          const districtId = `D${province.level1_id}${district.level2_id}`;
          
          districts.push({
            _id: districtId,
            code: district.level2_id,
            name: district.name,
            type: district.type,
            provinceId: provinceId
          });

          // Parse phường/xã
          if (district.level3s && Array.isArray(district.level3s)) {
            district.level3s.forEach((ward, wIdx) => {
              const wardId = `W${province.level1_id}${district.level2_id}${ward.level3_id}`;
              
              wards.push({
                _id: wardId,
                code: ward.level3_id,
                name: ward.name,
                type: ward.type,
                districtId: districtId
              });
            });
          }
        });
      }
    });

    console.log(`✅ Đã parse thành công:`);
    console.log(`   - ${provinces.length} tỉnh/thành phố`);
    console.log(`   - ${districts.length} quận/huyện`);
    console.log(`   - ${wards.length} phường/xã\n`);

    // Xóa dữ liệu cũ
    console.log('🗑️  Đang xóa dữ liệu cũ...');
    await db.collection('provinces').deleteMany({});
    await db.collection('districts').deleteMany({});
    await db.collection('wards').deleteMany({});
    console.log('✅ Đã xóa dữ liệu cũ\n');

    // Insert dữ liệu mới
    console.log('💾 Đang lưu dữ liệu mới...');
    await db.collection('provinces').insertMany(provinces);
    console.log(`✅ Đã lưu ${provinces.length} tỉnh/thành phố`);

    await db.collection('districts').insertMany(districts);
    console.log(`✅ Đã lưu ${districts.length} quận/huyện`);

    await db.collection('wards').insertMany(wards);
    console.log(`✅ Đã lưu ${wards.length} phường/xã\n`);

    // Thống kê
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SEED DỮ LIỆU HOÀN TẤT!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Tổng cộng:`);
    console.log(`   ✓ ${provinces.length} tỉnh/thành phố`);
    console.log(`   ✓ ${districts.length} quận/huyện`);
    console.log(`   ✓ ${wards.length} phường/xã`);
    console.log('');
    console.log('📍 Nguồn: Tổng cục thống kê Việt Nam');
    console.log('   https://danhmuchanhchinh.gso.gov.vn');
    console.log('   https://github.com/daohoangson/dvhcvn');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Hiển thị một số ví dụ
    const sampleProvinces = [
      { id: 'P01', name: 'Hà Nội' },
      { id: 'P79', name: 'TP Hồ Chí Minh' },
      { id: 'P48', name: 'Đà Nẵng' }
    ];

    console.log('📋 Ví dụ chi tiết:');
    for (const sample of sampleProvinces) {
      const districtCount = districts.filter(d => d.provinceId === sample.id).length;
      const districtIds = districts.filter(d => d.provinceId === sample.id).map(d => d._id);
      const wardCount = wards.filter(w => districtIds.includes(w.districtId)).length;
      console.log(`   • ${sample.name}: ${districtCount} quận/huyện, ${wardCount} phường/xã`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    throw error;
  } finally {
    await client.close();
  }
}

seedDVHCVN();

