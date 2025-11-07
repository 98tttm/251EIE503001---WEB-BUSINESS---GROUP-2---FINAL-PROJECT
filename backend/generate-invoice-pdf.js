const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate invoice PDF based on order data
 * @param {Object} orderData - Order information
 * @param {string} outputPath - Path to save PDF
 * @returns {Promise} Promise that resolves when PDF is created
 */
function generateInvoicePDF(orderData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4',
        margin: 50,
        bufferPages: true
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Helper function to add Vietnamese text
      const addText = (text, x, y, options = {}) => {
        doc.font('Helvetica')
           .fontSize(options.size || 12)
           .text(text, x, y, options);
      };

      // HEADER
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', 50, 50, { align: 'center' });
      
      doc.font('Helvetica')
         .fontSize(10)
         .text('Độc lập - Tự do - Hạnh phúc', 50, 65, { align: 'center' });

      // Line separator
      doc.moveTo(250, 80)
         .lineTo(350, 80)
         .stroke();

      // Invoice number box (top right)
      const invoiceNumber = `HD${Date.now()}`;
      const invoiceDate = new Date().toLocaleDateString('vi-VN');
      doc.fontSize(9)
         .text(`Mẫu số: TB01/AC`, 400, 50, { width: 150 })
         .text(`(Ban hành kèm theo Thông tư số`, 400, 65, { width: 150 })
         .text(`26/2015/TT-BTC ngày 27/2/2015 của`, 400, 78, { width: 150 })
         .text(`Bộ Tài chính)`, 400, 91, { width: 150 });

      // TITLE
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .text('THÔNG BÁO PHÁT HÀNH HÓA ĐƠN (TB01/AC)', 50, 110, { align: 'center' });

      doc.font('Helvetica-Oblique')
         .fontSize(10)
         .text('(Dành cho tổ chức, cá nhân kinh doanh đặt in, tự in)', 50, 130, { align: 'center' });

      doc.font('Helvetica')
         .fontSize(10)
         .text(`[01] Ký tính thuế: Ngày ${invoiceDate}`, 50, 150);

      // Company information
      let yPosition = 180;
      doc.font('Helvetica-Bold')
         .fontSize(11)
         .text('1. Tên đơn vị phát hành: Công ty Cổ Phần MediCare', 50, yPosition);

      yPosition += 20;
      doc.font('Helvetica')
         .fontSize(10)
         .text('2. Mã số thuế: 0315275368', 50, yPosition);

      yPosition += 20;
      doc.text('3. Địa chỉ trụ sở: 379-381 Hai Bà Trưng, Phường 8 - Quận 3 - TP. Hồ Chí Minh', 50, yPosition);

      yPosition += 20;
      doc.text('4. Điện thoại: 1900 6035', 50, yPosition);

      yPosition += 20;
      doc.font('Helvetica-Bold')
         .text('5. Các loại hóa đơn phát hành:', 50, yPosition);

      // Table
      yPosition += 30;
      const tableTop = yPosition;
      const tableHeaders = ['STT', 'Tên sản phẩm', 'Số lượng', 'Đơn giá', 'Thành tiền'];
      const columnWidths = [40, 220, 60, 90, 90];
      let xPosition = 50;

      // Table header
      doc.font('Helvetica-Bold').fontSize(10);
      tableHeaders.forEach((header, i) => {
        doc.rect(xPosition, yPosition, columnWidths[i], 25).stroke();
        doc.text(header, xPosition + 5, yPosition + 8, {
          width: columnWidths[i] - 10,
          align: 'center'
        });
        xPosition += columnWidths[i];
      });

      yPosition += 25;

      // Table rows
      doc.font('Helvetica').fontSize(9);
      orderData.items.forEach((item, index) => {
        xPosition = 50;
        const rowHeight = 30;

        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        // STT
        doc.rect(xPosition, yPosition, columnWidths[0], rowHeight).stroke();
        doc.text(String(index + 1), xPosition + 5, yPosition + 10, {
          width: columnWidths[0] - 10,
          align: 'center'
        });
        xPosition += columnWidths[0];

        // Product name
        doc.rect(xPosition, yPosition, columnWidths[1], rowHeight).stroke();
        doc.text(item.name, xPosition + 5, yPosition + 5, {
          width: columnWidths[1] - 10,
          align: 'left'
        });
        xPosition += columnWidths[1];

        // Quantity
        doc.rect(xPosition, yPosition, columnWidths[2], rowHeight).stroke();
        doc.text(String(item.quantity), xPosition + 5, yPosition + 10, {
          width: columnWidths[2] - 10,
          align: 'center'
        });
        xPosition += columnWidths[2];

        // Unit price
        const unitPrice = item.discount ? item.price : item.price;
        doc.rect(xPosition, yPosition, columnWidths[3], rowHeight).stroke();
        doc.text(formatPrice(unitPrice) + 'đ', xPosition + 5, yPosition + 10, {
          width: columnWidths[3] - 10,
          align: 'right'
        });
        xPosition += columnWidths[3];

        // Total price
        const totalPrice = unitPrice * item.quantity;
        doc.rect(xPosition, yPosition, columnWidths[4], rowHeight).stroke();
        doc.text(formatPrice(totalPrice) + 'đ', xPosition + 5, yPosition + 10, {
          width: columnWidths[4] - 10,
          align: 'right'
        });

        yPosition += rowHeight;
      });

      // Summary rows
      yPosition += 10;
      doc.font('Helvetica-Bold').fontSize(10);

      // Subtotal
      doc.text('Tạm tính:', 360, yPosition);
      doc.text(formatPrice(orderData.subtotal) + 'đ', 450, yPosition, { align: 'right', width: 90 });
      yPosition += 20;

      // Discount
      if (orderData.discount > 0) {
        doc.text('Giảm giá:', 360, yPosition);
        doc.text('-' + formatPrice(orderData.discount) + 'đ', 450, yPosition, { align: 'right', width: 90 });
        yPosition += 20;
      }

      // Shipping
      doc.text('Phí vận chuyển:', 360, yPosition);
      doc.text(orderData.shippingFee === 0 ? 'Miễn phí' : formatPrice(orderData.shippingFee) + 'đ', 450, yPosition, { align: 'right', width: 90 });
      yPosition += 20;

      // Total
      doc.fontSize(12);
      doc.text('Tổng cộng:', 360, yPosition);
      doc.text(formatPrice(orderData.total) + 'đ', 450, yPosition, { align: 'right', width: 90 });
      yPosition += 30;

      // Invoice recipient info
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('6. Thông tin người nhận hóa đơn:', 50, yPosition);
      yPosition += 25;

      doc.font('Helvetica').fontSize(10);
      doc.text(`- Họ và tên: ${orderData.invoiceInfo.fullName}`, 50, yPosition);
      yPosition += 20;
      doc.text(`- Số điện thoại: ${orderData.invoiceInfo.phone}`, 50, yPosition);
      yPosition += 20;
      doc.text(`- Địa chỉ: ${orderData.invoiceInfo.address}`, 50, yPosition);
      yPosition += 20;
      doc.text(`- Email: ${orderData.invoiceInfo.email}`, 50, yPosition);

      // Delivery address
      yPosition += 30;
      doc.font('Helvetica-Bold').fontSize(11);
      doc.text('7. Địa chỉ giao hàng:', 50, yPosition);
      yPosition += 25;

      doc.font('Helvetica').fontSize(10);
      if (orderData.address) {
        doc.text(`${orderData.address.name} - ${orderData.address.phone}`, 50, yPosition);
        yPosition += 20;
        doc.text(`${orderData.address.detailAddress}, ${orderData.address.ward}, ${orderData.address.district}, ${orderData.address.province}`, 50, yPosition, { width: 500 });
      }

      // Footer note
      yPosition += 40;
      doc.font('Helvetica-Oblique').fontSize(9);
      doc.text('Ghi chú: Tổ chức, cá nhân in hoá đơn không ghi cột Doanh nghiệp in và Hợp đồng đặt in', 50, yPosition, { width: 300 });

      // Signature
      doc.font('Helvetica').fontSize(10);
      doc.text(`Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`, 380, yPosition, { align: 'center', width: 150 });
      yPosition += 20;
      doc.font('Helvetica-Bold');
      doc.text('NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT', 380, yPosition, { align: 'center', width: 150 });
      yPosition += 15;
      doc.font('Helvetica-Oblique').fontSize(9);
      doc.text('(Ký, đóng dấu và ghi rõ họ tên)', 380, yPosition, { align: 'center', width: 150 });
      yPosition += 60;
      doc.font('Helvetica').fontSize(10);
      doc.text('Nguyễn Văn A', 380, yPosition, { align: 'center', width: 150 });

      // Company stamp/signature area
      doc.fontSize(8)
         .fillColor('green')
         .text('Ký điện tử bởi: CÔNG TY CỔ PHẦN MEDICARE', 380, yPosition + 20, { align: 'center', width: 150 });

      doc.end();

      stream.on('finish', () => {
        resolve(outputPath);
      });

      stream.on('error', (err) => {
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Helper function to format price
function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

module.exports = { generateInvoicePDF };

