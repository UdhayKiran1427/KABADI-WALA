import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Brand Colors
    PRIMARY = RGBColor(5, 150, 105)       # Emerald Green
    PRIMARY_DARK = RGBColor(6, 95, 70)    # Deep Emerald
    ACCENT = RGBColor(16, 185, 129)       # Mint
    DARK_TEXT = RGBColor(30, 41, 59)      # Slate 800
    MUTED_TEXT = RGBColor(100, 116, 139)  # Slate 500
    WHITE = RGBColor(255, 255, 255)
    CARD_BG = RGBColor(248, 250, 252)     # Slate 50
    CARD_BORDER = RGBColor(226, 232, 240) # Slate 200
    GOLD = RGBColor(217, 119, 6)          # Amber 600

    def add_header(slide, title_text, category_text="KABADI WALA PLATFORM"):
        header_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.1))
        tf = header_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p0 = tf.paragraphs[0]
        p0.text = category_text.upper()
        p0.font.size = Pt(11)
        p0.font.bold = True
        p0.font.color.rgb = PRIMARY

        p1 = tf.add_paragraph()
        p1.text = title_text
        p1.font.size = Pt(24)
        p1.font.bold = True
        p1.font.color.rgb = DARK_TEXT

    def add_card(slide, left, top, width, height, title, body_bullets, tag=None, bg_color=CARD_BG, border_color=CARD_BORDER):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1.5)

        tb = slide.shapes.add_textbox(left + Inches(0.3), top + Inches(0.25), width - Inches(0.6), height - Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        p_title = tf.paragraphs[0]
        p_title.text = title
        p_title.font.size = Pt(16)
        p_title.font.bold = True
        p_title.font.color.rgb = PRIMARY_DARK

        for b in body_bullets:
            p = tf.add_paragraph()
            p.text = f"•  {b}"
            p.font.size = Pt(13)
            p.font.color.rgb = DARK_TEXT
            p.space_before = Pt(8)

    # ==========================================
    # SLIDE 1: Title Slide
    # ==========================================
    s1 = prs.slides.add_slide(blank_layout)
    bg1 = s1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = PRIMARY_DARK
    bg1.line.fill.background()

    t_box1 = s1.shapes.add_textbox(Inches(1.2), Inches(2.0), Inches(11), Inches(3.5))
    tf1 = t_box1.text_frame
    tf1.word_wrap = True

    p_badge = tf1.paragraphs[0]
    p_badge.text = "♻️  CIRCULAR SUPPLY CHAIN PLATFORM"
    p_badge.font.size = Pt(14)
    p_badge.font.bold = True
    p_badge.font.color.rgb = ACCENT

    p_title = tf1.add_paragraph()
    p_title.text = "KABADI WALA"
    p_title.font.size = Pt(54)
    p_title.font.bold = True
    p_title.font.color.rgb = WHITE
    p_title.space_before = Pt(8)

    p_sub = tf1.add_paragraph()
    p_sub.text = "Empowering Informal Scrap Collectors with Fair Pricing, Safety & Traceable E-Waste Recycling"
    p_sub.font.size = Pt(20)
    p_sub.font.color.rgb = RGBColor(209, 250, 229)
    p_sub.space_before = Pt(14)

    p_meta = tf1.add_paragraph()
    p_meta.text = "Next.js 15 App Router  •  Prisma ORM  •  PostgreSQL  •  Multi-Role Architecture"
    p_meta.font.size = Pt(13)
    p_meta.font.color.rgb = RGBColor(167, 243, 208)
    p_meta.space_before = Pt(24)

    # ==========================================
    # SLIDE 2: Problem Statement
    # ==========================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "The Real-World Informal E-Waste Challenge", "Industry Dilemma")

    cards_s2 = [
        ("1. Severe Underpayment", [
            "Collectors lack real-time spot rates for electronic scrap.",
            "Middlemen take 50-70% margins on precious metals (gold, copper).",
            "No standard price reference exists in Hindi or Marathi."
        ]),
        ("2. Toxic Informal Hazards", [
            "Open burning of PVC cables emits deadly cancer-causing dioxins.",
            "Acid washing motherboards damages skin and poisons water.",
            "Smashing CRT glass releases toxic cadmium dust."
        ]),
        ("3. Trust & Weighing Disputes", [
            "Collectors and buyers frequently dispute mechanical scale readings.",
            "Cash payments lack digital receipts, proof, and EPR audit trails.",
            "Unlicensed recyclers illegally dump hazardous components."
        ])
    ]
    for i, (title, bullets) in enumerate(cards_s2):
        add_card(s2, Inches(0.8 + i * 4.0), Inches(2.0), Inches(3.7), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 3: The Solution
    # ==========================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "How KABADI WALA Transforms the Ecosystem", "Platform Solution")

    cards_s3 = [
        ("Transparent Spot Rates", [
            "Daily ground-truthed market price board (min, max, median).",
            "All rates calculated in integer paise per kg (₹1 = 100 paise).",
            "Dynamic estimate calculator before bringing scrap to the gate."
        ]),
        ("Mutual PIN & Scale Check", [
            "Secure 4-digit code generated only on the collector's device.",
            "Automated scale weight tolerance check (±5% auto-accept).",
            "Automatic anomaly flagging on 25% or 40% discrepancies."
        ]),
        ("Zero-PII Digital Receipts", [
            "Shareable public URL via WhatsApp or SMS.",
            "Collector phone numbers are masked (e.g. 982****001).",
            "Verifiable authorization number and tamper-evident audit trail."
        ])
    ]
    for i, (title, bullets) in enumerate(cards_s3):
        add_card(s3, Inches(0.8 + i * 4.0), Inches(2.0), Inches(3.7), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 4: The 4 System Personas
    # ==========================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "Multi-Stakeholder Architecture", "System Personas")

    personas = [
        ("Collector (कबाड़ीवाला)", [
            "Login with phone & 4-digit PIN",
            "Create Scrap Lots (PCB, Cables, etc.)",
            "Check today's local market prices",
            "Receive Cash or UPI payouts"
        ]),
        ("Recycler (अधिकृत फैक्ट्री)", [
            "Pollution Board verified license",
            "Set daily buying rates per kg",
            "Weigh incoming lots at gate",
            "Confirm handovers with PIN"
        ]),
        ("Field Agent (फील्ड साथी)", [
            "Onboard informal scrap collectors",
            "Record ground prices weekly",
            "Distribute audio safety guides",
            "Capture ML training photos"
        ]),
        ("Admin (प्लेटफ़ॉर्म मालिक)", [
            "Verify recycler authorizations",
            "Catch fraud & weight anomalies",
            "Track platform EPR volume",
            "Export price data for research"
        ])
    ]
    for i, (title, bullets) in enumerate(personas):
        add_card(s4, Inches(0.8 + i * 2.95), Inches(2.0), Inches(2.8), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 5: End-to-End Operational Lifecycle
    # ==========================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "The Scrap Lot Lifecycle (Step-by-Step)", "Operational Workflow")

    steps = [
        ("Step 1: Collection", ["Collector gathers scrap", "Takes photos & weights", "Selects material category"]),
        ("Step 2: Lot Creation", ["App generates Lot ID", "Instant payout estimate", "Unique 4-digit PIN assigned"]),
        ("Step 3: Matching", ["Finds closest verified plant", "Shows distance & directions", "Optional pickup request"]),
        ("Step 4: Verification", ["Weighed on facility scale", "Collector gives 4-digit PIN", "±5% tolerance evaluated"]),
        ("Step 5: Completion", ["Payment via Cash or UPI", "Digital receipt issued", "Ledger balance updated"])
    ]
    for i, (title, bullets) in enumerate(steps):
        add_card(s5, Inches(0.8 + i * 2.38), Inches(2.0), Inches(2.25), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 6: Trust, Safety & Anomaly Engine
    # ==========================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Automated Verification & Fraud Detection", "Trust Engine")

    cards_s6 = [
        ("Scale Tolerance Rules", [
            "≤ 5.0% Difference: AUTO_ACCEPT. Recalculates final price on exact scale weight.",
            "> 5.0% to 15%: MANUAL_REVIEW. Collector must confirm adjusted weight.",
            "> 25.0% or 40%: ANOMALY_FLAG. Transaction held for admin investigation."
        ]),
        ("Anti-Spoofing & Geofencing", [
            "GPS Haversine calculation verifies collector is at the facility gate (≤300m MATCH).",
            "Velocity spoofing checks flag impossible travel speeds (>50km in 10 mins).",
            "Photo duplicate detection via SHA-256 image fingerprinting."
        ]),
        ("4 Core Worker Safety Topics", [
            "Do Not Burn Cables (Dioxins & lung damage).",
            "Do Not Wash Boards with Acid (Skin burns & cyanide gas).",
            "Do Not Puncture Batteries (Fire & chemical explosion).",
            "Do Not Smash CRT Monitors (Leaded glass & cadmium dust)."
        ])
    ]
    for i, (title, bullets) in enumerate(cards_s6):
        add_card(s6, Inches(0.8 + i * 4.0), Inches(2.0), Inches(3.7), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 7: Material Categories & Rates
    # ==========================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Standardized Scrap Material Categories", "Material Taxonomy")

    materials = [
        ("Printed Circuit Boards (PCB)", ["Code: PCB", "Spot Rate: ₹340.00 / kg", "Hazardous: No", "Motherboards, RAM, cards"]),
        ("Wires & Copper Cables", ["Code: CABLE", "Spot Rate: ₹580.00 / kg", "Hazardous: No", "Stripped wiring, copper cords"]),
        ("Batteries (Li-Ion / Lead)", ["Code: BATTERY", "Spot Rate: ₹90.00 / kg", "Hazardous: YES ⚠️", "Laptop, mobile, UPS cells"]),
        ("CRT Monitors & Glass", ["Code: CRT", "Spot Rate: ₹12.00 / kg", "Hazardous: YES ⚠️", "Old TVs, monitor vacuum tubes"])
    ]
    for i, (title, bullets) in enumerate(materials):
        add_card(s7, Inches(0.8 + i * 2.95), Inches(2.0), Inches(2.8), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 8: Technology Stack & API Architecture
    # ==========================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Technical Architecture & API Surface", "System Implementation")

    cards_s8 = [
        ("Modern Web & Mobile Stack", [
            "Next.js 15 (App Router & Server Actions)",
            "Prisma ORM with PostgreSQL database",
            "TypeScript 5.8 with strict type guarantees",
            "Offline-first sync protocol (SQLite Drift client)"
        ]),
        ("High-Performance REST APIs", [
            "POST /api/v1/auth/login (PIN authentication)",
            "GET /api/v1/prices/board (Live rate board)",
            "POST /api/v1/estimate (Instant payout calc)",
            "POST /api/v1/lots (Scrap bundle creation)",
            "POST /api/v1/lots/{id}/handover (Mutual check)"
        ]),
        ("Security & Privacy Controls", [
            "Bcrypt PIN hashing (cost factor 10)",
            "5-Attempt Rate Limiting on mobile login",
            "Role-Based Access Control (RBAC)",
            "Zero-PII Public Receipts (phone numbers masked)"
        ])
    ]
    for i, (title, bullets) in enumerate(cards_s8):
        add_card(s8, Inches(0.8 + i * 4.0), Inches(2.0), Inches(3.7), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 9: Pre-Seeded Test Credentials
    # ==========================================
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "Ready-to-Use Demo Test Accounts", "Demo Credentials")

    creds = [
        ("Collector Portal", [
            "URL: /collector",
            "Phone: 9820000001",
            "PIN: 1234",
            "Short Code: KW01",
            "Area: Dharavi Matunga"
        ]),
        ("Recycler Facility", [
            "URL: /recycler",
            "Phone: 9876543210",
            "Password: password123",
            "Auth: EW-MH-2026-0042",
            "Facility: EcoRecycle Central"
        ]),
        ("Field Agent", [
            "Portal: Mobile / Field API",
            "Phone: 9830000001",
            "Password: agent123",
            "Role: Ground Price Surveyor",
            "Area: Mumbai District"
        ]),
        ("Platform Admin", [
            "Portal: /admin",
            "Phone: 9999999999",
            "Password: admin123",
            "Role: Master Supervisor",
            "Full System Governance"
        ])
    ]
    for i, (title, bullets) in enumerate(creds):
        add_card(s9, Inches(0.8 + i * 2.95), Inches(2.0), Inches(2.8), Inches(4.7), title, bullets)

    # ==========================================
    # SLIDE 10: Conclusion & Next Steps
    # ==========================================
    s10 = prs.slides.add_slide(blank_layout)
    bg10 = s10.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg10.fill.solid()
    bg10.fill.fore_color.rgb = PRIMARY_DARK
    bg10.line.fill.background()

    tb10 = s10.shapes.add_textbox(Inches(1.5), Inches(1.8), Inches(10.3), Inches(4.0))
    tf10 = tb10.text_frame
    tf10.word_wrap = True

    p_c1 = tf10.paragraphs[0]
    p_c1.text = "SUSTAINABILITY & FINANCIAL INCLUSION"
    p_c1.font.size = Pt(14)
    p_c1.font.bold = True
    p_c1.font.color.rgb = ACCENT

    p_c2 = tf10.add_paragraph()
    p_c2.text = "Ready for Production & Field Deployment"
    p_c2.font.size = Pt(40)
    p_c2.font.bold = True
    p_c2.font.color.rgb = WHITE
    p_c2.space_before = Pt(10)

    p_c3 = tf10.add_paragraph()
    p_c3.text = "• Tested & Verified: 53 Unit and Integration tests passing across domain rules.\n• Compliant: Meets Indian E-Waste Management Rules & Extended Producer Responsibility.\n• Inclusive: Designed for low-literacy collectors with Hindi/Marathi audio guides.\n• Reliable: Zero-PII receipts, offline sync support, and anti-fraud anomaly flags."
    p_c3.font.size = Pt(17)
    p_c3.font.color.rgb = RGBColor(209, 250, 229)
    p_c3.space_before = Pt(20)

    output_path = "KABADI_WALA_Project_Presentation.pptx"
    prs.save(output_path)
    print("SUCCESS: Created PowerPoint presentation: " + output_path)

if __name__ == "__main__":
    create_deck()
