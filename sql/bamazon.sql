DROP DATABASE IF EXISTS bamazon;

CREATE DATABASE bamazon;

USE playlist_db;

CREATE TABLE products (
  item_id INT NOT NULL AUTO_INCREMENT,
  product_name VARCHAR(200) NULL,
  department_name VARCHAR(200) NULL,
  price DECIMAL(13,2) NULL,
  stock_quantity integer default 0,
  product_sales DECIMAL(13,2) default 0,
  PRIMARY KEY (item_id)
);

INSERT INTO products (product_name, department_name, price, stock_quantity)
VALUES 	("Basketball", "Sporting Goods", "20.15", 200), 
		("Basketball", "Sporting Goods", "20.15", 200);




