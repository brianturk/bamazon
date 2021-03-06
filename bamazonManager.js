const inquirer = require('inquirer');
const TtyTable = require('tty-table');
var {conn} = require('./lib/shared.js');
var {getSQL} = require('./lib/shared.js');
var {formatter} = require('./lib/shared.js');
var {formatterNumber} = require('./lib/shared.js');


//start here
console.log('Welcome to the Bamazon Manager\'s Menu!');
start();


async function start() {
    inquirer
        .prompt([
            {
                message: 'Select an option',
                type: 'list',
                name: 'menuChoice',
                choices: ['View Products for Sale', 'View Low Inventory', 'Add to Inventory', 'Add New Product', 'Exit']
            }
        ])
        .then(async function (answer) {
            if (answer.menuChoice === 'Exit') {
                console.log('\nThank you for visiting the Bamazon Manager\'s menu.  Bye :)');
                conn.end();
            } else if (answer.menuChoice === 'View Products for Sale') {
                var result = await viewProducts(false);
                start();
            } else if (answer.menuChoice === 'View Low Inventory') {
                var result = await viewProducts(true);
                start();
            } else if (answer.menuChoice === 'Add New Product') {
                var result = addProduct();
            } else {
                var result = addToInventory()
            }
        })
}


function getItemInfo(itemId) {
    return new Promise(async function (resolve, reject) {
        var results = await getSQL(`SELECT 
                                        a.product_name, 
                                        a.department_id,
                                        b.department_name,
                                        a.stock_quantity 
                                    FROM 
                                        products as a
                                            LEFT JOIN
                                        departments as b
                                            ON
                                            a.department_id = b.department_id
                                    WHERE 
                                        a.item_id = ${itemId}`)


        if (results[0]) {
            resolve(JSON.parse(JSON.stringify(results)));
        } else {
            resolve([]);
        }
    })
}


function addToInventoryAmt(itemId, itemInfo) {
    inquirer
        .prompt([
            {
                message: `\nProduct Name: ${itemInfo[0].product_name}\nDepartment Name: (${itemInfo[0].department_id}) ${itemInfo[0].department_name}\nStock_Quantity: ${itemInfo[0].stock_quantity}\nAdjust the inventory amount by entering a positive or negative number`,
                name: 'addStock',
                validate: function (input) {
                    if (isNaN(input)) {
                        return 'Invalid Quantity'
                    } else if (!Number.isInteger(Number(input))) {
                        return 'Invalid Quantity'
                    } else if (itemInfo[0].stock_quantity + parseInt(input) < 0) {
                        return 'Cannot subtract more than the Stock Quantity.'
                    } else {
                        return true
                    }
                }
            }

        ])
        .then(async function (answer) {
            if (answer.addStock === 0) {
                start();
            } else {
                var results = await updateStock(itemId, parseInt(answer.addStock));
                start();
            }
        })
}



function addToInventory() {
    var itemInfo = [];
    inquirer
        .prompt([
            {
                message: 'Item ID',
                name: 'itemId',
                validate: async function (input) {
                    if (isNaN(input)) {
                        return 'Invalid Item ID'
                    } else if ((!Number.isInteger(Number(input))) || (parseInt(input) < 1)) {
                        return 'Invalid Item ID.'
                    } else {
                        itemInfo = await getItemInfo(parseInt(input))
                        if (itemInfo[0]) {
                            return true
                        } else {
                            return `Item with Item ID "${input}" not found.`
                        }
                    }
                }
            }
        ])
        .then(function (answer) {
            addToInventoryAmt(parseInt(answer.itemId), itemInfo);
        })
}


function updateStock(itemId, addStock) {
    return new Promise(async function (resolve, reject) {
        var results = await getSQL(`UPDATE products 
                                    SET stock_quantity = stock_quantity + ${addStock}
                                    WHERE item_id = ${itemId}`)

        if (results.protocol41) {
            console.log(`\nUpdated stock for Item ID "${itemId}"\n`);
            resolve(true);
        } else {
            resolve(false);
        }
    })
}


function getDepartments() {
    return new Promise(async function (resolve, reject) {
        var results = await getSQL('SELECT department_name FROM departments ORDER BY department_id')

        if (results[0]) {
            results = results.map(function (a) { return [a.department_name]; }).join().split(',');
            resolve(results)
        } else {
            resolve('');
        }
    })
}


function noDupeProduct(productName, departmentName) {
    return new Promise(async function (resolve, reject) {
        var results = await getSQL(`SELECT 
                                        count(*) as num 
                                    FROM 
                                        products as a 
                                            left join
                                        departments as b
                                            on
                                            a.department_id = b.department_id
                                    WHERE 
                                        a.product_name = "${productName}" AND 
                                        b.department_name = "${departmentName}"`)


        if (results[0]) {
            if (results[0].num === 0) {
                resolve(true)
            } else {
                console.log(`\nAn item with this Product Name and Department Name already exists in the store, so I cannot add it.\n`);
                resolve(false)
            }
        } else {
            resolve(false);
        }
    })
}


function addProductIn(productName, departmentName, price, stockQuantity) {
    return new Promise(async function (resolve, reject) {

        //Department Name is always unique, but using department ID in products table
        var departmentIdResults = await getSQL(`select department_id from departments where department_name = "${departmentName}" LIMIT 1`)

        
        var departmentId = departmentIdResults[0].department_id;

        var results = await getSQL(`INSERT INTO products SET 
                                        product_name = "${productName}",
                                        department_id = ${departmentId},
                                        price = ${price},
                                        stock_quantity = ${stockQuantity}
                                        `)

        
        if (results.insertId) {
            console.log(`\nAdded item.  New Item ID is "${results.insertId}"\n`);
            resolve(true);
        } else {
            resolve(false);
        }
    })
}


async function addProduct() {

    var departments = await getDepartments();

    inquirer
        .prompt([
            {
                message: 'Product Name (Type "exit" to cancel)',
                name: 'productName'
            },
            {
                message: 'Department Name',
                type: 'rawlist',
                name: 'departmentName',
                choices: departments
            },
            {
                message: 'Price',
                name: 'price',
                validate: function (input) {
                    if (isNaN(input)) {
                        return 'Invalid Price'
                    } else {
                        var reg = /^[0-9]+(\.[0-9]{1,2})?$/gm
                        let price = parseFloat(input)
                        if (reg.test(price)) {
                            return true;
                        } else {
                            return 'Invalid price.  Numbers with 2 decimal places only.'
                        }
                    }
                }
            },
            {
                message: 'Stock Quantity',
                name: 'stockQuantity',
                validate: function (input) {
                    if (isNaN(input)) {
                        return 'Invalid Quanity'
                    } else if ((!Number.isInteger(Number(input))) || (parseInt(input) < 0)) {
                        return 'Invalid Quantity'
                    } else {
                        return true
                    }
                }
            }
        ])
        .then(async function (answer) {
            if (answer.productName.toLowerCase() === 'exit') {
                start();
            } else {
                if (await noDupeProduct(answer.productName.trim(), answer.departmentName.trim())) {
                    var results = await addProductIn(answer.productName.trim(), answer.departmentName.trim(), answer.price, answer.stockQuantity);
                    start();
                } else {
                    start();
                }
            }
        })

}



function viewProducts(lowInventory) {
    return new Promise(async function (resolve, reject) {
        if (lowInventory) {
            console.log('\nHere are all of the products with less than six items in stock...');
            var sqlText = `SELECT 
                                a.item_id, 
                                a.product_name, 
                                CONCAT("(", CAST(a.department_id as CHAR), ") ", b.department_name) as department_key,
                                a.price, 
                                a.stock_quantity 
                            FROM 
                                products as a
                                LEFT JOIN
                                departments as b
                                ON
                                a.department_id = b.department_id WHERE stock_quantity < 6`
        } else {
            console.log('\nHere are all of the products for sale...');
            var sqlText = `SELECT 
                                a.item_id, 
                                a.product_name, 
                                CONCAT("(", CAST(a.department_id as CHAR), ") ", b.department_name) as department_key,
                                a.price, 
                                a.stock_quantity 
                            FROM 
                                products as a
                                LEFT JOIN
                                departments as b
                                ON
                                a.department_id = b.department_id`
        }

        var results = await getSQL(sqlText)

        if (results[0]) {
            var resultsArray = results.map(function (a) { return [a.item_id, a.product_name, a.department_key, a.price, a.stock_quantity]; });

            const tableHeader = [
                {
                    value: "ID",
                    headerColor: "cyan",
                    color: "yellow",
                    headerAlign: "right",
                    align: "right",
                    width: 7
                },
                {
                    value: "Name",
                    headerColor: "cyan",
                    color: "yellow",
                    headerAlign: "left",
                    align: "left",
                    width: 30
                },
                {
                    value: "Department",
                    headerColor: "cyan",
                    color: "yellow",
                    headerAlign: "left",
                    align: "left",
                    width: 30
                },
                {
                    value: "Price",
                    headerColor: "cyan",
                    color: "yellow",
                    headerAlign: "right",
                    align: "right",
                    formatter: function (value) {
                        return formatter.format(value);
                    },
                    width: 13
                },
                {
                    value: "Quantity",
                    headerColor: "cyan",
                    color: "yellow",
                    headerAlign: "right",
                    align: "right",
                    formatter: function (value) {
                        return formatterNumber.format(value);
                    },
                    width: 13
                }
            ]

            var t1 = TtyTable(tableHeader, resultsArray, []);
            console.log(t1.render());

            resolve(resultsArray);

        } else {
            console.log('No items found with stock quantity less than six.\n')
            resolve('');
        }
    })
}


