# Film Recommendation App - Cinephile.com

## Information about this repository

Cinephile.com is a film recommendation website that allows users to browse through films and receive recommendations based on their preferences using Machine Learning algorithms.
<br>
The application has two servers, a Node server (running on port 8080) that serves the frontend, and Flask server (running on port 8081) that controls the recommendation engine on the backend. The RecommendEngine.py file is an accesible API allowing user-film preference data to inputted to receive set of recommendations. Preference data must be organised as instructed in documentation.
<br>

SOFTWARE PRE-REQUISITES:
<ul>
<li>npm</li>
<li>MySql Workbench</li>
<li>any browser (Chrome recommennded)</li>
<li>packages in the node_modules folder must stored locally</li>
<li>database must be migrated onto local machine by running sql files in /mysql_schema_tables folder</li>
    <li>make sure the schema is called 'users'</li>
    <li>you will need to change the database host and password in database.js to your credentials</li>
</ul>

TO RUN:
<ul>
<li>navigate to the /webpage directory in terminal</li>
<li>run 'node app'</li>
<li>the terminal will show the status and outputs from both servers, navigate to http://localhost:8080 to access the website</li>
<li>the http://127.0.0.1:8081 link is also available for direct API request-making</li>
</ul>



<img width="1440" alt="Screenshot 2024-04-14 at 17 56 03" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/55ccf4f7-85a8-4abd-a466-c5e432862c1f">
<br>
<img width="1440" alt="Screenshot 2024-04-14 at 17 56 45" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/93066a3d-4ecd-44f7-9753-cd55314271d1">
<br>
<img width="1440" alt="Screenshot 2024-04-14 at 17 56 27" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/8a04787d-e22f-449a-b4e1-dab830e13232">
<br>
<img width="1440" alt="Screenshot 2024-04-14 at 17 56 56" src="https://github.com/Roland-02/Cinephile.com/assets/111765814/76825720-91c8-464a-8b90-14bd2dc06a6a">
<br>
