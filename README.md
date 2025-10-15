MediCare/
├─ public/ # file tĩnh phục vụ trực tiếp (favicon, robots, sitemap.xml build)
│ ├─ favicon.ico
│ ├─ robots.txt
│ └─ sitemap.xml
├─ src/
│ ├─ html/
│ │ ├─ index.html # Trang chủ
│ │ ├─ catalog.html # Danh mục thuốc
│ │ ├─ product.html # Chi tiết thuốc
│ │ ├─ search.html # Tìm kiếm
│ │ ├─ cart.html # Giỏ hàng
│ │ ├─ checkout.html # Thanh toán (demo)
│ │ ├─ order-success.html
│ │ ├─ account.html # Hồ sơ, đơn hàng
│ │ └─ help.html # Câu hỏi thường gặp / tư vấn
│ ├─ css/
│ │ ├─ base.css # reset, biến, token màu, typographic scale
│ │ ├─ layout.css # grid, container, header, footer
│ │ ├─ components.css # card, button, form, modal, badge
│ │ ├─ pages.css # style theo page
│ │ └─ utilities.css # helper (mt-, flex-, hide-*)
│ ├─ js/
│ │ ├─ app.js # bootstrap app, router đơn giản
│ │ ├─ router.js # điều hướng hash/history
│ │ ├─ api/
│ │ │ ├─ http.js # fetch wrapper (+ abort, retry)
│ │ │ ├─ endpoints.js # URL và hàm gọi JSON/XML
│ │ │ └─ mock-delay.js # giả lập độ trễ network
│ │ ├─ data/
│ │ │ ├─ state.js # state cục bộ (cart, user) (localStorage)
│ │ │ └─ validators.js # validate form, schema check
│ │ ├─ features/
│ │ │ ├─ catalog.js # load & render danh mục/thuốc
│ │ │ ├─ product.js # render chi tiết, tương tác thêm giỏ
│ │ │ ├─ cart.js # thêm/xóa/sửa giỏ, tính tổng
│ │ │ ├─ checkout.js # quy trình checkout giả lập
│ │ │ ├─ search.js # tìm kiếm + gợi ý
│ │ │ └─ reviews.js # hiển thị/giả lập đánh giá
│ │ ├─ ui/
│ │ │ ├─ components.js # header, footer, product-card, modal
│ │ │ └─ accessibility.js # focus trap, keyboard nav
│ │ └─ utils/
│ │ ├─ formatters.js # định dạng tiền tệ, liều dùng, ngày
│ │ └─ storage.js # localStorage/sessionStorage helper
│ ├─ data/
│ │ ├─ json/
│ │ │ ├─ drugs.json # thuốc (danh mục, hoạt chất, dạng bào chế)
│ │ │ ├─ categories.json
│ │ │ ├─ inventory.json # tồn kho
│ │ │ ├─ promotions.json
│ │ │ ├─ users.json # user mock (ẩn/mã hóa trường nhạy cảm)
│ │ │ ├─ carts.json # giỏ hàng mẫu
│ │ │ └─ orders.json # đơn hàng mẫu
│ │ └─ xml/
│ │ ├─ drug_feed.xml # feed XML mẫu (import đối tác)
│ │ └─ inventory_feed.xml
│ ├─ schemas/
│ │ ├─ drug.schema.json
│ │ ├─ order.schema.json
│ │ └─ inventory_feed.xsd
│ └─ assets/
│ ├─ images/ # ảnh sản phẩm, banner
│ ├─ icons/
│ └─ fonts/
├─ mock-server/
│ ├─ db.json # hợp nhất mock JSON
│ └─ server.js
├─ tests/
│ ├─ unit/ # test util, validator
│ └─ e2e/ # test luồng chính (Playwright/Cypress)
├─ docs/
│ ├─ DMP.md # Data Management Plan
│ ├─ API.md # mô tả endpoints mock
│ ├─ DATA_DICTIONARY.md # từ điển dữ liệu
│ └─ UX_COPY.md # nội dung text, cảnh báo sử dụng thuốc
├─ scripts/
│ ├─ build.js
│ └─ lint-data.mjs
├─ .editorconfig
├─ .gitignore
├─ package.json
└─ README.md
