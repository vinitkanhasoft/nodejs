#!/bin/bash

echo "Installing Node.js dependencies..."

# Install production dependencies
npm install express mongoose jsonwebtoken bcryptjs cors helmet compression morgan multer nodemailer cloudinary speakeasy qrcode express-rate-limit winston

# Install development dependencies
npm install -D @types/node @types/express @types/jsonwebtoken @types/bcryptjs @types/cors @types/compression @types/morgan @types/multer @types/nodemailer @types/qrcode typescript ts-node nodemon

echo "Dependencies installed successfully!"
echo "You can now run the application with: npm run dev"
