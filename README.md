"""
MediCare/
├─ public/                       # file tĩnh phục vụ trực tiếp (favicon, robots, sitemap.xml build)
│  ├─ favicon.ico
│  ├─ robots.txt
│  └─ sitemap.xml
├─ src/
│  ├─ html/
│  │  ├─ index.html             # Trang chủ
│  │  ├─ catalog.html           # Danh mục thuốc
│  │  ├─ product.html           # Chi tiết thuốc
│  │  ├─ search.html            # Tìm kiếm
│  │  ├─ cart.html              # Giỏ hàng
│  │  ├─ checkout.html          # Thanh toán (demo, không backend)
│  │  ├─ order-success.html
│  │  ├─ account.html           # Hồ sơ, đơn hàng
│  │  └─ help.html              # Câu hỏi thường gặp / tư vấn
│  ├─ css/
│  │  ├─ base.css               # reset, biến, token màu, typographic scale
│  │  ├─ layout.css             # grid, container, header, footer
│  │  ├─ components.css         # card, button, form, modal, badge
│  │  ├─ pages.css              # style theo page
│  │  └─ utilities.css          # helper (mt-*, flex-*, hide-*)
│  ├─ js/
│  │  ├─ app.js                 # bootstrap app, router đơn giản
│  │  ├─ router.js              # điều hướng hash/history
│  │  ├─ api/
│  │  │  ├─ http.js            # fetch wrapper (+ abort, retry)
│  │  │  ├─ endpoints.js       # URL và hàm gọi JSON/XML
│  │  │  └─ mock-delay.js      # giả lập độ trễ network
│  │  ├─ data/
│  │  │  ├─ state.js           # state cục bộ (cart, user) (localStorage)
│  │  │  └─ validators.js      # validate form, schema check
│  │  ├─ features/
│  │  │  ├─ catalog.js         # load & render danh mục/thuốc
│  │  │  ├─ product.js         # render chi tiết, tương tác thêm giỏ
│  │  │  ├─ cart.js            # thêm/xóa/sửa giỏ, tính tổng
│  │  │  ├─ checkout.js        # quy trình checkout giả lập
│  │  │  ├─ search.js          # tìm kiếm + gợi ý
│  │  │  └─ reviews.js         # hiển thị/giả lập đánh giá
│  │  ├─ ui/
│  │  │  ├─ components.js      # header, footer, product-card, modal
│  │  │  └─ accessibility.js   # focus trap, keyboard nav
│  │  └─ utils/
│  │     ├─ formatters.js      # định dạng tiền tệ, liều dùng, ngày
│  │     └─ storage.js         # localStorage/sessionStorage helper
│  ├─ data/                     # dữ liệu MOCK (JSON/XML) dùng frontend
│  │  ├─ json/
│  │  │  ├─ drugs.json         # thuốc (danh mục, hoạt chất, dạng bào chế)
│  │  │  ├─ categories.json
│  │  │  ├─ inventory.json     # tồn kho
│  │  │  ├─ promotions.json
│  │  │  ├─ users.json         # user mock (ẩn/mã hóa trường nhạy cảm)
│  │  │  ├─ carts.json         # giỏ hàng mẫu
│  │  │  └─ orders.json        # đơn hàng mẫu
│  │  └─ xml/
│  │     ├─ drug_feed.xml      # feed XML mẫu (import đối tác)
│  │     └─ inventory_feed.xml
│  ├─ schemas/                  # JSON Schema & XSD
│  │  ├─ drug.schema.json
│  │  ├─ order.schema.json
│  │  └─ inventory_feed.xsd
│  └─ assets/
│     ├─ images/               # ảnh sản phẩm, banner
│     ├─ icons/
│     └─ fonts/
├─ mock-server/                 # TÙY CHỌN: json-server hoặc express để dev
│  ├─ db.json                   # hợp nhất mock JSON
│  └─ server.js
├─ tests/
│  ├─ unit/                     # test util, validator
│  └─ e2e/                      # test luồng chính (Playwright/Cypress)
├─ docs/
│  ├─ DMP.md                    # Data Management Plan (bản chính)
│  ├─ API.md                    # mô tả endpoints mock
│  ├─ DATA_DICTIONARY.md        # từ điển dữ liệu
│  └─ UX_COPY.md                # nội dung text, cảnh báo sử dụng thuốc
├─ scripts/
"""
│  ├─ build.js                  # copy/minify (tùy chọn)
│  └─ lint-data.mjs             # lint JSON/XML theo schema
├─ .editorconfig
├─ .gitignore
├─ package.json                 # devDeps (live-server, json-server, ajv,…)
└─ README.md
