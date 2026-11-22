# Reporting business modules — คนที่ 5 (อั้ม)

## Implemented modules

- `reports/`: read-only report endpoints with Identity session validation and Manager/Admin authorization; aggregation is performed from Sales, Payment and Catalog APIs.
- `activity-logs/`: MongoDB persistence and a read-only Manager/Admin query endpoint. Event ingestion remains closed pending the team-approved service-to-service authentication and actor-identity contract.

เพิ่ม routes/controller/service/repository/validation ตามความจำเป็น และห้าม query database ของ service อื่นโดยตรง
