import os
import uuid
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from app.config import get_settings
from app.services.interview_service import InterviewService, EventService
from app.services.trust_score_service import TrustScoreEngine


class ReportService:
    @staticmethod
    async def generate_pdf(interview_id: str, metrics: dict | None = None) -> str:
        settings = get_settings()
        os.makedirs(settings.reports_dir, exist_ok=True)

        interview = await InterviewService.get_by_id(interview_id)
        events = await EventService.list_by_interview(interview_id)

        if metrics is None:
            metrics = {
                "eye_movement": 78,
                "head_pose": 82,
                "browser_activity": 65,
                "answer_originality": 88,
                "voice_behavior": 90,
                "multi_person": 95,
            }

        trust = TrustScoreEngine.calculate(metrics)
        filename = f"report_{interview_id[:8]}_{uuid.uuid4().hex[:6]}.pdf"
        filepath = os.path.join(settings.reports_dir, filename)

        doc = SimpleDocTemplate(filepath, pagesize=letter)
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            "CustomTitle",
            parent=styles["Heading1"],
            fontSize=22,
            textColor=colors.HexColor("#1e40af"),
            spaceAfter=20,
        )
        elements = []

        elements.append(Paragraph("Interview Integrity Report", title_style))
        elements.append(
            Paragraph(
                f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}",
                styles["Normal"],
            )
        )
        elements.append(Spacer(1, 0.3 * inch))

        if interview:
            info_data = [
                ["Interview", interview.get("title", "N/A")],
                ["Interview ID", interview_id],
                ["Status", interview.get("status", "N/A")],
                ["Trust Score", f"{trust['trust_score']}%"],
                ["Risk Level", trust["risk_level"].value.upper()],
            ]
            info_table = Table(info_data, colWidths=[2 * inch, 4 * inch])
            info_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eff6ff")),
                        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
                        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 10),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ]
                )
            )
            elements.append(info_table)
            elements.append(Spacer(1, 0.3 * inch))

        elements.append(Paragraph("Trust Score Breakdown", styles["Heading2"]))
        breakdown_data = [["Category", "Score"]]
        for k, v in trust["breakdown"].items():
            breakdown_data.append([k.replace("_", " ").title(), f"{v}%"])
        breakdown_table = Table(breakdown_data, colWidths=[3 * inch, 2 * inch])
        breakdown_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        elements.append(breakdown_table)
        elements.append(Spacer(1, 0.3 * inch))

        elements.append(Paragraph("Recommendation", styles["Heading2"]))
        elements.append(Paragraph(trust["recommendation"], styles["Normal"]))
        elements.append(Spacer(1, 0.3 * inch))

        elements.append(Paragraph("Suspicious Activity Log", styles["Heading2"]))
        if events:
            event_data = [["Time", "Type", "Severity", "Description"]]
            for e in events[:20]:
                event_data.append(
                    [
                        e.get("created_at", "")[:19],
                        e.get("event_type", ""),
                        e.get("severity", ""),
                        e.get("description", "")[:60],
                    ]
                )
            event_table = Table(event_data, colWidths=[1.3 * inch, 1.2 * inch, 0.8 * inch, 3 * inch])
            event_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#dc2626")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 8),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fef2f2")]),
                    ]
                )
            )
            elements.append(event_table)
        else:
            elements.append(Paragraph("No suspicious events recorded.", styles["Normal"]))

        doc.build(elements)
        return filepath
