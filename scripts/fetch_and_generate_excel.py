import os
import requests
import pandas as pd

# Load env vars
shop_url = os.environ["SHOPIFY_STORE_URL"]
api_key = os.environ["SHOPIFY_API_KEY"]
api_pass = os.environ["SHOPIFY_API_PASSWORD"]
qikin_token = os.environ["QIKIN_API_TOKEN"]

# Step 1: Fetch orders from Shopify
def fetch_shopify_orders():
    url = f"{shop_url}/admin/api/2023-10/orders.json?status=any"
    response = requests.get(url, auth=(api_key, api_pass))
    response.raise_for_status()
    return response.json()["orders"]

# Step 2: Fetch delivery method from Qikin
def fetch_qikin_delivery(order_id):
    # Placeholder: replace with real Qikin endpoint
    url = f"https://api.qikin.com/deliveries/{order_id}"
    headers = {"Authorization": f"Bearer {qikin_token}"}
    try:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()
        return resp.json().get("delivery_type", "unknown")
    except:
        return "unknown"

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
                "COD or Paid": "COD" if order.get("payment_gateway_names", [""])[0] == "cash_on_delivery" else "Paid",
                "Delivery Type": fetch_qikin_delivery(order.get("id"))
            })

    df = pd.DataFrame(data)
    df.to_excel("order_report.xlsx", index=False)

if __name__ == "__main__":
    orders = fetch_shopify_orders()
    create_excel(orders)
