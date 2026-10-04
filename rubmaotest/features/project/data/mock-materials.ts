import type { Material } from "../types";

export const mockMaterials: Material[] = [
  {
    id: "m1",
    material_name: "เหล็กกล่อง 1.5 นิ้ว",
    quantity: 12,
    acquired_quantity: 0,
    unit: "เส้น",
    unit_cost: 420,
    use_for: "โครงหลัก",
  },
  {
    id: "m2",
    material_name: "แผ่นเมทัลชีท",
    quantity: 8,
    acquired_quantity: 0,
    unit: "แผ่น",
    unit_cost: 650,
    use_for: "หลังคา",
  },
  {
    id: "m3",
    material_name: "สีรองพื้นกันสนิม",
    quantity: 2,
    acquired_quantity: 0,
    unit: "กระป๋อง",
    unit_cost: 380,
    use_for: "เก็บผิวงาน",
  },
];
