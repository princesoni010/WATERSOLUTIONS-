import math
from models import Zone


def haversine_meters(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two lat/lng points."""
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def find_nearest_zone(latitude, longitude):
    """Find the closest water zone to the given coordinates."""
    zones = Zone.query.all()
    if not zones:
        return None
    best_zone = None
    best_dist = float("inf")
    for z in zones:
        dist = haversine_meters(latitude, longitude, z.center_lat, z.center_lng)
        if dist < best_dist:
            best_dist = dist
            best_zone = z
    return best_zone
