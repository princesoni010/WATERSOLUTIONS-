import os
from flask import Blueprint, request
from datetime import datetime, timezone

from extensions import db
from models import Task, Incident, TaskAttachment, AuditEvent
from utils.validators import validate_image_file
from utils.response_helpers import api_response, api_error
from config import Config

tasks_bp = Blueprint("tasks", __name__, url_prefix="/api/tasks")

VALID_TASK_STATUSES = ("ASSIGNED", "ACCEPTED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED")


@tasks_bp.route("", methods=["POST"])
def create_task():
    data = request.get_json(force=True, silent=True) or {}
    incident_id = data.get("incident_id")
    technician_id = data.get("technician_id")
    task_type = (data.get("task_type") or "INSPECTION").upper()

    if not incident_id:
        return api_error("incident_id is required")

    inc = Incident.query.get(incident_id)
    if not inc:
        return api_error("Incident not found", 404)

    task = Task(
        incident_id=incident_id,
        technician_id=technician_id,
        task_type=task_type,
        status="ASSIGNED",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(task)
    db.session.flush()

    audit = AuditEvent(
        incident_id=incident_id,
        action="TASK_CREATED",
        reason=f"Task TSK-{task.id:03d} ({task_type}) created.",
        actor_id=data.get("actor_id"),
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(audit)
    db.session.commit()
    return api_response({"task": task.to_dict()}, status=201)


@tasks_bp.route("", methods=["GET"])
def list_tasks():
    status_filter = request.args.get("status")
    technician_filter = request.args.get("technician_id")
    incident_filter = request.args.get("incident_id")
    limit = min(int(request.args.get("limit", 50)), 200)

    q = Task.query
    if status_filter:
        q = q.filter(Task.status == status_filter.upper())
    if technician_filter:
        q = q.filter(Task.technician_id == int(technician_filter))
    if incident_filter:
        q = q.filter(Task.incident_id == int(incident_filter))

    tasks = q.order_by(Task.created_at.desc()).limit(limit).all()
    return api_response({"tasks": [t.to_dict() for t in tasks], "total": q.count()})


@tasks_bp.route("/<int:task_id>", methods=["GET"])
def get_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return api_error("Task not found", 404)
    return api_response({"task": task.to_dict()})


@tasks_bp.route("/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return api_error("Task not found", 404)

    data = request.get_json(force=True, silent=True) or {}

    if "status" in data:
        new_status = data["status"].upper()
        if new_status not in VALID_TASK_STATUSES:
            return api_error(f"Invalid task status: {new_status}")
        task.status = new_status
        if new_status == "COMPLETED":
            task.completed_at = datetime.now(timezone.utc)

    if "findings" in data:
        task.findings = data["findings"]

    if "repair_action" in data:
        task.repair_action = data["repair_action"]

    # Auto-update incident status when task is completed
    if task.status == "COMPLETED" and task.incident:
        inc = task.incident
        if data.get("field_confirmed"):
            inc.status = "FIELD_CONFIRMED"
            inc.confidence_level = "FIELD_CONFIRMED"
        elif inc.status == "INSPECTION_ASSIGNED":
            inc.status = "REPAIR_IN_PROGRESS"
        inc.updated_at = datetime.now(timezone.utc)

        audit = AuditEvent(
            incident_id=inc.id,
            action="TASK_COMPLETED",
            reason=f"Task TSK-{task.id:03d} completed. Findings: {task.findings or 'None provided.'}",
            actor_id=data.get("actor_id"),
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(audit)

    db.session.commit()
    return api_response({"task": task.to_dict()})


@tasks_bp.route("/<int:task_id>/upload-proof", methods=["POST"])
def upload_proof(task_id):
    task = Task.query.get(task_id)
    if not task:
        return api_error("Task not found", 404)

    attachment_type = (request.form.get("attachment_type") or "OTHER").upper()
    if attachment_type not in ("BEFORE", "AFTER", "OTHER"):
        return api_error("attachment_type must be BEFORE, AFTER, or OTHER")

    image_file = request.files.get("image")
    if not image_file:
        return api_error("No image file provided")

    img_ok, img_err = validate_image_file(image_file)
    if not img_ok:
        return api_error(img_err)

    os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
    safe_name = f"task_{task_id}_{attachment_type}_{image_file.filename}"
    save_path = os.path.join(Config.UPLOAD_FOLDER, safe_name)
    image_file.save(save_path)
    file_url = f"/uploads/report_images/{safe_name}"

    attachment = TaskAttachment(
        task_id=task_id,
        attachment_type=attachment_type,
        file_url=file_url,
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(attachment)

    # Mark repair completed if AFTER photo submitted
    if attachment_type == "AFTER" and task.incident:
        task.incident.status = "REPAIR_COMPLETED"
        task.incident.updated_at = datetime.now(timezone.utc)
        audit = AuditEvent(
            incident_id=task.incident.id,
            action="REPAIR_COMPLETED",
            reason=f"After-repair photo uploaded for TSK-{task.id:03d}.",
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(audit)

    db.session.commit()
    return api_response({"attachment": attachment.to_dict(), "task": task.to_dict()}, status=201)
