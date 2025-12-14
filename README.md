# Film Recommendation App - Cinephile.com

## Project Overview

Cinephile.com is an innovative film recommendation website that leverages machine learning algorithms to provide users with personalized film suggestions. With a user-friendly interface and advanced recommendation engine, Cinephile.com helps movie enthusiasts discover films tailored to their tastes.

### Tech Stack

- **Frontend:** 
  - HTML, CSS, JavaScript
  - Bootstrap for responsive design
- **Backend:**
  - Node.js for the server-side application (running on port **8080**)
  - Flask for the recommendation engine (running on port **8081**)
  - MySQL for database management
- **Machine Learning:**
  - Python for implementing recommendation algorithms
- **Development Tools:**
  - npm for package management
  - MySQL Workbench for database visualization and management

## Key Features

- **Personalized Recommendations:** Utilizes machine learning algorithms to analyze user preferences and suggest relevant films.
- **User-Friendly Interface:** Easy navigation and search capabilities to enhance the user experience.
- **API Integration:** Allows for seamless interaction with the recommendation engine through the accessible API in `RecommendEngine.py`.
- **Multi-Server Architecture:** Operates with two servers to handle front-end requests and backend processing efficiently.

## Achievements

- Developed a fully functional film recommendation system that has been tested with real user data.
- Successfully integrated a responsive front-end design, making the application accessible across various devices.
- Implemented robust error handling and validation mechanisms to ensure a smooth user experience.

## Software Prerequisites

To run the application, you will need to have the following installed on your local machine:

- npm
- MySQL Workbench
- A modern web browser (Chrome is recommended)

### Database Setup

- Ensure that the packages in the `node_modules` folder are stored locally.
- Migrate the database to your local machine by executing the SQL files located in the `/mysql_schema_tables` folder.
  - Make sure the schema is named `users`.
  - Update the database host and password in `database.js` to match your local credentials.

## How to Run the Application

1. Start the Node.js server:
   
   -terminal: node app.js

2. The terminal will display the status and outputs from both servers:
    
   -Access the frontend at http://localhost:8080
   
   -For direct API requests, use http://127.0.0.1:8081 


<img width="1440" alt="Screenshot 2024-04-14 at 17 56 03" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/55ccf4f7-85a8-4abd-a466-c5e432862c1f">
<br>
<img width="1440" alt="Screenshot 2024-04-14 at 17 56 45" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/93066a3d-4ecd-44f7-9753-cd55314271d1">
<br>
<img width="1440" alt="Screenshot 2024-04-14 at 17 56 27" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/8a04787d-e22f-449a-b4e1-dab830e13232">
<br>
<img width="1440" alt="Screenshot 2024-04-14 at 17 56 56" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/76825720-91c8-464a-8b90-14bd2dc06a6a">
<br>
