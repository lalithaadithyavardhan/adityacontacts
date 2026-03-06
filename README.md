# 📱 Aditya Contacts

**Aditya Contacts** is a mobile application designed to manage and
access university contact information in one place. The system includes
a **React Native (Expo) mobile app** and a **Node.js + Express backend**
connected to **MongoDB**.

The application allows users to easily search contacts, manage phone
numbers, and directly initiate calls from within the app.

------------------------------------------------------------------------

# ✨ Features

## 📇 Contact Management

-   View and manage university contact details
-   Read and write device contacts
-   Organized contact access for students and staff

## 📞 Call Integration

-   Start phone calls directly from the app
-   Quick access to frequently used contacts

## 🎨 Modern UI

-   Built using React Native Paper
-   Smooth navigation with React Navigation
-   Clean and responsive mobile interface

## 🌐 Secure Backend API

-   REST API built with Node.js and Express
-   JWT Authentication
-   Rate limiting and security headers

## ☁️ Cloud Integration

-   Firebase integration for future real-time features
-   Cloud data synchronization capability

------------------------------------------------------------------------

# 🛠️ Tech Stack

## Mobile Application (Frontend)

-   Framework: React Native + Expo
-   Navigation: React Navigation (Stack & Bottom Tabs)
-   UI Components: React Native Paper, Expo Vector Icons
-   3D Rendering: Three.js, React Three Fiber, React Three Drei
-   Cloud Services: Firebase

## Backend API

-   Runtime: Node.js
-   Framework: Express.js
-   Database: MongoDB with Mongoose
-   Authentication: JWT (jsonwebtoken)
-   Security: Helmet, bcryptjs, express-rate-limit
-   Utilities: dotenv, cors, morgan, express-validator

------------------------------------------------------------------------

# ⚙️ Prerequisites

Make sure the following tools are installed before running the project.

-   Node.js (v16 or higher recommended)
-   Expo CLI
-   MongoDB (Local installation or MongoDB Atlas)

------------------------------------------------------------------------

# 🚀 Installation & Setup

## 1️⃣ Clone the Repository

``` bash
git clone https://github.com/lalithaadithyavardhan/adityacontacts.git
cd adityacontacts
```

## 2️⃣ Install Frontend Dependencies

``` bash
npm install
```

## 3️⃣ Install Backend Dependencies

``` bash
cd backend
npm install
```

## 4️⃣ Configure Environment Variables

Create a `.env` file inside the **backend** directory.

Example configuration:

    PORT=5000
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_secret_key

------------------------------------------------------------------------

# ▶️ Running the Application

## Run Frontend and Backend

``` bash
npm run dev
```

## Run Backend Only

``` bash
npm run backend
```

## Run Frontend Only

``` bash
npm start
```

You can also run the app on specific devices:

``` bash
npm run android
npm run ios
```

------------------------------------------------------------------------

# 🔐 App Permissions

The application requires the following permissions:

### 📷 Camera & Media Library

Used for capturing or uploading profile images.

### 👤 Contacts (Read/Write)

Allows the app to access and manage contacts on the device.

### 📞 Phone Calls (Android)

Enables direct phone calls from the application.

------------------------------------------------------------------------

# 👨‍💻 Author

**Aditya Sai**\
Aditya University

GitHub:\
https://github.com/lalithaadithyavardhan

------------------------------------------------------------------------

# 📄 License

This project is licensed under the **MIT License**.
