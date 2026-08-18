import pyodbc
import pandas as pd

# Define the connection string
conn_str = (
    r'DRIVER={ODBC Driver 17 for SQL Server};'
    r'SERVER=.\SQLEXPRESS;'
    r'DATABASE=InventoryDB;'
    r'Trusted_Connection=yes;'
    r'Encrypt=yes;'
    r'TrustServerCertificate=yes;'
)

try:
    # --- 1. EXTRACT ---
    print("Connecting to database...")
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # Execute query and fetch all rows
    cursor.execute("SELECT ProductName, StockQuantity, Price FROM Products")
    rows = cursor.fetchall()
    
    # Get column names from the cursor description
    columns = [column[0] for column in cursor.description]
    
    # Load the raw data into a pandas DataFrame
    df = pd.DataFrame.from_records(rows, columns=columns)
    print("\n--- Raw Data Extracted ---")
    print(df)

    # --- 2. TRANSFORM ---
    # Ensure the Price column is treated as a float for math operations
    df['Price'] = df['Price'].astype(float)
    
    # Create a new column calculating the total value of the inventory
    df['TotalValue'] = df['StockQuantity'] * df['Price']
    print("\n--- Data Transformed ---")
    print(df)

    # --- 3. LOAD ---
    # Export the manipulated DataFrame to a CSV file
    export_filename = 'inventory_report.csv'
    df.to_csv(export_filename, index=False)
    print(f"\nSuccess! Pipeline complete. Report exported to your folder as {export_filename}")

except Exception as e:
    print(f"An error occurred: {e}")

finally:
    # Always close the connection
    if 'conn' in locals():
        conn.close()