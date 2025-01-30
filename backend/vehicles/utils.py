from datetime import datetime
from io import BytesIO

from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from vehicles.models import Vehicle


class VehicleFuelUsageReportGenerator:
    def __init__(self, vehicle: Vehicle):
        self.vehicle = vehicle
        self.now = datetime.now()
        self.buffer = BytesIO()
        self.width, self.height = A4
        self.doc = SimpleDocTemplate(
            self.buffer,
            rightMargin=30,
            leftMargin=30,
            topMargin=30,
            bottomMargin=30,
            pageSize=A4,
        )
        self.prepare_styles()
        self.datetime_format = "%Y-%m-%d %H:%M"
        self.data = []

    def prepare_styles(self) -> None:
        self.styles = getSampleStyleSheet()
        self.styles.add(ParagraphStyle(name="BrandHeader", fontSize=30, alignment=TA_CENTER, fontName="Helvetica-Bold"))
        self.styles.add(ParagraphStyle(name="PlatesHeader", fontSize=24, alignment=TA_CENTER, fontName="Helvetica-Bold"))
        self.styles.add(ParagraphStyle(name="ParagraphTitle", fontSize=12, alignment=TA_CENTER, fontName="Helvetica-Bold"))
        self.styles.add(ParagraphStyle(name="ParagraphCell", fontSize=10, alignment=TA_CENTER, fontName="Helvetica"))
        self.styles.add(ParagraphStyle(name="TableMeta", fontSize=8, alignment=TA_RIGHT, fontName="Helvetica"))

    def prepare_title_table(self) -> None:
        brand_style = self.styles["BrandHeader"]
        plates_style = self.styles["PlatesHeader"]

        data = [
            [Paragraph(str(self.vehicle), brand_style)],
            [Paragraph(self.vehicle.registration_number, plates_style)],
        ]
        table = Table(data, colWidths=self.width * 0.8, rowHeights=self.height * 0.05)
        table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        self.data.append(table)
        self.data.append(Spacer(1, 30))

    def prepare_car_data_table(self) -> None:
        paragraph_title_style = self.styles["ParagraphTitle"]
        paragraph_content_style = self.styles["ParagraphCell"]
        data = [
            [
                Paragraph("Production year", paragraph_title_style),
                Paragraph("VIN", paragraph_title_style),
                Paragraph("Kilometrage", paragraph_title_style),
                Paragraph("Gearbox type", paragraph_title_style),
            ],
            [
                Paragraph(str(self.vehicle.production_year), paragraph_content_style),
                Paragraph(self.vehicle.vin, paragraph_content_style),
                Paragraph(str(self.vehicle.kilometrage), paragraph_content_style),
                Paragraph(self.vehicle.gearbox_type.value.capitalize(), paragraph_content_style),
            ],
        ]
        table = Table(data, colWidths=self.width * 0.2, rowHeights=self.height * 0.04)
        table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("GRID", (0, 0), (-1, -1), 0.5, "black"),
                ]
            )
        )
        self.data.append(table)
        self.data.append(Spacer(1, 50))

    def prepare_meta_table(self) -> None:
        meta_style = self.styles["TableMeta"]
        self.data.append(Paragraph(self.now.strftime(self.datetime_format), meta_style))

    def prepare_fuel_table(self) -> None:
        refuel_data = sorted(self.vehicle.refuels, key=lambda r: r.date, reverse=True)

        headers = [
            [
                Paragraph("Date", self.styles["ParagraphTitle"]),
                Paragraph("Amount", self.styles["ParagraphTitle"]),
                Paragraph("Price", self.styles["ParagraphTitle"]),
                Paragraph("Kilometrage", self.styles["ParagraphTitle"]),
                Paragraph("Person", self.styles["ParagraphTitle"]),
            ],
        ]

        cells = []
        for r in refuel_data:
            cells.append(
                [
                    Paragraph(r.date.strftime(self.datetime_format), self.styles["ParagraphCell"]),
                    Paragraph(str(r.fuel_amount), self.styles["ParagraphCell"]),
                    Paragraph(str(r.price), self.styles["ParagraphCell"]),
                    Paragraph(str(r.kilometrage_during_refuel), self.styles["ParagraphCell"]),
                    Paragraph(r.user.name, self.styles["ParagraphCell"]),
                ]
            )

        table = Table(headers + cells, colWidths=self.width * 0.15, rowHeights=self.height * 0.04)
        table.setStyle(
            TableStyle(
                [
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("GRID", (0, 0), (-1, -1), 0.5, "black"),
                ]
            )
        )
        self.data.append(table)

    def report(self) -> BytesIO:
        self.prepare_meta_table()
        self.prepare_title_table()
        self.prepare_car_data_table()
        self.prepare_fuel_table()
        self.doc.build(self.data)
        return self.buffer.getvalue()
