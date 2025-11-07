# MediCare - Online Pharmacy Platform

A comprehensive e-commerce platform for pharmaceutical products, built with Angular and Node.js. MediCare provides a complete solution for online medicine sales, including product catalog, shopping cart, order management, and an admin panel for content management.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Usage Guide](#usage-guide)
- [Deployment](#deployment)
- [API Documentation](#api-documentation)
- [Team Members](#team-members)
- [Contributing](#contributing)
- [License](#license)

## Overview

MediCare is a full-stack web application designed for online pharmacy operations. The platform consists of three main components:

- **Client Frontend**: Customer-facing website for browsing products, managing cart, and placing orders
- **Admin Frontend**: Administrative panel for managing products, blogs, diseases, banners, and orders
- **Backend API**: RESTful API server built with Express.js and MongoDB

## Features

### Customer Features

- Product browsing and search with advanced filters
- Product details with images, descriptions, and specifications
- Shopping cart management
- User authentication and profile management
- Order placement and tracking
- Blog articles and health information
- Disease information database
- Pharmacist chat support
- Multiple payment methods (MoMo, Card, QR Code)
- Prescription upload and processing

### Admin Features

- Dashboard with statistics and analytics
- Product management (CRUD operations)
- Blog article management
- Disease information management
- Banner management
- Order management and processing
- User management
- Category and brand management

### Technical Features

- Responsive design for mobile and desktop
- Image optimization and lazy loading
- SEO-friendly URLs and meta tags
- Real-time inventory management
- Secure payment processing
- Email notifications
- PDF invoice generation
- OCR for prescription processing

## Technology Stack

### Frontend

- **Angular 20**: Modern web framework
- **TypeScript**: Type-safe JavaScript
- **Bootstrap 5**: CSS framework for responsive design
- **RxJS**: Reactive programming library

### Backend

- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database
- **JWT**: Authentication and authorization
- **Multer**: File upload handling
- **Nodemailer**: Email service
- **PDFKit**: PDF generation
- **Tesseract.js**: OCR for image processing

### Development Tools

- **Git**: Version control
- **PM2**: Process manager for Node.js
- **Nginx/IIS**: Web server (production)

## Project Structure

```
MEDICARE_FINAL/
├── backend/                    # Backend API server
│   ├── config/                 # Configuration files
│   │   ├── database-indexes.js
│   │   └── environment.js
│   ├── middleware/             # Express middleware
│   │   ├── security.js
│   │   └── validation.js
│   ├── public/                 # Static files
│   │   └── uploads/            # User uploaded files
│   ├── scripts/                # Utility scripts
│   │   ├── init-database.js
│   │   ├── create-admin.js
│   │   └── ...
│   ├── scraper/                # Web scraping tools
│   ├── utils/                  # Utility functions
│   ├── server.js               # Main server file
│   ├── package.json
│   └── ecosystem.config.js     # PM2 configuration
│
├── my_client/                  # Customer frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── homepage/       # Homepage component
│   │   │   ├── product-detail/ # Product details
│   │   │   ├── cart/           # Shopping cart
│   │   │   ├── order/          # Order management
│   │   │   ├── blog-detail/    # Blog articles
│   │   │   ├── disease-detail/ # Disease information
│   │   │   └── ...
│   │   ├── index.html
│   │   └── main.ts
│   ├── public/                 # Static assets
│   │   └── assets/
│   │       └── images/
│   ├── angular.json
│   └── package.json
│
├── my_admin/                   # Admin frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/
│   │   │   │   ├── dashboard/  # Admin dashboard
│   │   │   │   ├── collections/ # CRUD pages
│   │   │   │   └── auth/       # Authentication
│   │   │   └── ...
│   │   ├── index.html
│   │   └── main.ts
│   ├── angular.json
│   └── package.json
│
├── scripts/                    # Deployment scripts
│   ├── backup-mongodb.ps1
│   ├── safe-push.ps1
│   └── ...
│
├── .gitignore
├── README.md
└── DEPLOYMENT_GUIDE.md
```

## Prerequisites

Before installing, ensure you have the following installed:

- **Node.js**: v18.x or v20.x ([Download](https://nodejs.org/))
- **MongoDB**: v6.0+ ([Download](https://www.mongodb.com/try/download/community))
- **Git**: For version control ([Download](https://git-scm.com/))
- **npm**: Comes with Node.js

For production deployment:
- **PM2**: Process manager (`npm install -g pm2`)
- **Nginx** (Linux) or **IIS** (Windows): Web server

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/98tttm/251EIE503001---WEB-BUSINESS---GROUP-2---FINAL-PROJECT.git
cd MEDICARE_FINAL
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Client Frontend Dependencies

```bash
cd ../my_client
npm install
```

### 4. Install Admin Frontend Dependencies

```bash
cd ../my_admin
npm install
```

## Configuration

### Backend Configuration

1. Create a `.env` file in the `backend/` directory:

```env
NODE_ENV=development
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
DB_NAME=MediCare_database

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRES_IN=7d

# CORS Allowed Origins
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:4201

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

2. Initialize the database:

```bash
cd backend
npm run init-db
```

3. Create an admin user:

```bash
node scripts/create-admin.js
```

### Frontend Configuration

Update API URLs in the frontend code if needed. The default configuration points to `http://localhost:3000/api`.

## Running the Application

### Development Mode

1. **Start MongoDB** (if not running as a service):

```bash
# Windows
net start MongoDB

# Linux/Mac
sudo systemctl start mongod
```

2. **Start Backend Server**:

```bash
cd backend
npm start
```

The backend will run on `http://localhost:3000`

3. **Start Client Frontend** (in a new terminal):

```bash
cd my_client
npm start
```

The client will run on `http://localhost:4200`

4. **Start Admin Frontend** (in a new terminal):

```bash
cd my_admin
npm start
```

The admin panel will run on `http://localhost:4201`

### Production Mode

For production deployment, refer to the [Deployment Guide](DEPLOYMENT_GUIDE.md) for detailed instructions on:

- Building the frontend applications
- Setting up PM2 for backend
- Configuring Nginx/IIS
- Setting up SSL certificates
- Database backup strategies

## Usage Guide

### For Customers

1. **Browse Products**: Navigate through categories or use the search function
2. **View Product Details**: Click on any product to see detailed information
3. **Add to Cart**: Add products to your shopping cart
4. **Checkout**: Proceed to checkout and complete your order
5. **Track Orders**: View your order history and track current orders
6. **Read Articles**: Browse health articles and disease information

### For Administrators

1. **Login**: Access the admin panel at `http://localhost:4201`
2. **Dashboard**: View statistics and overview
3. **Manage Products**: Add, edit, or delete products
4. **Manage Content**: Create and edit blog articles and disease information
5. **Manage Orders**: Process and update order status
6. **Manage Banners**: Update homepage banners and promotions

## Deployment

### Quick Deployment

For quick deployment instructions, see:
- [Quick Deploy Guide](QUICK_DEPLOY.md) (Linux)
- [Quick Deploy Guide for Windows](QUICK_DEPLOY_WINDOWS.md)

### Detailed Deployment

For comprehensive deployment instructions, see:
- [Deployment Guide](DEPLOYMENT_GUIDE.md) (Linux)
- [Deployment Guide for Windows](DEPLOYMENT_GUIDE_WINDOWS.md)

### Deployment Scripts

Use the provided scripts for automated deployment:

**Windows:**
```powershell
.\deploy.ps1 all
```

**Linux:**
```bash
./deploy.sh all
```

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Main Endpoints

- **Products**: `/api/products`
- **Blogs**: `/api/blogs`
- **Diseases**: `/api/diseases`
- **Orders**: `/api/orders`
- **Users**: `/api/users`
- **Auth**: `/api/auth`

### Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

For detailed API documentation, refer to the backend code or use API testing tools like Postman.

## Team Members

This project is developed by Group 2 for the course **251EIE503001 - WEB BUSINESS**.

| No | Name | Student ID | Email |
|----|------|------------|-------|
| 1 | Tran Thanh Thinh | K234111418 | thinhtt234111e@st.uel.edu.vn |
| 2 | Nguyen Hoang Duc | K234111430 | ducnh234112e@st.uel.edu.vn |
| 3 | Le Trung Nhan | K234111439 | nhanlt234112e@st.uel.edu.vn |
| 4 | Do Minh Nhat | K234111440 | nhatdm234112e@st.uel.edu.vn |
| 5 | Huynh Tan Phat | K234111414 | phatht234111e@st.uel.edu.vn |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Follow Angular style guide for frontend code
- Use ESLint for JavaScript/TypeScript linting
- Write meaningful commit messages
- Add comments for complex logic

## License

This project is developed for educational purposes as part of the WEB BUSINESS course at University of Economics and Law (UEL).

## Support

For issues, questions, or contributions, please contact the team members via email or create an issue in the repository.

## Acknowledgments

- University of Economics and Law (UEL)
- Course: 251EIE503001 - WEB BUSINESS
- All contributors and team members

---

**Last Updated**: November 2025
