from datetime import datetime
from config import Config


def validate_coordinates(lat, lng):
    """Validate latitude (-90 to 90) and longitude (-180 to 180)."""
    try:
        lat_val = float(lat)
        lng_val = float(lng)
    except (TypeError, ValueError):
        return False, "400 Invalid location: coordinates must be numeric", None, None

    if not (-90.0 <= lat_val <= 90.0) or not (-180.0 <= lng_val <= 180.0):
        return False, "400 Invalid location: latitude must be -90..90 and longitude -180..180", None, None

    return True, None, lat_val, lng_val


def validate_image_file(file_storage):
    """Allow jpg/jpeg/png/webp; size limit 5 MB."""
    if not file_storage or not file_storage.filename:
        return True, None

    ext = file_storage.filename.rsplit(".", 1)[-1].lower() if "." in file_storage.filename else ""
    if ext not in Config.ALLOWED_EXTENSIONS:
        return False, "400 Unsupported file: only jpg, jpeg, png, and webp are allowed"

    return True, None


def validate_sensor_reading_payload(data):
    """At least one of flow_lpm or pressure_psi must be provided (unless OFFLINE/STALE/MISSING)."""
    if not isinstance(data, dict):
        return False, "400 Invalid JSON payload"

    sensor_id = data.get("sensor_id")
    if not sensor_id:
        return False, "400 Missing sensor_id"

    quality_flag = data.get("quality_flag", "GOOD")
    flow = data.get("flow_lpm")
    pressure = data.get("pressure_psi")

    if quality_flag == "GOOD" and flow is None and pressure is None:
        return False, "400 Missing reading values: at least one of flow_lpm or pressure_psi must be provided"

    ts_str = data.get("timestamp")
    if ts_str:
        try:
            datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
        except ValueError:
            return False, "400 Invalid timestamp: must be ISO-8601 format"

    return True, None
