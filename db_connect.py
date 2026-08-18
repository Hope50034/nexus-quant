import pyodbc

# 1. Define the connection string
# Note: You may need to change 'ODBC Driver 17 for SQL Server' to 'ODBC Driver 18' depending on what is installed on your Windows 11 PC.
conn_str = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=.\SQLEXPRESS;'
    r'DATABASE=InventoryDB;'
    r'Trusted_Connection=yes;'
    r'Encrypt=yes;'
    r'TrustServerCertificate=yes;'
)

try:
    # 2. Establish the connection
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    print("Successfully connected to the database!\n")

    # 3. Execute a SQL query
    cursor.execute("SELECT ProductName, StockQuantity, Price FROM Products")
    
    # 4. Fetch and print the results
    for row in cursor.fetchall():
        print(f"Product: {row.ProductName} | Stock: {row.StockQuantity} | Price: ${row.Price}")

except Exception as e:
    print(f"An error occurred: {e}")

finally:
    # 5. Always close the connection when finished
    if 'conn' in locals():
        conn.close()