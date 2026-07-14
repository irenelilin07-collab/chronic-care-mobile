import { stockUnitOf } from "../medicine.js";

export function findMedicineInInventory(medicines, item) {
  const names = [item.name, item.rawName]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (!names.length) return null;

  return (
    medicines.find((medicine) => {
      const medicineName = String(medicine.name || "").trim();
      return names.some((name) => medicineName === name);
    }) || null
  );
}

export function resolveDraftInventory(item, medicines) {
  const existing = findMedicineInInventory(medicines, item);

  if (item.captureMode === "stock_only") {
    if (existing) {
      const sameMedicine = item.existingMedicineId === existing.id;
      return {
        ...item,
        existingMedicineId: existing.id,
        inventoryMode: "existing",
        stockAction: "add_stock",
        stockAmount: sameMedicine ? item.stockAmount || "" : item.stockAmount || "",
      };
    }
    return {
      ...item,
      existingMedicineId: null,
      inventoryMode: "new",
      stockAction: "add_stock",
      stockAmount: item.stockAmount || "",
    };
  }

  if (existing) {
    const sameMedicine = item.existingMedicineId === existing.id;
    // 默认追加库存，避免漏选；用户可改「仅加计划」
    const stockAction = sameMedicine
      ? item.stockAction || "add_stock"
      : "add_stock";
    return {
      ...item,
      existingMedicineId: existing.id,
      inventoryMode: "existing",
      stockAction,
      stockAmount:
        sameMedicine && stockAction === "add_stock" ? item.stockAmount || "" : "",
    };
  }

  const keepStock =
    item.inventoryMode === "new" ? item.stockAmount || "" : "";

  return {
    ...item,
    existingMedicineId: null,
    inventoryMode: "new",
    stockAction: "add_stock",
    stockAmount: keepStock,
  };
}

export function getExistingMedicineStockLabel(medicine) {
  if (!medicine) return "";
  const unit = stockUnitOf(medicine);
  return `当前剩余 ${medicine.stock} ${unit}`;
}

/** 用药计划确认卡：药箱状态说明（置顶展示） */
export function getPlanInventoryStatusHint(item, medicine) {
  if (item.inventoryMode === "existing" && medicine) {
    return `药箱中已有 · ${getExistingMedicineStockLabel(medicine)}`;
  }
  return "药箱中暂无此药 · 请填写初始数量";
}

/** 仅库存确认卡：药箱状态说明 */
export function getStockOnlyInventoryHint(medicine) {
  if (medicine) {
    return `药箱中已有 · ${getExistingMedicineStockLabel(medicine)} · 请填写追加数量`;
  }
  return "药箱中暂无此药 · 确认后将新建药品并写入库存";
}
