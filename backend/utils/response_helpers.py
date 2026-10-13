from flask import jsonify


def api_response(data=None, message=None, status=200):
    payload = {}
    if isinstance(data, dict):
        payload.update(data)
    elif data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    return jsonify(payload), status


def api_error(message, status=400, details=None):
    payload = {"error": message, "message": message}
    if details:
        payload["details"] = details
    return jsonify(payload), status
