# ReSell Hub — Backend API

Backend API for the ReSell Hub second-hand marketplace platform.

## Project Overview

ReSell Hub provides a marketplace where buyers can purchase second-hand products and sellers can manage their listings and orders.

## Technology Stack

- Node.js
- Express.js
- MongoDB
- Stripe
- Environment variables using dotenv

## Main Features

- User authentication and role-based access
- Buyer, seller, and admin operations
- Product listing and management
- Admin product approval
- Wishlist and order management
- Stripe test payment integration
- Payment history
- Seller sales analytics

## Local Setup

1. Install dependencies:

   `npm install`

2. Create a `.env` file using `.env.example` as a reference.

3. Configure MongoDB and other required credentials.

4. Start the backend:

   `npm run dev`

## Environment Security

Never commit actual `.env` files, passwords, API keys, or secret tokens.

## Frontend

ReSell Hub React application. GitHub repository link will be added after creation.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Check API health |
| GET | `/api/products` | Get product listings |
| GET | `/api/products/:id` | Get a product by ID |
| GET | `/api/products/:id/reviews` | Get product reviews |
| GET | `/api/marketplace/categories` | Get marketplace categories |
| GET | `/api/marketplace/stats` | Get marketplace statistics |
| GET | `/api/marketplace/trusted-sellers` | Get trusted sellers |
| GET | `/api/marketplace/success-stories` | Get success stories |

### API Testing

Start the server:

`npm start`

Health check:

`http://localhost:5000/api/health`

Products endpoint:

`http://localhost:5000/api/products`

The products endpoint returns product data and pagination
information, including the current page, total pages,
and total product count.