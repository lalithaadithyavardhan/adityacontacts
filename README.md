# 📱 Aditya Contacts

**Aditya Contacts** is a mobile application designed to manage and
access university contact information in one place. The system includes
a **React Native (Expo) mobile app** and a **Node.js + Express backend**
connected to **MongoDB**.

The application allows users to easily search contacts, manage phone
numbers, and directly initiate calls from within the app.

## 📸 App Showcase

<table align="center">
  <tr>
    <td align="center"><b>Loading Screen</b></td>
    <td align="center"><b>Home Screen</b></td>
    <td align="center"><b>Officers Tab</b></td>
    <td align="center"><b>Directory List</b></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/282da9d8-07f5-41e8-9aa2-d4b669a5db7a" width="200" alt="Loading screen"></td>
    <td><img src="https://github.com/user-attachments/assets/8263feb1-34b4-4f3b-bfee-89c80e75f9e2" width="200" alt="HomeScreen"></td>
    <td><img src="https://github.com/user-attachments/assets/32e707f6-860a-4677-b114-0a9e57c3959d" width="200" alt="Officers Tab"></td>
    <td><img src="https://github.com/user-attachments/assets/1c8b9044-a576-4db7-8b04-e53c02077629" width="200" alt="Directory List"></td>
  </tr>

  <tr>
    <td align="center"><b>Contact Details</b></td>
    <td align="center"><b>Share Contact</b></td>
    <td align="center"><b>Favorites</b></td>
    <td align="center"><b>Recent Calls</b></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/68cb3924-4468-4d0b-8972-ca10075bfbf5" width="200" alt="Contact Details"></td>
    <td><img src="https://github.com/user-attachments/assets/78284c45-36ea-4d6f-b009-4b21ecb314dd" width="200" alt="Share Contact"></td>
    <td><img src="https://github.com/user-attachments/assets/0567efbb-6832-4f7d-a001-80d70fe73eac" width="200" alt="Favorites"></td>
    <td><img src="https://github.com/user-attachments/assets/e93801f7-4824-4f1b-a8e9-1ced09cf2bc1" width="200" alt="Recent Calls"></td>
  </tr>

  <tr>
    <td align="center"><b>Search</b></td>
    <td align="center"><b>Deans</b></td>
    <td align="center"><b>HODs</b></td>
    <td align="center"><b>School of Business</b></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/a485088e-723f-4e16-9af5-fb74d1f3d85b" width="200" alt="Search"></td>
    <td><img src="https://github.com/user-attachments/assets/078f759b-b256-48aa-b7dc-5874b04ff363" width="200" alt="Deans"></td>
    <td><img src="https://github.com/user-attachments/assets/0e7cdb2d-9dbb-449a-a56d-d9a016f6d028" width="200" alt="HODs"></td>
    <td><img src="https://github.com/user-attachments/assets/53260922-6d4c-4520-9054-fe7ff7ac7c54" width="200" alt="School of Business"></td>
  </tr>

  <tr>
    <td align="center"><b>Placement & Training</b></td>
    <td align="center"><b>Academic Support</b></td>
    <td align="center"><b>About Tab</b></td>
    <td align="center"><b>About Details</b></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/ee5416ca-d2ad-4fc2-8d05-3e151133f104" width="200" alt="Placement & Training"></td>
    <td><img src="https://github.com/user-attachments/assets/b36e6b32-b7de-4eb7-9f70-d8800608e24d" width="200" alt="Academic Support"></td>
    <td><img src="https://github.com/user-attachments/assets/0b685fbd-d44c-4e05-8a7b-3f5ca1fd4b30" width="200" alt="About Tab"></td>
    <td><img src="https://github.com/user-attachments/assets/a011147d-c197-479f-a009-af27bd40c552" width="200" alt="About Details"></td>
  </tr>
</table>
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
