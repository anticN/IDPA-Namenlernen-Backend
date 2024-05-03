#!/bin/bash

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file
echo "Creating .env file..."
echo "DB_HOST=localhost" > .env
echo "DB_USER=idpa" >> .env
echo "DB_PASSWORD=IDPA2024" >> .env
echo "DB_NAME=learnnames_DB" >> .env
echo "SECRET=\"Ein beliebiges Secret\"" >> .env

# Create uploads folder
echo "Creating 'uploads' folder..."
mkdir uploads

# Modify node_modules/pdf-parse/index.js
echo "Modifying node_modules/pdf-parse/index.js..."
sed -i '6,$d' node_modules/pdf-parse/index.js

# Start server
echo "To start the server:"
echo "npm run start  # Start server"
echo "npm run dev    # Start server with Nodemon"
