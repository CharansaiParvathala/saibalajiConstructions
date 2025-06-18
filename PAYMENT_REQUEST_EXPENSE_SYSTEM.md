# Payment Request Expense Tracking System

## Overview
Updated the payment request system to store individual expenses with their amounts, types, and associated images in MySQL database. The total amount is automatically calculated from the sum of all expenses.

## Database Schema Changes

### 1. Updated Tables

#### Payment Requests Table
```sql
CREATE TABLE payment_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL, -- Calculated from expenses
    status ENUM('pending', 'approved', 'rejected', 'scheduled', 'paid') DEFAULT 'pending',
    description TEXT,
    progress_id INT,
    proof_of_payment LONGBLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (progress_id) REFERENCES progress(id) ON DELETE SET NULL
);
```

#### Payment Request Expenses Table (NEW)
```sql
CREATE TABLE payment_request_expenses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_request_id INT NOT NULL,
    expense_type ENUM('food', 'fuel', 'labour', 'vehicle', 'water', 'other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE CASCADE
);
```

#### Payment Request Images Table (UPDATED)
```sql
CREATE TABLE payment_request_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    payment_request_id INT NOT NULL,
    expense_id INT, -- Links image to specific expense
    image_url VARCHAR(255) NOT NULL,
    image_data LONGBLOB NOT NULL, -- Image stored as BLOB
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (payment_request_id) REFERENCES payment_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (expense_id) REFERENCES payment_request_expenses(id) ON DELETE SET NULL
);
```

## API Changes

### 1. Create Payment Request
```typescript
POST /api/payment-requests

// Request Body (FormData)
{
  projectId: number,
  description: string,
  progressId?: number,
  expenses: string, // JSON string of expenses array
  images: File[] // Array of image files
}

// Example expenses JSON
[
  {
    "type": "food",
    "amount": 500,
    "remarks": "Lunch for workers",
    "images": [0, 1] // Image indices for this expense
  },
  {
    "type": "fuel",
    "amount": 300,
    "remarks": "Diesel for generator",
    "images": [2] // Image index for this expense
  }
]
```

### 2. Response Format
```typescript
{
  id: number,
  project_id: number,
  user_id: number,
  total_amount: number, // Calculated from expenses
  status: string,
  description: string,
  project_title: string,
  requester_name: string,
  image_ids: number[], // Array of image IDs
  expense_ids: number[], // Array of expense IDs
  expenses: [
    {
      id: number,
      expense_type: string,
      amount: number,
      remarks: string
    }
  ]
}
```

## Frontend Integration

### 1. TypeScript Types
```typescript
export interface PaymentRequest {
  id: string;
  projectId: string;
  totalAmount: number; // Calculated total
  status: "pending" | "approved" | "rejected" | "scheduled" | "paid";
  expenses: PaymentExpense[];
  image_ids?: number[];
}

export interface PaymentExpense {
  id?: number;
  type: "food" | "fuel" | "labour" | "vehicle" | "water" | "other";
  amount: number;
  remarks?: string;
  images?: number[]; // Image indices
}
```

### 2. API Client Usage
```typescript
import { createPaymentRequest } from '@/lib/api/api-client';

const handleSubmit = async () => {
  const expenses = [
    {
      type: 'food' as const,
      amount: 500,
      remarks: 'Lunch for workers',
      images: [0, 1] // First two images belong to this expense
    },
    {
      type: 'fuel' as const,
      amount: 300,
      remarks: 'Diesel for generator',
      images: [2] // Third image belongs to this expense
    }
  ];

  const result = await createPaymentRequest({
    projectId: 123,
    description: 'Daily expenses',
    expenses,
    images: selectedFiles // Array of File objects
  });

  console.log('Total Amount:', result.total_amount); // 800
  console.log('Expenses:', result.expenses);
};
```

## How It Works

### 1. Expense Creation Flow
```
📝 Frontend Form → 📊 API Request → 🗄️ Database Storage
     ↓                    ↓                    ↓
Multiple Expenses    Calculate Total    Store Each Expense
     ↓                    ↓                    ↓
Image Mapping        Store Images       Link Images to Expenses
     ↓                    ↓                    ↓
Submit Form          Return Total       Return Complete Data
```

### 2. Database Storage Process
```sql
-- 1. Create payment request with calculated total
INSERT INTO payment_requests (project_id, user_id, total_amount, description)
VALUES (123, 456, 800, 'Daily expenses');

-- 2. Insert individual expenses
INSERT INTO payment_request_expenses (payment_request_id, expense_type, amount, remarks)
VALUES (1, 'food', 500, 'Lunch for workers');

INSERT INTO payment_request_expenses (payment_request_id, expense_type, amount, remarks)
VALUES (1, 'fuel', 300, 'Diesel for generator');

-- 3. Insert images linked to specific expenses
INSERT INTO payment_request_images (payment_request_id, expense_id, image_data)
VALUES (1, 1, [BLOB_DATA]); -- Image for food expense

INSERT INTO payment_request_images (payment_request_id, expense_id, image_data)
VALUES (1, 2, [BLOB_DATA]); -- Image for fuel expense
```

### 3. Image Handling
- **Images are stored as BLOB data** in MySQL database
- **Each image is linked to a specific expense** via `expense_id`
- **Images are served via API endpoints** `/api/payment-requests/image/:imageId`
- **Frontend creates blob URLs** for display

## Benefits

### ✅ Advantages
- **Detailed Expense Tracking**: Each expense type and amount is stored separately
- **Image Association**: Images are linked to specific expenses
- **Automatic Total Calculation**: Total amount is calculated from individual expenses
- **Database Storage**: All data including images stored in MySQL
- **Cross-Device Access**: Access payment requests from any device
- **Data Integrity**: All operations in database transactions

### 📊 Data Structure
```typescript
Payment Request
├── Total Amount: 800
├── Expenses:
│   ├── Food: 500 (with 2 images)
│   ├── Fuel: 300 (with 1 image)
│   └── Labour: 0 (no images)
└── Status: pending
```

## Migration Steps

### 1. Run Database Migration
```sql
-- Execute server/db/migrate-payment-requests.sql
```

### 2. Update Frontend Components
- Update payment request forms to handle multiple expenses
- Implement image mapping to expenses
- Update display components to show expense breakdown

### 3. Test the System
- Create payment requests with multiple expenses
- Verify total amount calculation
- Test image upload and association
- Check cross-device access

## Example Usage

### Creating a Payment Request
```typescript
const paymentRequest = {
  projectId: 123,
  description: 'Weekly construction expenses',
  expenses: [
    {
      type: 'labour',
      amount: 2000,
      remarks: 'Daily wages for 5 workers',
      images: [0, 1, 2]
    },
    {
      type: 'materials',
      amount: 1500,
      remarks: 'Cement and steel',
      images: [3, 4]
    },
    {
      type: 'fuel',
      amount: 800,
      remarks: 'Generator fuel',
      images: [5]
    }
  ],
  images: selectedFiles // 6 image files
};

// Total will be automatically calculated: 4300
const result = await createPaymentRequest(paymentRequest);
```

This system provides comprehensive expense tracking with image support, all stored securely in MySQL database for cross-device access. 