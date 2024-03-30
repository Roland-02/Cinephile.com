var { getConnection } = require('../database');


function loadFilmsDB() {
    return new Promise((resolve, reject) => {
        getConnection(async (err, connection) => {

            if (err) {
                reject(err);
                return;
            }

            const query = 'SELECT * FROM all_films';

            connection.query(query, async (err, results) => {
                connection.release();

                if (err) {
                    reject(err);
                    return;
                }

                let out = JSON.parse(JSON.stringify(results))
                resolve(out);
            });
        });
    });
}


module.exports = { loadFilmsDB };
