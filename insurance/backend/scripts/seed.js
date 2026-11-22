import { pathToFileURL } from 'node:url';
import { getPool, closePool } from '../src/config.js';
export const plans = [
  {
    id: 'a6e2d500-18c2-4000-8000-000000000001',
    slug: 'essential',
    name: 'Essential',
    type: 'ประกันชั้น 3',
    amount: 3490,
    description: 'เบี้ยสบายใจ สำหรับความคุ้มครองพื้นฐาน',
    highlights: [
      'คุ้มครองความรับผิดต่อบุคคลภายนอก',
      'เหมาะกับผู้ที่ต้องการเบี้ยประกันประหยัด',
      'ไม่คุ้มครองความเสียหายรถผู้เอาประกันตามความคุ้มครองรถยนต์ภาคสมัครใจประเภทนี้',
    ],
    ownCollision: false,
    fireTheft: false,
    flood: false,
  },
  {
    id: 'a6e2d500-18c2-4000-8000-000000000002',
    slug: 'smart-drive',
    name: 'Smart Drive',
    type: 'ประกันชั้น 3+',
    amount: 6490,
    description: 'พร้อมออกเดินทาง ในทุกวันของคุณ',
    highlights: [
      'คุ้มครองความรับผิดต่อบุคคลภายนอก',
      'เพิ่มความคุ้มครองรถผู้เอาประกันเมื่อชนกับยานพาหนะทางบกตามเงื่อนไข',
      'เหมาะสำหรับรถที่ใช้งานประจำวัน',
    ],
    ownCollision: true,
    fireTheft: false,
    flood: false,
  },
  {
    id: 'a6e2d500-18c2-4000-8000-000000000003',
    slug: 'extra-care',
    name: 'Extra Care',
    type: 'ประกันชั้น 2+',
    amount: 9490,
    description: 'ดูแลมากขึ้น เพื่อความอุ่นใจที่เพิ่มขึ้น',
    highlights: [
      'ความคุ้มครองแบบ Smart Drive',
      'เพิ่มความคุ้มครองกรณีไฟไหม้',
      'เพิ่มความคุ้มครองกรณีโจรกรรมตามเงื่อนไข',
      'เหมาะกับผู้ต้องการความคุ้มครองเพิ่มเติม',
    ],
    ownCollision: true,
    fireTheft: true,
    flood: false,
  },
  {
    id: 'a6e2d500-18c2-4000-8000-000000000004',
    slug: 'signature',
    name: 'Signature',
    type: 'ประกันชั้น 1',
    amount: 17900,
    description: 'มั่นใจเต็มที่ ในทุกเส้นทางข้างหน้า',
    highlights: [
      'ความคุ้มครองอุบัติเหตุรถผู้เอาประกันที่กว้างกว่าแผนอื่น',
      'คุ้มครองไฟไหม้และโจรกรรมตามเงื่อนไข',
      'คุ้มครองความเสียหายจากน้ำท่วมตามเงื่อนไขที่ระบุ',
      'เหมาะกับผู้ต้องการความคุ้มครองครอบคลุม',
    ],
    ownCollision: true,
    fireTheft: true,
    flood: true,
  },
];
export async function seed(pool) {
  for (const plan of plans)
    await pool.execute(
      `INSERT INTO insurance_plans (id, slug, name, insurance_type, description, premium_amount, coverage, is_recommended)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = ?, insurance_type = ?, description = ?, premium_amount = ?, coverage = ?, is_recommended = ?`,
      [
        plan.id,
        plan.slug,
        plan.name,
        plan.type,
        plan.description,
        plan.amount,
        JSON.stringify({
          highlights: plan.highlights,
          thirdParty: true,
          ownCollision: plan.ownCollision,
          fireTheft: plan.fireTheft,
          flood: plan.flood,
        }),
        plan.slug === 'signature',
        plan.name,
        plan.type,
        plan.description,
        plan.amount,
        JSON.stringify({
          highlights: plan.highlights,
          thirdParty: true,
          ownCollision: plan.ownCollision,
          fireTheft: plan.fireTheft,
          flood: plan.flood,
        }),
        plan.slug === 'signature',
      ],
    );
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    await seed(getPool());
    console.log('Seeded four demo insurance plans');
  } catch (error) {
    console.error('Seed failed:', error.code || error.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
