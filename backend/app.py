"""
app.py — AquaGuard AI Flask Application Entry Point
"""
import json
import os
from flask import Flask, send_from_directory
from config import Config
from extensions import db, cors
from models import Zone, Sensor, User


def seed_demo_data(app):
    """Seed zones, sensors, demo users, and initial demo dataset if the DB is empty."""
    with app.app_context():
        if Zone.query.count() == 0:
            zones_file = os.path.join(os.path.dirname(__file__), "..", "demo-data", "zones.json")
            if os.path.exists(zones_file):
                with open(zones_file, "r", encoding="utf-8") as f:
                    zones_data = json.load(f)
                for z in zones_data:
                    zone = Zone(
                        id=z["id"],
                        name=z["name"],
                        center_lat=z["center_lat"],
                        center_lng=z["center_lng"],
                        expected_flow_lpm=z["expected_flow_lpm"],
                        expected_pressure_psi=z["expected_pressure_psi"],
                        impact_category=z.get("impact_category", "STANDARD"),
                    )
                    db.session.add(zone)
                    sensor = Sensor(
                        id=f"FLOW-{z['id']}-01",
                        zone_id=z["id"],
                        sensor_type="COMBINED",
                        latitude=z["center_lat"],
                        longitude=z["center_lng"],
                        is_active=True,
                        expected_interval_seconds=60,
                    )
                    db.session.add(sensor)
            db.session.commit()

        from routes.simulation import seed_rich_demo_dataset
        from models import Incident
        if Incident.query.count() == 0:
            seed_rich_demo_dataset()
            print("[AquaGuard AI] Rich demo data seeded successfully.")


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    db.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints
    from routes.reports import reports_bp
    from routes.sensors import sensors_bp, zones_bp
    from routes.incidents import incidents_bp
    from routes.tasks import tasks_bp
    from routes.dashboard import dashboard_bp
    from routes.simulation import simulation_bp

    app.register_blueprint(reports_bp)
    app.register_blueprint(sensors_bp)
    app.register_blueprint(zones_bp)
    app.register_blueprint(incidents_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(simulation_bp)

    @app.route("/api/users")
    def list_users():
        users = User.query.all()
        return {"users": [u.to_dict() for u in users]}, 200

    # Serve uploaded images
    @app.route("/uploads/report_images/<path:filename>")
    def serve_image(filename):
        return send_from_directory(Config.UPLOAD_FOLDER, filename)

    # Health check
    @app.route("/api/health")
    def health():
        return {"status": "ok", "app": "AquaGuard AI", "simulation_mode": True}, 200

    # DB init
    with app.app_context():
        db.create_all()
        seed_demo_data(app)

    return app


if __name__ == "__main__":
    application = create_app()
    application.run(debug=True, host="0.0.0.0", port=5000)
