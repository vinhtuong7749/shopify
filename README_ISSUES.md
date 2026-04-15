# Bảng Theo Dõi Các Vấn Đề Khó & Cách Khắc Phục (CamoSignal)

File này lưu trữ những vấn đề kỹ thuật khó, dễ gây lỗi hệ thống nếu gặp lại trong tương lai, cùng với cách khắc phục đã được chứng minh hiệu quả trên Store CamoSignal.

---

## 1. Lỗi Lọc Sản Phẩm Trả Về 0 Sản Phẩm (Coming Soon) Khi Bấm Vào "T-SHIRT"

### 🔴 Mô tả vấn đề:
Tình trạng: Khi vào `/collections/all` và ấn vào danh mục "T-Shirt" trên thanh Sidebar, hệ thống trả về màn hình trống (hết hàng) hoặc báo "Coming Soon", mặc dù trong kho rõ ràng có sản phẩm T-Shirt.
Nguyên nhân gốc: Custom Sidebar sử dụng chuỗi văn bản gán cứng (vd: `data-product-type="Type1,3D Tshirt,T-Shirt"`). Tuy nhiên, khi Admin (chủ store) vào ứng dụng **"Search & Discovery"** của Shopify để nhóm các giá trị ảo lại với nhau thành một Filter duy nhất. Lúc này Shopify sẽ ngầm biến định nghĩa Filter thành các đoạn mã GID (ví dụ: `gid://shopify/filtersettinggroup/102400191`). Link cũ truyền dạng text sẽ bị Shopify từ chối (trả về 0 matches).

### 🟢 Cách giải quyết / Code tham khảo:
Không bao giờ gán cứng text (hardcode) cho filter. Phải quét động thông số `.value` trực tiếp từ Shopify.
- **Tập tin liên quan**: `snippets/product-filters-sidebar.liquid`
- **Cách viết**:
```liquid
{%- assign matched_val = default_clothing_values[i] -%}
{%- for filter in product_list.filters -%}
  {%- if filter.param_name == 'filter.p.product_type' -%}
	{%- for value in filter.values -%}
	  {%- assign v_label = value.label | downcase -%}
	  {%- if c_label contains 't-shirt' and v_label contains 't-shirt' -%}
		{%- assign matched_val = value.value -%} {%- comment -%}Sẽ lấy đúng GID nếu bị nhóm{%- endcomment -%}
	  {%- endif -%}
	{%- endfor -%}
  {%- endif -%}
{%- endfor -%}
```

---

## 2. Bị Lỗi Che Khuất Các Nút Shopify Pay Nhúng Dưới Nút Checkout (Giỏ Hàng / Cart Drawer)

### 🔴 Mô tả vấn đề:
Tình trạng: Khi làm tính năng "Ghim nút Checkout ở mép dưới" (Sticky Checkout Button) cho phần footer giỏ hàng. Chỉ có nút màu xanh nằm ở dưới cùng, còn các nút thanh toán bổ sung (Shopify Pay, G-Pay) thì bị che khuất hoặc tạo ra những dải màu trắng đứt gãy khó chịu khi kéo xuống.
Nguyên nhân gốc: Áp dụng `position: sticky; bottom: 0;` lên nút nhưng không gỡ bỏ giới hạn chiều cao / cấu trúc của các thẻ `div` cha. Nút bị kẹt trong thẻ Div cấp 2 (ví dụ `.cart-footer__main`) nên khi vuốt, nó bị kéo tuột xuống tận cùng của Div đó và đè cấn lên các nút thanh toán nhỏ.

### 🟢 Cách giải quyết / Code tham khảo:
Sử dụng thủ thuật CSS `display: contents;` để xóa bỏ cấp bậc của các thẻ Div bao bọc ngoài, đẩy Nút Checkout trở thành "con trực tiếp" (direct child) của vùng cuộn chính (scrolling flow).
- **Tập tin liên quan**: `snippets/cart-footer.liquid` & `sections/cart-drawer.liquid`
- **Cách viết**:
1. Đặt `style="display: contents;"` vào các lớp bọc như `.drawer__footer`, `.cart-footer` và `.cart-footer__main`.
2. Đặt `position: sticky; bottom: 0; z-index: 200;` TRỰC TIẾP lên vỏ nút Checkout (`.js-cart-footer-button`).
3. Đẩy padding / margin sang các nhóm chi tiết khác (Discount, Tiền phụ phí, Icon Pay) thay vì để trên các lớp cha.

---

## 3. Khối Upsell Sản Phẩm Trong Cart Không Hiển Thị Dù Mảng Chứa Giá Trị

### 🔴 Mô tả vấn đề:
Tình trạng: Thêm một danh sách các sản phẩm Upsell thủ công hoặc qua thẻ (Tags) trong giỏ hàng. Có sản phẩm truyền vào hàm nhưng vòng lặp hoặc điều kiện Logic bị che giấu vì báo điều kiện if không đạt.
Nguyên nhân gốc: Việc sử dụng hàm kiểm tra `.count > 0` của đối tượng thuộc tính `products` nhiều lúc không hỗ trợ cho các biến mảng Array thủ công trong Liquid khi truyền biến qua Snippet. Nếu mảng rỗng thì lỗi render trống sẽ xảy ra.

### 🟢 Cách giải quyết / Code tham khảo:
Tuyệt đối không dùng `.count` hay `.size > 0` cho các điều kiện render snippet upsell.
- **Tập tin liên quan**: `snippets/cart-upsell.liquid`
- **Cách viết**:
Dùng `if products != blank`.
```liquid
{%- if products != blank -%}
  <!-- Render the upsell block -->
{%- endif -%}
```

---

## 4. Hiện Tượng Sản Phẩm Shipping Protection Hiện Ở Vòng Lặp Mọi Nơi (Dù Bị Ẩn)

### 🔴 Mô tả vấn đề:
Sản phẩm "Shipping Protection" cần giấu đi không cho user lướt tới, nhưng nếu giấu bằng Front-End (CSS) thì nó vẫn làm sai lệch bộ đếm `collection.products_count` và thỉnh thoảng hiện lên ở trang All.

### 🟢 Cách giải quyết:
1. Tạo 1 rules trên Shopify Admin: Dùng điều kiện loại bỏ Tags `Protection` trực tiếp trong Cấu hình Rule Của Collection nếu cần ẩn toàn diện.
2. Hoặc ẩn qua Liquid filter `continue`:
```liquid
{%- unless product.selected_or_first_available_variant.requires_shipping -%}
  {%- continue -%}
{%- endunless -%}
```
(Lưu ý: Cách loại bỏ bằng CSS hoặc Liquid Filter sẽ luôn làm tổng số Product Count bị khập khiễng - do Shopify Count không biết Liquid chạy ngầm. Cần tự viết hàm đếm trừ đi số lượng bị giấu nếu cần hiển thị chính xác dòng "24 Products").

---

## 5. Lỗi "Coming Soon" Giả Khi Tự Build Form Filter Mà Bỏ Qua App Search & Discovery

### 🔴 Mô tả vấn đề:
Tình trạng: Khi kết hợp bộ lọc CLOTHING (ví dụ T-Shirt) + COLLECTION (ví dụ Forest & Hardwood), hoặc CLOTHING + COLOR/SIZE, trang hiển thị "Coming Soon" dù rõ ràng có sản phẩm phù hợp.

Nguyên nhân gốc (ĐA TẦNG):
1. **Tầng 1 - Liquid Array rỗng**: Phần Color/Size ban đầu lấy từ `product_list.filters` do app Search & Discovery cung cấp. Khi app bị tắt hoặc không cấu hình đủ, mảng này trả về rỗng (`[]`).
2. **Tầng 2 - GID không khớp**: App Search & Discovery nhóm nhiều Product Type lại (vd: "Type1", "3D Tshirt", "T-Shirt") thành một mã GID duy nhất (`gid://shopify/FilterSettingGroup/102400191`). JavaScript so sánh GID này với mảng `availableProductTypes` chứa tên thường ("t-shirt") → không khớp → hiển thị Coming Soon giả.
3. **Tầng 3 - Logic tiên đoán sai**: Hàm `verifyFilteredProducts()` cố gắng **tiên đoán** (predict) xem filter có hợp lệ không bằng cách so sánh URL params với mảng đã biết. Cách này vốn dĩ mong manh vì không thể cover mọi edge case (GID, nhóm filter, tên tùy chỉnh...).

### 🟢 Cách giải quyết TRIỆT ĐỂ:
**Bỏ hoàn toàn logic "tiên đoán" (prediction).** Thay bằng logic **"quan sát thực tế" (observation)**: Đếm số lượng sản phẩm Shopify ĐÃ THẬT SỰ render ra trong grid. Nếu có sản phẩm → hiển thị bình thường. Nếu grid rỗng (0 items) VÀ có filter đang hoạt động → lúc đó mới hiện Coming Soon.

- **Tập tin liên quan**: `snippets/product-filters-sidebar.liquid`
- **Cách viết**:
```javascript
// ĐÃ FIX - Kiểm tra DOM thực tế thay vì tiên đoán
(function verifyFilteredProducts() {
  const currentUrl = new URL(window.location.href);
  const hasAnyFilter = [...currentUrl.searchParams.keys()]
    .some(k => k.startsWith('filter.'));

  // Đếm sản phẩm THẬT SỰ đã render
  const productItems = gridWrapper.querySelectorAll('.collection__item');
  const hasProducts = productItems.length > 0;

  if (hasAnyFilter && !hasProducts) {
    // Chỉ hiện Coming Soon khi grid THẬT SỰ rỗng
    gridWrapper.style.display = 'none';
    // ... show empty state
  }
})();
```
Lưu ý: Cách fix này đã được test thành công qua 10 kịch bản kết hợp filter khác nhau (Clothing × Collection × Colors × Sizes).

---

## 6. Không Thể Override Căn Lề Mobile Cho Section "Image with Text" Qua CSS Stylesheet

### 🔴 Mô tả vấn đề:
Tình trạng: Section `image-with-text.liquid` có setting `text_alignment_mobile` cho phép đặt căn lề khác nhau giữa Desktop và Mobile (ví dụ: Desktop = right, Mobile = left). Tuy nhiên dù thay đổi setting trong `index.json`, text trên mobile vẫn **không đổi**, luôn giữ giá trị Desktop.

Nguyên nhân gốc: **Inline CSS variable luôn thắng Stylesheet rule** (bất kể specificity hay `!important`).
- File `image-with-text.liquid` đặt biến CSS `--text-alignment` trực tiếp qua **inline style** trên element HTML (`style="--text-alignment: end;"`).
- File CSS biên dịch (`assets/image-with-text.build.css`) dùng `text-align: var(--text-alignment)` — chỉ đọc biến inline.
- Mọi cố gắng override `--text-alignment` trong stylesheet (kể cả `@media` + `!important`) đều **THUA** inline style, vì theo quy tắc CSS Cascade: **inline style > stylesheet rule** cho custom properties.

### 🟢 Cách giải quyết / Code tham khảo:
Dùng **JavaScript `element.style.setProperty()`** để ghi đè trực tiếp biến CSS inline trên mobile. Đây là cách duy nhất đáng tin cậy.

- **Tập tin liên quan**: `sections/image-with-text.liquid` (cuối file, trước `{% schema %}`)
- **Cách viết**:
```liquid
{%- assign mobile_text_align = section.settings.text_alignment_mobile | default: 'center' -%}
{%- assign desktop_text_align = text_alignment | default: 'center' -%}
{%- if mobile_text_align != desktop_text_align -%}
<script>
(function() {
  var mobileAlign = '{{ mobile_text_align | replace: "left", "start" | replace: "right", "end" }}';
  var desktopAlign = '{{ desktop_text_align | replace: "left", "start" | replace: "right", "end" }}';
  function applyAlign() {
    var el = document.querySelector('#shopify-section-{{ section.id }} .image-with-text');
    if (!el) return;
    if (window.innerWidth < 992) {
      el.style.setProperty('--text-alignment', mobileAlign);
    } else {
      el.style.setProperty('--text-alignment', desktopAlign);
    }
  }
  applyAlign();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAlign);
  }
  window.addEventListener('resize', applyAlign);
})();
</script>
{%- endif -%}
```

### ⚠️ Ghi nhớ chung (Áp dụng cho mọi section theme Allure):
Khi theme đặt biến CSS qua `{%- capture section_styles -%}` rồi gán vào `style="{{ section_styles }}"`, thì **KHÔNG THỂ** override biến đó bằng stylesheet. Phải dùng JavaScript hoặc sửa trực tiếp logic trong `{%- capture -%}` để output giá trị responsive (ví dụ media query trong inline style là không hợp lệ, nên JS là lựa chọn duy nhất).
