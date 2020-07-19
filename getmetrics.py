import requests
import time

while 1:
    r = requests.get("http://localhost:4545/metrics");
    print(r.json())
    time.sleep(30)

