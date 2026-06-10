import { analyzeSnapshot } from "./api/insights.js";

const result = analyzeSnapshot();

let passed = true;

console.log("=== Bắt đầu kiểm tra tính toàn vẹn dữ liệu ===");

// 1. Kiểm tra tổng đơn hàng (Orders) giữa KPI và Calendar
const kpiOrders = result.metrics.find(m => m.key === "orders").current;
const calendarOrders = result.tables.daily.reduce((sum, day) => sum + (day.orders || 0), 0);

if (kpiOrders === calendarOrders) {
  console.log(`✅ [Orders] KPI Orders (${kpiOrders}) khớp với tổng Calendar Orders (${calendarOrders}).`);
} else {
  console.error(`❌ [Orders] KPI Orders (${kpiOrders}) KHÔNG khớp với tổng Calendar Orders (${calendarOrders}).`);
  passed = false;
}

// 2. Kiểm tra tổng doanh thu (Net Sales) giữa KPI và Calendar
const kpiNetSales = result.metrics.find(m => m.key === "netSales").current;
// Do làm tròn, cho phép lệch một chút (ví dụ 1 USD)
const calendarNetSales = result.tables.daily.reduce((sum, day) => sum + (day.netSales || 0), 0);
const netSalesDiff = Math.abs(kpiNetSales - calendarNetSales);

if (netSalesDiff <= 1) {
  console.log(`✅ [Net Sales] KPI Net Sales (${kpiNetSales}) khớp với tổng Calendar Net Sales (${calendarNetSales.toFixed(2)}). Lệch: ${netSalesDiff.toFixed(2)}`);
} else {
  console.error(`❌ [Net Sales] KPI Net Sales (${kpiNetSales}) KHÔNG khớp với tổng Calendar Net Sales (${calendarNetSales.toFixed(2)}). Lệch: ${netSalesDiff.toFixed(2)}`);
  passed = false;
}

// 3. Kiểm tra sản phẩm không có collection/tag không bị gán mùa bừa
const seasonalityProducts = result.seasonality.products;
let seasonGassingFound = false;

for (const product of seasonalityProducts) {
  if (product.classificationSource === "missing") {
    if (product.activeFit !== "missing" || product.activeFitLabel !== "Thiếu collection/tag mùa vụ") {
      console.error(`❌ [Seasonality] Sản phẩm "${product.name}" bị gán mùa bừa!`);
      console.error(`   - classificationSource: ${product.classificationSource}`);
      console.error(`   - activeFit: ${product.activeFit}`);
      console.error(`   - activeFitLabel: ${product.activeFitLabel}`);
      seasonGassingFound = true;
      passed = false;
    }
  }
}

if (!seasonGassingFound) {
  console.log(`✅ [Seasonality] Không có sản phẩm nào bị "season-gassing" (gán mùa bừa mà không có collection/tag/title hợp lệ).`);
}

console.log("==================================================");
if (passed) {
  console.log("🎉 TẤT CẢ TEST ĐỀU PASS.");
} else {
  console.error("⚠️ CÓ TEST THẤT BẠI. Cần kiểm tra lại logic.");
  process.exit(1);
}
