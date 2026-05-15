<div align="center">
  <h1>🛡️ Voucha</h1>
  <p><b>The Integrity Layer for Academic Credentials</b></p>
  <p><i>Built for the Squad Hackathon 3.0 — "Smart Systems: The Intelligent Economy"</i></p>

  [![Hackathon](https://img.shields.io/badge/Squad-Hackathon_3.0-blue.svg)](#)
  [![Challenge](https://img.shields.io/badge/Challenge_01-Proof_of_Life-success.svg)](#)
  [![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](#)
  [![Squad API](https://img.shields.io/badge/Integration-Squad_API-orange.svg)](#)
</div>

---

## 📖 Introduction
Welcome to the official repository for **Voucha**. 

Built as a targeted solution for the **Squad Hackathon 3.0 (Challenge 01: "Proof of Life")**, Voucha is a high-fidelity, AI-powered verification platform designed to authenticate academic certificates, transcripts, and exam results. By combining advanced document forensics (OCR + NLP + Anomaly Detection) with instant financial settlements via the Squad API, Voucha transforms the historically slow and opaque process of credential verification into a seamless, intelligent "Trust-as-a-Service" model.

---

## 📌 The Problem: The Certificate Fraud Epidemic
In the Nigerian education sector, the proliferation of forged academic certificates and transcripts (affecting bodies like WAEC, NECO, and universities such as UNILAG) severely undermines institutional trust and economic opportunity. Traditional manual verification processes are overwhelmingly slow, expensive, and highly susceptible to human error and bribery.

## 💡 The Solution: Voucha
Voucha acts as an automated digital notary. It provides a secure bridge for verifying documents by cross-referencing AI-extracted data against established institutional patterns. By outputting a definitive, highly-analytical **"Trust Score"** and facilitating instant, per-verification payments via the **Squad API**, Voucha offers a scalable and financially sustainable verification layer for the modern economy.

---

## 🏗️ Core Features & Architecture

Our pipeline is engineered to meet the strict demands of an intelligent, data-driven economy:

1. **Smart Upload Portal:** Users securely upload a certificate or transcript image/PDF into our highly responsive interface.
2. **Multi-Stage AI Analysis Engine:** * **OCR:** Accurately extracts text and metadata from complex, varied document layouts.
   * **NLP:** Validates formatting patterns, language structures, and institutional nomenclature.
   * **Anomaly Detection:** Flags visual or structural inconsistencies (e.g., mismatched fonts, altered issuance dates, forged digital seals).
3. **The Integrity Dial (Trust Score):** The system outputs a quantitative 0–100 Trust Score alongside a definitive Pass/Fail verdict, highlighting specific flagged anomalies with clear AI reasoning.
4. **Secure Settlement:** Institutions or employers pay a seamless, instant verification fee utilizing the **Squad Checkout API** before accessing the final validation.
5. **Immutable Reports:** Generates a downloadable, highly detailed PDF verification report for official records.

---

## 🧠 Alignment with the "Four Pillars"

Voucha is explicitly designed to embody the core grading pillars of the Squad Hackathon 3.0:

* **🤖 AI Automation (30% Technical Depth):** We move beyond simple heuristics. The core of Voucha is a machine learning pipeline that performs deep document forensic analysis.
* **📊 Use of Data:** Voucha cross-references extracted metadata against established patterns from thousands of valid academic records to reliably identify deviations.
* **🔌 Squad APIs (20% Integration):** Squad is the financial engine of the application. Access to the final verification report is securely gated by a successful transaction via the Squad Payment Webhooks.
* **💸 Financial Innovation:** By introducing micro-transactions for instant certificate verification, Voucha creates a new, sustainable revenue model for institutions while saving employers countless administrative hours.

---

## 🛠️ Tech Stack

* **Backend & AI Pipeline:** Python, FastAPI (Fast, highly scalable, and native for our ML models)
* **Machine Learning:** OpenCV (Document layout), Tesseract/EasyOCR (Text extraction), scikit-learn (Anomaly detection)
* **Frontend:** Responsive Web Interface (HTML5, Tailwind CSS, JavaScript)
* **Payments & Settlement:** Squad Checkout API & Webhooks

---

## 🚀 Local Setup & Installation

Follow these steps to run the Voucha pipeline locally.

### Prerequisites
* Python 3.10+
* A Squad Developer Account (Sandbox API Keys)

### 1. Clone the Repository
```bash
git clone [https://github.com/salimmadeit/voucha.git](https://github.com/salimmadeit/voucha.git)
cd voucha
