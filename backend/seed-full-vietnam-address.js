const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'MediCare_database';

async function seedFullVietnamAddress() {
  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(DB_NAME);

  // ==================== 63 TỈNH THÀNH VIỆT NAM ====================
  const provinces = [
    // Thành phố trực thuộc Trung ương
    { _id: 'P01', code: '01', name: 'Thành phố Hà Nội', type: 'Thành phố Trung ương' },
    { _id: 'P79', code: '79', name: 'Thành phố Hồ Chí Minh', type: 'Thành phố Trung ương' },
    { _id: 'P48', code: '48', name: 'Thành phố Đà Nẵng', type: 'Thành phố Trung ương' },
    { _id: 'P31', code: '31', name: 'Thành phố Hải Phòng', type: 'Thành phố Trung ương' },
    { _id: 'P92', code: '92', name: 'Thành phố Cần Thơ', type: 'Thành phố Trung ương' },
    
    // Miền Bắc
    { _id: 'P02', code: '02', name: 'Tỉnh Hà Giang', type: 'Tỉnh' },
    { _id: 'P04', code: '04', name: 'Tỉnh Cao Bằng', type: 'Tỉnh' },
    { _id: 'P06', code: '06', name: 'Tỉnh Bắc Kạn', type: 'Tỉnh' },
    { _id: 'P08', code: '08', name: 'Tỉnh Tuyên Quang', type: 'Tỉnh' },
    { _id: 'P10', code: '10', name: 'Tỉnh Lào Cai', type: 'Tỉnh' },
    { _id: 'P11', code: '11', name: 'Tỉnh Điện Biên', type: 'Tỉnh' },
    { _id: 'P12', code: '12', name: 'Tỉnh Lai Châu', type: 'Tỉnh' },
    { _id: 'P14', code: '14', name: 'Tỉnh Sơn La', type: 'Tỉnh' },
    { _id: 'P15', code: '15', name: 'Tỉnh Yên Bái', type: 'Tỉnh' },
    { _id: 'P17', code: '17', name: 'Tỉnh Hòa Bình', type: 'Tỉnh' },
    { _id: 'P19', code: '19', name: 'Tỉnh Thái Nguyên', type: 'Tỉnh' },
    { _id: 'P20', code: '20', name: 'Tỉnh Lạng Sơn', type: 'Tỉnh' },
    { _id: 'P22', code: '22', name: 'Tỉnh Quảng Ninh', type: 'Tỉnh' },
    { _id: 'P24', code: '24', name: 'Tỉnh Bắc Giang', type: 'Tỉnh' },
    { _id: 'P25', code: '25', name: 'Tỉnh Phú Thọ', type: 'Tỉnh' },
    { _id: 'P26', code: '26', name: 'Tỉnh Vĩnh Phúc', type: 'Tỉnh' },
    { _id: 'P27', code: '27', name: 'Tỉnh Bắc Ninh', type: 'Tỉnh' },
    { _id: 'P30', code: '30', name: 'Tỉnh Hải Dương', type: 'Tỉnh' },
    { _id: 'P33', code: '33', name: 'Tỉnh Hưng Yên', type: 'Tỉnh' },
    { _id: 'P34', code: '34', name: 'Tỉnh Thái Bình', type: 'Tỉnh' },
    { _id: 'P35', code: '35', name: 'Tỉnh Hà Nam', type: 'Tỉnh' },
    { _id: 'P36', code: '36', name: 'Tỉnh Nam Định', type: 'Tỉnh' },
    { _id: 'P37', code: '37', name: 'Tỉnh Ninh Bình', type: 'Tỉnh' },
    
    // Bắc Trung Bộ
    { _id: 'P38', code: '38', name: 'Tỉnh Thanh Hóa', type: 'Tỉnh' },
    { _id: 'P40', code: '40', name: 'Tỉnh Nghệ An', type: 'Tỉnh' },
    { _id: 'P42', code: '42', name: 'Tỉnh Hà Tĩnh', type: 'Tỉnh' },
    { _id: 'P44', code: '44', name: 'Tỉnh Quảng Bình', type: 'Tỉnh' },
    { _id: 'P45', code: '45', name: 'Tỉnh Quảng Trị', type: 'Tỉnh' },
    { _id: 'P46', code: '46', name: 'Tỉnh Thừa Thiên Huế', type: 'Tỉnh' },
    
    // Nam Trung Bộ
    { _id: 'P49', code: '49', name: 'Tỉnh Quảng Nam', type: 'Tỉnh' },
    { _id: 'P51', code: '51', name: 'Tỉnh Quảng Ngãi', type: 'Tỉnh' },
    { _id: 'P52', code: '52', name: 'Tỉnh Bình Định', type: 'Tỉnh' },
    { _id: 'P54', code: '54', name: 'Tỉnh Phú Yên', type: 'Tỉnh' },
    { _id: 'P56', code: '56', name: 'Tỉnh Khánh Hòa', type: 'Tỉnh' },
    { _id: 'P58', code: '58', name: 'Tỉnh Ninh Thuận', type: 'Tỉnh' },
    { _id: 'P60', code: '60', name: 'Tỉnh Bình Thuận', type: 'Tỉnh' },
    
    // Tây Nguyên
    { _id: 'P62', code: '62', name: 'Tỉnh Kon Tum', type: 'Tỉnh' },
    { _id: 'P64', code: '64', name: 'Tỉnh Gia Lai', type: 'Tỉnh' },
    { _id: 'P66', code: '66', name: 'Tỉnh Đắk Lắk', type: 'Tỉnh' },
    { _id: 'P67', code: '67', name: 'Tỉnh Đắk Nông', type: 'Tỉnh' },
    { _id: 'P68', code: '68', name: 'Tỉnh Lâm Đồng', type: 'Tỉnh' },
    
    // Đông Nam Bộ
    { _id: 'P70', code: '70', name: 'Tỉnh Bình Phước', type: 'Tỉnh' },
    { _id: 'P72', code: '72', name: 'Tỉnh Tây Ninh', type: 'Tỉnh' },
    { _id: 'P74', code: '74', name: 'Tỉnh Bình Dương', type: 'Tỉnh' },
    { _id: 'P75', code: '75', name: 'Tỉnh Đồng Nai', type: 'Tỉnh' },
    { _id: 'P77', code: '77', name: 'Tỉnh Bà Rịa - Vũng Tàu', type: 'Tỉnh' },
    
    // Đồng bằng sông Cửu Long
    { _id: 'P80', code: '80', name: 'Tỉnh Long An', type: 'Tỉnh' },
    { _id: 'P82', code: '82', name: 'Tỉnh Tiền Giang', type: 'Tỉnh' },
    { _id: 'P83', code: '83', name: 'Tỉnh Bến Tre', type: 'Tỉnh' },
    { _id: 'P84', code: '84', name: 'Tỉnh Trà Vinh', type: 'Tỉnh' },
    { _id: 'P86', code: '86', name: 'Tỉnh Vĩnh Long', type: 'Tỉnh' },
    { _id: 'P87', code: '87', name: 'Tỉnh Đồng Tháp', type: 'Tỉnh' },
    { _id: 'P89', code: '89', name: 'Tỉnh An Giang', type: 'Tỉnh' },
    { _id: 'P91', code: '91', name: 'Tỉnh Kiên Giang', type: 'Tỉnh' },
    { _id: 'P93', code: '93', name: 'Tỉnh Hậu Giang', type: 'Tỉnh' },
    { _id: 'P94', code: '94', name: 'Tỉnh Sóc Trăng', type: 'Tỉnh' },
    { _id: 'P95', code: '95', name: 'Tỉnh Bạc Liêu', type: 'Tỉnh' },
    { _id: 'P96', code: '96', name: 'Tỉnh Cà Mau', type: 'Tỉnh' }
  ];

  // ==================== QUẬN/HUYỆN MẪU ====================
  const districts = [
    // Hà Nội (30 quận/huyện)
    { _id: 'D0101', code: '001', name: 'Quận Ba Đình', provinceId: 'P01' },
    { _id: 'D0102', code: '002', name: 'Quận Hoàn Kiếm', provinceId: 'P01' },
    { _id: 'D0103', code: '003', name: 'Quận Tây Hồ', provinceId: 'P01' },
    { _id: 'D0104', code: '004', name: 'Quận Long Biên', provinceId: 'P01' },
    { _id: 'D0105', code: '005', name: 'Quận Cầu Giấy', provinceId: 'P01' },
    { _id: 'D0106', code: '006', name: 'Quận Đống Đa', provinceId: 'P01' },
    { _id: 'D0107', code: '007', name: 'Quận Hai Bà Trưng', provinceId: 'P01' },
    { _id: 'D0108', code: '008', name: 'Quận Hoàng Mai', provinceId: 'P01' },
    { _id: 'D0109', code: '009', name: 'Quận Thanh Xuân', provinceId: 'P01' },
    { _id: 'D0110', code: '016', name: 'Huyện Sóc Sơn', provinceId: 'P01' },
    { _id: 'D0111', code: '017', name: 'Huyện Đông Anh', provinceId: 'P01' },
    { _id: 'D0112', code: '018', name: 'Huyện Gia Lâm', provinceId: 'P01' },
    { _id: 'D0113', code: '019', name: 'Quận Nam Từ Liêm', provinceId: 'P01' },
    { _id: 'D0114', code: '020', name: 'Huyện Thanh Trì', provinceId: 'P01' },
    { _id: 'D0115', code: '021', name: 'Quận Bắc Từ Liêm', provinceId: 'P01' },
    { _id: 'D0116', code: '250', name: 'Huyện Mê Linh', provinceId: 'P01' },
    { _id: 'D0117', code: '268', name: 'Quận Hà Đông', provinceId: 'P01' },
    { _id: 'D0118', code: '269', name: 'Thị xã Sơn Tây', provinceId: 'P01' },
    { _id: 'D0119', code: '271', name: 'Huyện Ba Vì', provinceId: 'P01' },
    { _id: 'D0120', code: '272', name: 'Huyện Phúc Thọ', provinceId: 'P01' },
    { _id: 'D0121', code: '273', name: 'Huyện Đan Phượng', provinceId: 'P01' },
    { _id: 'D0122', code: '274', name: 'Huyện Hoài Đức', provinceId: 'P01' },
    { _id: 'D0123', code: '275', name: 'Huyện Quốc Oai', provinceId: 'P01' },
    { _id: 'D0124', code: '276', name: 'Huyện Thạch Thất', provinceId: 'P01' },
    { _id: 'D0125', code: '277', name: 'Huyện Chương Mỹ', provinceId: 'P01' },
    { _id: 'D0126', code: '278', name: 'Huyện Thanh Oai', provinceId: 'P01' },
    { _id: 'D0127', code: '279', name: 'Huyện Thường Tín', provinceId: 'P01' },
    { _id: 'D0128', code: '280', name: 'Huyện Phú Xuyên', provinceId: 'P01' },
    { _id: 'D0129', code: '281', name: 'Huyện Ứng Hòa', provinceId: 'P01' },
    { _id: 'D0130', code: '282', name: 'Huyện Mỹ Đức', provinceId: 'P01' },

    // TP Hồ Chí Minh (22 quận/huyện)
    { _id: 'D7901', code: '760', name: 'Quận 1', provinceId: 'P79' },
    { _id: 'D7902', code: '761', name: 'Quận 12', provinceId: 'P79' },
    { _id: 'D7903', code: '762', name: 'Quận Thủ Đức', provinceId: 'P79' },
    { _id: 'D7904', code: '763', name: 'Quận 9', provinceId: 'P79' },
    { _id: 'D7905', code: '764', name: 'Quận Gò Vấp', provinceId: 'P79' },
    { _id: 'D7906', code: '765', name: 'Quận Bình Thạnh', provinceId: 'P79' },
    { _id: 'D7907', code: '766', name: 'Quận Tân Bình', provinceId: 'P79' },
    { _id: 'D7908', code: '767', name: 'Quận Tân Phú', provinceId: 'P79' },
    { _id: 'D7909', code: '768', name: 'Quận Phú Nhuận', provinceId: 'P79' },
    { _id: 'D7910', code: '769', name: 'Thành phố Thủ Đức', provinceId: 'P79' },
    { _id: 'D7911', code: '770', name: 'Quận 3', provinceId: 'P79' },
    { _id: 'D7912', code: '771', name: 'Quận 10', provinceId: 'P79' },
    { _id: 'D7913', code: '772', name: 'Quận 11', provinceId: 'P79' },
    { _id: 'D7914', code: '773', name: 'Quận 4', provinceId: 'P79' },
    { _id: 'D7915', code: '774', name: 'Quận 5', provinceId: 'P79' },
    { _id: 'D7916', code: '775', name: 'Quận 6', provinceId: 'P79' },
    { _id: 'D7917', code: '776', name: 'Quận 8', provinceId: 'P79' },
    { _id: 'D7918', code: '777', name: 'Quận Bình Tân', provinceId: 'P79' },
    { _id: 'D7919', code: '778', name: 'Quận 7', provinceId: 'P79' },
    { _id: 'D7920', code: '783', name: 'Huyện Củ Chi', provinceId: 'P79' },
    { _id: 'D7921', code: '784', name: 'Huyện Hóc Môn', provinceId: 'P79' },
    { _id: 'D7922', code: '785', name: 'Huyện Bình Chánh', provinceId: 'P79' },
    { _id: 'D7923', code: '786', name: 'Huyện Nhà Bè', provinceId: 'P79' },
    { _id: 'D7924', code: '787', name: 'Huyện Cần Giờ', provinceId: 'P79' },

    // Đà Nẵng (8 quận/huyện)
    { _id: 'D4801', code: '490', name: 'Quận Liên Chiểu', provinceId: 'P48' },
    { _id: 'D4802', code: '491', name: 'Quận Thanh Khê', provinceId: 'P48' },
    { _id: 'D4803', code: '492', name: 'Quận Hải Châu', provinceId: 'P48' },
    { _id: 'D4804', code: '493', name: 'Quận Sơn Trà', provinceId: 'P48' },
    { _id: 'D4805', code: '494', name: 'Quận Ngũ Hành Sơn', provinceId: 'P48' },
    { _id: 'D4806', code: '495', name: 'Quận Cẩm Lệ', provinceId: 'P48' },
    { _id: 'D4807', code: '497', name: 'Huyện Hòa Vang', provinceId: 'P48' },
    { _id: 'D4808', code: '498', name: 'Huyện Hoàng Sa', provinceId: 'P48' },

    // Hải Phòng (15 quận/huyện)
    { _id: 'D3101', code: '303', name: 'Quận Hồng Bàng', provinceId: 'P31' },
    { _id: 'D3102', code: '304', name: 'Quận Ngô Quyền', provinceId: 'P31' },
    { _id: 'D3103', code: '305', name: 'Quận Lê Chân', provinceId: 'P31' },
    { _id: 'D3104', code: '306', name: 'Quận Hải An', provinceId: 'P31' },
    { _id: 'D3105', code: '307', name: 'Quận Kiến An', provinceId: 'P31' },
    { _id: 'D3106', code: '308', name: 'Quận Đồ Sơn', provinceId: 'P31' },
    { _id: 'D3107', code: '309', name: 'Quận Dương Kinh', provinceId: 'P31' },
    { _id: 'D3108', code: '311', name: 'Huyện Thuỷ Nguyên', provinceId: 'P31' },
    { _id: 'D3109', code: '312', name: 'Huyện An Dương', provinceId: 'P31' },
    { _id: 'D3110', code: '313', name: 'Huyện An Lão', provinceId: 'P31' },
    { _id: 'D3111', code: '314', name: 'Huyện Kiến Thuỵ', provinceId: 'P31' },
    { _id: 'D3112', code: '315', name: 'Huyện Tiên Lãng', provinceId: 'P31' },
    { _id: 'D3113', code: '316', name: 'Huyện Vĩnh Bảo', provinceId: 'P31' },
    { _id: 'D3114', code: '317', name: 'Huyện Cát Hải', provinceId: 'P31' },
    { _id: 'D3115', code: '318', name: 'Huyện Bạch Long Vĩ', provinceId: 'P31' },

    // Cần Thơ (9 quận/huyện)
    { _id: 'D9201', code: '916', name: 'Quận Ninh Kiều', provinceId: 'P92' },
    { _id: 'D9202', code: '917', name: 'Quận Ô Môn', provinceId: 'P92' },
    { _id: 'D9203', code: '918', name: 'Quận Bình Thuỷ', provinceId: 'P92' },
    { _id: 'D9204', code: '919', name: 'Quận Cái Răng', provinceId: 'P92' },
    { _id: 'D9205', code: '923', name: 'Quận Thốt Nốt', provinceId: 'P92' },
    { _id: 'D9206', code: '924', name: 'Huyện Vĩnh Thạnh', provinceId: 'P92' },
    { _id: 'D9207', code: '925', name: 'Huyện Cờ Đỏ', provinceId: 'P92' },
    { _id: 'D9208', code: '926', name: 'Huyện Phong Điền', provinceId: 'P92' },
    { _id: 'D9209', code: '927', name: 'Huyện Thới Lai', provinceId: 'P92' }
  ];

  // ==================== PHƯỜNG/XÃ MẪU ====================
  const wards = [
    // Quận 1, TP HCM
    { _id: 'W790101', code: '26734', name: 'Phường Tân Định', districtId: 'D7901' },
    { _id: 'W790102', code: '26737', name: 'Phường Đa Kao', districtId: 'D7901' },
    { _id: 'W790103', code: '26740', name: 'Phường Bến Nghé', districtId: 'D7901' },
    { _id: 'W790104', code: '26743', name: 'Phường Bến Thành', districtId: 'D7901' },
    { _id: 'W790105', code: '26746', name: 'Phường Nguyễn Thái Bình', districtId: 'D7901' },
    { _id: 'W790106', code: '26749', name: 'Phường Phạm Ngũ Lão', districtId: 'D7901' },
    { _id: 'W790107', code: '26752', name: 'Phường Cầu Ông Lãnh', districtId: 'D7901' },
    { _id: 'W790108', code: '26755', name: 'Phường Cô Giang', districtId: 'D7901' },
    { _id: 'W790109', code: '26758', name: 'Phường Nguyễn Cư Trinh', districtId: 'D7901' },
    { _id: 'W790110', code: '26761', name: 'Phường Cầu Kho', districtId: 'D7901' },

    // Quận Ba Đình, Hà Nội
    { _id: 'W010101', code: '00001', name: 'Phường Phúc Xá', districtId: 'D0101' },
    { _id: 'W010102', code: '00004', name: 'Phường Trúc Bạch', districtId: 'D0101' },
    { _id: 'W010103', code: '00006', name: 'Phường Vĩnh Phúc', districtId: 'D0101' },
    { _id: 'W010104', code: '00007', name: 'Phường Cống Vị', districtId: 'D0101' },
    { _id: 'W010105', code: '00008', name: 'Phường Liễu Giai', districtId: 'D0101' },
    { _id: 'W010106', code: '00010', name: 'Phường Nguyễn Trung Trực', districtId: 'D0101' },
    { _id: 'W010107', code: '00013', name: 'Phường Quán Thánh', districtId: 'D0101' },
    { _id: 'W010108', code: '00016', name: 'Phường Ngọc Hà', districtId: 'D0101' },
    { _id: 'W010109', code: '00019', name: 'Phường Điện Biên', districtId: 'D0101' },
    { _id: 'W010110', code: '00022', name: 'Phường Đội Cấn', districtId: 'D0101' },

    // Quận Hoàn Kiếm, Hà Nội
    { _id: 'W010201', code: '00025', name: 'Phường Phúc Tân', districtId: 'D0102' },
    { _id: 'W010202', code: '00028', name: 'Phường Đồng Xuân', districtId: 'D0102' },
    { _id: 'W010203', code: '00031', name: 'Phường Hàng Mã', districtId: 'D0102' },
    { _id: 'W010204', code: '00034', name: 'Phường Hàng Buồm', districtId: 'D0102' },
    { _id: 'W010205', code: '00037', name: 'Phường Hàng Đào', districtId: 'D0102' },
    { _id: 'W010206', code: '00040', name: 'Phường Hàng Bồ', districtId: 'D0102' },
    { _id: 'W010207', code: '00043', name: 'Phường Cửa Đông', districtId: 'D0102' },
    { _id: 'W010208', code: '00046', name: 'Phường Lý Thái Tổ', districtId: 'D0102' },
    { _id: 'W010209', code: '00049', name: 'Phường Hàng Bạc', districtId: 'D0102' },
    { _id: 'W010210', code: '00052', name: 'Phường Hàng Gai', districtId: 'D0102' },

    // Quận Hải Châu, Đà Nẵng
    { _id: 'W480301', code: '20194', name: 'Phường Thạch Thang', districtId: 'D4803' },
    { _id: 'W480302', code: '20195', name: 'Phường Hải Châu I', districtId: 'D4803' },
    { _id: 'W480303', code: '20197', name: 'Phường Hải Châu II', districtId: 'D4803' },
    { _id: 'W480304', code: '20198', name: 'Phường Phước Ninh', districtId: 'D4803' },
    { _id: 'W480305', code: '20200', name: 'Phường Hòa Thuận Tây', districtId: 'D4803' },
    { _id: 'W480306', code: '20201', name: 'Phường Hòa Thuận Đông', districtId: 'D4803' },
    { _id: 'W480307', code: '20203', name: 'Phường Nam Dương', districtId: 'D4803' },
    { _id: 'W480308', code: '20204', name: 'Phường Bình Hiên', districtId: 'D4803' },
    { _id: 'W480309', code: '20206', name: 'Phường Bình Thuận', districtId: 'D4803' },
    { _id: 'W480310', code: '20207', name: 'Phường Hòa Cường Bắc', districtId: 'D4803' }
  ];

  try {
    console.log('🚀 Bắt đầu seed dữ liệu địa chỉ Việt Nam đầy đủ...\n');

    // Xóa dữ liệu cũ
    await db.collection('provinces').deleteMany({});
    await db.collection('districts').deleteMany({});
    await db.collection('wards').deleteMany({});
    console.log('✅ Đã xóa dữ liệu cũ');

    // Insert dữ liệu mới
    await db.collection('provinces').insertMany(provinces);
    console.log(`✅ Đã thêm ${provinces.length} tỉnh/thành phố`);

    await db.collection('districts').insertMany(districts);
    console.log(`✅ Đã thêm ${districts.length} quận/huyện`);

    await db.collection('wards').insertMany(wards);
    console.log(`✅ Đã thêm ${wards.length} phường/xã`);

    console.log('\n🎉 Seed dữ liệu thành công!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Tổng cộng:`);
    console.log(`   - ${provinces.length} tỉnh/thành phố (đầy đủ 63 tỉnh thành VN)`);
    console.log(`   - ${districts.length} quận/huyện (5 thành phố lớn)`);
    console.log(`   - ${wards.length} phường/xã (mẫu)`);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
  } finally {
    await client.close();
  }
}

seedFullVietnamAddress();

