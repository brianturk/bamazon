const inquirer = require('inquirer');
const TtyTable = require('tty-table');
var { conn } = require('./lib/shared.js');
var { getSQL } = require('./lib/shared.js');
var { formatter } = require('./lib/shared.js');
var { formatterNumber } = require('./lib/shared.js');

//start here
console.log('Welcome to the Bamazon Supervisor\'s Menu!');
start();

async function start() {
    inquirer
        .prompt([
            {
                message: 'Select an option',
                type: 'list',
                name: 'menuChoice',
                choices: ['View Product Sales by Department', 'Create New Department', 'Exit']
            }
        ])
        .then(async function (answer) {
            if (answer.menuChoice === 'Exit') {
                console.log('\nThank you for visiting the Bamazon Supervisor\'s menu.  Bye :)');
                conn.end();
            } else if (answer.menuChoice === 'View Product Sales by Department') {
                var result = await viewProductsByDepartment();
                start();
            } else {
                var result = createDepartment();
            }
        })
}


function checkDepartment(departmentName) {
    return new Promise(async function (resolve, reject) {
        var results = await getSQL(`SELECT count(*) as num FROM departments WHERE 
                                    department_name = "${departmentName}"`)

        if (results[0]) {
            if (results[0].num === 0) {
                resolve(true)
            } else {
                resolve(false)
            }
        } else {
            resolve(false);
        }
    })
}


function createDepartment() {
    inquirer
        .prompt([
            {
                message: 'Enter the new department name (Type "exit" to return to the main menu):',
                name: 'name',
                validate: async function (input) {
                    var isNewDepartment = await checkDepartment(input);
                    if (input.toLowerCase() === 'exit') {
                        return true
                    } else if (isNewDepartment) {
                        return true
                    } else {
                        return 'Enter a unique new department name.'
                    }
                }
            },
            {
                when: function (response) {
                    return (response.name.toLowerCase() != 'exit');
                },
                message: 'New department overhead costs:',
                name: 'overheadCosts',
                validate: async function (input) {
                    if (isNaN(input)) {
                        return 'Invalid Price'
                    } else {
                        var reg = /^[0-9]+(\.[0-9]{1,2})?$/gm   //expression for currency
                        let costs = parseFloat(input)
                        if (reg.test(costs)) {
                            return true;
                        } else {
                            return 'Invalid overhead cost.  Numbers with 2 decimal places only.'
                        }
                    }
                }
            },
        ])
        .then(async function (answer) {
            if (answer.menuChoice === 'Exit') {
                start();
            } else {
                var result = await addDepartment(answer.name,parseFloat(answer.overheadCosts));
                start();
            } 
        })
}


function addDepartment(name, overheadCosts) {
    return new Promise(async function (resolve, reject) {

        var results = await getSQL(`INSERT INTO departments SET 
                                        department_name = "${name}",
                                        over_head_costs = ${overheadCosts}
                                        `)

        if (results.insertId) {
            console.log(`\nAdded department.  New Department ID is "${results.insertId}"\n`);
            resolve(true);
        } else {
            resolve(false);
        }
    })
}



async function viewProductsByDepartment() {
    return new Promise(async function (resolve, reject) {
        console.log('\nHere is product sales by department...');
        var results = await getSQL(`SELECT 
                                        a.department_id, 
                                        a.department_name, 
                                        a.over_head_costs, 
                                        sum(ifnull(b.product_sales,0)) as product_sales,
                                        sum(ifnull(b.product_sales,0)) - a.over_head_costs as total_profit
                                    FROM 
                                        departments as a
                                            left join
                                        products as b
                                            on
                                            a.department_id = b.department_id
                                    group by
                                        a.department_id,
                                        a.department_name,
                                        a.over_head_costs`)

        if (results[0]) {
            var resultsArray = results.map(function (a) {
                return [a.department_id,
                a.department_name,
                a.over_head_costs,
                a.product_sales,
                a.total_profit];
            });

            const tableHeader = [
                {
                    value: "Dept. ID",
                    headerColor: "cyan",
                    color: "yellow",
                    headerAlign: "right",
                    align: "right",
                    width: 7
                },
                {
                    value: "Department Name",
                    headerColor: "cyan",
                    color: "yellow",
                    headerAlign: "left",
                    align: "left",
                    width: 30
                },
                {
                    value: "Overhead Costs",
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
                    value: "Product Sales",
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
                    value: "Total Profit",
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