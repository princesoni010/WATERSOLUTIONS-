from datetime import datetime
import json
from extensions import db


# Enums and Status Values per Backend Schema Contract
USER_ROLES = ("CITIZEN", "OPERATOR", "TECHNICIAN", "ADMIN")
INCIDENT_STATUSES = (
    "SUSPECTED",
    "UNDER_REVIEW",
    "INSPECTION_ASSIGNED",
    "FIELD_CONFIRMED",
    "REPAIR_IN_PROGRESS",
    "REPAIR_COMPLETED",
    "VERIFIED_RESOLVED",
    "NOT_A_LEAK",
    "DUPLICATE",
    "REOPENED",
)
TASK_STATUSES = ("ASSIGNED", "ACCEPTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED")
TASK_TYPES = ("INSPECTION", "REPAIR", "FOLLOW_UP")
PRIORITY_LEVELS = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
CONFIDENCE_LEVELS = ("LOW_EVIDENCE", "MODERATE_EVIDENCE", "CORROBORATED", "FIELD_CONFIRMED")
QUALITY_FLAGS = ("GOOD", "STALE", "MISSING", "SUSPECT", "INVALID")
EVIDENCE_TYPES = ("CITIZEN_REPORT", "SENSOR_ANOMALY", "FIELD_FINDING", "OPERATOR_NOTE")


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(160), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=True)
    role = db.Column(db.String(30), nullable=False, default="CITIZEN")
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Zone(db.Model):
    __tablename__ = "zones"
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    center_lat = db.Column(db.Float, nullable=False)
    center_lng = db.Column(db.Float, nullable=False)
    expected_flow_lpm = db.Column(db.Float, nullable=False)
    expected_pressure_psi = db.Column(db.Float, nullable=False)
    impact_category = db.Column(db.String(50), default="STANDARD")

    def to_dict(self):
        return {
            "id": self.id,
            "zone_id": self.id,
            "name": self.name,
            "center_lat": self.center_lat,
            "center_lng": self.center_lng,
            "latitude": self.center_lat,
            "longitude": self.center_lng,
            "expected_flow_lpm": self.expected_flow_lpm,
            "expected_pressure_psi": self.expected_pressure_psi,
            "impact_category": self.impact_category,
        }


class Sensor(db.Model):
    __tablename__ = "sensors"
    id = db.Column(db.String(50), primary_key=True)
    zone_id = db.Column(db.String(50), db.ForeignKey("zones.id"), nullable=False, index=True)
    sensor_type = db.Column(db.String(30), nullable=False)  # FLOW, PRESSURE, COMBINED
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    expected_interval_seconds = db.Column(db.Integer, default=60, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    zone = db.relationship("Zone", backref=db.backref("sensors", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "sensor_id": self.id,
            "zone_id": self.zone_id,
            "zone_name": self.zone.name if self.zone else self.zone_id,
            "sensor_type": self.sensor_type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "is_active": self.is_active,
            "expected_interval_seconds": self.expected_interval_seconds,
            "expected_flow_lpm": self.zone.expected_flow_lpm if self.zone else None,
            "expected_pressure_psi": self.zone.expected_pressure_psi if self.zone else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class SensorReading(db.Model):
    __tablename__ = "sensor_readings"
    id = db.Column(db.Integer, primary_key=True)
    sensor_id = db.Column(db.String(50), db.ForeignKey("sensors.id"), nullable=False, index=True)
    flow_lpm = db.Column(db.Float)
    pressure_psi = db.Column(db.Float)
    quality_flag = db.Column(db.String(20), default="GOOD", nullable=False)
    scenario_id = db.Column(db.String(50), nullable=True)  # simulation traceability
    recorded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    sensor = db.relationship("Sensor", backref=db.backref("readings", lazy=True))

    def to_dict(self):
        expected_flow = self.sensor.zone.expected_flow_lpm if self.sensor and self.sensor.zone else 100.0
        expected_pressure = self.sensor.zone.expected_pressure_psi if self.sensor and self.sensor.zone else 60.0
        return {
            "id": self.id,
            "reading_id": self.id,
            "sensor_id": self.sensor_id,
            "zone_id": self.sensor.zone_id if self.sensor else None,
            "flow_lpm": self.flow_lpm,
            "pressure_psi": self.pressure_psi,
            "expected_flow_lpm": expected_flow,
            "expected_pressure_psi": expected_pressure,
            "quality_flag": self.quality_flag,
            "scenario_id": self.scenario_id,
            "recorded_at": self.recorded_at.isoformat() if self.recorded_at else None,
            "timestamp": self.recorded_at.isoformat() if self.recorded_at else None,
        }


class SensorAnomaly(db.Model):
    __tablename__ = "sensor_anomalies"
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.String(50), db.ForeignKey("zones.id"), nullable=False, index=True)
    anomaly_type = db.Column(db.String(50), nullable=False)  # FLOW_HIGH, PRESSURE_LOW, COMBINED
    severity_score = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default="ACTIVE", nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=True)
    metrics_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    zone = db.relationship("Zone", backref=db.backref("anomalies", lazy=True))

    def to_dict(self):
        metrics = {}
        if self.metrics_json:
            try:
                metrics = json.loads(self.metrics_json)
            except Exception:
                metrics = {}
        return {
            "id": self.id,
            "zone_id": self.zone_id,
            "anomaly_type": self.anomaly_type,
            "severity_score": self.severity_score,
            "status": self.status,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "metrics": metrics,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Incident(db.Model):
    __tablename__ = "incidents"
    id = db.Column(db.Integer, primary_key=True)
    zone_id = db.Column(db.String(50), db.ForeignKey("zones.id"), nullable=True, index=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(40), default="SUSPECTED", nullable=False, index=True)
    priority_score = db.Column(db.Float, default=0, nullable=False, index=True)
    priority_level = db.Column(db.String(20), default="LOW", nullable=False)
    confidence_level = db.Column(db.String(30), default="LOW_EVIDENCE", nullable=False)
    estimated_excess_flow_lpm = db.Column(db.Float, nullable=True)
    estimated_loss_24h_liters = db.Column(db.Float, nullable=True)
    assigned_engineer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    ai_summary = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    zone = db.relationship("Zone", backref=db.backref("incidents", lazy=True))
    assigned_engineer = db.relationship("User", foreign_keys=[assigned_engineer_id])
    reports = db.relationship("Report", backref="incident", lazy=True)
    tasks = db.relationship("Task", backref="incident", lazy=True)
    evidences = db.relationship("IncidentEvidence", backref="incident", lazy=True)
    audit_events = db.relationship("AuditEvent", backref="incident", lazy=True)

    def to_dict(self, include_details=False):
        ai_data = {}
        if self.ai_summary:
            try:
                ai_data = json.loads(self.ai_summary)
            except Exception:
                ai_data = {"brief": self.ai_summary}

        data = {
            "id": self.id,
            "incident_id": self.id,
            "code": f"INC-{self.id:03d}",
            "zone_id": self.zone_id,
            "zone_name": self.zone.name if self.zone else (self.zone_id or "Unassigned Zone"),
            "impact_category": self.zone.impact_category if self.zone else "STANDARD",
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "priority_score": round(self.priority_score or 0.0, 1),
            "priority_level": self.priority_level,
            "confidence_level": self.confidence_level,
            "estimated_excess_flow_lpm": round(self.estimated_excess_flow_lpm or 0.0, 1),
            "estimated_loss_1h_liters": round((self.estimated_excess_flow_lpm or 0.0) * 60.0, 1),
            "estimated_loss_24h_liters": round(self.estimated_loss_24h_liters or 0.0, 1),
            "assigned_engineer_id": self.assigned_engineer_id,
            "assigned_engineer_name": self.assigned_engineer.name if self.assigned_engineer else None,
            "report_count": len(self.reports),
            "task_count": len(self.tasks),
            "ai_summary": ai_data.get("brief", "Suspected leak — field verification required."),
            "priority_explanation": ai_data.get("priority_explanation", ""),
            "priority_breakdown": ai_data.get("priority_breakdown", {}),
            "recommended_action": ai_data.get("recommended_action", "OPERATOR_REVIEW"),
            "title": ai_data.get("title", f"Suspected Leak in {self.zone.name if self.zone else self.zone_id}"),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_details:
            data["reports"] = [r.to_dict() for r in self.reports]
            data["tasks"] = [t.to_dict() for t in sorted(self.tasks, key=lambda x: x.created_at or datetime.min, reverse=True)]
            data["evidences"] = [e.to_dict() for e in self.evidences]
            data["audit_events"] = [
                a.to_dict() for a in sorted(self.audit_events, key=lambda x: x.created_at or datetime.min, reverse=True)
            ]
        return data


class Report(db.Model):
    __tablename__ = "reports"
    id = db.Column(db.Integer, primary_key=True)
    tracking_reference = db.Column(db.String(50), unique=True, nullable=False, index=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id"), nullable=True, index=True)
    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    issue_type = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(30), default="SUBMITTED", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    images = db.relationship("ReportImage", backref="report", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        # Privacy requirement: never expose citizen contact details on public/operator map views
        primary_image = self.images[0] if self.images else None
        ai_tags = {}
        if primary_image and primary_image.ai_tags_json:
            try:
                ai_tags = json.loads(primary_image.ai_tags_json)
            except Exception:
                ai_tags = {}
        return {
            "id": self.id,
            "report_id": self.id,
            "tracking_reference": self.tracking_reference,
            "incident_id": self.incident_id,
            "incident_code": f"INC-{self.incident_id:03d}" if self.incident_id else None,
            "incident_status": self.incident.status if self.incident else None,
            "issue_type": self.issue_type,
            "description": self.description,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "image_url": primary_image.image_url if primary_image else None,
            "ai_image_tags": ai_tags,
            "images": [img.to_dict() for img in self.images],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class ReportImage(db.Model):
    __tablename__ = "report_images"
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=False, index=True)
    image_url = db.Column(db.String(500), nullable=False)
    ai_tags_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        tags = {}
        if self.ai_tags_json:
            try:
                tags = json.loads(self.ai_tags_json)
            except Exception:
                tags = {}
        return {
            "id": self.id,
            "report_id": self.report_id,
            "image_url": self.image_url,
            "ai_tags": tags,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class IncidentEvidence(db.Model):
    __tablename__ = "incident_evidence"
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id"), nullable=False, index=True)
    evidence_type = db.Column(db.String(40), nullable=False)
    reference_id = db.Column(db.String(100), nullable=False)
    linked_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    linked_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "incident_id": self.incident_id,
            "evidence_type": self.evidence_type,
            "reference_id": self.reference_id,
            "linked_by": self.linked_by,
            "linked_at": self.linked_at.isoformat() if self.linked_at else None,
        }


class Task(db.Model):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id"), nullable=False, index=True)
    technician_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True, index=True)
    task_type = db.Column(db.String(30), nullable=False)  # INSPECTION / REPAIR / FOLLOW_UP
    status = db.Column(db.String(30), default="ASSIGNED", nullable=False, index=True)
    findings = db.Column(db.Text, nullable=True)
    repair_action = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)

    technician = db.relationship("User", foreign_keys=[technician_id])
    attachments = db.relationship("TaskAttachment", backref="task", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        before_img = next((a.file_url for a in self.attachments if a.attachment_type == "BEFORE"), None)
        after_img = next((a.file_url for a in self.attachments if a.attachment_type == "AFTER"), None)
        return {
            "id": self.id,
            "task_id": self.id,
            "code": f"TSK-{self.id:03d}",
            "incident_id": self.incident_id,
            "incident_code": f"INC-{self.incident_id:03d}" if self.incident_id else None,
            "zone_id": self.incident.zone_id if self.incident else None,
            "zone_name": self.incident.zone.name if (self.incident and self.incident.zone) else None,
            "latitude": self.incident.latitude if self.incident else None,
            "longitude": self.incident.longitude if self.incident else None,
            "priority_level": self.incident.priority_level if self.incident else "MEDIUM",
            "priority_score": round(self.incident.priority_score or 0, 1) if self.incident else 0,
            "confidence_level": self.incident.confidence_level if self.incident else "LOW_EVIDENCE",
            "incident_status": self.incident.status if self.incident else None,
            "technician_id": self.technician_id,
            "assigned_to": self.technician.name if self.technician else "Unassigned",
            "task_type": self.task_type,
            "status": self.status,
            "findings": self.findings,
            "repair_action": self.repair_action,
            "before_image_url": before_img,
            "after_image_url": after_img,
            "attachments": [a.to_dict() for a in self.attachments],
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class TaskAttachment(db.Model):
    __tablename__ = "task_attachments"
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("tasks.id"), nullable=False, index=True)
    attachment_type = db.Column(db.String(30), nullable=False)  # BEFORE, AFTER, OTHER
    file_url = db.Column(db.String(500), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "task_id": self.task_id,
            "attachment_type": self.attachment_type,
            "file_url": self.file_url,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AuditEvent(db.Model):
    __tablename__ = "audit_events"
    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(db.Integer, db.ForeignKey("incidents.id"), nullable=False, index=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(80), nullable=False)
    reason = db.Column(db.Text, nullable=True)
    metadata_json = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    actor = db.relationship("User", foreign_keys=[actor_id])

    def to_dict(self):
        meta = {}
        if self.metadata_json:
            try:
                meta = json.loads(self.metadata_json)
            except Exception:
                meta = {}
        return {
            "id": self.id,
            "event_id": self.id,
            "incident_id": self.incident_id,
            "actor_id": self.actor_id,
            "actor_name": self.actor.name if self.actor else "System / Automated",
            "actor_role": self.actor.role if self.actor else "SYSTEM",
            "action": self.action,
            "reason": self.reason,
            "metadata": meta,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
