require("dotenv").config();
const util = require('util');
const mysql = require('mysql');


const conn = mysql.createConnection({
    host: "localhost",
    port: 3306,
    user: "root",
    password: process.env.MYSQL_PASSWORD,
    database: "bamazon"
});

// node native promisify
const query = util.promisify(conn.query).bind(conn);

function getSQL(sqlText) {
    return new Promise(async function (resolve, reject) {
        try {
            const rows = await query(sqlText);
            resolve(rows);
        }
        catch (err) {
            resolve(err)
        }
        finally {
            // conn.end();
        }
    })
}

const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
})

const formatterNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    maximumFractionDigits: 0
})


module.exports = {
    conn: conn, 
    query: query,
    getSQL: getSQL,
    formatter: formatter,
    formatterNumber: formatterNumber
};