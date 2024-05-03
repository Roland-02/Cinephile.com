# Film Recommendation App - Cinephile.com

## Information about this repository

Cinephile.com is a film recommendation website that allows users to browse through films and get recommendations based on their preferences.
<br>
The application has two servers, a Node server (running on port 8080) that controls the website, and Flask server (running on port 8081) that controls the recommendation engine on the backend.
<br>

SOFTWARE PRE-REQUISITES:
<ul>
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


PROJECT FILE STRUCTURE:<br>

<ul>    
    <li>/mysql_schema_tables (sql files for database migration)</li>
    <li>Dissertation.docx (pdf submitted on BlackBoard)</li>
    <li>/webpage (SYSTEM)
        <ul>
            <li>/bootstrap (external styling)</li>
            <li>/images</li>
            <li>/node_modules (packages for GUI)</li>
            <li>/routes (server-side)
                <ul>
                    <li>recommendEngine.py (python recommendation engine, FLASK)</li>
                    <li>tmdb_calls.py (TMDB api calls)</li>
                    <li>films.js (internal films dataset routing)</li>
                    <li>createAccount.js</li>
                    <li>login.js</li>
                    <li>index.js</li>
                    <li>profile.js</li>
                    <li>search.js</li>
                    <li>watchlist.js</li>
                </ul>
            </li>
            <li>/scripts (client-side)
                <ul>
                    <li>createAccount.js</li>
                    <li>login.js</li>
                    <li>index.js</li>
                    <li>profile.js</li>
                    <li>recommend.js</li>
                    <li>search.js</li>
                    <li>watchlist.js</li>
                </ul>
            </li>
            <li>/styles (custom css)
                <ul>
                    <li>createAccount.css</li>
                    <li>login.css</li>
                    <li>index.css</li>
                    <li>profile.css</li>
                    <li>recommend.css</li>
                    <li>search.css</li>
                    <li>watchlist.css</li>
                </ul>
            </li>
            <li>/views (html pages)
                <ul>
                    <li>createAccount.ejs</li>
                    <li>login.ejs</li>
                    <li>index.ejs</li>
                    <li>profile.ejs</li>
                    <li>recommend.ejs</li>
                    <li>search.ejs</li>
                    <li>watchlist.ejs</li>
                </ul>
            </li>
            <li>database.js (database connection)</li>
            <li>app.js (NODE server file - RUN THIS)</li>
        <ul>
    </li>
</ul>
