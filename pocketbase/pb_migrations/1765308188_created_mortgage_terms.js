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
        "hidden": false,
        "id": "number1975920185",
        "max": null,
        "min": null,
        "name": "term_number",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text2910911105",
        "max": 0,
        "min": 0,
        "name": "lender",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "number1908588469",
        "max": null,
        "min": null,
        "name": "interest_rate",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select1943725350",
        "maxSelect": 0,
        "name": "rate_type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "fixed",
          "variable",
          "adjustable",
          "prime_plus",
          "prime_minus"
        ]
      },
      {
        "hidden": false,
        "id": "number935322157",
        "max": null,
        "min": null,
        "name": "prime_rate_offset",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number2520422399",
        "max": null,
        "min": null,
        "name": "term_years",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "date2721309289",
        "max": "",
        "min": "",
        "name": "term_start_date",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "date185255306",
        "max": "",
        "min": "",
        "name": "term_end_date",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "hidden": false,
        "id": "select1700173627",
        "maxSelect": 0,
        "name": "payment_frequency",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "weekly",
          "bi_weekly",
          "semi_monthly",
          "monthly",
          "accelerated_bi_weekly",
          "accelerated_weekly"
        ]
      },
      {
        "hidden": false,
        "id": "number4241823994",
        "max": null,
        "min": null,
        "name": "regular_payment_amount",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "select159372075",
        "maxSelect": 0,
        "name": "minimum_payment_type",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "principal_and_interest",
          "interest_only",
          "custom"
        ]
      },
      {
        "hidden": false,
        "id": "number2073449283",
        "max": null,
        "min": null,
        "name": "balance_at_term_start",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number3349391354",
        "max": null,
        "min": null,
        "name": "balance_at_term_end",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "bool1241673013",
        "name": "is_current_term",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "hidden": false,
        "id": "select2823213952",
        "maxSelect": 0,
        "name": "renewal_type",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "original",
          "renewal",
          "refinance",
          "transfer"
        ]
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
    "id": "pbc_2863001619",
    "indexes": [
      "CREATE INDEX idx_mortgage_terms_user_id ON mortgage_terms (user_id)",
      "CREATE INDEX idx_mortgage_terms_mortgage_id ON mortgage_terms (mortgage_id)",
      "CREATE INDEX idx_mortgage_terms_current ON mortgage_terms (is_current_term)"
    ],
    "listRule": "@request.auth.id != \"\"",
    "name": "mortgage_terms",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != \"\"",
    "viewRule": "@request.auth.id != \"\""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2863001619");

  return app.delete(collection);
})
