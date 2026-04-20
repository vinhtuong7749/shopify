# CamoSignal Theme — Known Issues & Fixes

---

## 1. 🖼️ Product Page: Thumbnails chỉ hiển thị 4 ảnh thay vì khớp chiều cao ảnh main

### Triệu chứng
Trên trang sản phẩm (Desktop), cột thumbnails bên **trái** chỉ hiển thị được 4 ảnh dù ảnh main cao hơn nhiều.

### Nguyên nhân gốc (Root Causes)

| # | Vị trí | Vấn đề |
|---|--------|--------|
| 1 | `sections/product-template.liquid` | `align-items: flex-start` trên flex container → thumbnail container **không stretch** theo chiều cao ảnh main |
| 2 | `sections/product-template.liquid` | `max-height: 368px` hardcode trên `.product-media__slider-thumbnails` → giới hạn cứng ~4 ảnh |
| 3 | `assets/product-carousel-5c4cc215.js` | Swiper vertical khởi tạo với `direction: "horizontal"` rồi mới đổi sang `vertical` ở breakpoint → render sai từ đầu |
| 4 | `assets/product-carousel-5c4cc215.js` | `slidesPerView: 4` hardcode, không dùng `"auto"` |

### Fix đã áp dụng

#### CSS trong `sections/product-template.liquid` (trong `@media screen and (min-width: 992px)`)

```css
/* 1. Flex container: stretch thay vì flex-start */
.product-media.product-media--layout-carousel.product-media--thumbnails-position-left {
  align-items: stretch; /* KEY FIX */
}

/* 2. Container thumbnail: height: 100% + flex column */
.product-media__slider-thumbnails-container {
  height: 100%;
  display: flex !important;
  flex-direction: column;
}

/* 3. Swiper element: flex: 1 để chiếm toàn bộ chiều cao */
.product-media__slider-thumbnails {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

/* 4. Mỗi slide: height cố định để Swiper auto tính đúng */
.product-media__slider-thumbnails-slide {
  height: 80px !important;
}
```

#### JS trong `assets/product-carousel-5c4cc215.js`

```js
// Trong else branch (thumbnails vertical - left/right)
Thumbnails = new Swiper(selectors.sliderThumbnails, {
  direction: thumbnailsDirections, // dùng đúng direction từ đầu (KHÔNG phải "horizontal")
  slidesPerView: "auto",           // "auto" để khớp container height
  spaceBetween: 10,
  freeMode: true,
  watchSlidesProgress: true,
  threshold: 10,
  navigation: {
    prevEl: document.querySelector(`.js-thumb-nav-prev-${sectionId}`),
    nextEl: document.querySelector(`.js-thumb-nav-next-${sectionId}`)
  }
});
```

### Nút điều hướng lên/xuống

Thêm vào `snippets/product-media.liquid`:

```html
<!-- Trước .swiper -->
<button class="thumb-nav thumb-nav--prev js-thumb-nav-prev-{{ section.id }}" type="button">
  <!-- SVG chevron-up -->
</button>

<!-- Sau .swiper -->
<button class="thumb-nav thumb-nav--next js-thumb-nav-next-{{ section.id }}" type="button">
  <!-- SVG chevron-down -->
</button>
```

### Files bị ảnh hưởng

- `sections/product-template.liquid` — CSS inline (dòng ~109-200)
- `snippets/product-media.liquid` — HTML structure (dòng ~462-530)
- `assets/product-carousel-5c4cc215.js` — Swiper config (hàm `Le`, dòng ~1027-1070)
- `assets/product-carousel-64289327.js` — Bản minified (cần sync thủ công)

> **Lưu ý:** `product-carousel-64289327.js` là file minified, phải sửa bằng cách tìm đúng chuỗi ký tự và thay thế.

---

*Cập nhật lần cuối: 2026-04-20*
