const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'MediCare_database';

async function seedAddressData() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  // Data mẫu cho Tỉnh/Thành phố
  const provinces = [
    { _id: 'P01', code: '01', name: 'Hà Nội' },
    { _id: 'P02', code: '79', name: 'Hồ Chí Minh' },
    { _id: 'P03', code: '48', name: 'Đà Nẵng' },
    { _id: 'P04', code: '92', name: 'Cần Thơ' },
    { _id: 'P05', code: '31', name: 'Hải Phòng' },
    { _id: 'P06', code: '74', name: 'Bình Dương' },
    { _id: 'P07', code: '75', name: 'Đồng Nai' },
    { _id: 'P08', code: '56', name: 'Khánh Hòa' }
  ];

  // Data mẫu cho Quận/Huyện (Hồ Chí Minh)
  const districts = [
    { _id: 'D001', code: '760', name: 'Quận 1', provinceId: 'P02' },
    { _id: 'D002', code: '761', name: 'Quận 2', provinceId: 'P02' },
    { _id: 'D003', code: '762', name: 'Quận 3', provinceId: 'P02' },
    { _id: 'D004', code: '763', name: 'Quận 4', provinceId: 'P02' },
    { _id: 'D005', code: '764', name: 'Quận 5', provinceId: 'P02' },
    { _id: 'D006', code: '765', name: 'Quận 6', provinceId: 'P02' },
    { _id: 'D007', code: '766', name: 'Quận 7', provinceId: 'P02' },
    { _id: 'D008', code: '767', name: 'Quận 8', provinceId: 'P02' },
    { _id: 'D009', code: '768', name: 'Quận 9', provinceId: 'P02' },
    { _id: 'D010', code: '769', name: 'Quận 10', provinceId: 'P02' },
    { _id: 'D011', code: '770', name: 'Quận 11', provinceId: 'P02' },
    { _id: 'D012', code: '771', name: 'Quận 12', provinceId: 'P02' },
    { _id: 'D013', code: '772', name: 'Quận Bình Thạnh', provinceId: 'P02' },
    { _id: 'D014', code: '773', name: 'Quận Gò Vấp', provinceId: 'P02' },
    { _id: 'D015', code: '774', name: 'Quận Phú Nhuận', provinceId: 'P02' },
    { _id: 'D016', code: '775', name: 'Quận Tân Bình', provinceId: 'P02' },
    { _id: 'D017', code: '776', name: 'Quận Tân Phú', provinceId: 'P02' },
    { _id: 'D018', code: '777', name: 'Thành phố Thủ Đức', provinceId: 'P02' },
    // Hà Nội
    { _id: 'D101', code: '001', name: 'Quận Ba Đình', provinceId: 'P01' },
    { _id: 'D102', code: '002', name: 'Quận Hoàn Kiếm', provinceId: 'P01' },
    { _id: 'D103', code: '003', name: 'Quận Tây Hồ', provinceId: 'P01' },
    { _id: 'D104', code: '004', name: 'Quận Long Biên', provinceId: 'P01' },
    { _id: 'D105', code: '005', name: 'Quận Cầu Giấy', provinceId: 'P01' },
    // Đà Nẵng
    { _id: 'D201', code: '490', name: 'Quận Hải Châu', provinceId: 'P03' },
    { _id: 'D202', code: '491', name: 'Quận Thanh Khê', provinceId: 'P03' },
    { _id: 'D203', code: '492', name: 'Quận Sơn Trà', provinceId: 'P03' },
    { _id: 'D204', code: '493', name: 'Quận Ngũ Hành Sơn', provinceId: 'P03' },
    { _id: 'D205', code: '494', name: 'Quận Liên Chiểu', provinceId: 'P03' }
  ];

  // Data mẫu cho Phường/Xã (Quận 1, HCM)
  const wards = [
    { _id: 'W0001', code: '26734', name: 'Phường Bến Nghé', districtId: 'D001' },
    { _id: 'W0002', code: '26737', name: 'Phường Bến Thành', districtId: 'D001' },
    { _id: 'W0003', code: '26740', name: 'Phường Nguyễn Thái Bình', districtId: 'D001' },
    { _id: 'W0004', code: '26743', name: 'Phường Phạm Ngũ Lão', districtId: 'D001' },
    { _id: 'W0005', code: '26746', name: 'Phường Cầu Ông Lãnh', districtId: 'D001' },
    { _id: 'W0006', code: '26749', name: 'Phường Cô Giang', districtId: 'D001' },
    { _id: 'W0007', code: '26752', name: 'Phường Nguyễn Cư Trinh', districtId: 'D001' },
    { _id: 'W0008', code: '26755', name: 'Phường Cầu Kho', districtId: 'D001' },
    { _id: 'W0009', code: '26758', name: 'Phường Đa Kao', districtId: 'D001' },
    { _id: 'W0010', code: '26761', name: 'Phường Tân Định', districtId: 'D001' },
    // Quận 2
    { _id: 'W0101', code: '26764', name: 'Phường Thảo Điền', districtId: 'D002' },
    { _id: 'W0102', code: '26767', name: 'Phường An Phú', districtId: 'D002' },
    { _id: 'W0103', code: '26770', name: 'Phường Bình An', districtId: 'D002' },
    { _id: 'W0104', code: '26773', name: 'Phường Bình Trưng Đông', districtId: 'D002' },
    { _id: 'W0105', code: '26776', name: 'Phường Bình Trưng Tây', districtId: 'D002' },
    // Quận 3
    { _id: 'W0201', code: '26779', name: 'Phường 01', districtId: 'D003' },
    { _id: 'W0202', code: '26782', name: 'Phường 02', districtId: 'D003' },
    { _id: 'W0203', code: '26785', name: 'Phường 03', districtId: 'D003' },
    { _id: 'W0204', code: '26788', name: 'Phường 04', districtId: 'D003' },
    { _id: 'W0205', code: '26791', name: 'Phường 05', districtId: 'D003' }
  ];

  try {
    // Xóa dữ liệu cũ
    await db.collection('provinces').deleteMany({});
    await db.collection('districts').deleteMany({});
    await db.collection('wards').deleteMany({});

    // Insert dữ liệu mới
    await db.collection('provinces').insertMany(provinces);
    await db.collection('districts').insertMany(districts);
    await db.collection('wards').insertMany(wards);

    console.log('✅ Seeded address data successfully!');
    console.log(`   - ${provinces.length} provinces`);
    console.log(`   - ${districts.length} districts`);
    console.log(`   - ${wards.length} wards`);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seedAddressData();

