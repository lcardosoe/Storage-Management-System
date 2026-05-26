# Storage Management System

A web-based storage, sales, payments and debt tracking system developed using Google Apps Script, HTML, Bootstrap and Google Sheets.

---

## 📌 Features

- User management
- Sales registration
- Payment reconciliation
- Debt tracking
- Metrics dashboard
- WhatsApp payment notifications
- Search and filtering system
- Responsive interface using Bootstrap

---

## 🛠️ Technologies Used

- Google Apps Script
- HTML5
- JavaScript
- Bootstrap 5
- SweetAlert2
- Chart.js
- Google Sheets Database

---

## 📂 Project Structure

```bash
├── Index.html
├── usuarios_view.html
├── usuarios_js.html
├── ventas_view.html
├── ventas_js.html
├── pagos_view.html
├── pagos_js.html
├── metricas_view.html
├── metricas_js.html
├── code.gs
└── Storage Management System.xlsx
```

---

## ⚙️ How to Run the Project

### 1. Create a Google Apps Script Project

Go to:

https://script.google.com

Create a new project.

---

### 2. Upload the Files

Copy the content of:

- Index.html
- usuarios_view.html
- usuarios_js.html
- ventas_view.html
- ventas_js.html
- pagos_view.html
- pagos_js.html
- metricas_view.html
- code.gs

into your Apps Script project.

---

### 3. Create Google Sheets Database

Create a new Google Spreadsheet and configure the required sheets.

Then copy the Spreadsheet ID.

---

### 4. Configure Spreadsheet ID

Inside `code.gs`, replace:

```javascript
const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
```

with your Google Sheets ID.

---

### 5. Deploy the Application

In Google Apps Script:

1. Click **Deploy**
2. Select **New Deployment**
3. Choose **Web App**
4. Set access permissions
5. Deploy

---

## 📊 Main Modules

### 👥 User Management

- Create users
- Edit users
- Soft delete users
- Debt visualization

### 💰 Sales Management

- Register sales
- Associate sales with users
- WhatsApp sales summary

### 💳 Payment Management

- Register payments
- Reconcile pending debts
- Partial debt payments
- Payment notifications

### 📈 Metrics Dashboard

- Total sales
- Total payments
- Outstanding balance
- Top debtors
- Charts and analytics

---

## 📱 External Libraries

The project uses CDN libraries:

- Bootstrap 5
- SweetAlert2
- Chart.js

No local installation is required.

---

## 🚀 Future Improvements

- Authentication system
- Role-based access
- Export reports to PDF/Excel
- Email notifications
- Inventory management
- Cloud database migration

---

## 👨‍💻 Author

Developed by Leonardo Cardoso Rodriguez.
