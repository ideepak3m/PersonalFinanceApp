/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\"",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2809058197",
        "max": 0,
        "min": 0,
        "name": "user_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_4179096061",
        "hidden": false,
        "id": "relation355950541",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "mortgage_id",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_2863001619",
        "hidden": false,
        "id": "relation237778428",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "term_id",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "hidden": false,
        "id": "date2333974542",
        "max": "",
        "min": "",
        "name": "payment_date",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "number2878991316",
        "max": null,
        "min": null,
        "name": "payment_amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number4012363399",
        "max": null,
        "min": null,
        "name": "principal_amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number4096756235",
        "max": null,
        "min": null,
        "name": "interest_amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number3532410957",
        "max": null,
        "min": null,
        "name": "extra_principal",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select2908602461",
        "maxSelect": 0,
        "name": "payment_type",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "regular",
          "extra",
          "lump_sum",
          "prepayment",
          "interest_only"
        ]
      },
      {
        "hidden": false,
        "id": "number3792762044",
        "max": null,
        "min": null,
        "name": "balance_after_payment",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2360977322",
        "max": 0,
        "min": 0,
        "name": "source_transaction_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text18589324",
        "max": 0,
        "min": 0,
        "name": "notes",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text80652301",
        "max": 0,
        "min": 0,
        "name": "supabase_id",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_4236761724",
    "indexes": [
      "CREATE INDEX idx_mortgage_payments_user_id ON mortgage_payments (user_id)",
      "CREATE INDEX idx_mortgage_payments_mortgage_id ON mortgage_payments (mortgage_id)",
      "CREATE INDEX idx_mortgage_payments_date ON mortgage_payments (payment_date)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "mortgage_payments",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4236761724");

  return app.delete(collection);
})
