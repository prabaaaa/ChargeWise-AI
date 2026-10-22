import urllib.request
import json

req = urllib.request.urlopen("http://localhost:8000/api/comparison")
data = json.loads(req.read().decode("utf-8"))
unc_ivs = data["uncontrolled"]["intervals"]
opt_ivs = data["chargewise"]["intervals"]

print(f"Total intervals: {len(unc_ivs)}")
high_count = 0
for u, o in zip(unc_ivs, opt_ivs):
    u_req = u.get("total_requested_power_kw")
    u_site = u.get("site_total_power_kw")
    o_site = o.get("site_total_power_kw")
    if u_req is not None and u_req > 45.1:
        high_count += 1
        if high_count <= 8:
            print(f"{u['timestamp']}: Uncontrolled Requested={u_req:.1f} kW | Uncontrolled Clipped={u_site:.1f} kW | ChargeWise={o_site:.1f} kW")

print(f"Intervals where Uncontrolled exceeded 45 kW cap: {high_count}")
