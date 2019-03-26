const inquirer = require('inquirer');
const TtyTable = require('tty-table');
var {conn} = require('./shared.js');
var {getSQL} = require('./shared.js');
var {formatter} = require('./shared.js');





//start here
console.log('Welcome to Bamazon!');
buyItem('');

function checkItem(item, itemArray) {
    let isValid = false
    itemArray.forEach(function (value, key) {
        if (value[0] === item) {
            isValid = true;
        }
    })

    return isValid;
}


async function buyItem(resultText) {
    var resultsArray = await itemList();
    if (resultText != '') {
        console.log(resultText)
    }
    if (resultsArray === '') {
        console.log('Unable to get items from the store.  Please try again later.');
    } else {
        return new Promise(async function (resolve, reject) {
            inquirer
                .prompt([
                    {
                        message: 'Enter the [ID] of the item you would like to buy (Type "exit" to leave the store):',
                        name: 'itemId',
                        validate: function (input) {
                            if (input != 'exit') {
                                if (isNaN(input)) {
                                    return 'Invalid Item ID.'
                                } else if (!Number.isInteger(Number(input))) {
                                    return 'Invalid Item ID.'
                                } else if (!checkItem(parseInt(input), resultsArray)) {
                                    return 'Invalid Item ID'
                                } else {
                                    return true;
                                }
                            } else {
                                return true;
                            }
                        }
                    },
                    {
                        when: function (response) {
                            return (response.itemId.toLowerCase() != 'exit');
                        },
                        message: 'Quantity:',
                        name: 'quantity',
                        validate: function (input) {
                            if (isNaN(input)) {
                                return 'Invalid Quantity'
                            } else if ((!Number.isInteger(Number(input))) || (parseInt(input) < 1)) {
                                return 'Invalid Quantity.'
                            } else {
                                return true;
                            }
                        }
                    }
                ])
                .then(async function (answer) {
                    if (answer.itemId.toLowerCase() === 'exit') {
                        console.log('\nThank you for visiting Bamazon.  Bye :)');
                        conn.end();
                    } else {
                        var result = await purchaseItem(answer.itemId, answer.quantity);
                        buyItem(result);
                    }
                })
        })
    }
}



async function purchaseItem(itemId, quantity) {
    return new Promise(async function (resolve, reject) {
        var results = await getSQL(`SELECT stock_quantity, price, product_sales FROM products WHERE item_id = ${itemId}`)

        if (results[0]) {
            var stockQuantity = parseInt(results[0].stock_quantity);
            var price = parseFloat(results[0].price);
            var productSales = parseFloat(results[0].product_sales);
            if (stockQuantity < quantity) {
                resolve(`We do not have enough of that item for that quantity.  Our current stock is ${stockQuantity} of this item.`);
            } else {  //make purchase 
                stockQuantity -= quantity;
                var totalCost = quantity * price
                productSales = productSales + totalCost;
                var results = await getSQL(`UPDATE products SET 
                                    stock_quantity = ${stockQuantity},
                                    product_sales = ${productSales}  WHERE item_id = ${itemId}`)
                if (results.protocol41) {
                    resolve(`\nPurchase made!  Your total cost was ${formatter.format(totalCost)}\n`)
                } else {
                    resolve('Error with purchase.')
                }
            }
        } else {
            resolve(results);
        }
        resolve(results);
    })
}




async function itemList() {
    return new Promise(async function (resolve, reject) {
        console.log('\nHere are all our items...');
        var results = await getSQL(`SELECT 
                                        a.item_id, 
                                        a.product_name, 
                                        b.department_name, 
                                        a.price 
                                    FROM 
                                        products as a 
                                            left join
                                        departments as b
                                            on
                                            a.department_id = b.department_id 
                                    WHERE 
                                        a.stock_quantity > 0`)

        if (results[0]) {
            var resultsArray = results.map(function (a) { return [a.item_id, a.product_name, a.department_name, a.price]; });

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
                }
            ]

            var t1 = TtyTable(tableHeader, resultsArray, []);
            console.log(t1.render());

            resolve(resultsArray);

        } else {
            console.log(results);
            resolve('');
        }
    })
}