// Run with mongosh, not node. No data is deleted.
// Existing collections are left unchanged; schema upgrades need a migration.
const shopDb = db.getSiblingDB("carshop_mongo");
const uuidPattern = "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$";
const uuidField = { bsonType: "string", pattern: uuidPattern };
const validator = {
  $jsonSchema: {
    bsonType: "object",
    additionalProperties: false,
    required: ["_id", "customerId", "subject", "description", "requestType", "status", "createdAt", "updatedAt"],
    properties: {
      _id: uuidField,
      customerId: uuidField,
      carId: { bsonType: ["string", "null"], pattern: uuidPattern },
      subject: { bsonType: "string", minLength: 1, maxLength: 200 },
      description: { bsonType: "string", minLength: 1, maxLength: 10000 },
      requestType: { enum: ["CAR_INQUIRY", "FINANCE", "TEST_DRIVE", "PURCHASE", "INSURANCE", "OTHER"] },
      status: { enum: ["PENDING", "IN_PROGRESS", "RESOLVED", "CANCELLED"] },
      details: { bsonType: "object", description: "Validate type-specific fields in the backend." },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" }
    }
  }
};
if (!shopDb.getCollectionNames().includes("customer_requests")) {
  shopDb.createCollection("customer_requests", { validator, validationLevel: "strict", validationAction: "error" });
} else {
  print("customer_requests already exists: validator unchanged. Compare its options before use.");
}
shopDb.customer_requests.createIndex({ customerId: 1, createdAt: -1, _id: -1 }, { name: "idx_customer_created" });
shopDb.customer_requests.createIndex({ status: 1, createdAt: -1, _id: -1 }, { name: "idx_status_created" });
shopDb.customer_requests.createIndex({ carId: 1 }, { name: "idx_car" });
shopDb.customer_requests.createIndex({ createdAt: -1, _id: -1 }, { name: "idx_created" });
print("Database: " + shopDb.getName());
printjson(shopDb.getCollectionInfos({ name: "customer_requests" }));
