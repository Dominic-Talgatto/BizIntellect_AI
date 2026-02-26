                                                                   Table "public.contacts"
   Column   |            Type             | Collation | Nullable |               Default                | Storage  | Compression | Stats target | Description 
------------+-----------------------------+-----------+----------+--------------------------------------+----------+-------------+--------------+-------------
 id         | integer                     |           | not null | nextval('contacts_id_seq'::regclass) | plain    |             |              | 
 first_name | character varying(100)      |           | not null |                                      | extended |             |              | 
 last_name  | character varying(100)      |           |          |                                      | extended |             |              | 
 email      | character varying(255)      |           | not null |                                      | extended |             |              | 
 phone      | character varying(20)       |           |          |                                      | extended |             |              | 
 created_at | timestamp without time zone |           |          | CURRENT_TIMESTAMP                    | plain    |             |              | 
 updated_at | timestamp without time zone |           |          | CURRENT_TIMESTAMP                    | plain    |             |              | 
Indexes:
    "contacts_pkey" PRIMARY KEY, btree (id)
    "contacts_email_key" UNIQUE CONSTRAINT, btree (email)
Access method: heap



                                                                     Table "public.users"
    Column     |            Type             | Collation | Nullable |              Default              | Storage  | Compression | Stats target | Description 
---------------+-----------------------------+-----------+----------+-----------------------------------+----------+-------------+--------------+-------------
 id            | integer                     |           | not null | nextval('users_id_seq'::regclass) | plain    |             |              | 
 first_name    | text                        |           | not null |                                   | extended |             |              | 
 last_name     | text                        |           | not null |                                   | extended |             |              | 
 email         | text                        |           |          |                                   | extended |             |              | 
 phone         | text                        |           |          |                                   | extended |             |              | 
 password_hash | text                        |           | not null |                                   | extended |             |              | 
 created_at    | timestamp without time zone |           |          | now()                             | plain    |             |              | 
Indexes:
    "users_pkey" PRIMARY KEY, btree (id)
    "users_email_key" UNIQUE CONSTRAINT, btree (email)
    "users_phone_key" UNIQUE CONSTRAINT, btree (phone)
Referenced by:
    TABLE "forecasts" CONSTRAINT "forecasts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "receipts" CONSTRAINT "receipts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "tax_settings" CONSTRAINT "tax_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    TABLE "transactions" CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Access method: heap



                                                                  Table "public.transactions"
   Column    |           Type           | Collation | Nullable |                 Default                  | Storage  | Compression | Stats target | Description 
-------------+--------------------------+-----------+----------+------------------------------------------+----------+-------------+--------------+-------------
 id          | integer                  |           | not null | nextval('transactions_id_seq'::regclass) | plain    |             |              | 
 user_id     | integer                  |           | not null |                                          | plain    |             |              | 
 amount      | numeric(15,2)            |           | not null |                                          | main     |             |              | 
 type        | character varying(10)    |           | not null |                                          | extended |             |              | 
 category    | character varying(100)   |           | not null | 'Other'::character varying               | extended |             |              | 
 description | text                     |           |          |                                          | extended |             |              | 
 date        | date                     |           | not null |                                          | plain    |             |              | 
 source      | character varying(20)    |           | not null | 'manual'::character varying              | extended |             |              | 
 created_at  | timestamp with time zone |           | not null | now()                                    | plain    |             |              | 
Indexes:
    "transactions_pkey" PRIMARY KEY, btree (id)
    "idx_transactions_user_category" btree (user_id, category)
    "idx_transactions_user_date" btree (user_id, date DESC)
    "idx_transactions_user_type" btree (user_id, type)
Check constraints:
    "transactions_amount_check" CHECK (amount > 0::numeric)
    "transactions_source_check" CHECK (source::text = ANY (ARRAY['manual'::character varying, 'excel'::character varying, 'receipt'::character varying]::text[]))
    "transactions_type_check" CHECK (type::text = ANY (ARRAY['income'::character varying, 'expense'::character varying]::text[]))
Foreign-key constraints:
    "transactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Referenced by:
    TABLE "receipts" CONSTRAINT "receipts_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
Access method: heap



                                                                    Table "public.receipts"
     Column     |           Type           | Collation | Nullable |               Default                | Storage  | Compression | Stats target | Description 
----------------+--------------------------+-----------+----------+--------------------------------------+----------+-------------+--------------+-------------
 id             | integer                  |           | not null | nextval('receipts_id_seq'::regclass) | plain    |             |              | 
 transaction_id | integer                  |           |          |                                      | plain    |             |              | 
 user_id        | integer                  |           | not null |                                      | plain    |             |              | 
 image_url      | text                     |           |          |                                      | extended |             |              | 
 ocr_raw_text   | text                     |           |          |                                      | extended |             |              | 
 processed_at   | timestamp with time zone |           | not null | now()                                | plain    |             |              | 
Indexes:
    "receipts_pkey" PRIMARY KEY, btree (id)
Foreign-key constraints:
    "receipts_transaction_id_fkey" FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    "receipts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Access method: heap



                                                                     Table "public.forecasts"
      Column       |           Type           | Collation | Nullable |                Default                | Storage | Compression | Stats target | Description 
-------------------+--------------------------+-----------+----------+---------------------------------------+---------+-------------+--------------+-------------
 id                | integer                  |           | not null | nextval('forecasts_id_seq'::regclass) | plain   |             |              | 
 user_id           | integer                  |           | not null |                                       | plain   |             |              | 
 month             | date                     |           | not null |                                       | plain   |             |              | 
 predicted_income  | numeric(15,2)            |           |          |                                       | main    |             |              | 
 predicted_expense | numeric(15,2)            |           |          |                                       | main    |             |              | 
 confidence_lower  | numeric(15,2)            |           |          |                                       | main    |             |              | 
 confidence_upper  | numeric(15,2)            |           |          |                                       | main    |             |              | 
 created_at        | timestamp with time zone |           | not null | now()                                 | plain   |             |              | 
Indexes:
    "forecasts_pkey" PRIMARY KEY, btree (id)
    "forecasts_user_id_month_key" UNIQUE CONSTRAINT, btree (user_id, month)
Foreign-key constraints:
    "forecasts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Access method: heap



                                                                       Table "public.tax_settings"
        Column         |           Type           | Collation | Nullable |                 Default                  | Storage  | Compression | Stats target | Description 
-----------------------+--------------------------+-----------+----------+------------------------------------------+----------+-------------+--------------+-------------
 id                    | integer                  |           | not null | nextval('tax_settings_id_seq'::regclass) | plain    |             |              | 
 user_id               | integer                  |           | not null |                                          | plain    |             |              | 
 tax_rate              | numeric(5,2)             |           | not null | 20.0                                     | main     |             |              | 
 business_type         | character varying(100)   |           | not null | 'general'::character varying             | extended |             |              | 
 quarterly_start_month | integer                  |           | not null | 1                                        | plain    |             |              | 
 updated_at            | timestamp with time zone |           | not null | now()                                    | plain    |             |              | 
Indexes:
    "tax_settings_pkey" PRIMARY KEY, btree (id)
    "tax_settings_user_id_key" UNIQUE CONSTRAINT, btree (user_id)
Check constraints:
    "tax_settings_quarterly_start_month_check" CHECK (quarterly_start_month >= 1 AND quarterly_start_month <= 12)
Foreign-key constraints:
    "tax_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
Access method: heap



