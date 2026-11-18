# ย้าย MySQL จากเครื่องไป Railway

ใช้วิธีนี้เพื่อคัดลอกทั้งโครงสร้างและข้อมูลจากฐานข้อมูลในเครื่องไปยังฐานข้อมูล `railway` สำหรับใช้ร่วมกันในทีม คำสั่งด้านล่างใช้กับ PowerShell

## 1. Export จากเครื่อง

เปิด PowerShell ในโฟลเดอร์ `bin` ของ MySQL ที่มี `mysqldump.exe` และ `mysql.exe` แล้วเปลี่ยน `LOCAL_DB` เป็นชื่อฐานข้อมูลจริงในเครื่อง ถ้า MySQL ในเครื่องใช้พอร์ตหรือชื่อผู้ใช้อื่น ให้แก้สองค่านั้นด้วย

```powershell
$localDb = 'LOCAL_DB'
$dump = Join-Path $env:TEMP 'carshop-local.sql'

.\mysqldump.exe --host=127.0.0.1 --port=3306 --user=root -p --single-transaction --routines --events --triggers --no-tablespaces --set-gtid-purged=OFF --skip-add-drop-table --result-file="$dump" "$localDb"

if ($LASTEXITCODE -ne 0) { throw 'Export ไม่สำเร็จ ให้แก้ข้อผิดพลาดก่อน import' }
```

เมื่อขึ้น `Enter password:` ให้ใส่รหัส MySQL **ในเครื่อง** อย่าใช้ไฟล์ SQL เดิมใน repo แทน ถ้าต้องการให้ทั้งข้อมูลและโครงสร้างตรงกับฐานข้อมูลปัจจุบัน

## 2. Import เข้า Railway

รันใน PowerShell หน้าต่างเดิม คำสั่งนี้จะถามรหัส MySQL **ของ Railway**

```powershell
$sourcePath = $dump.Replace('\', '/')

.\mysql.exe --host=metro.proxy.rlwy.net --port=32569 --user=root -p --database=railway --abort-source-on-error --execute="source $sourcePath"

if ($LASTEXITCODE -ne 0) { throw 'Import ไม่สำเร็จ ให้ตรวจตารางปลายทางก่อนรันซ้ำ เพราะบางตารางอาจถูกสร้างไปแล้ว' }
```

ก่อน import ให้เช็กว่าปลายทางไม่มีตารางชื่อเดียวกับต้นทาง และสำรองข้อมูลปลายทางที่ต้องการเก็บไว้

## 3. ตรวจผล

```powershell
.\mysql.exe --host=metro.proxy.rlwy.net --port=32569 --user=root -p --database=railway --execute="SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';"
```

- เทียบรายชื่อตารางและจำนวนแถวจริง (`SELECT COUNT(*)`) ของแต่ละตารางกับต้นทาง
- ต้นทางที่ตรวจไว้ก่อนหน้านี้มี 15 ตาราง ส่วน Railway มี `TEST` อยู่แล้ว ถ้าต้นทางยังมี 15 ตารางเดิมและนำเข้าครบ ปลายทางจะมี 16 ตารางรวม `TEST` หากต้องการให้ตรงกัน ให้สำรองและจัดการ `TEST` แยกเมื่อยืนยันว่าไม่ต้องใช้
- เก็บไฟล์ dump และรหัสผ่านไว้นอก GitHub ให้ทีมใช้บัญชี MySQL ที่มีสิทธิ์ตามงาน และเก็บ `root` ไว้สำหรับดูแลฐานข้อมูล

[คู่มือ MySQL: การ export ฐานข้อมูลเป็น SQL](https://dev.mysql.com/doc/refman/8.4/en/mysqldump-sql-format.html)
