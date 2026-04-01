const fs = require('fs');
const filePath = 'd:/Projects/CamoSignal/CamoSignal/templates/product.json';
let raw = fs.readFileSync(filePath, 'utf8');

raw = raw.replace(/\/\*[\s\S]*?\*\//g, '');
let data = JSON.parse(raw);

const blockId = 'ai_gen_block_7c15653_4GBMea';

if (data.sections['product-template'].blocks[blockId]) {
  delete data.sections['product-template'].blocks[blockId];
  const idx = data.sections['product-template'].block_order.indexOf(blockId);
  if (idx > -1) {
    data.sections['product-template'].block_order.splice(idx, 1);
  }
}

const header = `/*
 * ------------------------------------------------------------
 * IMPORTANT: The contents of this file are auto-generated.
 *
 * This file may be updated by the Shopify admin theme editor
 * or related systems. Please exercise caution as any changes
 * made to this file may be overwritten.
 * ------------------------------------------------------------
 */\n`;

fs.writeFileSync(filePath, header + JSON.stringify(data, null, 2));
console.log('Removed invalid block from product.json');
