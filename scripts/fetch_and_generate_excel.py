import os
import requests
import pandas as pd
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Load env vars
shop_url = "https://aneem.in"
access_token = "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"  # Use the access token instead of API key and password

# Step 1: Fetch orders from Shopify
def fetch_shopify_orders():
    url = f"{shop_url}/admin/api/2023-10/orders.json?status=any"
    
    headers = {
        "Authorization": f"Bearer {access_token}",  # Bearer token authentication
        "Content-Type": "application/json"
    }
    
    response = requests.get(url, headers=headers, verify=False)  # Use headers for authentication
    response.raise_for_status()  # This will raise an exception if the response is an error
    print("Using store URL:", shop_url)
    return response.json()["orders"]

# Step 3: Process data and write to Excel
def create_excel(orders):
    data = []
    for idx, order in enumerate(orders, start=1):
        customer = order.get("customer", {})
        shipping = order.get("shipping_address", {})
        line_items = order.get("line_items", [])
        
        for item in line_items:
            data.append({
                "Sr No": idx,
                "Customer Name": f"{customer.get('first_name', '')} {customer.get('last_name', '')}",
                "T-shirt Order": item.get("title", ""),
                "Size": item.get("variant_title", ""),
                "City": shipping.get("city", ""),
                "State": shipping.get("province", ""),
                "COD or Paid": "COD" if order.get("payment_gateway_names", [""])[0] == "cash_on_delivery" else "Paid"
            })

    df = pd.DataFrame(data)
    df.to_excel("order_report.xlsx", index=False)

if __name__ == "__main__":
    orders = fetch_shopify_orders()
    create_excel(orders)
