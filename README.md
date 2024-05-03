# Film Recommendation App - Cinephile.com

## Information about this repository

Cinephile.com is an film recommendation website that allows user to browse, search, save, and get suggested films based on their profile.

The application has two servers, a Node server (running on port 8080) that controls the entire website, and Flask server (running on port 8081) that controls the recommendation engine.

SOFTWARE PRE-REQUISITES:
-MySql Workbench
-any browser (Chrome recommennded)
-packages in the node_modules folder must stored locally
-database must be migrated onto local machine by running sql files in /mysql_schema_tables folder
    -make sure the schema is called 'users'
    -you will need to change the database host and password in database.js to your credentials

TO RUN:
-navigate to the /webpage directory in terminal
-run 'node app'
-the terminal will shpw the status and outputs from both servers, navigate to http://localhost:8080 to access the website
-the http://127.0.0.1:8081 link is also available for direct API request-making


PROJECT FILE STRUCTURE:
webpage:
    /bootstrap
    /images
    /node_modules
    /routes (server-side)
        -recommendEngine.py (python recommendation engine, FLASK)
        -tmdb_calls.py (TMDB api calls)
        -films.js (internal films dataset routing)
        -createAccount.js
        -login.js
        -index.js
        -profile.js
        -search.js
        -watchlist.js

    /scripts (client-side)
        -createAccount.js
        -login.js
        -index.js
        -profile.js
        -recommend.js
        -search.js
        -watchlist.js

    /styles (custom css)
        -createAccount.css
        -login.css
        -index.css
        -profile.css
        -recommend.css
        -search.css
        -watchlist.css
    
    /views (html pages)
        -createAccount.ejs
        -login.ejs
        -index.ejs
        -profile.ejs
        -recommend.ejs
        -search.ejs
        -watchlist.ejs

    -database.js (database connection)
    -app.js (NODE server file - RUN THIS)

/mysql_schema_tables (sql files for database migration)