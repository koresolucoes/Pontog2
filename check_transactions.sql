SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('b2b_transactions', 'b2b_wallets', 'b2b_campaigns');
