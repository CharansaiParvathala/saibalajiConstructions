-- Add sample payment request and expense data for testing analytics

-- First, let's add some sample payment requests
INSERT INTO payment_requests (project_id, user_id, total_amount, status, description, created_at) VALUES
(1, 2, 25000.00, 'approved', 'Payment for road construction materials and labor', '2024-01-15 10:30:00'),
(1, 2, 15000.00, 'pending', 'Payment for fuel and vehicle maintenance', '2024-02-20 14:45:00'),
(2, 3, 30000.00, 'approved', 'Payment for bridge construction materials', '2024-01-25 09:15:00'),
(2, 3, 20000.00, 'scheduled', 'Payment for equipment rental', '2024-02-10 16:20:00'),
(3, 4, 18000.00, 'paid', 'Payment for highway extension work', '2024-01-30 11:00:00'),
(3, 4, 12000.00, 'rejected', 'Payment for additional materials', '2024-02-05 13:30:00'),
(1, 2, 22000.00, 'approved', 'Payment for water supply work', '2024-02-15 08:45:00'),
(2, 3, 28000.00, 'pending', 'Payment for safety equipment', '2024-02-25 15:10:00');

-- Now add sample expense data for these payment requests
INSERT INTO payment_request_expenses (payment_request_id, expense_type, amount, remarks) VALUES
(1, 'labour', 15000.00, 'Daily wage for 10 workers for 15 days'),
(1, 'vehicle', 8000.00, 'Truck rental for material transport'),
(1, 'fuel', 2000.00, 'Diesel for construction vehicles'),
(2, 'fuel', 8000.00, 'Diesel for JCB and trucks'),
(2, 'vehicle', 7000.00, 'Vehicle maintenance and repairs'),
(3, 'labour', 20000.00, 'Skilled labor for bridge construction'),
(3, 'vehicle', 10000.00, 'Crane rental for bridge work'),
(4, 'vehicle', 15000.00, 'Heavy equipment rental'),
(4, 'fuel', 5000.00, 'Fuel for equipment'),
(5, 'labour', 12000.00, 'Labor for highway extension'),
(5, 'vehicle', 6000.00, 'Vehicle costs'),
(6, 'labour', 8000.00, 'Additional labor costs'),
(6, 'vehicle', 4000.00, 'Additional vehicle costs'),
(7, 'water', 15000.00, 'Water supply installation materials'),
(7, 'labour', 7000.00, 'Labor for water work'),
(8, 'vehicle', 18000.00, 'Safety equipment and gear'),
(8, 'other', 10000.00, 'Miscellaneous safety items');

-- Add more diverse expense types
INSERT INTO payment_request_expenses (payment_request_id, expense_type, amount, remarks) VALUES
(1, 'food', 1500.00, 'Food for workers during construction'),
(2, 'food', 1200.00, 'Meals for vehicle operators'),
(3, 'food', 2000.00, 'Food for bridge construction team'),
(4, 'water', 3000.00, 'Water supply for equipment cooling'),
(5, 'food', 1800.00, 'Food for highway work crew'),
(7, 'other', 3000.00, 'Additional water supply materials'); 